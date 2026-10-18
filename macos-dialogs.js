/* =============================================================================
   Диалоги в стиле macOS вместо системных окон браузера
   -----------------------------------------------------------------------------
   Зачем. Приложение подтверждает действия системным confirm():

       onClick: () => { confirm("Сохранить кейс?") && сохранить(id) }

   Проблема в том, что браузер может эти окна не показать:
     * в приложении, добавленном на домашний экран iOS, системные диалоги
       в режиме standalone не отображаются вовсе;
     * в Chrome есть галочка «не показывать больше диалоги» — после неё
       confirm() молча возвращает false до перезагрузки страницы.

   В обоих случаях confirm() возвращает false, и обработчик не выполняется:
   кнопка выглядит рабочей, но ничего не делает. Ровно это происходило с
   «Сохранить» и «Закрыть» в разделе кейсов — и так же повели бы себя
   «Очистить дежурства», «Удалить», «Загрузить данные от коллеги».

   Как решено. Свои окна рисуются средствами страницы, поэтому их ничто не
   блокирует. confirm() синхронный, а окно показывается асинхронно, поэтому
   используется приём с повторным нажатием:

     1. confirm() запоминает элемент, по которому только что щёлкнули, и
        возвращает false — обработчик приложения ничего не делает;
     2. показывается наше окно;
     3. если пользователь подтвердил — тем же элементом программно
        «щёлкают» ещё раз, и на этот раз confirm() возвращает true —
        обработчик выполняется ровно один раз.

   alert() подменяется так же, но там возвращаемое значение не нужно.
   prompt() приложение не использует.
   ============================================================================= */
