/* =============================================================================
   Действия, которых нет в приложении (дополнение к собранному коду)
   -----------------------------------------------------------------------------
   Пока одно: удаление всей «Истории обзвона» за день, а не по одной записи
   за каждого диспетчера. Кнопку «Удалить день» в шапку дня встраивает правка
   собранного кода (tools/nav-patches.mjs), а сама работа с данными — здесь:
   так правка остаётся маленькой, а логику видно целиком.

   Что важно в реализации:

   1. Записи диспетчеров лежат в localStorage под ключом vdgo_dispatcher.
      Приложение умеет хранить их и массивом, и объектом из массивов, поэтому
      читаем так же терпимо, как оно само.

   2. Мало удалить записи у себя: при синхронизации они вернулись бы с другого
      устройства. Поэтому вместе с удалением пишутся метки удаления —
      в vdgo_dispatcher_deleted (как это делает само приложение при удалении
      одной записи) и в общий список vdgo_deleted_ids, по которому слияние
      отбрасывает удалённое. Метки живут час, ровно как в приложении.

   3. После изменения данных отправляется событие vdgo_data_changed: экран
      «Истории обзвона» перечитывает список и обновляется, и запускается
      отправка данных в Firebase.
   ============================================================================= */
(function () {
  'use strict';

  var KEY = 'vdgo_dispatcher';
  var DELETED_KEY = 'vdgo_dispatcher_deleted';
  var TOMBSTONE_KEY = 'vdgo_deleted_ids';
  var TOMBSTONE_TTL = 60 * 60 * 1000; // час — как в приложении

  function readArray(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /* Приложение хранит записи либо массивом, либо объектом из массивов —
     повторяем его же нормализацию, чтобы не потерять данные. */
  function readRecords() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        var flat = [];
        Object.keys(parsed).forEach(function (key) {
          if (Array.isArray(parsed[key])) flat = flat.concat(parsed[key]);
        });
        return flat;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  function pruneTombstones(list) {
    var limit = Date.now() - TOMBSTONE_TTL;
    return list.filter(function (item) {
      return (item.deletedAt || 0) > limit;
    });
  }

  function formatDate(date) {
    try {
      return new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return date;
    }
  }

  function pushToCloud() {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    setTimeout(function () {
      try {
        var sync = JSON.parse(localStorage.getItem('vdgo_firebase_sync') || '{}');
        if (sync && typeof sync.pushData === 'function') sync.pushData();
      } catch (e) {
        /* отправка произойдёт при следующем действии в приложении */
      }
    }, 100);
  }

  /* Метки удаления: без них запись вернётся с другого устройства при слиянии.
     Приложение держит такие метки час — повторяем его же срок. */
  function addTombstones(ids) {
    var now = Date.now();
    var marks = ids.map(function (id) {
      return { id: String(id), deletedAt: now };
    });
    ['vdgo_deleted_ids'].forEach(function (key) {
      localStorage.setItem(key, JSON.stringify(pruneTombstones(readArray(key).concat(marks))));
    });
  }

  function removeDay(date) {
    var records = readRecords();
    var dayRecords = records.filter(function (record) {
      return record.date === date;
    });

    if (!dayRecords.length) {
      alert('За ' + formatDate(date) + ' записей нет.');
      return;
    }

    var count = dayRecords.length;
    var question =
      'Удалить все записи за ' + formatDate(date) + '?\n\n' +
      'Будет удалено записей: ' + count + '. Действие нельзя отменить.';
    if (!confirm(question)) return;

    var now = Date.now();
    var removedIds = dayRecords.map(function (record) {
      return String(record.id);
    });

    // 1. Убираем записи этого дня, остальные оставляем как были.
    var rest = records.filter(function (record) {
      return record.date !== date;
    });
    localStorage.setItem(KEY, JSON.stringify(rest));

    // 2. Метки удаления: чтобы записи не вернулись с другого устройства.
    var marks = removedIds.map(function (id) {
      return { id: id, deletedAt: now };
    });
    localStorage.setItem(DELETED_KEY, JSON.stringify(pruneTombstones(readArray(DELETED_KEY).concat(marks))));
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(pruneTombstones(readArray(TOMBSTONE_KEY).concat(marks))));

    // 3. Сообщаем приложению: обновить экран и отправить данные.
    pushToCloud();
  }

  window.__vdgoDeleteDispatcherDay = removeDay;

  /* ---------------------------------------------------------------------------
     Кассы: добавление и удаление.
     -----------------------------------------------------------------------------
     Приложение умеет только менять статус и закреплять слесаря — обновление
     существующей записи по id. Поэтому обновляющая функция в собранном коде
     дополнена правкой: если id не найден — запись добавляется, а флаг
     __delete убирает её из списка. Так добавление и удаление проходят тем же
     путём, что и обычное изменение: состояние, localStorage и отправка данных.
     Эти функции лишь собирают данные и подтверждают действие.
     ------------------------------------------------------------------------ */
  var CASH_KEY = 'vdgo_cash_registers_v1';
  var CASH_TITLE = 'Касса ККТ "aQsi-5Ф"';
  var CASH_STATUSES = ['В работе', 'В ремонте', 'Списана'];

  function readCash() {
    try {
      var raw = localStorage.getItem(CASH_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function nextCashId(list) {
    return list.reduce(function (max, item) {
      var id = Number(item && item.id);
      return Number.isFinite(id) && id > max ? id : max;
    }, 0) + 1;
  }

  /** Форма «Новая касса». update — обновляющая функция приложения, workers — слесари. */
  window.__vdgoCashForm = function (update, workers) {
    if (typeof update !== 'function') return;
    if (typeof window.__macForm !== 'function') return;

    var workerOptions = [{ value: '', label: 'Не назначен' }].concat(
      (workers || []).map(function (worker) {
        return { value: worker.id, label: worker.name };
      })
    );

    window.__macForm({
      title: 'Новая касса',
      text: 'Заполните данные — касса появится в списке и уйдёт на другие устройства при синхронизации.',
      submitLabel: 'Добавить',
      fields: [
        { name: 'code', label: '№ кассы', value: '', required: true, placeholder: 'БП-00028466' },
        { name: 'name', label: 'Наименование', value: CASH_TITLE },
        { name: 'inv', label: 'Инвентарный №', value: '', placeholder: 'БП-00004111' },
        {
          name: 'status',
          label: 'Статус',
          type: 'select',
          value: 'В работе',
          options: CASH_STATUSES.map(function (status) {
            return { value: status, label: status };
          })
        },
        { name: 'workerId', label: 'Закрепить за слесарем', type: 'select', value: '', options: workerOptions }
      ],
      validate: function (values) {
        var code = (values.code || '').trim();
        if (!code) return 'Укажите номер кассы.';
        var duplicate = readCash().some(function (item) {
          return String(item.code || '').trim().toLowerCase() === code.toLowerCase();
        });
        if (duplicate) return 'Касса с таким номером уже есть в списке.';
        return null;
      },
      onSubmit: function (values) {
        var list = readCash();
        update(nextCashId(list), {
          code: (values.code || '').trim(),
          name: (values.name || '').trim() || CASH_TITLE,
          inv: (values.inv || '').trim(),
          status: CASH_STATUSES.indexOf(values.status) >= 0 ? values.status : 'В работе',
          workerId: values.workerId || null
        });
      }
    });
  };

  /** Удаление кассы из списка: register — запись, update — функция приложения. */
  window.__vdgoCashDelete = function (update, register) {
    if (typeof update !== 'function' || !register) return;

    var question =
      'Удалить кассу ' + register.code + ' из списка?\n\n' +
      (register.workerId ? 'Она закреплена за слесарем — закрепление снимется.\n\n' : '') +
      'Действие нельзя отменить.';
    if (!confirm(question)) return;

    addTombstones([register.id]);
    update(register.id, { __delete: true });
  };

  /** Изменение кассы: те же поля, что при добавлении, но заполнены текущими. */
  window.__vdgoCashEdit = function (update, register, workers) {
    if (typeof update !== 'function' || !register) return;
    if (typeof window.__macForm !== 'function') return;

    var workerOptions = [{ value: '', label: 'Не назначен' }].concat(
      (workers || []).map(function (worker) {
        return { value: worker.id, label: worker.name };
      })
    );

    window.__macForm({
      title: 'Изменить кассу',
      text: 'Правки применяются сразу и уходят на другие устройства при синхронизации.',
      submitLabel: 'Сохранить',
      fields: [
        { name: 'code', label: '№ кассы', value: register.code || '', placeholder: 'БП-00028466' },
        { name: 'name', label: 'Наименование', value: register.name || CASH_TITLE },
        { name: 'inv', label: 'Инвентарный №', value: register.inv || '', placeholder: 'БП-00004111' },
        {
          name: 'status',
          label: 'Статус',
          type: 'select',
          value: register.status || 'В работе',
          options: CASH_STATUSES.map(function (status) {
            return { value: status, label: status };
          })
        },
        {
          name: 'workerId',
          label: 'Закрепить за слесарем',
          type: 'select',
          value: register.workerId == null ? '' : String(register.workerId),
          options: workerOptions
        }
      ],
      validate: function (values) {
        var code = (values.code || '').trim();
        if (!code) return 'Укажите номер кассы.';
        var duplicate = readCash().some(function (item) {
          return (
            String(item.id) !== String(register.id) &&
            String(item.code || '').trim().toLowerCase() === code.toLowerCase()
          );
        });
        if (duplicate) return 'Другая касса уже с таким номером.';
        return null;
      },
      onSubmit: function (values) {
        update(register.id, {
          code: (values.code || '').trim(),
          name: (values.name || '').trim() || CASH_TITLE,
          inv: (values.inv || '').trim(),
          status: CASH_STATUSES.indexOf(values.status) >= 0 ? values.status : 'В работе',
          workerId: values.workerId || null
        });
      }
    });
  };

  /* ---------------------------------------------------------------------------
     KPI планшет: перенос старых записей на помесячные ключи.
     -----------------------------------------------------------------------------
     Раньше ячейка планшета хранилась под ключом «слесарь_день», без месяца,
     поэтому сентябрь и октябрь показывали одни и те же числа. Теперь в ключе
     есть год и месяц: «слесарь_2026-9-5». Старые записи относим к текущему
     месяцу — именно за него их и заполняли. Перенос идёт до запуска
     приложения (macos-actions.js подключён раньше бандла) и только один раз:
     после него ключей без месяца не остаётся.
     ------------------------------------------------------------------------ */
  var KPI_DRAFT_KEY = 'vdgo_kpiSession';
  var KPI_CASES_KEY = 'vdgo_kpiCases';

  function migrateKpiMonths() {
    var changed = false;
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;

    try {
      var raw = localStorage.getItem(KPI_DRAFT_KEY);
      if (raw) {
        var draft = JSON.parse(raw);
        if (draft && typeof draft === 'object') {
          var next = {};
          Object.keys(draft).forEach(function (key) {
            var bare = /^([^_]+)_(\d{1,2})$/.exec(key);
            var target = bare ? bare[1] + '_' + year + '-' + month + '-' + parseInt(bare[2], 10) : key;
            if (target !== key) changed = true;
            next[target] = draft[key];
          });
          if (changed) localStorage.setItem(KPI_DRAFT_KEY, JSON.stringify(next));
        }
      }
    } catch (e) {
      /* испорченные данные не трогаем */
    }

    try {
      var casesRaw = localStorage.getItem(KPI_CASES_KEY);
      if (casesRaw) {
        var cases = JSON.parse(casesRaw);
        if (Array.isArray(cases)) {
          var touched = false;
          cases.forEach(function (item) {
            if (!item || !Array.isArray(item.entries) || !item.month || !item.year) return;
            item.entries.forEach(function (entry) {
              if (entry && /^\d{1,2}$/.test(String(entry.day))) {
                entry.day = item.year + '-' + item.month + '-' + parseInt(entry.day, 10);
                touched = true;
              }
            });
          });
          if (touched) {
            localStorage.setItem(KPI_CASES_KEY, JSON.stringify(cases));
            changed = true;
          }
        }
      }
    } catch (e) {
      /* испорченные данные не трогаем */
    }

    // Дежурства: месяц в записи появился позже, а первая версия правки писала
    // в него чужие данные (массив вместо числа) — такие записи планшет не
    // показывал. Приводим их к текущему месяцу и убираем задвоенные: по одному
    // слесарю и типу дня в месяц остаётся самая свежая запись.
    try {
      var dutiesRaw = localStorage.getItem('vdgo_duties');
      if (dutiesRaw) {
        var duties = JSON.parse(dutiesRaw);
        if (Array.isArray(duties)) {
          var touchedDuties = false;
          duties.forEach(function (item) {
            if (!item) return;
            if (typeof item.month !== 'number' || typeof item.year !== 'number') {
              item.month = month;
              item.year = year;
              touchedDuties = true;
            }
          });
          var seen = {};
          var cleaned = [];
          duties
            .slice()
            .sort(function (a, b) {
              return (b.updatedAt || 0) - (a.updatedAt || 0);
            })
            .forEach(function (item) {
              var key = [item.workerId, item.month, item.year, item.dayType].join('|');
              if (seen[key]) {
                touchedDuties = true;
                return;
              }
              seen[key] = 1;
              cleaned.push(item);
            });
          if (touchedDuties) {
            localStorage.setItem('vdgo_duties', JSON.stringify(cleaned));
            changed = true;
          }
        }
      }
    } catch (e) {
      /* испорченные данные не трогаем */
    }

    if (changed) window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
  }

  /* ---------------------------------------------------------------------------
     Выгрузка для табеля: таблица «фамилия + дни» для ручного копирования
     -----------------------------------------------------------------------------
     Где в планшете стоит число (выполненные адреса) — в выгрузке «Я»; где код
     (В, Б, ДО, ОТ, У) — этот код. Два листа: дни 1–15 и 15–30, столбцы дней
     идут подряд, как D…R (и D…S во второй половине) в форме табеля.

     Файл собирается прямо в браузере: это обычный xlsx (zip без сжатия), без
     внешних библиотек — так выгрузка не зависит от того, что есть в приложении.
     ------------------------------------------------------------------------ */
  var KPI_MAP_KEY = 'vdgo_kpiSession';

  function kpiMarks(month, year) {
    var map = {};
    try {
      map = JSON.parse(localStorage.getItem(KPI_MAP_KEY) || '{}') || {};
    } catch (e) {
      map = {};
    }
    var suffix = '_' + year + '-' + month + '-';
    var out = {};
    Object.keys(map).forEach(function (key) {
      var cut = key.indexOf(suffix);
      if (cut < 0) return;
      var worker = key.slice(0, cut);
      var day = parseInt(key.slice(cut + suffix.length), 10);
      if (!day) return;
      var value = String((map[key] || {}).value == null ? '' : (map[key] || {}).value).trim();
      if (!value) return;
      out[worker] = out[worker] || {};
      out[worker][day] = /^\d+([.,]\d+)?$/.test(value) ? 'Я' : value.toUpperCase();
    });
    return out;
  }

  var CRC_TABLE = null;
  function crc32(bytes) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Int32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        CRC_TABLE[n] = c;
      }
    }
    var crc = -1;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
    return (crc ^ -1) >>> 0;
  }

  function utf8(text) {
    return new TextEncoder().encode(text);
  }

  function zipStored(files) {
    var chunks = [];
    var central = [];
    var offset = 0;
    files.forEach(function (file) {
      var name = utf8(file.name);
      var data = utf8(file.text);
      var crc = crc32(data);
      var local = new Uint8Array(30);
      var view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(8, 0, true); // без сжатия
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, name.length, true);
      chunks.push(local, name, data);
      central.push({ name: name, crc: crc, size: data.length, offset: offset });
      offset += local.length + name.length + data.length;
    });
    var centralStart = offset;
    central.forEach(function (item) {
      var head = new Uint8Array(46);
      var view = new DataView(head.buffer);
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(10, 0, true);
      view.setUint32(16, item.crc, true);
      view.setUint32(20, item.size, true);
      view.setUint32(24, item.size, true);
      view.setUint16(28, item.name.length, true);
      view.setUint32(42, item.offset, true);
      chunks.push(head, item.name);
      offset += head.length + item.name.length;
    });
    var end = new Uint8Array(22);
    var endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, central.length, true);
    endView.setUint16(10, central.length, true);
    endView.setUint32(12, offset - centralStart, true);
    endView.setUint32(16, centralStart, true);
    chunks.push(end);
    return new Blob(chunks, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function columnName(index) {
    var name = '';
    while (index > 0) {
      var rest = (index - 1) % 26;
      name = String.fromCharCode(65 + rest) + name;
      index = Math.floor((index - 1) / 26);
    }
    return name;
  }

  function xmlEscape(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function sheetXml(grid) {
    var rows = grid
      .map(function (row, rowIndex) {
        var cells = row
          .map(function (cell, colIndex) {
            var value = cell;
            var style = 0;
            if (cell && typeof cell === 'object' && !Array.isArray(cell) === false) {
              value = cell[0];
              style = cell[1] || 0;
            } else if (cell && typeof cell === 'object') {
              value = cell.v;
              style = cell.s || 0;
            }
            var ref = columnName(colIndex + 1) + (rowIndex + 1);
            var s = style ? ' s="' + style + '"' : '';
            if (value === '' || value === null || value === undefined) return '<c r="' + ref + '"' + s + '/>';
            if (typeof value === 'number') return '<c r="' + ref + '"' + s + '><v>' + value + '</v></c>';
            return '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t>' + xmlEscape(value) + '</t></is></c>';
          })
          .join('');
        return '<row r="' + (rowIndex + 1) + '">' + cells + '</row>';
      })
      .join('');
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetData>' + rows + '</sheetData></worksheet>'
    );
  }

  /* Стили: две заливки — синяя (дни 1–15) и красная (дни 16–31/30), текст
     белый, чтобы читался на заливке. Индекс 1 — синяя, 2 — красная. */
  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="4"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF003366"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFF0000"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function buildSheetsXlsx(sheets) {
    var files = [
      {
        name: '[Content_Types].xml',
        text:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          sheets
            .map(function (sheet, i) {
              return (
                '<Override PartName="/xl/worksheets/sheet' + (i + 1) +
                '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
              );
            })
            .join('') +
          '</Types>'
      },
      {
        name: '_rels/.rels',
        text:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>'
      },
      { name: 'xl/styles.xml', text: STYLES_XML },
      {
        name: 'xl/workbook.xml',
        text:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
          sheets
            .map(function (sheet, i) {
              return (
                '<sheet name="' + xmlEscape(sheet.name) + '" sheetId="' + (i + 1) +
                '" r:id="rId' + (i + 1) + '"/>'
              );
            })
            .join('') +
          '</sheets></workbook>'
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        text:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          sheets
            .map(function (sheet, i) {
              return (
                '<Relationship Id="rId' + (i + 1) +
                '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
                'Target="worksheets/sheet' + (i + 1) + '.xml"/>'
              );
            })
            .join('') +
          '<Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          '</Relationships>'
      }
    ];
    sheets.forEach(function (sheet, i) {
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXml(sheet.grid) });
    });
    return zipStored(files);
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /* Табельные номера слесарей — взяты из присланных файлов табеля.
     У кого номера нет, оставляем пусто: впишете сами. */
  var TABEL_NUMBERS = {
    бастеев: 'ГВ00-10989',
    белолипецкий: 'ГВ00-10990',
    белоусов: 'ГВ00-10991',
    бочкарев: 'ГВ00-10992',
    ершов: 'ГВ00-10994',
    китаев: 'ГВ00-10996',
    клопов: 'ГВ00-10997',
    кувакин: 'ГВ00-10998',
    липчанский: 'ГВ00-10999',
    лукьяненко: 'ГВ00-11044',
    нерозников: 'ГВ00-11000',
    овчинников: 'ГВ00-11001',
    романенко: 'ГВ00-11002',
    севастьянов: 'ГВ00-11003',
    соловьев: 'ГВ00-11004',
    тюрин: 'ГВ00-11006',
    усов: 'ГВ00-11007',
    шибанов: 'ГВ00-11008'
  };

  function tabelNumber(name) {
    var key = String(name || '').trim().toLowerCase().replace(/ё/g, 'е').split(' ')[0];
    return TABEL_NUMBERS[key] || '';
  }

  function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  /* ---------------------------------------------------------------------------
     Часы для табеля
     -----------------------------------------------------------------------------
     Слесарям ставим 8 часов. У мастеров и техников другой график: обычный день
     8,2 часа, а пятница — 7,2 часа. Липчанский Сергей Викторович остаётся
     слесарем (8 ч), поэтому Андрея Сергеевича опознаём по полному имени.
     ------------------------------------------------------------------------ */
  var SPECIAL_HOURS = {
    'муленков': 1,
    'липчанский андрей': 1,
    'пузикова': 1,
    'широкова': 1
  };

  function isSpecialHours(name) {
    var key = String(name || '').trim().toLowerCase().replace(/ё/g, 'е');
    if (SPECIAL_HOURS[key]) return true;
    var words = key.split(' ');
    if (SPECIAL_HOURS[words[0]]) return true;
    // Липчанский Андрей Сергеевич — мастер, а Липчанский Сергей Викторович —
    // слесарь, поэтому проверяем и первые два слова, а не только фамилию.
    if (words.length > 1 && SPECIAL_HOURS[words[0] + ' ' + words[1]]) return true;
    return false;
  }

  function hoursFor(name, month, year, day) {
    if (!isSpecialHours(name)) return 8;
    var weekday = new Date(year, month - 1, day).getDay();
    return weekday === 5 ? 7.2 : 8.2; // пятница — короткий день
  }

  /** Кнопка «Табель» в KPI планшете: month, year и список слесарей.
      На каждого слесаря — четыре строки: коды и часы первой половины (синие),
      затем коды и часы второй половины (красные), как в образце. */
  function buildCompactTabel(month, year, workers) {
    var marks = kpiMarks(month, year);
    var last = daysInMonth(month, year);
    var first = [];
    var second = [];
    for (var day = 1; day <= 15; day++) first.push(day);
    for (var day2 = 16; day2 <= last; day2++) second.push(day2);

    var grid = [];
    (workers || []).forEach(function (worker, index) {
      var table = marks[worker.id] || {};
      var firstCodes = [];
      var firstHours = [];
      var secondCodes = [];
      var secondHours = [];
      var workedFirst = 0;
      var workedSecond = 0;

      first.forEach(function (day) {
        var mark = table[day] || '';
        firstCodes.push([mark, 1]);
        firstHours.push([mark === 'Я' ? 8 : '', 1]);
        if (mark === 'Я') workedFirst++;
      });
      second.forEach(function (day) {
        var mark = table[day] || '';
        secondCodes.push([mark, 2]);
        secondHours.push([mark === 'Я' ? 8 : '', 2]);
        if (mark === 'Я') workedSecond++;
      });

      var head = [index + 1, worker.name, tabelNumber(worker.name)];
      var headFirst = [head[0], head[1], head[2]].map(function (v) {
        return [v, 1];
      });
      var headSecond = [head[0], head[1], head[2]].map(function (v) {
        return [v, 2];
      });

      grid.push(headFirst.concat(firstCodes, [[workedFirst, 1]]));
      grid.push([['', 1], ['', 1], ['', 1]].concat(firstHours, [[workedFirst * 8, 1]]));
      grid.push(headSecond.concat(secondCodes, [[workedSecond, 2]]));
      grid.push([['', 2], ['', 2], ['', 2]].concat(secondHours, [[workedSecond * 8, 2]]));
    });

    // Заголовок: дни в столбцах, чтобы было видно, где какая половина.
    var header = [['№', 0], ['Фамилия', 0], ['Табельный', 0]];
    first.forEach(function (day) {
      header.push([day, 1]);
    });
    header.push(['Дней', 0]);
    var header2 = [['', 0], ['', 0], ['', 0]];
    second.forEach(function (day) {
      header2.push([day, 2]);
    });
    header2.push(['Дней', 0]);

    download(
      buildSheetsXlsx([{ name: 'Табель по планшету', grid: [header, header2].concat(grid) }]),
      'Табель из планшета ' + month + '.' + year + '.xlsx'
    );

    var filledDays = 0;
    (workers || []).forEach(function (worker) {
      var table = marks[worker.id] || {};
      Object.keys(table).forEach(function () {
        filledDays++;
      });
    });
    alert(
      'Выгрузка для табеля сформирована.\n\n' +
        'Слесарей: ' + (workers || []).length + ', отметок: ' + filledDays + '.\n' +
        'Файл: «Табель из планшета ' + month + '.' + year + '.xlsx».\n' +
        'Синие столбцы — дни 1–15, красные — 16–' + last + '.\n\n' +
        'Если файла нет в загрузках — браузер блокирует скачивание, разрешите его для этого сайта.'
    );
  };

  /* ---------------------------------------------------------------------------
     Заполнение ВАШЕГО файла табеля (тот, где уже есть формулы)
     -----------------------------------------------------------------------------
     Правится только XML листа внутри архива xlsx: коды и часы вписываются в дни,
     всё остальное — формулы, оформление, объединённые ячейки, синяя и красная
     заливки — переносится байт в байт. Исходный файл не изменяется: результат
     скачивается отдельным файлом.

     Разметка строк на работника (шаблон «Табель.xls»):
       строка N   — коды дней 1–15 (столбцы D…R), синяя;
       строка N+1 — часы за эти дни;
       строка N+2 — коды дней 16–31 (столбцы D…S), красная;
       строка N+3 — часы за эти дни.
     Работник опознаётся по табельному номеру в столбце C.
     ------------------------------------------------------------------------ */
  var reversedNumbers = null;

  /* Раскодировать XML-сущности: числовые коды вида &#1059; Excel тоже пишет. */
  function decodeXml(text) {
    return String(text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (whole, entity) {
      if (entity[0] === '#') {
        var code =
          entity[1] === 'x' || entity[1] === 'X'
            ? parseInt(entity.slice(2), 16)
            : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&', nbsp: '\u00a0' }[entity] || whole;
    });
  }

  function surnameByTabel(number) {
    if (!reversedNumbers) {
      reversedNumbers = {};
      Object.keys(TABEL_NUMBERS).forEach(function (surname) {
        reversedNumbers[TABEL_NUMBERS[surname]] = surname;
      });
    }
    return reversedNumbers[number] || null;
  }

  function readZipEntries(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var eocd = -1;
    for (var i = bytes.length - 22; i >= 0 && i > bytes.length - 70000; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('файл не похож на xlsx');
    var count = view.getUint16(eocd + 10, true);
    var p = view.getUint32(eocd + 16, true);
    var entries = [];
    for (var n = 0; n < count; n++) {
      var method = view.getUint16(p + 10, true);
      var compSize = view.getUint32(p + 20, true);
      var nameLen = view.getUint16(p + 28, true);
      var extraLen = view.getUint16(p + 30, true);
      var commentLen = view.getUint16(p + 32, true);
      var localAt = view.getUint32(p + 42, true);
      var name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
      var localNameLen = view.getUint16(localAt + 26, true);
      var localExtraLen = view.getUint16(localAt + 28, true);
      var dataStart = localAt + 30 + localNameLen + localExtraLen;
      entries.push({
        name: name,
        method: method,
        raw: bytes.subarray(dataStart, dataStart + compSize),
        crc: view.getUint32(p + 16, true),
        size: view.getUint32(p + 24, true)
      });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  async function inflateEntry(entry) {
    if (entry.method !== 8) return entry.raw;
    if (typeof DecompressionStream !== 'function') {
      throw new Error('браузер не поддерживает распаковку — обновите его');
    }
    var stream = new Blob([entry.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function sharedStringsOf(entry) {
    if (!entry) return [];
    var text = new TextDecoder().decode(entry);
    return (text.match(/<si>[\s\S]*?<\/si>/g) || []).map(function (si) {
      return (si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || [])
        .map(function (t) {
          return t.replace(/<[^>]+>/g, '');
        })
        .join('')
        .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (whole, entity) {
          if (entity[0] === '#') {
            var code =
              entity[1] === 'x' || entity[1] === 'X'
                ? parseInt(entity.slice(2), 16)
                : parseInt(entity.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
          }
          return { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[entity] || whole;
        });
    });
  }

  async function fillTemplate(file, month, year, workers) {
    var bytes = new Uint8Array(await file.arrayBuffer());
    var entries = readZipEntries(bytes);
    var sheetEntry = null;
    var sharedEntry = null;
    entries.forEach(function (entry) {
      if (/^xl\/worksheets\/sheet1\.xml$/.test(entry.name)) sheetEntry = entry;
      if (/^xl\/sharedStrings\.xml$/.test(entry.name)) sharedEntry = entry;
    });
    if (!sheetEntry) throw new Error('в файле не найден лист');

    var sheetBytes = await inflateEntry(sheetEntry);
    var shared = sharedStringsOf(sharedEntry ? await inflateEntry(sharedEntry) : null);
    var xml = new TextDecoder().decode(sheetBytes);

    var marks = kpiMarks(month, year);
    var byName = {};
    (workers || []).forEach(function (worker) {
      byName[String(worker.name).trim().toLowerCase().replace(/ё/g, 'е')] = worker;
    });

    var cellOf = function (col, row) {
      return new RegExp('<c r="' + col + row + '"([^>]*?)(?:/>|>[\\s\\S]*?</c>)').exec(xml);
    };
    var readCell = function (col, row) {
      var m = cellOf(col, row);
      if (!m) return null;
      // Строка может лежать и в общих строках, и прямо в ячейке (inlineStr) —
      // Excel пишет первым способом, openpyxl вторым.
      var inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(m[0]);
      if (/t="(inlineStr|str)"/.test(m[1]) && inline) return decodeXml(inline[1]);
      var v = /<v>([\s\S]*?)<\/v>/.exec(m[0]);
      if (!v) return null;
      var raw = v[1];
      if (/t="s"/.test(m[1])) return shared[Number(raw)] || null;
      return decodeXml(raw);
    };
    var writeCell = function (col, row, value) {
      var ref = col + row;
      var m = cellOf(col, row);
      var style = m ? (/s="(\d+)"/.exec(m[1]) || [])[1] : null;
      var s = style ? ' s="' + style + '"' : '';
      var cell;
      if (value === '' || value === null || value === undefined) cell = '<c r="' + ref + '"' + s + '/>';
      else if (typeof value === 'number') cell = '<c r="' + ref + '"' + s + '><v>' + value + '</v></c>';
      else cell = '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t>' + xmlEscape(value) + '</t></is></c>';
      if (m) {
        xml = xml.slice(0, m.index) + cell + xml.slice(m.index + m[0].length);
        return;
      }
      var rowRe = new RegExp('(<row[^>]*r="' + row + '"[^>]*>)([\\s\\S]*?)(</row>)');
      var rm = rowRe.exec(xml);
      if (rm) {
        var at = rm.index + rm[1].length + rm[2].length;
        xml = xml.slice(0, at) + cell + xml.slice(at);
      }
    };

    // Формула (нужна для итогов и блока «Неявки по причинам»). Вместе с формулой
    // пишем и посчитанное значение: Excel покажет число сразу, а формула
    // пересчитает его при любом изменении дней.
    var writeFormula = function (col, row, formula, value) {
      var ref = col + row;
      var m = cellOf(col, row);
      var style = m ? (/s="(\d+)"/.exec(m[1]) || [])[1] : null;
      var s = style ? ' s="' + style + '"' : '';
      var cached = value === undefined || value === null ? 0 : value;
      var cell = '<c r="' + ref + '"' + s + '><f>' + xmlEscape(formula) + '</f><v>' + cached + '</v></c>';
      if (m) {
        xml = xml.slice(0, m.index) + cell + xml.slice(m.index + m[0].length);
        return;
      }
      var rowRe = new RegExp('(<row[^>]*r="' + row + '"[^>]*>)([\\s\\S]*?)(</row>)');
      var rm = rowRe.exec(xml);
      if (rm) {
        var at = rm.index + rm[1].length + rm[2].length;
        xml = xml.slice(0, at) + cell + xml.slice(at);
      }
    };

    var firstColumns = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];
    var secondColumns = firstColumns.concat(['S']);
    var last = daysInMonth(month, year);
    var filled = 0;

    var rows = (xml.match(/<row[^>]*r="(\d+)"/g) || []).map(function (rowTag) {
      return Number(/r="(\d+)"/.exec(rowTag)[1]);
    });
    rows.forEach(function (row) {
      var tabel = readCell('C', row);
      if (!tabel || !/^[А-ЯA-Z]{2}\d{2}-\d{5}$/.test(String(tabel))) return;

      // Работника опознаём по фамилии из самого табеля (столбец B) — так не
      // нужен список табельных номеров и работают любые слесари. Номер —
      // запасной путь на случай, если фамилия написана иначе.
      var fio = readCell('B', row);
      var surnameFromSheet = fio
        ? String(fio).trim().toLowerCase().replace(/ё/g, 'е').split(' ')[0]
        : '';
      var worker = byName[surnameFromSheet] || null;
      if (!worker) {
        var surname = surnameByTabel(String(tabel));
        worker = surname ? byName[surname] : null;
      }
      if (!worker) return;
      var table = marks[worker.id] || {};
      filled++;

      // Сначала очищаем дни и часы блока: в шаблоне могли остаться данные
      // образца (например, часы 8 у мастера) — иначе они смешаются с новыми.
      for (var clearDay = 1; clearDay <= last; clearDay++) {
        var clearCol =
          clearDay <= 15 ? firstColumns[clearDay - 1] : secondColumns[clearDay - 16];
        if (!clearCol) continue;
        writeCell(clearCol, row, '');
        writeCell(clearCol, clearDay <= 15 ? row + 1 : row + 3, '');
      }

      firstColumns.forEach(function (col, index) {
        var day = index + 1;
        var mark = table[day] || '';
        writeCell(col, row, mark);
        writeCell(col, row + 1, mark === 'Я' ? hoursFor(worker.name, month, year, day) : '');
      });
      secondColumns.forEach(function (col, index) {
        var day = index + 16;
        if (day > last) return;
        var mark = table[day] || '';
        writeCell(col, row + 2, mark);
        writeCell(col, row + 3, mark === 'Я' ? hoursFor(worker.name, month, year, day) : '');
      });

      // Блок «Неявки по причинам».
      // Столбец AD — всегда «В» (выходной), количество считает формула в AE.
      // Все прочие коды (Б, ДО, ОТ, У, ПК, ОДК и любые другие) идут в AB,
      // а их количество — числом в AC.
      var weekends = 0;
      var otherReasons = {};
      for (var rday = 1; rday <= last; rday++) {
        var rmark = table[rday] || '';
        if (!rmark || rmark === 'Я') continue;
        if (rmark === 'В') weekends++;
        else otherReasons[rmark] = (otherReasons[rmark] || 0) + 1;
      }
      if (weekends) {
        writeCell('AD', row, 'В');
        writeFormula('AE', row, 'COUNTIF(D' + row + ':S' + (row + 3) + ',"В")');
      }
      var topCode = '';
      var topCount = 0;
      Object.keys(otherReasons).forEach(function (code) {
        if (otherReasons[code] > topCount) {
          topCount = otherReasons[code];
          topCode = code;
        }
      });
      if (topCode) {
        writeCell('AB', row, topCode);
        writeCell('AC', row, topCount);
      }

      // Итоги блока — те же формулы, что в образце, и сразу с посчитанными
      // числами, чтобы в табеле не было нулей до пересчёта Excel.
      var firstCodesRow = row;
      var firstHoursRow = row + 1;
      var secondCodesRow = row + 2;
      var secondHoursRow = row + 3;
      var daysFirst = 0;
      var hoursFirst = 0;
      var daysSecond = 0;
      var hoursSecond = 0;
      var weekendsAll = 0;
      firstColumns.forEach(function (col, index) {
        var mark = table[index + 1] || '';
        if (mark === 'Я') {
          daysFirst++;
          hoursFirst += hoursFor(worker.name, month, year, index + 1);
        }
        if (mark === 'В') weekendsAll++;
      });
      secondColumns.forEach(function (col, index) {
        var day = index + 16;
        if (day > last) return;
        var mark = table[day] || '';
        if (mark === 'Я') {
          daysSecond++;
          hoursSecond += hoursFor(worker.name, month, year, day);
        }
        if (mark === 'В') weekendsAll++;
      });
      writeFormula('T', firstCodesRow, 'COUNTIF(D' + firstCodesRow + ':R' + firstCodesRow + ',"Я")', daysFirst);
      writeFormula('T', firstHoursRow, 'SUMPRODUCT(D' + firstHoursRow + ':R' + firstHoursRow + ')', hoursFirst);
      writeFormula('T', secondCodesRow, 'COUNTIF(D' + secondCodesRow + ':R' + secondCodesRow + ',"Я")', daysSecond);
      writeFormula('T', secondHoursRow, 'SUMPRODUCT(D' + secondHoursRow + ':S' + secondHoursRow + ')', hoursSecond);
      writeFormula('U', firstCodesRow, 'T' + firstCodesRow + '+T' + secondCodesRow, daysFirst + daysSecond);
      writeFormula('U', secondCodesRow, 'T' + firstHoursRow + '+T' + secondHoursRow, hoursFirst + hoursSecond);
      writeFormula(
        'AE',
        firstCodesRow,
        'COUNTIF(D' + firstCodesRow + ':S' + secondHoursRow + ',"В")',
        weekendsAll
      );
    });

    if (!filled) return 0;

    var updated = await Promise.all(
      entries.map(async function (entry) {
        return {
          name: entry.name,
          // Лист — с правками, остальные части распаковываем и кладём как есть:
          // содержимое сохраняется полностью, меняется только способ упаковки.
          bytes: entry === sheetEntry ? utf8(xml) : await inflateEntry(entry)
        };
      })
    );
    download(zipEntries(updated), 'Табель заполнен ' + month + '.' + year + '.xlsx');
    return filled;
  }

  /* Архив: все части без сжатия — так содержимое переносится без изменений. */
  function zipEntries(parts) {
    var chunks = [];
    var central = [];
    var offset = 0;
    parts.forEach(function (part) {
      var name = utf8(part.name);
      var data = part.bytes;
      var crc = crc32(data);
      var local = new Uint8Array(30);
      var view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(8, 0, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, name.length, true);
      chunks.push(local, name, data);
      central.push({ name: name, crc: crc, size: data.length, offset: offset });
      offset += local.length + name.length + data.length;
    });
    var centralStart = offset;
    central.forEach(function (item) {
      var head = new Uint8Array(46);
      var view = new DataView(head.buffer);
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(10, 0, true);
      view.setUint32(16, item.crc, true);
      view.setUint32(20, item.size, true);
      view.setUint32(24, item.size, true);
      view.setUint16(28, item.name.length, true);
      view.setUint32(42, item.offset, true);
      chunks.push(head, item.name);
      offset += head.length + item.name.length;
    });
    var end = new Uint8Array(22);
    var endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, central.length, true);
    endView.setUint16(10, central.length, true);
    endView.setUint32(12, offset - centralStart, true);
    endView.setUint32(16, centralStart, true);
    chunks.push(end);
    return new Blob(chunks, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /* Шаблон табеля лежит в корне приложения (tabel-template.xlsx). Если он есть —
     кнопка «Табель» заполняет его сразу, без выбора файла. Если шаблона нет,
     как и раньше предложим выбрать свой файл. */
  async function bundledTemplate() {
    try {
      var response = await fetch('./tabel-template.xlsx', { cache: 'no-store' });
      if (!response.ok) return null;
      var blob = await response.blob();
      if (!blob || blob.size < 2000) return null;
      return {
        arrayBuffer: function () {
          return blob.arrayBuffer();
        }
      };
    } catch (e) {
      return null;
    }
  }

  function pickTimesheet() {
    return new Promise(function (resolve) {
      if (typeof window.showOpenFilePicker === 'function') {
        window
          .showOpenFilePicker({
            types: [
              {
                description: 'Табель (xlsx)',
                accept: {
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                }
              }
            ]
          })
          .then(function (handles) {
            return handles[0].getFile();
          })
          .then(resolve)
          .catch(function () {
            resolve(null); // отмена выбора
          });
        return;
      }
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx';
      input.onchange = function () {
        resolve(input.files && input.files[0] ? input.files[0] : null);
      };
      input.click();
      setTimeout(function () {
        resolve(null);
      }, 60000);
    });
  }

  /** Кнопка «Табель»: если выбран файл табеля — заполняем его, иначе строим таблицу. */
  window.__vdgoTabel = async function (month, year, workers) {
    var file = null;
    // Сначала пробуем шаблон из приложения — тогда табель скачивается сразу.
    try {
      file = await bundledTemplate();
    } catch (e) {
      file = null;
    }
    if (!file) {
      try {
        file = await pickTimesheet();
      } catch (e) {
        file = null;
      }
    }
    if (!file) {
      buildCompactTabel(month, year, workers);
      return;
    }
    try {
      var filled = await fillTemplate(file, month, year, workers);
      if (!filled) {
        alert(
          'В файле не найдено ни одного знакомого табельного номера.\n\n' +
            'Проверьте, что это тот самый табель и что в столбце C стоят номера вида ГВ00-10989.'
        );
        return;
      }
      alert(
        'Табель заполнен: строк слесарей — ' + filled + '.\n\n' +
          'Файл скачан: «Табель заполнен ' + month + '.' + year + '.xlsx».\n' +
          'Формулы в нём пересчитают дни и часы при открытии.\n' +
          'Исходный файл не изменялся.'
      );
    } catch (e) {
      alert('Не удалось заполнить файл: ' + (e && e.message ? e.message : e));
    }
  };

  /* ---------------------------------------------------------------------------
     Дашборд: справочник «Табельные номера»
     -----------------------------------------------------------------------------
     Блок живёт ВНЕ дерева React: свой слой на странице, который встаёт сразу под
     разделом «KPI планшет». Так React не может его затереть, а он не мешает
     React перерисовывать дашборд (вставка «своих» узлов внутрь чужих контейнеров
     ломает согласование и разделы перестают открываться).
     ------------------------------------------------------------------------ */
  var TABEL_NUMBERS_KEY = 'vdgo_tabel_numbers';
  var SLEEAR = 'Слесарь по эксплуатации и ремонту газового оборудования';
  /* Список из присланного файла «табельные номера.xlsx»: ФИО, номер, должность, разряд. */
  var DEFAULT_EMPLOYEES = [
    ['Липчанский Андрей Сергеевич', 'ГВ00-11009', 'Мастер', ''],
    ['Муленков Максим Денисович', 'ГВ00-11010', 'Мастер', ''],
    ['Пузикова Светлана Геннадьевна', 'ГВ00-10987', 'Техник', '2 категория'],
    ['Широкова Оксана Геннадьевна', 'ГВ00-10988', 'Техник', '2 категория'],
    ['Бастеев Юрий Геннадиевич', 'ГВ00-10989', SLEEAR, '4 разряд'],
    ['Белолипецкий Сергей Егорович', 'ГВ00-10990', SLEEAR, '4 разряд'],
    ['Белоусов Владимир Николаевич', 'ГВ00-10991', SLEEAR, '4 разряд'],
    ['Бочкарев Павел Александрович', 'ГВ00-10992', SLEEAR, '4 разряд'],
    ['Ершов Максим Сергеевич', 'ГВ00-10994', SLEEAR, '4 разряд'],
    ['Китаев Максим Николаевич', 'ГВ00-10996', SLEEAR, '4 разряд'],
    ['Клопов Игорь Геннадиевич', 'ГВ00-10997', SLEEAR, '4 разряд'],
    ['Кувакин Дмитрий Анатольевич', 'ГВ00-10998', SLEEAR, '4 разряд'],
    ['Липчанский Сергей Викторович', 'ГВ00-10999', SLEEAR, '4 разряд'],
    ['Лукьяненко Павел Александрович', 'ГВ00-11044', SLEEAR, '4 разряд'],
    ['Нерозников Игорь Александрович', 'ГВ00-11000', SLEEAR, '4 разряд'],
    ['Овчинников Дмитрий Геннадьевич', 'ГВ00-11001', SLEEAR, '4 разряд'],
    ['Романенко Юрий Михайлович', 'ГВ00-11002', SLEEAR, '5 разряд'],
    ['Севастьянов Владимир Александрович', 'ГВ00-11003', SLEEAR, '4 разряд'],
    ['Соловьев Павел Олегович', 'ГВ00-11004', SLEEAR, '4 разряд'],
    ['Тюрин Михаил Юрьевич', 'ГВ00-11006', SLEEAR, '4 разряд'],
    ['Усов Дмитрий Анатольевич', 'ГВ00-11007', SLEEAR, '4 разряд'],
    ['Анисимов Сергей Александрович', 'ГВ00-12075', SLEEAR, '4 разряд'],
    ['Бондаренко Максим Артемович', 'ГВ00-12424', SLEEAR, '4 разряд'],
    ['Шибанов Игорь Александрович', 'ГВ00-11008', SLEEAR, '4 разряд']
  ];

  function employees() {
    try {
      var raw = localStorage.getItem(TABEL_NUMBERS_KEY);
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) return list;
      }
    } catch (e) {
      /* повреждённые данные — покажем исходный список */
    }
    return DEFAULT_EMPLOYEES.map(function (row) {
      return { name: row[0], number: row[1], position: row[2], rank: row[3] };
    });
  }

  function saveEmployees(list) {
    try {
      localStorage.setItem(TABEL_NUMBERS_KEY, JSON.stringify(list));
    } catch (e) {
      /* места нет — не страшно */
    }
  }

  function tabelInput(value, placeholder, flex) {
    var input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = placeholder || '';
    input.style.cssText =
      'flex:' + flex + ';min-width:0;font:inherit;font-size:12px;padding:5px 8px;' +
      'border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);' +
      'color:var(--text-primary)';
    return input;
  }

  function tabelButton(text, title, onClick, danger) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.title = title;
    button.style.cssText =
      'flex:0 0 auto;height:28px;padding:0 9px;border-radius:8px;cursor:pointer;font-size:12px;' +
      'border:1px solid var(--border);background:var(--bg-secondary);color:' +
      (danger ? '#e5484d' : 'var(--text-primary)');
    button.addEventListener('click', onClick);
    return button;
  }

  function buildTabelPanel() {
    var panel = document.createElement('div');
    panel.id = 'mac-tabel-panel';
    panel.style.cssText =
      'margin:12px 0 16px;padding:12px;border-radius:14px;border:1px solid var(--border);' +
      'background:var(--bg-secondary);color:var(--text-primary)';

    var head = document.createElement('div');
    head.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px';
    var titleBox = document.createElement('div');
    titleBox.style.cssText = 'display:flex;align-items:center;gap:7px;min-width:0';
    var iconBox = document.createElement('span');
    iconBox.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;color:var(--accent)';
    iconBox.appendChild(tabelIcon(16));
    var title = document.createElement('div');
    title.textContent = 'Табельные номера';
    title.style.cssText = 'font-size:13px;font-weight:600;white-space:nowrap';
    titleBox.appendChild(iconBox);
    titleBox.appendChild(title);

    var rows = document.createElement('div');
    // Без ограничения высоты: список показывается целиком, прокрутка не нужна.
    rows.style.cssText = 'display:flex;flex-direction:column;gap:4px';

    function renderTabelRows() {
      rows.textContent = '';
      var list = employees();
      list.forEach(function (item, index) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px';

        var nameInput = tabelInput(item.name, 'ФИО', '1 1 34%');
        var numberInput = tabelInput(item.number, 'Табельный номер', '0 1 17%');
        var positionInput = tabelInput(item.position, 'Должность', '0 1 30%');
        var rankInput = tabelInput(item.rank, 'Разряд', '0 1 12%');
        row.appendChild(nameInput);
        row.appendChild(numberInput);
        row.appendChild(positionInput);
        row.appendChild(rankInput);

        function commit() {
          var current = employees();
          if (!current[index]) return;
          current[index] = {
            name: nameInput.value.trim(),
            number: numberInput.value.trim(),
            position: positionInput.value.trim(),
            rank: rankInput.value.trim()
          };
          saveEmployees(current);
        }
        [nameInput, numberInput, positionInput, rankInput].forEach(function (input) {
          input.addEventListener('change', commit);
          input.addEventListener('blur', commit);
        });

        row.appendChild(
          tabelButton('✕', 'Удалить сотрудника', function () {
            var current = employees();
            current.splice(index, 1);
            saveEmployees(current);
            renderTabelRows();
          }, true)
        );
        rows.appendChild(row);
      });
      if (!list.length) {
        var empty = document.createElement('div');
        empty.textContent = 'Список пуст — нажмите «Добавить».';
        empty.style.cssText = 'font-size:12px;color:var(--text-secondary)';
        rows.appendChild(empty);
      }
    }

    var addButton = tabelButton('+ Добавить', 'Добавить сотрудника', function () {
      var list = employees();
      list.push({ name: '', number: '', position: 'Слесарь ЭРГО' });
      saveEmployees(list);
      renderTabelRows();
    });

    head.appendChild(titleBox);
    head.appendChild(addButton);
    panel.appendChild(head);
    panel.appendChild(rows);
    renderTabelRows();
    return panel;
  }

  /* Иконка раздела — простой значок «табельный номер» (карточка с полосками). */
  function tabelIcon(size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size || 16));
    svg.setAttribute('height', String(size || 16));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.innerHTML =
      '<rect x="3" y="5" width="18" height="14" rx="3"/>' +
      '<circle cx="9" cy="11" r="2.2"/>' +
      '<path d="M5.5 16.5c.9-1.6 2.2-2.4 3.5-2.4s2.6.8 3.5 2.4"/>' +
      '<path d="M16 10h3M16 13h3"/>';
    return svg;
  }

  var tabelButtonEl = null;
  var tabelWindow = null;

  /* Кнопка раздела в дашборде: иконка и подпись, как у соседних разделов. */
  function buildTabelButton() {
    if (tabelButtonEl && document.body.contains(tabelButtonEl)) return tabelButtonEl;
    tabelButtonEl = document.createElement('button');
    tabelButtonEl.type = 'button';
    tabelButtonEl.id = 'mac-tabel-button';
    tabelButtonEl.style.cssText =
      'display:none;align-items:center;gap:8px;box-sizing:border-box;padding:10px 12px;' +
      'border-radius:14px;border:1px solid var(--border);background:var(--bg-secondary);' +
      'color:var(--text-primary);cursor:pointer;font:inherit;font-size:13px;font-weight:600;' +
      'text-align:left;width:100%';
    var icon = document.createElement('span');
    icon.style.cssText = 'display:inline-flex;align-items:center;color:var(--accent);flex:0 0 auto';
    icon.appendChild(tabelIcon(17));
    var label = document.createElement('span');
    label.textContent = 'Табельные номера';
    tabelButtonEl.appendChild(icon);
    tabelButtonEl.appendChild(label);
    tabelButtonEl.addEventListener('click', openTabelWindow);
    return tabelButtonEl;
  }

  function closeTabelWindow() {
    if (tabelWindow && tabelWindow.parentElement) tabelWindow.parentElement.removeChild(tabelWindow);
    tabelWindow = null;
  }

  /* Окно раздела: открывается по кнопке, содержит таблицу табельных номеров. */
  function openTabelWindow() {
    closeTabelWindow();
    var layer = document.createElement('div');
    layer.id = 'mac-tabel-window';
    layer.style.cssText =
      'position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.28)';
    layer.addEventListener('click', function (event) {
      if (event.target === layer) closeTabelWindow();
    });

    var box = document.createElement('div');
    box.style.cssText =
      'width:min(94vw,760px);max-height:84vh;overflow:auto;padding:14px;border-radius:16px;' +
      'border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);' +
      'box-shadow:0 24px 70px rgba(0,0,0,0.35)';

    var head = document.createElement('div');
    head.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px';
    var titleBox = document.createElement('div');
    titleBox.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0';
    var icon = document.createElement('span');
    icon.style.cssText = 'display:inline-flex;align-items:center;color:var(--accent)';
    icon.appendChild(tabelIcon(18));
    var title = document.createElement('div');
    title.textContent = 'Табельные номера';
    title.style.cssText = 'font-size:15px;font-weight:600;white-space:nowrap';
    titleBox.appendChild(icon);
    titleBox.appendChild(title);

    var close = tabelButton('✕', 'Закрыть', closeTabelWindow, false);
    head.appendChild(titleBox);
    head.appendChild(close);
    box.appendChild(head);
    box.appendChild(buildTabelPanel());
    layer.appendChild(box);
    document.body.appendChild(layer);
    tabelWindow = layer;
  }

  /* Ищем на дашборде карточку KPI: подпись может быть «KPI планшет»,
     «KPI-планшет», «Планшет KPI». Берём самый крупный видимый блок с «KPI». */
  function findKpiSection() {
    var nodes = document.querySelectorAll('#root *');
    var best = null;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.id === 'mac-tabel-button' || (el.closest && el.closest('#mac-tabel-button'))) continue;
      var text = (el.textContent || '').trim();
      if (!text || text.length > 120) continue;
      if (!/KPI/i.test(text)) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width < 150 || rect.height < 30) continue;
      var area = rect.width * rect.height;
      if (!best || area > best.area) best = { el: el, rect: rect, area: area };
    }
    return best;
  }

  /* Поднимаемся от карточки KPI до контейнера, где лежат карточки разделов
     (в нём несколько соседей). Так кнопка не окажется вложенной в KPI. */
  function dashboardContainer(card) {
    var node = card;
    for (var depth = 0; depth < 6 && node && node.parentElement; depth++) {
      node = node.parentElement;
      if (node === document.body) break;
      if (node.children && node.children.length >= 3) return node;
    }
    return null;
  }

  /* Кнопка встаёт в дашборд сразу после «KPI планшет». Узлы React не трогаем:
     свою кнопку добавляем последней, а место задаём через CSS order. */
  function mountTabelButton() {
    var found = findKpiSection();
    var button = buildTabelButton();
    if (!found) {
      button.style.display = 'none';
      return;
    }
    var container = dashboardContainer(found.el);
    if (!container) {
      button.style.display = 'none';
      return;
    }
    if (button.parentElement !== container) container.appendChild(button);
    button.style.display = 'inline-flex';

    var children = Array.prototype.slice.call(container.children);
    var kpiIndex = children.indexOf(found.el);
    if (kpiIndex < 0) kpiIndex = children.length - 1;
    button.style.order = String(kpiIndex + 1);
    for (var i = kpiIndex + 1; i < children.length; i++) {
      if (children[i] === button) continue;
      children[i].style.order = String(i + 1);
    }
  }

  /* ---------------------------------------------------------------------------
     Раздел «Табельные номера» в меню приложения
     -----------------------------------------------------------------------------
     Сам пункт меню добавляется правкой списка разделов (tools/nav-patches.mjs),
     поэтому нажатие переключает приложение на этот раздел. Экран раздела
     рисуем сами: React на незнакомый раздел ничего не выводит, и наш слой
     занимает область содержимого. Слой живёт вне дерева React, поэтому ничего
     не ломает — он только показывает и скрывает себя.
     ------------------------------------------------------------------------ */
  var tabelScreenEl = null;
  var tabelSectionLabels = [
    'Работа',
    'KPI планшет',
    'Прейскурант',
    'Нет дома',
    'Диспетчер',
    'Кассы',
    'Калькулятор',
    'Напоминания',
    'История кейсов',
    'История KPI',
    'История обзвона',
    'История НД',
    '1С коды',
    'Отписка наряда'
  ];

  function buildTabelScreen() {
    if (tabelScreenEl && document.body.contains(tabelScreenEl)) return tabelScreenEl;
    var screen = document.createElement('div');
    screen.id = 'mac-tabel-screen';
    // Обычный блок внутри области содержимого, а не слой поверх сайта:
    // меню и разметка приложения остаются нетронутыми.
    screen.style.cssText =
      'display:none;box-sizing:border-box;padding:14px 16px;' +
      'min-height:calc(100vh - 130px);' +
      'overflow:auto;background:var(--bg-primary);color:var(--text-primary)';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:9px;margin-bottom:12px';
    var icon = document.createElement('span');
    icon.style.cssText = 'display:inline-flex;align-items:center;color:var(--accent)';
    icon.appendChild(tabelIcon(20));
    var title = document.createElement('div');
    title.textContent = 'Табельные номера';
    title.style.cssText = 'font-size:16px;font-weight:600';
    head.appendChild(icon);
    head.appendChild(title);
    screen.appendChild(head);
    screen.appendChild(buildTabelPanel());
    document.body.appendChild(screen);
    tabelScreenEl = screen;
    return screen;
  }

  function contentHost() {
    // Основная область — самый широкий прямой потомок оболочки приложения.
    // Боковое меню заметно уже, поэтому под этот признак не попадает.
    var shell = document.querySelector('#root > div');
    if (!shell || !shell.children) return null;
    var best = null;
    Array.prototype.forEach.call(shell.children, function (child) {
      var rect = child.getBoundingClientRect();
      if (!best || rect.width > best.width) best = { el: child, width: rect.width };
    });
    return best ? best.el : null;
  }

  /* Свой экран добавляем в основную область и НИЧЕГО чужого не прячем:
     на незнакомый раздел приложение выводит пустую область, поэтому таблица
     ничего не ломает. При переходе в другой раздел просто скрываем её. */
  function showTabelScreen(show) {
    var host = contentHost();
    if (!host) return;
    var screen = buildTabelScreen();
    if (show) {
      if (screen.parentElement !== host) host.appendChild(screen);
      screen.style.display = 'block';
    } else {
      screen.style.display = 'none';
    }
  }

  function labelOf(button) {
    return String((button && button.textContent) || '').trim();
  }

  function isTabelLabel(text) {
    return text.indexOf('Табельные номера') === 0;
  }

  function isOtherSection(text) {
    if (!text || text.length > 30) return false;
    for (var i = 0; i < tabelSectionLabels.length; i++) {
      if (text.indexOf(tabelSectionLabels[i]) === 0) return true;
    }
    return false;
  }

  function watchTabelScreen() {
    if (!document.documentElement.getAttribute('data-mac-tabel-nav')) {
      document.documentElement.setAttribute('data-mac-tabel-nav', '1');
      // Только наблюдаем за кликами: ничего не перехватываем и не гасим.
      document.addEventListener(
        'click',
        function (event) {
          var button = event.target && event.target.closest ? event.target.closest('button') : null;
          if (!button) return;
          var text = labelOf(button);
          if (isTabelLabel(text)) showTabelScreen(true);
          else if (isOtherSection(text)) showTabelScreen(false);
        },
        true
      );
    }
    if (tabelScreenEl && tabelScreenEl.style.display === 'block') {
      showTabelScreen(true); // экран уже открыт — просто пересобираем его место
    }
  }

  /* Иконка настоящему пункту меню «Табельные номера». Значок добавляем внутрь
     кнопки последним/первым дочерним узлом — свои узлы React не трогает, чужие
     места не сдвигаются, поэтому вёрстка не ломается. */
  function decorateTabelNav() {
    var buttons = document.querySelectorAll('#root button');
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      if (String(button.textContent || '').trim() !== 'Табельные номера') continue;
      // Значок внутрь кнопки не добавляем: он сдвигал подпись и пункт вставал
      // не на один уровень с остальными. Иконку даёт сам механизм приложения.
      button.setAttribute('data-mac-tabel-nav', '1');
    }
  }

  /* ---------------------------------------------------------------------------
     KPI планшет: визуально отделяем мастеров и техников от слесарей
     -----------------------------------------------------------------------------
     Это только оформление: строки сдвигаются чуть ниже и получают разделитель с
     подписью. На данные и на табель не влияет никак — там всё считается по
     именам сотрудников, а не по расположению строк.
     ------------------------------------------------------------------------ */
  var SPECIAL_NAMES = ['муленков', 'липчанский андрей', 'пузикова', 'широкова'];

  /* Подписи и порядок: как просил заказчик — Липчанский А., Муленков М.,
     Широкова О., Пузикова С., и все четверо ниже слесарей. */
  var SPECIAL_LABELS = [
    { match: 'липчанский андрей', label: 'Липчанский А.', order: 1 },
    { match: 'муленков', label: 'Муленков М.', order: 2 },
    { match: 'широкова', label: 'Широкова О.', order: 3 },
    { match: 'пузикова', label: 'Пузикова С.', order: 4 }
  ];

  function specialLabel(text) {
    var key = String(text || '').trim().toLowerCase().replace(/ё/g, 'е');
    for (var i = 0; i < SPECIAL_LABELS.length; i++) {
      if (key === SPECIAL_LABELS[i].match || key.indexOf(SPECIAL_LABELS[i].match) === 0) {
        return SPECIAL_LABELS[i];
      }
    }
    return null;
  }

  function isSpecialName(text) {
    return !!specialLabel(text);
  }

  function markSpecialWorkers() {
    var nodes = document.querySelectorAll('#root span, #root div, #root td, #root p');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.children && node.children.length) continue;
      var text = String(node.textContent || '').trim();
      var info = specialLabel(text);
      if (!info) continue;

      // Короткая подпись вместо полного имени (React её вернёт — поправим снова).
      if (text !== info.label) node.textContent = info.label;

      // Поднимаемся до строки: это ближайший предок, который заметно шире подписи.
      var row = node;
      for (var depth = 0; depth < 4 && row.parentElement; depth++) {
        row = row.parentElement;
        if (row.getBoundingClientRect().width > 320) break;
      }
      if (!row || !row.setAttribute) continue;
      row.setAttribute('data-mac-special', '1');
      row.style.order = String(info.order); // четверо уходят вниз, после слесарей
    }
  }

  /* ---------------------------------------------------------------------------
     KPI планшет: короткие подписи мастеров и техников
     -----------------------------------------------------------------------------
     Как в образце: Липчанский А., Пузикова С., Широкова О., а Муленков — просто
     фамилией. Правим ТОЛЬКО текст внутри таблицы планшета, поэтому подписи в
     меню и карточка пользователя не затрагиваются. На табель это не влияет:
     там сотрудник ищется по фамилии и табельному номеру.
     ------------------------------------------------------------------------ */
  var TABLET_SHORT_NAMES = [
    { from: 'Муленков', to: 'Муленков М.' },
    { from: 'Липчанский Андрей', to: 'Липчанский А.' },
    { from: 'Пузикова', to: 'Пузикова С.' },
    { from: 'Широкова', to: 'Широкова О.' }
  ];

  function shortenTabletNames() {
    var cells = document.querySelectorAll('#root table td, #root table th, #root table span, #root table div');
    for (var i = 0; i < cells.length; i++) {
      var node = cells[i];
      if (node.children && node.children.length) continue;
      var text = String(node.textContent || '').trim();
      if (!text) continue;
      for (var k = 0; k < TABLET_SHORT_NAMES.length; k++) {
        if (text === TABLET_SHORT_NAMES[k].from || text === TABLET_SHORT_NAMES[k].to) {
          if (text !== TABLET_SHORT_NAMES[k].to) node.textContent = TABLET_SHORT_NAMES[k].to;
          break;
        }
      }
    }
  }

  /* ---------------------------------------------------------------------------
     KPI планшет: шапка «Мастера и Техники» и отступ от таблицы слесарей
     -----------------------------------------------------------------------------
     Помечаем ТОЛЬКО первую строку группы внутри таблицы планшета: ищем подписи
     сотрудников в строках таблицы и ставим атрибут на первую из них. Оформление
     (разделитель, отступ и надпись) задаёт тема. Ничего другого не трогаем —
     поэтому меню, дашборд и остальные экраны не затрагиваются.
     ------------------------------------------------------------------------ */
  function isGroupName(text) {
    for (var k = 0; k < TABLET_SHORT_NAMES.length; k++) {
      if (text === TABLET_SHORT_NAMES[k].to || text === TABLET_SHORT_NAMES[k].from) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------------------
     KPI планшет: настоящая строка-шапка «Мастера и Техники»
     -----------------------------------------------------------------------------
     Как в образце: перед группой вставляем отдельную строку таблицы с подписью
     «Мастера и Техники» и номерами дней (номера берём из собственной шапки
     приложения — значит они всегда совпадают), а над ней — пустую строку-отступ.
     Поля ввода в шапке отсутствуют, поэтому на данные и на табель это не влияет.
     ------------------------------------------------------------------------ */
  function buildGroupHeaderRow(sourceCells) {
    var row = document.createElement('tr');
    row.setAttribute('data-mac-group-header', '1');
    row.style.background = 'var(--input-bg)';
    row.style.borderTop = '1px solid var(--border)';
    row.style.borderBottom = '1px solid var(--border)';

    var label = document.createElement('th');
    label.textContent = 'Мастера и Техники';
    label.className = sourceCells[0] ? sourceCells[0].className : '';
    label.style.color = 'var(--text-secondary)';
    label.style.position = 'sticky';
    label.style.left = '0';
    label.style.background = 'var(--input-bg)';
    label.style.whiteSpace = 'nowrap';
    row.appendChild(label);

    // Дни — один в один как в родной шапке приложения: те же классы и ширина,
    // поэтому при смене месяца (30 или 31 день) таблица не разъезжается.
    for (var i = 1; i < sourceCells.length - 1; i++) {
      var cell = document.createElement('th');
      cell.textContent = sourceCells[i].textContent;
      cell.className = sourceCells[i].className;
      cell.style.color = 'var(--text-secondary)';
      row.appendChild(cell);
    }
    // Столбец «Ср» у мастеров и техников не нужен — не добавляем его вовсе.
    return row;
  }

  function buildGroupSpacerRow(columns) {
    var row = document.createElement('tr');
    row.setAttribute('data-mac-group-spacer', '1');
    var cell = document.createElement('td');
    cell.colSpan = Math.max(1, columns);
    cell.style.height = '12px';
    cell.style.background = 'transparent';
    row.appendChild(cell);
    return row;
  }

  function markGroupHeader() {
    var tbody = document.querySelector('#root table tbody');
    var thead = document.querySelector('#root table thead tr');
    if (!tbody || !thead) return;

    var sourceCells = thead.children;
    var rows = tbody.querySelectorAll('tr');
    var first = null;
    var groupRows = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-mac-group-header') || rows[i].getAttribute('data-mac-group-spacer')) continue;
      var nameNode = rows[i].querySelector('span.truncate');
      var text = String((nameNode && nameNode.textContent) || '').trim();
      if (!isGroupName(text)) continue;
      groupRows.push(rows[i]);
      if (!first) first = rows[i];
    }
    if (!first) {
      var stale = tbody.querySelector('[data-mac-group-header]');
      if (stale && stale.parentElement) stale.parentElement.removeChild(stale);
      var stale2 = tbody.querySelector('[data-mac-group-spacer]');
      if (stale2 && stale2.parentElement) stale2.parentElement.removeChild(stale2);
      return;
    }

    // Помечаем строки группы: у них прячем столбец «Ср».
    for (var g = 0; g < groupRows.length; g++) groupRows[g].setAttribute('data-mac-group-row', '1');

    var header = tbody.querySelector('[data-mac-group-header]');
    var expected = sourceCells.length - 1; // без столбца «Ср»
    // Пересобираем шапку, если месяц сменился и число дней стало другим.
    if (header && header.children.length !== expected) {
      header.parentElement.removeChild(header);
      header = null;
    }
    if (!header) header = buildGroupHeaderRow(sourceCells);

    var spacer = tbody.querySelector('[data-mac-group-spacer]');
    if (!spacer) spacer = buildGroupSpacerRow(expected);
    if (spacer.nextElementSibling !== header || header.nextElementSibling !== first) {
      tbody.insertBefore(spacer, first);
      tbody.insertBefore(header, first);
    }
  }

  function watchTabelButton() {
    // Прежняя кнопка раздела в дашборде отключена: раздел объявлен в списке
    // разделов приложения, поэтому второй кнопки быть не должно.
    decorateTabelNav();
    shortenTabletNames();
    markGroupHeader();
    // Пометки строк мастеров и техников убраны: они ломали вёрстку. Порядок
    // (мастера и техники — внизу, после слесарей) задаёт само приложение.
    watchTabelScreen();
    setInterval(function () {
      decorateTabelNav();
      shortenTabletNames();
    markGroupHeader();
      watchTabelScreen();
    }, 1200);
    var root = document.getElementById('root');
    var scheduled = false;
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        decorateTabelNav();
      });
    }
    if (root && window.MutationObserver) {
      new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    }
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    setInterval(schedule, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchTabelButton);
  } else {
    watchTabelButton();
  }

  migrateKpiMonths();
})();
