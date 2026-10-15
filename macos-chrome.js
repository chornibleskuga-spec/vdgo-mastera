/* =============================================================================
   ВДГО Мастер — хром окна macOS
   -----------------------------------------------------------------------------
   Внешний скрипт: рисует полосу окна, иконки боковой панели и кнопку разделов
   для телефона. Тема (macos-theme.css) включает нужный режим по флагам на
   <html>. React-приложение и минифицированный бандл не изменяются.

   Параметры адреса:
     ?chrome=0    — не рисовать полосу окна
     ?window=1    — режим «окно на рабочем столе» (тень, скругление, фон)
     ?sidebar=0   — вернуть верхнюю строку навигации вместо боковой панели

   Два важных правила, из-за которых этот файл устроен именно так:

   1. Полоса окна нужна там, где в ней есть смысл: в браузерной вкладке —
      всегда, в установленном приложении (PWA) — только на узком экране, потому
      что на телефоне в этой полосе живёт кнопка разделов.
   2. Флаг data-macos-drawer ставится ТОЛЬКО тогда, когда кнопка разделов
      действительно создана. Стили выдвижной панели включаются по этому флагу,
      поэтому «панель спрятана, а открыть нечем» стало невозможно.
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

  function isNarrow() {
    return window.matchMedia('(max-width: 899px)').matches;
  }

  /* Полоса состояния Android/Chrome красится в цвет окна приложения. */
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', html.getAttribute('data-theme') === 'dark' ? '#1E1E1E' : '#ECECEC');
  }

  /* ---------------------------------------------------------------------------
     Иконки боковой панели: 16×16, отдаются в CSS как маска (--mac-icon),
     поэтому цвет берётся от текста, включая белый на синей «пилюле».
     ------------------------------------------------------------------------ */
  var ICONS = {
    briefcase:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1.8" y="4.6" width="12.4" height="8.8" rx="2"/><path d="M6 4.6V3.7A1.7 1.7 0 0 1 7.7 2h.6A1.7 1.7 0 0 1 10 3.7v.9"/><path d="M1.8 8.6h12.4"/></svg>',
    chart:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round"><path d="M2.5 13.5V9M6.5 13.5V4.5M10.5 13.5V7M14 13.5V2.5"/></svg>',
    tag:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linejoin="round"><path d="M2.2 7.2V3.9c0-.9.8-1.7 1.7-1.7h3.3l6.6 6.6-5 5z"/><circle cx="5.3" cy="5.3" r="1.1"/></svg>',
    grid:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2"><rect x="2.2" y="2.2" width="5" height="5" rx="1.3"/><rect x="8.8" y="2.2" width="5" height="5" rx="1.3"/><rect x="2.2" y="8.8" width="5" height="5" rx="1.3"/><rect x="8.8" y="8.8" width="5" height="5" rx="1.3"/></svg>',
    houseOff:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 7.4 8 2.9l5.6 4.5v5.1c0 .6-.5 1.1-1.1 1.1H3.5c-.6 0-1.1-.5-1.1-1.1z"/><path d="M2.2 13.8 13.8 2.2"/></svg>',
    phone:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 2.3h2l1.1 2.7-1.5 1a8.4 8.4 0 0 0 4 4l1-1.5 2.7 1.1v2a1.3 1.3 0 0 1-1.4 1.3A10.8 10.8 0 0 1 2.9 3.7c0-.8.6-1.4 1.3-1.4z"/></svg>',
    receipt:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.6 1.9h8.8v12.2l-1.9-1.3-1.8 1.3-1.7-1.3-1.7 1.3-1.7-1.3z"/><path d="M6.2 5.6h3.6M6.2 8.4h3.6"/></svg>',
    doc:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.7 1.9h5.1L13 6.1V14H3.7z"/><path d="M8.8 1.9V6h4.2"/><path d="M5.9 9h4.2M5.9 11.3h4.2"/></svg>',
    clock:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.1"/><path d="M8 4.6V8l2.4 1.5"/></svg>',
    calculator:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="1.8" width="9.2" height="12.4" rx="2"/><path d="M5.8 4.6h4.4"/><path d="M6.2 7.8h.01M9.8 7.8h.01M6.2 10.6h.01M9.8 10.6h.01"/></svg>',
    bell:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.4c1.9 0 3.4 1.5 3.4 3.4v2.3c0 1.1.4 1.9 1 2.5H3.6c.6-.6 1-1.4 1-2.5V5.8c0-1.9 1.5-3.4 3.4-3.4z"/><path d="M6.5 12.4a1.6 1.6 0 0 0 3 0"/></svg>',
    sidebarToggle:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1.6" y="2.6" width="12.8" height="10.8" rx="2.2"/><path d="M6.2 2.6v10.8"/></svg>',
    // Шестерёнка для пункта «Настройки». Значок самого приложения в 14 px
    // читается как солнышко, поэтому рисуем свою — с зубцами и заметно жирнее.
    settings:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="3.3"/><circle cx="8" cy="8" r="1.35"/><path d="M8 4.6V1.6M8 11.4v3M4.6 8h-3M11.4 8h3M5.6 5.6 3.5 3.5M10.4 10.4l2.1 2.1M10.4 5.6l2.1-2.1M5.6 10.4 3.5 12.5"/></svg>',
    book:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 2.6h4.2c.7 0 1.2.5 1.2 1.2v9.6c0-.7-.5-1.2-1.2-1.2H2.6z"/><path d="M13.4 2.6H9.2c-.7 0-1.2.5-1.2 1.2v9.6c0-.7.5-1.2 1.2-1.2h4.2z"/></svg>'
  };

  // Подписи пунктов навигации приложения и соответствующие им иконки.
  // «Калькулятор» и «Напоминания» — вынесены из раздела «Приложения» правкой
  // навигации в бандле (tools/nav-patches.mjs), поэтому у них свои глифы.
  var LABEL_ICONS = [
    ['Работа', 'briefcase'],
    ['KPI', 'chart'],
    ['Прейскурант', 'tag'],
    ['Калькулятор', 'calculator'],
    ['Напоминания', 'bell'],
    ['Нет дома', 'houseOff'],
    ['Диспетчер', 'phone'],
    ['Кассы', 'receipt'],
    // Раздел «Табельные номера»: значок карточки сотрудника — рисуется тем же
    // механизмом, что у остальных разделов, поэтому пункт встаёт в один уровень.
    ['Табельные номера', 'doc'],
    // Раздела «ФИАР» больше нет — иконка ему не нужна. Старое имя «ФАР»
    // осталось для копии без правок (app-isolated).
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
      // Подсказка нужна для свёрнутой панели: там от пункта остаётся иконка.
      if (!btn.getAttribute('title')) btn.setAttribute('title', LABEL_ICONS[i][0]);
    });

    // Пункт «Настройки» в приложении — кнопка без подписи. Даём ему свою
    // шестерёнку и подпись, как у остальных пунктов: иначе внизу панели
    // остаётся одинокий значок, который легко принять за солнышко.
    var settings = bar.querySelector('button[title="Настройки"]');
    if (settings && !settings.hasAttribute('data-mac-settings')) {
      settings.setAttribute('data-mac-settings', '1');
      settings.style.setProperty('--mac-icon', iconUrl('settings'));
      settings.style.setProperty('--mac-icon-size', '17px');
      var caption = document.createElement('span');
      caption.className = 'mac-nav-label';
      caption.textContent = 'Настройки';
      settings.appendChild(caption);
    }
  }

  /* ---------------------------------------------------------------------------
     Сворачивание панели разделов: остаются только иконки.
     Состояние хранится в localStorage, поэтому переживает перезагрузку.
     ------------------------------------------------------------------------ */
  var SIDEBAR_KEY = 'macos_sidebar_collapsed';

  function setCollapsed(on) {
    if (on) {
      html.setAttribute('data-macos-sidebar-collapsed', '1');
    } else {
      html.removeAttribute('data-macos-sidebar-collapsed');
    }
    var btn = document.querySelector('.mac-sidebar-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Развернуть панель разделов' : 'Свернуть панель разделов';
      var caption = btn.querySelector('.mac-nav-label');
      if (caption) caption.textContent = on ? 'Развернуть' : 'Свернуть';
    }
    try {
      localStorage.setItem(SIDEBAR_KEY, on ? '1' : '0');
    } catch (e) {}
  }

  /* Кнопка сворачивания панели живёт в самой панели — в её «подвале», ниже
     пункта «Настройки». Раньше она стояла в полосе окна. */
  function buildSidebarToggle() {
    var bar = document.querySelector('#root > div > div.h-9');
    if (!bar || bar.querySelector('.mac-sidebar-footer')) return;

    var footer = document.createElement('div');
    footer.className = 'mac-sidebar-footer';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mac-sidebar-toggle';
    btn.setAttribute('aria-label', 'Свернуть или развернуть панель разделов');

    var glyph = document.createElement('span');
    glyph.className = 'mac-toggle-glyph';
    glyph.innerHTML = ICONS.sidebarToggle;

    var caption = document.createElement('span');
    caption.className = 'mac-nav-label';

    btn.appendChild(glyph);
    btn.appendChild(caption);
    btn.addEventListener('click', function () {
      setCollapsed(html.getAttribute('data-macos-sidebar-collapsed') !== '1');
    });

    footer.appendChild(btn);
    bar.appendChild(footer);

    var saved = '0';
    try {
      saved = localStorage.getItem(SIDEBAR_KEY) || '0';
    } catch (e) {}
    setCollapsed(saved === '1');
  }

  /* ---------------------------------------------------------------------------
     Ящик навигации для телефона и узкого планшета.
     Флаг data-macos-drawer выставляется вместе с кнопкой — по нему включаются
     стили выдвижной панели, поэтому навигация не может остаться без кнопки.
     ------------------------------------------------------------------------ */
  function setDrawer(open) {
    if (open && html.getAttribute('data-macos-drawer') === '1') {
      html.setAttribute('data-macos-sidebar-open', '1');
    } else {
      html.removeAttribute('data-macos-sidebar-open');
    }
  }

  function buildBurger(bar) {
    if (html.getAttribute('data-macos-drawer') === '1') return;
    if (!bar) return;

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

    if (!document.querySelector('.mac-drawer-backdrop')) {
      var back = document.createElement('div');
      back.className = 'mac-drawer-backdrop';
      back.addEventListener('click', function () {
        setDrawer(false);
      });
      document.body.appendChild(back);
    }

    html.setAttribute('data-macos-drawer', '1');

    var navBar = document.querySelector('#root > div > div.h-9');
    if (navBar && !navBar.getAttribute('data-mac-drawer')) {
      navBar.setAttribute('data-mac-drawer', '1');
      navBar.addEventListener('click', function (event) {
        if (!isNarrow()) return;
        var target = event.target && event.target.closest ? event.target.closest('button') : null;
        if (!target) return;
        // Подменю «История» и «Справочники» лежат внутри div.relative —
        // их не закрываем, иначе подменю исчезнет вместе с ящиком.
        if (target.parentElement !== navBar) return;
        setTimeout(function () {
          setDrawer(false);
        }, 120);
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setDrawer(false);
    });
  }

  /* ---------------------------------------------------------------------------
     Полоса окна
     -----------------------------------------------------------------------------
     Здесь осталась только кнопка разделов для телефона: подписи убраны, а
     кнопка сворачивания панели переехала в саму панель.
     ------------------------------------------------------------------------ */
  function buildBar() {
    if (document.querySelector('.mac-titlebar')) return document.querySelector('.mac-titlebar');

    var bar = document.createElement('div');
    bar.className = 'mac-titlebar';
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  /* Полоса нужна только там, где в ней есть смысл: на телефоне в ней живёт
     кнопка разделов. На компьютере и планшете сверху ничего не остаётся —
     приложение занимает всё окно, и ничто не «задевает» содержимое. */
  function removeBar() {
    var bar = document.querySelector('.mac-titlebar');
    if (bar) bar.remove();
    html.removeAttribute('data-macos-bar');
  }

  function ensureBar() {
    if (!wantChrome) return;

    html.setAttribute('data-macos-chrome', '1');

    if (!isNarrow()) {
      // Ушли на широкий экран: полосы и ящика быть не должно.
      html.removeAttribute('data-macos-drawer');
      html.removeAttribute('data-macos-sidebar-open');
      removeBar();
      return;
    }

    var bar = buildBar();
    html.setAttribute('data-macos-bar', '1');
    if (isNarrow()) buildBurger(bar);
  }

  function start() {
    ensureBar();
    paintIcons();
    buildSidebarToggle();
    syncThemeColor();

    if (window.MutationObserver) {
      // Полоса состояния на телефоне должна совпадать с темой приложения.
      new MutationObserver(syncThemeColor).observe(html, {
        attributes: true,
        attributeFilter: ['data-theme']
      });

      // React может перерисовать панель — иконки и «подвал» дорисовываем снова.
      var root = document.getElementById('root');
      if (root) {
        var scheduled = false;
        new MutationObserver(function () {
          if (scheduled) return;
          scheduled = true;
          requestAnimationFrame(function () {
            scheduled = false;
            paintIcons();
            buildSidebarToggle();
          });
        }).observe(root, { childList: true, subtree: true });
      }
    }

    window.addEventListener('resize', function () {
      ensureBar();
      buildSidebarToggle();
      if (!isNarrow()) setDrawer(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