(function () {
  'use strict';

  var bypass = false;
  var lastClickTarget = null;
  var layer = null;
  var nodes = {};
  var pending = null;
  var restoreFocus = null;

  /* Запоминаем элемент, по которому щёлкнули: он понадобится для повтора. */
  document.addEventListener(
    'click',
    function (event) {
      lastClickTarget = event.target;
    },
    true
  );

  function ensureLayer() {
    if (layer) return;

    layer = document.createElement('div');
    layer.className = 'mac-dialog-layer';
    layer.hidden = true;
    layer.innerHTML =
      '<div class="mac-dialog-backdrop"></div>' +
      '<div class="mac-dialog" role="alertdialog" aria-modal="true">' +
      '<img class="mac-dialog-icon" src="./icon-macos-128.png" alt="" />' +
      '<div class="mac-dialog-body">' +
      '<h2 class="mac-dialog-title"></h2>' +
      '<p class="mac-dialog-text"></p>' +
      '<div class="mac-dialog-form"></div>' +
      '<p class="mac-dialog-error" hidden></p>' +
      '<div class="mac-dialog-actions">' +
      '<button type="button" class="mac-dialog-btn mac-dialog-btn--cancel"></button>' +
      '<button type="button" class="mac-dialog-btn mac-dialog-btn--ok"></button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(layer);

    nodes = {
      backdrop: layer.querySelector('.mac-dialog-backdrop'),
      title: layer.querySelector('.mac-dialog-title'),
      text: layer.querySelector('.mac-dialog-text'),
      form: layer.querySelector('.mac-dialog-form'),
      error: layer.querySelector('.mac-dialog-error'),
      cancel: layer.querySelector('.mac-dialog-btn--cancel'),
      ok: layer.querySelector('.mac-dialog-btn--ok'),
      dialog: layer.querySelector('.mac-dialog')
    };

    nodes.cancel.addEventListener('click', function () {
      close(false);
    });
    nodes.backdrop.addEventListener('click', function () {
      close(false);
    });
    nodes.ok.addEventListener('click', function () {
      close(true);
    });

    document.addEventListener('keydown', function (event) {
      if (layer.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab' && (!pending || pending.kind !== 'form')) {
        // удержание фокуса внутри окна; в форме Tab должен работать как обычно
        var focusables = [nodes.cancel, nodes.ok];
        var index = focusables.indexOf(document.activeElement);
        event.preventDefault();
        var next = event.shiftKey ? index - 1 : index + 1;
        if (next < 0) next = focusables.length - 1;
        if (next >= focusables.length) next = 0;
        focusables[next].focus();
      }
    });
  }

  var DANGER = /удал|очист|сброс|закрыть/i;
  var ACTION_WORD = /^(Удалить|Очистить|Сбросить|Закрыть|Сохранить|Загрузить|Продолжить|Добавить)/i;

  /* --- поля формы --- */
  function buildForm(fields) {
    nodes.form.textContent = '';
    nodes.form.hidden = !fields || !fields.length;
    (fields || []).forEach(function (field) {
      var row = document.createElement('label');
      row.className = 'mac-field';

      var caption = document.createElement('span');
      caption.className = 'mac-field-label';
      caption.textContent = field.label || field.name;
      row.appendChild(caption);

      var input;
      if (field.type === 'select') {
        input = document.createElement('select');
        (field.options || []).forEach(function (option) {
          var item = document.createElement('option');
          item.value = option.value;
          item.textContent = option.label;
          input.appendChild(item);
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
        if (field.placeholder) input.placeholder = field.placeholder;
      }
      input.className = 'mac-field-input';
      input.value = field.value == null ? '' : String(field.value);
      input.dataset.field = field.name;
      row.appendChild(input);
      nodes.form.appendChild(row);
    });
  }

  function collectForm() {
    var values = {};
    Array.prototype.forEach.call(nodes.form.querySelectorAll('[data-field]'), function (input) {
      values[input.dataset.field] = input.value;
    });
    return values;
  }

  function showError(message) {
    nodes.error.textContent = message || '';
    nodes.error.hidden = !message;
  }

  function show(kind, message, onResult) {
    ensureLayer();

    if (pending && pending.onResult) pending.onResult(false);

    var danger = kind === 'confirm' && DANGER.test(message);
    var word = ACTION_WORD.exec(message);

    pending = { kind: kind, onResult: onResult };

    nodes.title.textContent = kind === 'alert' ? 'Сообщение' : danger ? 'Внимание' : 'Подтверждение';
    nodes.text.textContent = message;
    nodes.cancel.textContent = 'Отмена';
    nodes.cancel.hidden = kind === 'alert';
    nodes.ok.textContent = kind === 'alert' ? 'ОК' : word ? word[1] : 'Подтвердить';
    nodes.dialog.setAttribute('data-danger', danger ? '1' : '0');
    buildForm(null);
    showError('');

    if (layer.hidden) {
      restoreFocus = document.activeElement;
      layer.hidden = false;
      document.documentElement.classList.add('mac-dialog-open');
    }

    // По умолчанию фокус на безопасной кнопке: разрушительное — на «Отмене».
    (danger ? nodes.cancel : nodes.ok).focus();
  }

  /* ---------------------------------------------------------------------------
     Форма в том же окне: используется для добавления данных, которых приложение
     само добавлять не умеет. Проверка полей — до закрытия окна, поэтому при
     ошибке окно остаётся открытым и показывает подсказку.
     ------------------------------------------------------------------------ */
  function showForm(options) {
    ensureLayer();
    if (pending && pending.onResult) pending.onResult(false);

    pending = {
      kind: 'form',
      validate: options.validate,
      onSubmit: options.onSubmit
    };

    nodes.title.textContent = options.title || 'Новая запись';
    nodes.text.textContent = options.text || '';
    nodes.cancel.textContent = 'Отмена';
    nodes.cancel.hidden = false;
    nodes.ok.textContent = options.submitLabel || 'Добавить';
    nodes.ok.style.background = '';
    nodes.dialog.setAttribute('data-danger', '0');
    buildForm(options.fields || []);
    showError('');

    if (layer.hidden) {
      restoreFocus = document.activeElement;
      layer.hidden = false;
      document.documentElement.classList.add('mac-dialog-open');
    }

    var first = nodes.form.querySelector('input, select');
    (first || nodes.ok).focus();
  }

  function hide() {
    layer.hidden = true;
    document.documentElement.classList.remove('mac-dialog-open');
    if (restoreFocus && document.documentElement.contains(restoreFocus)) restoreFocus.focus();
    restoreFocus = null;
  }

  function close(result) {
    if (!pending) return;
    var request = pending;

    // Форма: сначала проверяем поля, и только потом закрываем окно.
    if (result && request.kind === 'form') {
      var values = collectForm();
      var error = request.validate ? request.validate(values) : null;
      if (error) {
        showError(error);
        return;
      }
      pending = null;
      hide();
      if (request.onSubmit) request.onSubmit(values);
      return;
    }

    pending = null;
    hide();
    if (request.onResult) request.onResult(result);
  }

  /* --- подмена системных диалогов --- */
  window.confirm = function (message) {
    if (bypass) {
      bypass = false;
      return true;
    }

    var target = lastClickTarget;
    show('confirm', String(message), function (ok) {
      if (!ok) return;
      if (target && document.documentElement.contains(target)) {
        bypass = true;
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        bypass = false;
        return;
      }
      // элемент исчез (перерисовался) — сообщаем честно, а не молчим
      show('alert', 'Не удалось выполнить: кнопка больше не существует. Повторите действие.', null);
    });

    return false;
  };

  window.alert = function (message) {
    show('alert', String(message), null);
  };

  /* Форма для тех действий, которых в приложении нет: ею пользуется
     macos-actions.js (например, добавление кассы). */
  window.__macForm = showForm;
})();
