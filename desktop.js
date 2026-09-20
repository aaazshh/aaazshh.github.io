// Desktop behaviour: dragging the icons, opening windows, moving and resizing
// them, and remembering where things were put. Nothing here is required to read
// the site. Every item is a real button, so tab and enter get through the whole
// thing without a pointer.

(function () {
  'use strict';

  var desktop = document.getElementById('desktop');
  var itemList = document.getElementById('items');
  var windowLayer = document.getElementById('windows');
  var frame = document.getElementById('window-frame');
  var tidyButton = document.getElementById('tidy');
  var dockMin = document.getElementById('dock-min');
  var STORE = 'desktop.icons.v1';
  var DRAG_SLOP = 4;      // pointer travel that turns a click into a drag
  var MENUBAR = 44;       // keep icons and windows clear of the bar and the dock
  var DOCK = 96;
  var MIN_W = 320;
  var MIN_H = 220;
  var topWindow = 10;

  var phone = window.matchMedia('(max-width: 760px)');
  var stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
  var defaults = {};
  Array.prototype.forEach.call(itemList.children, function (item) {
    var id = item.querySelector('.icon').dataset.open;
    defaults[id] = { x: item.style.getPropertyValue('--x'), y: item.style.getPropertyValue('--y') };
  });

  /* Saved icon positions --------------------------------------------------- */

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

  // Builds the chrome. Everything after this point works in pixels: a window
  // that can be dragged, resized and zoomed needs one set of numbers, not a
  // mix of percentages and CSS variables.
  function build(id, title, opener) {
    var win = frame.content.firstElementChild.cloneNode(true);
    var heading = win.querySelector('.title');
    var headingId = 'title-' + id;

    win.dataset.windowId = id;
    win.windowTitle = title;
    heading.id = headingId;
    heading.textContent = title;
    win.setAttribute('aria-labelledby', headingId);
    win.querySelector('.close').setAttribute('aria-label', 'Close ' + title);
    win.querySelector('.zoom').setAttribute('aria-label', 'Maximize ' + title);
    win.querySelector('.min').setAttribute('aria-label', 'Minimize ' + title);
    if (opener) win.returnFocusTo = opener;
    return win;
  }

  function place(win, w, h) {
    var room = desktop.getBoundingClientRect();
    var width = Math.min(w, room.width - 32);
    var height = Math.min(h, room.height - MENUBAR - DOCK - 16);
    var step = windowLayer.children.length % 6 * 26;

    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.style.left = Math.max(16, Math.min(room.width * 0.12 + step, room.width - width - 16)) + 'px';
    win.style.top = Math.max(MENUBAR + 8, Math.min(room.height * 0.13 + step, room.height - height - DOCK)) + 'px';
  }

  function existing(id) {
    var open = windowLayer.querySelector('[data-window-id="' + id + '"]');
    if (!open) return false;
    if (open.classList.contains('is-min')) restore(open);
    else {
      raise(open);
      open.querySelector('.pane').focus();
    }
    return true;
  }

  function openWindow(id, opener) {
    if (existing(id)) return;
    var source = document.querySelector('template[data-window="' + id + '"]');
    if (!source) return;

    var win = build(id, source.dataset.title, opener);
    win.dataset.icon = source.dataset.icon || 'doc';
    win.querySelector('.pane').appendChild(source.content.cloneNode(true));
    place(win, Number(source.dataset.w) || 620, Number(source.dataset.h) || 460);
    windowLayer.appendChild(win);
    settle(win);
    raise(win);
    win.querySelector('.pane').focus();
  }

  // The opening animation plays once and is then taken off the element, so
  // nothing later can bring it back and replay it mid use.
  function settle(win) {
    win.addEventListener('animationend', function () {
      win.style.animation = 'none';
    }, { once: true });
  }

  /* A demo window holds the project itself in an iframe: the web ones in a
     window shaped like a browser, the app ones inside a phone. */
  function openDemo(src, kind, label, opener) {
    var id = 'demo-' + src.replace(/[^a-z0-9]+/gi, '-');
    if (existing(id)) return;

    var win = build(id, label, opener);
    win.dataset.icon = kind === 'phone' ? 'phone' : 'web';
    var pane = win.querySelector('.pane');
    win.classList.add('window-demo', kind === 'phone' ? 'is-phone' : 'is-web');
    pane.classList.add('is-frame');

    var holder = pane;
    if (kind === 'phone') {
      holder = document.createElement('div');
      holder.className = 'phone';
      pane.appendChild(holder);
    }
    var frameEl = document.createElement('iframe');
    frameEl.className = 'demo-frame';
    frameEl.src = 'demos/' + src;
    frameEl.title = label;
    holder.appendChild(frameEl);

    if (kind === 'phone') place(win, 392, 812);
    else place(win, 1120, 740);

    windowLayer.appendChild(win);
    settle(win);
    raise(win);
    pane.focus();
  }

  function raise(win) {
    topWindow += 1;
    win.style.zIndex = topWindow;
  }

  function closeWindow(win) {
    var back = win.returnFocusTo;
    if (win.dockTile) win.dockTile.remove();
    win.remove();
    if (back && document.contains(back)) back.focus();
  }

  /* Minimizing ------------------------------------------------------------- */

  /* A minimized window is not closed, it is parked: it keeps its size, its
     scroll position and, for a demo, the iframe it had already loaded. The
     tile in the dock is the way back to it. */

  var DOCK_GLYPH = { folder: '#dock-folder', doc: '#dock-doc', web: '#pf-web', phone: '#pf-phone' };

  function dockTile(win) {
    var slot = document.createElement('li');
    var button = document.createElement('button');
    var glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    var name = document.createElement('span');

    button.type = 'button';
    button.className = 'dock-win';
    button.setAttribute('aria-label', 'Restore ' + win.windowTitle);
    glyph.setAttribute('class', 'glyph');
    glyph.setAttribute('viewBox', '0 0 24 24');
    glyph.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', DOCK_GLYPH[win.dataset.icon] || DOCK_GLYPH.doc);
    name.textContent = win.windowTitle;

    glyph.appendChild(use);
    button.appendChild(glyph);
    button.appendChild(name);
    button.addEventListener('click', function () { restore(win); });
    slot.appendChild(button);
    return slot;
  }

  // Points the window at its dock tile, so the fold runs between the two.
  function aim(win, tile) {
    var from = win.getBoundingClientRect();
    var to = tile.getBoundingClientRect();
    if (!from.width || !to.width) return false;
    win.style.setProperty('--fold-x', (to.left - from.left) + 'px');
    win.style.setProperty('--fold-y', (to.top - from.top) + 'px');
    win.style.setProperty('--fold-sx', (to.width / from.width).toFixed(4));
    win.style.setProperty('--fold-sy', (to.height / from.height).toFixed(4));
    return true;
  }

  // Transitions can be dropped mid flight, so the timer is the backstop.
  function afterFold(win, done) {
    var fired = false;
    function end(event) {
      if (event && event.target !== win) return;
      if (fired) return;
      fired = true;
      clearTimeout(timer);
      win.removeEventListener('transitionend', end);
      done();
    }
    var timer = setTimeout(end, 420);
    win.addEventListener('transitionend', end);
  }

  function minimize(win) {
    if (win.classList.contains('is-min') || win.classList.contains('is-folding')) return;
    var tile = dockTile(win);
    dockMin.appendChild(tile);
    win.dockTile = tile;

    var back = win.returnFocusTo;
    if (back && document.contains(back)) back.focus();

    if (stillness.matches || !aim(win, tile)) {
      win.classList.add('is-min');
      return;
    }
    win.classList.add('is-folding', 'is-folded');
    afterFold(win, function () {
      win.classList.remove('is-folding', 'is-folded');
      win.classList.add('is-min');
    });
  }

  function restore(win) {
    if (!win.classList.contains('is-min')) {
      raise(win);
      win.querySelector('.pane').focus();
      return;
    }
    if (win.dockTile) {
      aim(win, win.dockTile);
      win.dockTile.remove();
      win.dockTile = null;
    }
    win.classList.remove('is-min');
    raise(win);

    if (stillness.matches) {
      win.querySelector('.pane').focus();
      return;
    }
    win.classList.add('is-folded');
    void win.offsetWidth;                 // settle at the dock before unfolding
    win.classList.add('is-folding');
    win.classList.remove('is-folded');
    afterFold(win, function () {
      win.classList.remove('is-folding');
      win.querySelector('.pane').focus();
    });
  }

  /* Window controls -------------------------------------------------------- */

  function zoom(win) {
    var room = desktop.getBoundingClientRect();
    if (win.classList.contains('is-zoomed')) {
      var was = win.wasAt;
      win.style.left = was.left + 'px';
      win.style.top = was.top + 'px';
      win.style.width = was.width + 'px';
      win.style.height = was.height + 'px';
      win.classList.remove('is-zoomed');
      win.querySelector('.zoom').setAttribute('aria-label', 'Maximize window');
      return;
    }
    win.wasAt = {
      left: win.offsetLeft, top: win.offsetTop,
      width: win.offsetWidth, height: win.offsetHeight
    };
    win.style.left = '12px';
    win.style.top = (MENUBAR + 6) + 'px';
    win.style.width = (room.width - 24) + 'px';
    win.style.height = (room.height - MENUBAR - DOCK - 6) + 'px';
    win.classList.add('is-zoomed');
    win.querySelector('.zoom').setAttribute('aria-label', 'Restore window');
  }

  windowLayer.addEventListener('pointerdown', function (event) {
    var win = event.target.closest('.window');
    if (win) raise(win);
  });

  windowLayer.addEventListener('click', function (event) {
    var win = event.target.closest('.window');
    if (!win) return;
    if (event.target.closest('.close')) closeWindow(win);
    else if (event.target.closest('.min')) minimize(win);
    else if (event.target.closest('.zoom')) zoom(win);
  });

  windowLayer.addEventListener('dblclick', function (event) {
    // Two quick drags in a row also land as a double click, and zooming then is
    // not what anyone meant.
    if (Date.now() - dragEndedAt < 360) return;
    if (event.target.closest('.titlebar') && !event.target.closest('.ctl')) {
      zoom(event.target.closest('.window'));
    }
  });

  windowLayer.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var win = event.target.closest('.window');
    if (win) closeWindow(win);
  });

  /* Moving and resizing ---------------------------------------------------- */

  var live = null;
  var dragEndedAt = 0;

  windowLayer.addEventListener('pointerdown', function (event) {
    if (phone.matches || event.button !== 0) return;

    var grip = event.target.closest('.grip');
    var bar = event.target.closest('.titlebar');
    if (!grip && (!bar || event.target.closest('.ctl'))) return;

    var win = event.target.closest('.window');
    if (win.classList.contains('is-zoomed') && !grip) return;

    live = {
      win: win,
      edge: grip ? grip.dataset.grip : null,
      startX: event.clientX,
      startY: event.clientY,
      left: win.offsetLeft,
      top: win.offsetTop,
      width: win.offsetWidth,
      height: win.offsetHeight,
      room: desktop.getBoundingClientRect(),
      lastX: event.clientX,
      lastY: event.clientY,
      shiftX: 0,
      shiftY: 0,
      raf: 0
    };
    win.classList.add(grip ? 'is-sizing' : 'is-moving');
    windowLayer.classList.add('is-busy');
    (grip || bar).setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  /* A move only ever changes where the window sits, so it is a transform, not
     new left/top. Writing left/top relaid out the whole window every pointer
     move, iframe and all, which is what made dragging a demo window feel
     sticky. A resize genuinely changes the box, so that still writes the
     geometry. Either way the work happens once per frame, not once per event. */
  function moveFrame() {
    live.raf = 0;
    var dx = live.lastX - live.startX;
    var dy = live.lastY - live.startY;
    var win = live.win;

    if (!live.edge) {
      var x = Math.min(Math.max(live.left + dx, -live.width + 90), live.room.width - 90) - live.left;
      var y = Math.min(Math.max(live.top + dy, MENUBAR - 6), live.room.height - 48) - live.top;
      live.shiftX = x;
      live.shiftY = y;
      win.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      return;
    }

    var left = live.left, top = live.top, width = live.width, height = live.height;

    if (live.edge.indexOf('e') !== -1) width = Math.max(MIN_W, live.width + dx);
    if (live.edge.indexOf('s') !== -1) height = Math.max(MIN_H, live.height + dy);
    if (live.edge.indexOf('w') !== -1) {
      width = Math.max(MIN_W, live.width - dx);
      left = live.left + (live.width - width);
    }
    if (live.edge.indexOf('n') !== -1) {
      height = Math.max(MIN_H, live.height - dy);
      top = Math.max(MENUBAR - 6, live.top + (live.height - height));
      height = live.top + live.height - top;
    }

    win.style.left = left + 'px';
    win.style.top = top + 'px';
    win.style.width = width + 'px';
    win.style.height = height + 'px';
  }

  windowLayer.addEventListener('pointermove', function (event) {
    if (!live) return;
    live.lastX = event.clientX;
    live.lastY = event.clientY;
    if (Math.abs(event.clientX - live.startX) > 3 || Math.abs(event.clientY - live.startY) > 3) {
      live.moved = true;
    }
    if (!live.raf) live.raf = requestAnimationFrame(moveFrame);
  });

  function release() {
    if (!live) return;
    if (live.raf) { cancelAnimationFrame(live.raf); moveFrame(); }
    // Bake the drag's transform back into left/top, so the next drag and the
    // fold-to-dock animation both start from a window with no transform on it.
    if (!live.edge) {
      live.win.style.transform = '';
      live.win.style.left = (live.left + live.shiftX) + 'px';
      live.win.style.top = (live.top + live.shiftY) + 'px';
    }
    live.win.classList.remove('is-moving', 'is-sizing');
    windowLayer.classList.remove('is-busy');
    // A window that has been moved or resized is no longer the zoomed one.
    if (live.edge) live.win.classList.remove('is-zoomed');
    if (live.moved) dragEndedAt = Date.now();
    live = null;
  }

  windowLayer.addEventListener('pointerup', release);
  windowLayer.addEventListener('pointercancel', release);

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
