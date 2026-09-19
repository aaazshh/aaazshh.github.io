// Desktop behaviour: dragging the icons, opening windows, and remembering where
// things were put. Nothing here is required to read the site. Every item is a
// real button, so tab and enter get through the whole thing without a pointer.

(function () {
  'use strict';

  var desktop = document.getElementById('desktop');
  var itemList = document.getElementById('items');
  var windowLayer = document.getElementById('windows');
  var frame = document.getElementById('window-frame');
  var tidyButton = document.getElementById('tidy');
  var STORE = 'desktop.icons.v1';
  var DRAG_SLOP = 4;      // pointer travel that turns a click into a drag
  var MENUBAR = 44;       // keep icons clear of the bar and the dock
  var DOCK = 96;
  var topWindow = 10;

  var phone = window.matchMedia('(max-width: 760px)');
  var defaults = {};
  Array.prototype.forEach.call(itemList.children, function (item) {
    var id = item.querySelector('.icon').dataset.open;
    defaults[id] = { x: item.style.getPropertyValue('--x'), y: item.style.getPropertyValue('--y') };
  });

  /* Saved positions -------------------------------------------------------- */

  function readSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {};
    } catch (err) {
      return {};
    }
  }

  function save(positions) {
    try {
      localStorage.setItem(STORE, JSON.stringify(positions));
    } catch (err) {
      // Private browsing and the like. The layout just stops persisting.
    }
    tidyButton.hidden = false;
  }

  function applySaved() {
    var saved = readSaved();
    var any = false;
    Array.prototype.forEach.call(itemList.children, function (item) {
      var id = item.querySelector('.icon').dataset.open;
      if (!saved[id]) return;
      item.style.setProperty('--x', saved[id].x);
      item.style.setProperty('--y', saved[id].y);
      any = true;
    });
    tidyButton.hidden = !any;
  }

  tidyButton.addEventListener('click', function () {
    Array.prototype.forEach.call(itemList.children, function (item) {
      var id = item.querySelector('.icon').dataset.open;
      item.style.setProperty('--x', defaults[id].x);
      item.style.setProperty('--y', defaults[id].y);
    });
    try {
      localStorage.removeItem(STORE);
    } catch (err) {}
    tidyButton.hidden = true;
  });

  applySaved();

  /* Dragging the icons ----------------------------------------------------- */

  var drag = null;
  var suppressClick = false;

  itemList.addEventListener('pointerdown', function (event) {
    suppressClick = false;
    if (phone.matches || event.button !== 0) return;
    var icon = event.target.closest('.icon');
    if (!icon) return;
    var item = icon.parentElement;
    var bounds = desktop.getBoundingClientRect();
    drag = {
      item: item,
      icon: icon,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.offsetLeft,
      originY: item.offsetTop,
      bounds: bounds,
      maxX: bounds.width - item.offsetWidth,
      maxY: bounds.height - DOCK - item.offsetHeight,
      moved: false
    };
    icon.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  itemList.addEventListener('pointermove', function (event) {
    if (!drag) return;
    var dx = event.clientX - drag.startX;
    var dy = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.item.classList.add('is-dragging');
    }
    var x = Math.min(Math.max(drag.originX + dx, 0), drag.maxX);
    var y = Math.min(Math.max(drag.originY + dy, MENUBAR), drag.maxY);
    drag.item.style.setProperty('--x', (x / drag.bounds.width * 100).toFixed(2) + '%');
    drag.item.style.setProperty('--y', (y / drag.bounds.height * 100).toFixed(2) + '%');
  });

  function endDrag() {
    if (!drag) return;
    if (drag.moved) {
      drag.item.classList.remove('is-dragging');
      suppressClick = true;
      var positions = readSaved();
      positions[drag.icon.dataset.open] = {
        x: drag.item.style.getPropertyValue('--x'),
        y: drag.item.style.getPropertyValue('--y')
      };
      save(positions);
    }
    drag = null;
  }

  itemList.addEventListener('pointerup', endDrag);
  itemList.addEventListener('pointercancel', function () {
    if (drag) drag.item.classList.remove('is-dragging');
    drag = null;
  });

  /* Opening ---------------------------------------------------------------- */

  document.addEventListener('click', function (event) {
    var demo = event.target.closest('[data-demo]');
    if (demo) {
      openDemo(demo.dataset.demo, demo.dataset.kind, demo.dataset.label, demo);
      return;
    }
    var opener = event.target.closest('[data-open]');
    if (!opener) return;
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    openWindow(opener.dataset.open, opener);
  });

  /* A demo window holds the project itself in an iframe: the web ones in a
     window shaped like a browser, the app ones inside a phone. */
  function openDemo(src, kind, label, opener) {
    var id = 'demo-' + src.replace(/[^a-z0-9]+/gi, '-');
    var open = windowLayer.querySelector('[data-window-id="' + id + '"]');
    if (open) {
      raise(open);
      open.querySelector('.pane').focus();
      return;
    }

    var win = frame.content.firstElementChild.cloneNode(true);
    var heading = win.querySelector('.title');
    var pane = win.querySelector('.pane');
    var headingId = 'title-' + id;

    win.dataset.windowId = id;
    win.classList.add('window-demo', kind === 'phone' ? 'is-phone' : 'is-web');
    heading.id = headingId;
    heading.textContent = label;
    win.setAttribute('aria-labelledby', headingId);
    win.querySelector('.close').setAttribute('aria-label', 'Close ' + label);

    var full = document.createElement('a');
    full.className = 'full-size';
    full.href = 'demos/' + src;
    full.target = '_blank';
    full.rel = 'noopener';
    full.textContent = 'Full size';
    win.querySelector('.titlebar').insertBefore(full, win.querySelector('.close'));

    pane.classList.add('is-frame');
    var holder = kind === 'phone' ? document.createElement('div') : pane;
    if (kind === 'phone') {
      holder.className = 'phone';
      pane.appendChild(holder);
    }
    var frameEl = document.createElement('iframe');
    frameEl.className = 'demo-frame';
    frameEl.src = 'demos/' + src;
    frameEl.title = label;
    holder.appendChild(frameEl);

    if (opener) win.returnFocusTo = opener;

    var count = windowLayer.children.length % 5;
    win.style.setProperty('--wx', 'calc(8% + ' + count * 24 + 'px)');
    win.style.setProperty('--wy', 'calc(9% + ' + count * 24 + 'px)');

    windowLayer.appendChild(win);
    raise(win);
    pane.focus();
  }

  function openWindow(id, opener) {
    var open = windowLayer.querySelector('[data-window-id="' + id + '"]');
    if (open) {
      raise(open);
      open.querySelector('.pane').focus();
      return;
    }
    var source = document.querySelector('template[data-window="' + id + '"]');
    if (!source) return;

    var win = frame.content.firstElementChild.cloneNode(true);
    var heading = win.querySelector('.title');
    var pane = win.querySelector('.pane');
    var headingId = 'title-' + id;

    win.dataset.windowId = id;
    heading.id = headingId;
    heading.textContent = source.dataset.title;
    win.setAttribute('aria-labelledby', headingId);
    win.querySelector('.close').setAttribute('aria-label', 'Close ' + source.dataset.title);
    pane.appendChild(source.content.cloneNode(true));
    if (opener) win.returnFocusTo = opener;

    var count = windowLayer.children.length % 6;
    win.style.setProperty('--wx', 'calc(24% + ' + count * 26 + 'px)');
    win.style.setProperty('--wy', 'calc(14% + ' + count * 26 + 'px)');

    windowLayer.appendChild(win);
    raise(win);
    pane.focus();
  }

  function raise(win) {
    topWindow += 1;
    win.style.zIndex = topWindow;
  }

  windowLayer.addEventListener('pointerdown', function (event) {
    var win = event.target.closest('.window');
    if (win) raise(win);
  });

  windowLayer.addEventListener('click', function (event) {
    if (event.target.closest('.close')) closeWindow(event.target.closest('.window'));
  });

  windowLayer.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var win = event.target.closest('.window');
    if (win) closeWindow(win);
  });

  function closeWindow(win) {
    var back = win.returnFocusTo;
    win.remove();
    if (back && document.contains(back)) back.focus();
  }

  /* Dragging a window by its title bar -------------------------------------- */

  var moving = null;

  windowLayer.addEventListener('pointerdown', function (event) {
    if (phone.matches || event.button !== 0) return;
    var bar = event.target.closest('.titlebar');
    if (!bar || event.target.closest('.close')) return;
    var win = bar.closest('.window');
    moving = {
      win: win,
      startX: event.clientX,
      startY: event.clientY,
      originX: win.offsetLeft,
      originY: win.offsetTop,
      maxX: desktop.clientWidth - win.offsetWidth,
      maxY: desktop.clientHeight - 60
    };
    win.classList.add('is-moving');
    bar.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  windowLayer.addEventListener('pointermove', function (event) {
    if (!moving) return;
    var x = Math.min(Math.max(moving.originX + event.clientX - moving.startX, 0), moving.maxX);
    var y = Math.min(Math.max(moving.originY + event.clientY - moving.startY, MENUBAR - 8), moving.maxY);
    moving.win.style.setProperty('--wx', x + 'px');
    moving.win.style.setProperty('--wy', y + 'px');
  });

  function endMove() {
    if (!moving) return;
    moving.win.classList.remove('is-moving');
    moving = null;
  }

  windowLayer.addEventListener('pointerup', endMove);
  windowLayer.addEventListener('pointercancel', endMove);

  /* Menu bar clock ---------------------------------------------------------- */

  var clock = document.getElementById('clock');

  function tick() {
    var now = new Date();
    clock.textContent = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) +
      '  ' + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  tick();
  setInterval(tick, 30000);
}());
