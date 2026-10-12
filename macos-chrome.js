/* =============================================================================
   ВДГО Мастер — хром окна macOS
   -----------------------------------------------------------------------------
   Внешний скрипт: дорисовывает полосу заголовка со «светофором», добавляет
   иконки в боковую панель и выставляет флаги на <html>, по которым тема
   (macos-theme.css) включает нужный режим оформления. React-приложение и
   минифицированный бандл при этом не изменяются.

   Параметры адреса:
     ?chrome=0    — не рисовать полосу заголовка
     ?window=1    — режим «окно на рабочем столе» (тень, скругление, фон)
     ?sidebar=0   — вернуть верхнюю строку навигации вместо боковой панели

   В установленном PWA (display-mode: standalone) полоса не рисуется:
   у настоящего приложения окно уже есть.
   ============================================================================= */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var wantChrome = params.get('chrome') !== '0';
  var wantWindow = params.get('window') === '1';
  var wantSidebar = params.get('sidebar') !== '0';
  var html = document.documentElement;

  var standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  if (wantWindow) html.setAttribute('data-macos-window', '1');
  if (wantSidebar) html.setAttribute('data-macos-sidebar', '1');
  if (!wantChrome || standalone) return;

  html.setAttribute('data-macos-chrome', '1');

  /* ---------------------------------------------------------------------------
     Иконки боковой панели. Рисуются в 16×16, отдаются в CSS как маска
     (--mac-icon), поэтому цвет берётся от текста пункта, включая состояние
     «выбрано» с белым текстом на синей «пилюле».
     ------------------------------------------------------------------------ */
  var ICONS = {
    briefcase:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1.8" y="4.6" width="12.4" height="8.8" rx="2"/><path d="M6 4.6V3.7A1.7 1.7 0 0 1 7.7 2h.6A1.7 1.7 0 0 1 10 3.7v.9"/><path d="M1.8 8.6h12.4"/></svg>',
    chart:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 13.5V9M6.5 13.5V4.5M10.5 13.5V7M14 13.5V2.5"/></svg>',
    tag:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linejoin="round"><path d="M2.2 7.2V3.9c0-.9.8-1.7 1.7-1.7h3.3l6.6 6.6-5 5z"/><circle cx="5.3" cy="5.3" r="1.1"/></svg>',
    grid:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4"><rect x="2.2" y="2.2" width="5" height="5" rx="1.3"/><rect x="8.8" y="2.2" width="5" height="5" rx="1.3"/><rect x="2.2" y="8.8" width="5" height="5" rx="1.3"/><rect x="8.8" y="8.8" width="5" height="5" rx="1.3"/></svg>',
    houseOff:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 7.4 8 2.9l5.6 4.5v5.1c0 .6-.5 1.1-1.1 1.1H3.5c-.6 0-1.1-.5-1.1-1.1z"/><path d="M2.2 13.8 13.8 2.2"/></svg>',
    phone:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 2.3h2l1.1 2.7-1.5 1a8.4 8.4 0 0 0 4 4l1-1.5 2.7 1.1v2a1.3 1.3 0 0 1-1.4 1.3A10.8 10.8 0 0 1 2.9 3.7c0-.8.6-1.4 1.3-1.4z"/></svg>',
    receipt:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.6 1.9h8.8v12.2l-1.9-1.3-1.8 1.3-1.7-1.3-1.7 1.3-1.7-1.3z"/><path d="M6.2 5.6h3.6M6.2 8.4h3.6"/></svg>',
    doc:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.7 1.9h5.1L13 6.1V14H3.7z"/><path d="M8.8 1.9V6h4.2"/><path d="M5.9 9h4.2M5.9 11.3h4.2"/></svg>',
    clock:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.1"/><path d="M8 4.6V8l2.4 1.5"/></svg>',
    book:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 2.6h4.2c.7 0 1.2.5 1.2 1.2v9.6c0-.7-.5-1.2-1.2-1.2H2.6z"/><path d="M13.4 2.6H9.2c-.7 0-1.2.5-1.2 1.2v9.6c0-.7.5-1.2 1.2-1.2h4.2z"/></svg>'
  };

  // Порядок и подписи пунктов навигации приложения.
  var LABEL_ICONS = [
    ['Работа', 'briefcase'],
    ['KPI', 'chart'],
    ['Прейскурант', 'tag'],
    ['Приложения', 'grid'],
    ['Нет дома', 'houseOff'],
    ['Диспетчер', 'phone'],
    ['Кассы', 'receipt'],
    ['ФАР', 'doc'],
    ['История', 'clock'],
    ['Справочники', 'book']
  ];

  function iconUrl(name) {
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(ICONS[name]) + '")';
  }

  function paintIcons() {
    var bar = document.querySelector('#root > div > div.h-9');
    if (!bar) return;

    var candidates = [];
    Array.prototype.forEach.call(bar.children, function (el) {
      if (el.tagName === 'BUTTON') {
        candidates.push(el);
      } else if (el.tagName === 'DIV' && el.classList.contains('relative')) {
        Array.prototype.forEach.call(el.children, function (child) {
          if (child.tagName === 'BUTTON') candidates.push(child);
        });
      }
    });

    candidates.forEach(function (btn) {
      if (btn.style.getPropertyValue('--mac-icon')) return;

      var text = (btn.textContent || '').trim();
      // Кнопки-иконки без подписи (например «Настройки») уже рисуют свою SVG —
      // свою иконку им не добавляем, чтобы не было двух шестерёнок.
      if (!text && btn.querySelector('svg')) return;

      var name = null;
      for (var i = 0; i < LABEL_ICONS.length; i++) {
        if (text.indexOf(LABEL_ICONS[i][0]) === 0) {
          name = LABEL_ICONS[i][1];
          break;
        }
      }
      if (!name) return;

      btn.style.setProperty('--mac-icon', iconUrl(name));
      btn.style.setProperty('--mac-icon-size', '15px');
    });
  }

  /* ---------------------------------------------------------------------------
     Полоса заголовка со «светофором»
     ------------------------------------------------------------------------ */
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (html.requestFullscreen) {
      html.requestFullscreen().catch(function () {});
    }
  }

  function buildTitlebar() {
    if (document.querySelector('.mac-titlebar')) return;

    var bar = document.createElement('div');
    bar.className = 'mac-titlebar';

    var lights = document.createElement('div');
    lights.className = 'mac-lights';

    // Красный и жёлтый — декорация (в браузере закрывать и сворачивать нечего),
    // зелёный — настоящий полноэкранный режим.
    var defs = [
      { cls: 'mac-light--close', title: 'Закрыть — в браузере недоступно' },
      { cls: 'mac-light--min', title: 'Свернуть — в браузере недоступно' },
      { cls: 'mac-light--zoom', title: 'Полноэкранный режим' }
    ];

    defs.forEach(function (def) {
      var el = document.createElement(def.cls === 'mac-light--zoom' ? 'button' : 'span');
      el.className = 'mac-light ' + def.cls;
      el.title = def.title;
      if (el.tagName === 'BUTTON') {
        el.type = 'button';
        el.setAttribute('aria-label', def.title);
        el.addEventListener('click', toggleFullscreen);
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
      lights.appendChild(el);
    });

    var title = document.createElement('div');
    title.className = 'mac-title';
    title.textContent = 'ВДГО Мастер';

    // Метка режима: сразу видно, что открыта именно тема macOS.
    var mark = document.createElement('span');
    mark.className = 'mac-mark';
    mark.textContent = 'macOS-тема · ' + (wantSidebar ? 'боковая панель' : 'верхняя строка');
    mark.title = 'Отключить: ?chrome=0 — без полосы, ?sidebar=0 — без боковой панели, ?window=1 — окно на рабочем столе';

    bar.appendChild(lights);
    bar.appendChild(title);
    bar.appendChild(mark);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ---------------------------------------------------------------------------
     Ящик навигации для телефона и узкого планшета (до 899 px).
     Кнопка в полосе заголовка открывает панель, затемнение и Esc закрывают,
     выбор пункта тоже закрывает — но подменю «История»/«Справочники» остаются
     открытыми, иначе до них нельзя добраться.
     ------------------------------------------------------------------------ */
  function isNarrow() {
    return window.matchMedia('(max-width: 899px)').matches;
  }

  /* Полоса состояния Android/Chrome красится в цвет окна приложения. */
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', html.getAttribute('data-theme') === 'dark' ? '#1E1E1E' : '#ECECEC');
  }

  function setDrawer(open) {
    if (open) {
      html.setAttribute('data-macos-sidebar-open', '1');
    } else {
      html.removeAttribute('data-macos-sidebar-open');
    }
    updateMark();
  }

  function updateMark() {
    var mark = document.querySelector('.mac-titlebar .mac-mark');
    if (!mark || !wantSidebar) return;
    mark.textContent = 'macOS-тема · ' + (isNarrow() ? 'ящик' : 'боковая панель');
  }

  function buildDrawer() {
    var bar = document.querySelector('.mac-titlebar');

    if (bar && !bar.querySelector('.mac-burger')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mac-burger';
      btn.title = 'Разделы';
      btn.setAttribute('aria-label', 'Разделы');
      btn.appendChild(document.createElement('span'));
      btn.addEventListener('click', function () {
        setDrawer(!html.hasAttribute('data-macos-sidebar-open'));
      });
      bar.appendChild(btn);
    }

    if (!document.querySelector('.mac-drawer-backdrop')) {
      var back = document.createElement('div');
      back.className = 'mac-drawer-backdrop';
      back.addEventListener('click', function () {
        setDrawer(false);
      });
      document.body.appendChild(back);
    }

    var navBar = document.querySelector('#root > div > div.h-9');
    if (navBar && !navBar.getAttribute('data-mac-drawer')) {
      navBar.setAttribute('data-mac-drawer', '1');
      navBar.addEventListener('click', function (event) {
        if (!isNarrow()) return;
        var btn = event.target && event.target.closest ? event.target.closest('button') : null;
        if (!btn) return;
        // Подменю «История» и «Справочники» лежат внутри div.relative —
        // их не закрываем, иначе подменю исчезнет вместе с ящиком.
        if (btn.parentElement !== navBar) return;
        setTimeout(function () {
          setDrawer(false);
        }, 120);
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') setDrawer(false);
      });

      window.addEventListener('resize', function () {
        if (!isNarrow()) setDrawer(false);
        else updateMark();
      });
    }
  }

  function start() {
    buildTitlebar();
    buildDrawer();
    paintIcons();
    syncThemeColor();

    // Полоса состояния на телефоне должна совпадать с темой приложения.
    if (window.MutationObserver) {
      new MutationObserver(syncThemeColor).observe(html, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    // React может перерисовать панель — тогда иконки дорисовываем снова.
    var root = document.getElementById('root');
    if (root && window.MutationObserver) {
      var scheduled = false;
      new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
          scheduled = false;
          paintIcons();
        });
      }).observe(root, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
