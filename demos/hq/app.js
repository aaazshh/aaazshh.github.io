/**
 * The HQ app, rebuilt screen by screen from the Flutter sources in
 * hq-mobile/lib. This file carries what every screen shares (the navigation
 * stack, dialogs and sheets, the Material date and time pickers, the
 * ApiManager port that calls hq-web) and the screens around the home page:
 * SplashRouter, LoginPage, HomePage with the logo animation and the weather
 * chip, MorePage, MyAccountPage, UpdateAccountPage, LanguagePage and AppsPage.
 * The feature screens live in meetings.js, tickets.js, kitchen.js, memos.js
 * and bulletin.js and register themselves on HQ.
 */

'use strict';

var HQ = (function () {
  var app = document.getElementById('app');

  /* ==== l10n (lib/l10n/app_*.arb) ======================================== */
  var LOCALES = { en: 'en-GB', zh: 'zh-CN', ms: 'ms-MY', ta: 'ta-IN' };
  var lang = 'en';
  try { lang = localStorage.getItem('hq-app-lang') || 'en'; } catch (e) {}
  if (!L10N[lang]) lang = 'en';
  function t(k, params) {
    var s = (L10N[lang] && L10N[lang][k]) || L10N.en[k] || k;
    if (params) Object.keys(params).forEach(function (p) { s = s.split('{' + p + '}').join(params[p]); });
    return s;
  }
  function locale() { return LOCALES[lang]; }
  function setLang(l) { lang = l; try { localStorage.setItem('hq-app-lang', l); } catch (e) {} }

  /* ==== helpers ========================================================== */
  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Icons.foo_outlined uses the Outlined set; everything else the Round set.
  function icon(name, cls) {
    var outlined = /_outlined$/.test(name);
    var n = name.replace(/_(outlined|rounded)$/, '');
    return '<span class="' + (outlined ? 'mo' : 'mi') + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + n + '</span>';
  }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseLocal(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(s || ''));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    // An explicit offset (+08:00 / Z) means an instant; convert to this device's clock.
    var z = /([+-])(\d{2}):?(\d{2})$|Z$/.exec(String(s));
    if (z && m[4] !== undefined) {
      var off = z[0] === 'Z' ? 0 : (z[1] === '-' ? -1 : 1) * (+z[2] * 60 + +z[3]);
      d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) - off * 60000);
    }
    return d;
  }
  // Dart DateTime.toIso8601String() for a local DateTime
  function dartIso(d) { return ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.000'; }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // intl DateFormat patterns the screens use, in the active locale
  function dfmt(d, pattern, loc) {
    loc = loc || 'en-GB';
    var o = null;
    switch (pattern) {
      case 'd MMM': return loc === 'en-GB' ? d.getDate() + ' ' + MON[d.getMonth()] : new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(d);
      case 'EEEE': o = { weekday: 'long' }; break;
      case 'EEEEE': o = { weekday: 'narrow' }; break;
      case 'MMM': if (loc === 'en-GB') return MON[d.getMonth()]; o = { month: 'short' }; break;
      case 'MMMM yyyy': o = { month: 'long', year: 'numeric' }; break;
      case 'd MMM yyyy, h:mm a': {
        var h = d.getHours() % 12 || 12;
        return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() + ', ' + h + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
      }
      case 'yyyy-MM-dd hh:mm a': {
        var hh = d.getHours() % 12 || 12;
        return ymd(d) + ' ' + pad(hh) + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
      }
    }
    return new Intl.DateTimeFormat(loc, o).format(d);
  }
  var AVATAR = ['#7B6A4E', '#5F4A26', '#8D7355', '#4A6741', '#4A5867', '#674A4A', '#4A4A67', '#67674A'];
  function avatarColor(name) { return name ? AVATAR[name.charCodeAt(0) % AVATAR.length] : AVATAR[0]; }
  function initials(name) {
    var p = String(name || '').trim().split(' ');
    if (p.length >= 2 && p[0] && p[p.length - 1]) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return name ? name[0].toUpperCase() : '?';
  }
  function raf(fn) {
    // A splash or animation step that waits on a frame also gets a timer, so a
    // hidden frame cannot stall it.
    var done = false;
    function run() { if (done) return; done = true; fn(); }
    requestAnimationFrame(run);
    setTimeout(run, 60);
  }
  function busy(btn, on, label) {
    btn.disabled = on;
    if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spin white"></span>'; }
    else btn.innerHTML = label || btn.dataset.label || btn.innerHTML;
  }

  /* ==== session (SharedPreferences + TokenStorage) ======================= */
  var prefs = {};
  try { prefs = JSON.parse(sessionStorage.getItem('hq-prefs') || '{}') || {}; } catch (e) { prefs = {}; }
  function savePrefs() { try { sessionStorage.setItem('hq-prefs', JSON.stringify(prefs)); } catch (e) {} }
  function token() { return prefs.access_token || null; }

  /* ==== ApiManager (lib/api_manager.dart) ================================ */
  function ErrorDescription(msg) { var e = new Error(msg); e.description = msg; return e; }
  function request(method, path) {
    var body = arguments[2];
    return HqWeb.handle(method, path, body, token()).then(function (res) {
      if (res.status === 401 && path.indexOf('/auth/') !== 0) {
        // _tryRefresh: no stored refresh route in the walkthrough, so log out.
        Api.forceLogout();
      }
      return res;
    });
  }
  var Api = {
    request: request,
    saveUserDetails: function (d) {
      prefs.user_id = String(d.user_id || d.id || ''); prefs.username = d.username || ''; prefs.department = d.department_code || '';
      prefs.role_id = String(d.role_id || ''); prefs.email = d.email || ''; prefs.name = d.name || ''; prefs.is_microsoft = !!d.is_microsoft;
      prefs.profile_picture_base64 = d.profile_picture || '';
      savePrefs();
    },
    getCurrentUserDetails: function () {
      return request('GET', '/me').then(function (r) {
        if (r.status === 200 && r.body.data) Api.saveUserDetails(r.body.data);
        return r.body;
      });
    },
    loginUser: function (u, p) {
      return request('POST', '/auth/login', { username: u, password: p }).then(function (r) {
        if (r.status === 200) {
          prefs.access_token = r.body.access_token; prefs.refresh_token = r.body.refresh_token; savePrefs();
          return Api.getCurrentUserDetails().then(function () { return r.body; });
        }
        return { success: false, message: String((r.body && (r.body.error || r.body.message)) || 'Unknown error') };
      });
    },
    loginWithMicrosoft: function (tk) {
      return request('POST', '/auth/microsoft/login', null).then(function (r) {
        if (r.status === 200) {
          prefs.access_token = r.body.access_token; prefs.refresh_token = r.body.refresh_token; savePrefs();
          return Api.getCurrentUserDetails().then(function () { return r.body; });
        }
        return { success: false, message: String(r.body.error || r.body.message || 'Unknown error') };
      });
    },
    forceLogout: function () {
      return request('POST', '/auth/logout', { refresh_token: prefs.refresh_token, uuid: 'web' }).catch(function () {}).then(function () {
        var keep = {}; prefs = keep; savePrefs();
        push(LoginPage(), { replaceAll: true });
      });
    },
    // POST 'update-account' has no leading slash, so it lands on
    // /api/v1update-account, which hq-web does not route.
    updateAccount: function (b) {
      return request('POST', 'update-account', b).then(function (r) {
        if (r.status === 200) return r.body;
        return { success: false, message: 'HTTP ' + r.status + ': ' + JSON.stringify(r.body).replace(/\//g, '\\/') };
      });
    },
    deleteAccount: function (id) { return Api.updateAccount({ id: id, status_id: 0 }); },
    // Microsoft Graph
    fetchCalendar: function (refresh) {
      return request('GET', '/microsoft/me/calendar?refresh=' + !!refresh).then(function (r) {
        if (r.status === 200 && r.body.success === true) return r.body.data;
        throw ErrorDescription(r.body.message);
      });
    },
    fetchMeetingDetails: function (id) {
      return request('GET', '/microsoft/me/event/' + id).then(function (r) {
        if (r.status === 200 && r.body.success === true) return r.body.data;
        if (r.status === 200) throw ErrorDescription(r.body.message || 'Unknown error');
        return { success: false, message: 'HTTP ' + r.status };
      });
    }
  };

  /* ==== navigation stack ================================================= */
  var stack = [];
  function push(sc, opts) {
    opts = opts || {};
    var node = sc.el;
    if (opts.smooth) node.classList.add('smooth');
    if (opts.replaceAll) {
      closeAllOverlays();
      stack.forEach(function (s) { if (s.leave) s.leave(); s.el.remove(); });
      stack = [];
      node.classList.add('fade');
      node.style.opacity = '0';
      app.appendChild(node);
      stack.push(sc);
      raf(function () { node.style.opacity = '1'; });
      setTimeout(function () { node.style.opacity = ''; node.classList.remove('fade'); }, 350);
      if (sc.enter) sc.enter();
      return;
    }
    var prev = stack[stack.length - 1];
    if (prev) prev.el.inert = true;
    node.classList.add('enter');
    app.appendChild(node);
    stack.push(sc);
    node.getBoundingClientRect();
    raf(function () {
      node.classList.remove('enter');
      if (prev && !opts.smooth) prev.el.classList.add('under');
    });
    if (sc.enter) sc.enter();
  }
  function pop(result) {
    if (stack.length < 2) return;
    var top = stack.pop(), prev = stack[stack.length - 1];
    closeAllOverlays();
    top.el.classList.add('leave');
    top.el.inert = true;
    prev.el.classList.remove('under');
    prev.el.inert = false;
    setTimeout(function () { top.el.remove(); }, 420);
    if (top.leave) top.leave();
    if (prev.resume) prev.resume(result);
  }
  function current() { return stack[stack.length - 1]; }
  // _HqSwipeBack: a rightward fling anywhere past the edge pops too.
  (function () {
    var sx = null, sy = 0, st = 0;
    app.addEventListener('pointerdown', function (e) {
      if (overlays.length || stack.length < 2 || e.target.closest('input, textarea, .hscroll, .dial, .pager, [data-noswipe]')) { sx = null; return; }
      sx = e.clientX; sy = e.clientY; st = performance.now();
    });
    app.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = Math.abs(e.clientY - sy), v = dx / Math.max(1, performance.now() - st) * 1000;
      if (dx > 60 && dy < dx * 0.6 && v > 250 && current() && !current().noSwipe) pop();
      sx = null;
    });
  }());
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (overlays.length) { overlays[overlays.length - 1].close(); return; }
    pop();
  });

  function screen(cls, inner) {
    var node = el('<section class="screen ' + (cls || '') + '">' + inner + '</section>');
    node.addEventListener('click', function (e) { if (e.target.closest('[data-back]')) pop(); });
    return node;
  }
  function hero(title, sub, trailing, back) {
    return '<header class="hero">' + (back === false ? '' : '<button class="hero-back press" data-back aria-label="Back">' + icon('chevron_left_rounded') + '</button>') +
      '<div class="hero-text"><div class="hero-title">' + esc(title) + '</div>' + (sub ? '<div class="hero-sub">' + esc(sub) + '</div>' : '') + '</div>' +
      (trailing || '') + '</header>';
  }
  function pageHeader(title, sub) {
    return '<header class="page-header"><button class="back-btn press" data-back aria-label="Back">' + icon('chevron_left_rounded') + '</button>' +
      '<div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div></header>';
  }

  /* ==== overlays ========================================================= */
  var overlays = [];
  function overlay(node, onClose) {
    var o = { el: node, closed: false };
    o.close = function (v) {
      if (o.closed) return;
      o.closed = true;
      overlays.splice(overlays.indexOf(o), 1);
      node.remove();
      if (onClose) onClose(v);
    };
    overlays.push(o);
    app.appendChild(node);
    return o;
  }
  function closeAllOverlays() { overlays.slice().forEach(function (o) { o.close(); }); }
  // showModalBottomSheet; resolves with the value the sheet closes with.
  function sheet(html, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var node = el('<div><div class="sheet-scrim"></div><div class="sheet ' + (opts.cls || '') + '"' + (opts.height ? ' style="height:' + opts.height + '"' : '') + '>' + html + '</div></div>');
      var o = overlay(node, resolve);
      node.firstChild.onclick = function () { if (opts.dismissible !== false) o.close(); };
      if (opts.wire) opts.wire(node.lastChild, o);
    });
  }
  function dialog(html, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var node = el('<div class="scrim"><div class="dialog ' + (opts.cls || '') + '" role="dialog">' + html + '</div></div>');
      var o = overlay(node, resolve);
      node.addEventListener('click', function (e) { if (e.target === node && opts.dismissible !== false) o.close(); });
      if (opts.wire) opts.wire(node.firstChild, o);
    });
  }
  // AlertDialog(title, content, actions)
  function alert(title, content, actions, cls) {
    return dialog((title ? '<h2 class="' + (cls || '') + '">' + esc(title) + '</h2>' : '') + '<p>' + esc(content) + '</p><div class="actions">' +
      actions.map(function (a, i) { return '<button class="text-btn" data-i="' + i + '" style="' + (a.style || '') + '">' + esc(a.label) + '</button>'; }).join('') + '</div>',
    { wire: function (d, o) { d.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { o.close(actions[+b.dataset.i].value); }; }); } });
  }
  // util_widgets.dart showErrorPopup
  function errorPopup(msg) {
    return dialog('<div class="err-dialog"><img src="assets/aiyo_icon.png" alt=""><div>' + esc(msg) + '</div><button data-close>' + esc(t('back')) + '</button></div>',
      { wire: function (d, o) { d.querySelector('[data-close]').onclick = function () { o.close(); }; } });
  }
  // UtilMethods.showErrorDialog
  function errorDialog(msg, title) {
    return alert(title || 'Something went wrong', msg, [{ label: 'OK' }]);
  }
  // HqCute popups used by the meeting and kitchen screens
  function cute(opts) {
    return dialog('<div class="cute"><div class="cute-icon" style="' + (opts.tint ? 'background:' + opts.tint + ';color:' + opts.color : '') + '">' + icon(opts.icon) + '</div>' +
      '<h3>' + esc(opts.title) + '</h3><p>' + esc(opts.message) + '</p>' + (opts.extra || '') +
      (opts.actions || '<button class="btn btn-green" data-ok>' + esc(opts.ok || t('gotIt')) + '</button>') + '</div>',
    { cls: 'cute', wire: function (d, o) {
      d.querySelectorAll('[data-ok]').forEach(function (b) { b.onclick = function () { o.close(b.dataset.ok || true); }; });
      if (opts.wire) opts.wire(d, o);
    } });
  }
  function snack(msg, color, seconds) {
    var s = el('<div class="snackbar" role="status" style="' + (color ? 'background:' + color : '') + '">' + esc(msg) + '</div>');
    // Scaffold lifts a SnackBar above its bottomNavigationBar.
    var top = current();
    if (top && top.el.querySelector('.glass-nav')) s.style.bottom = '84px';
    app.appendChild(s);
    raf(function () { s.classList.add('show'); });
    setTimeout(function () { s.classList.remove('show'); setTimeout(function () { s.remove(); }, 300); }, (seconds || 3.5) * 1000);
  }
  function note(msg) {
    var n = document.getElementById('demo-note');
    n.textContent = msg;
    n.classList.add('show');
    clearTimeout(n.timer);
    n.timer = setTimeout(function () { n.classList.remove('show'); }, 3800);
  }
  function live(what) { note(what + ' is wired to the live system, not to this walkthrough.'); }
  // showMenu / PopupMenuButton, anchored at a point or a rect
  function menu(x, y, items, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var node = el('<div class="menu-layer"><div class="menu" role="menu">' + items.map(function (it, i) {
        return '<button role="menuitem" data-i="' + i + '" class="' + (it.selected ? 'sel' : '') + '">' + (it.icon ? icon(it.icon) : '') + '<span>' + esc(it.label) + '</span></button>';
      }).join('') + '</div></div>');
      var o = overlay(node, resolve);
      var m = node.firstChild, host = app.getBoundingClientRect();
      node.addEventListener('click', function (e) { if (e.target === node) o.close(); });
      m.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { o.close(items[+b.dataset.i].value); }; });
      var w = opts.width || Math.max(140, m.offsetWidth), h = m.offsetHeight;
      var left = Math.min(Math.max(8, x - host.left), host.width - w - 8), top = Math.min(Math.max(8, y - host.top), host.height - h - 8);
      m.style.left = left + 'px'; m.style.top = top + 'px'; if (opts.width) m.style.width = w + 'px';
    });
  }
  function longPress(node, fn) {
    var timer = null, fired = false;
    node.addEventListener('pointerdown', function (e) {
      fired = false;
      var x = e.clientX, y = e.clientY;
      timer = setTimeout(function () { fired = true; fn({ x: x, y: y }); }, 500);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { node.addEventListener(ev, function () { clearTimeout(timer); }); });
    node.addEventListener('pointermove', function (e) { if (e.movementX * e.movementX + e.movementY * e.movementY > 36) clearTimeout(timer); });
    node.addEventListener('click', function (e) { if (fired) { e.stopImmediatePropagation(); e.preventDefault(); fired = false; } }, true);
    node.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* ==== Material date and time pickers =================================== */
  function datePicker(opts) {
    var sel = startOfDay(opts.initial), first = startOfDay(opts.first), last = startOfDay(opts.last);
    var view = new Date(sel.getFullYear(), sel.getMonth(), 1), today = startOfDay(new Date());
    return new Promise(function (resolve) {
      var node = el('<div class="scrim"><div class="picker" role="dialog"></div></div>');
      var o = overlay(node, resolve);
      node.addEventListener('click', function (e) { if (e.target === node) o.close(null); });
      var box = node.firstChild;
      function ok(d) { return d >= first && d <= last && (!opts.selectable || opts.selectable(d)); }
      function paint() {
        var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate(), lead = view.getDay(), cells = '';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l) { cells += '<span>' + l + '</span>'; });
        for (var i = 0; i < lead; i++) cells += '<span></span>';
        for (var d = 1; d <= days; d++) {
          var dt = new Date(view.getFullYear(), view.getMonth(), d);
          cells += '<button data-d="' + d + '" class="' + (sameDay(dt, sel) ? 'sel' : sameDay(dt, today) ? 'today' : '') + '"' + (ok(dt) ? '' : ' disabled') + '>' + d + '</button>';
        }
        var prevOk = new Date(view.getFullYear(), view.getMonth(), 0) >= first, nextOk = new Date(view.getFullYear(), view.getMonth() + 1, 1) <= last;
        box.innerHTML = '<div class="picker-head"><small>Select date</small><b>' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][sel.getDay()] + ', ' + MON[sel.getMonth()] + ' ' + sel.getDate() + '</b></div>' +
          '<div class="picker-nav"><span>' + MONTH[view.getMonth()] + ' ' + view.getFullYear() + '</span><div><button data-m="-1"' + (prevOk ? '' : ' disabled') + ' aria-label="Previous month">' + icon('chevron_left') + '</button>' +
          '<button data-m="1"' + (nextOk ? '' : ' disabled') + ' aria-label="Next month">' + icon('chevron_right') + '</button></div></div>' +
          '<div class="dp-grid">' + cells + '</div><div class="picker-actions"><button class="text-btn" data-c>Cancel</button><button class="text-btn" data-ok>OK</button></div>';
        box.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { sel = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d); paint(); }; });
        box.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { view = new Date(view.getFullYear(), view.getMonth() + +b.dataset.m, 1); paint(); }; });
        box.querySelector('[data-c]').onclick = function () { o.close(null); };
        box.querySelector('[data-ok]').onclick = function () { o.close(sel); };
      }
      paint();
    });
  }
  function timePicker(initial) {
    var h = initial.h, m = initial.m, mode = 'h';
    return new Promise(function (resolve) {
      var node = el('<div class="scrim"><div class="picker" role="dialog"></div></div>');
      var o = overlay(node, resolve);
      node.addEventListener('click', function (e) { if (e.target === node) o.close(null); });
      var box = node.firstChild;
      function paint() {
        var h12 = h % 12 || 12, pm = h >= 12, nums = '', val = mode === 'h' ? h12 : m;
        for (var i = 0; i < 12; i++) {
          var n = mode === 'h' ? (i === 0 ? 12 : i) : i * 5, a = i * 30 * Math.PI / 180;
          nums += '<span style="left:' + (128 + 100 * Math.sin(a)) + 'px;top:' + (128 - 100 * Math.cos(a)) + 'px" class="' + (n === val || (mode === 'm' && n === 0 && val === 0) ? 'on' : '') + '">' + (mode === 'm' ? pad(n) : n) + '</span>';
        }
        var ang = (mode === 'h' ? (h12 % 12) * 30 : m * 6) * Math.PI / 180;
        box.innerHTML = '<div class="tp"><small>Select time</small><div class="tp-disp"><button data-mode="h" class="' + (mode === 'h' ? 'on' : '') + '">' + pad(h12) + '</button><i>:</i>' +
          '<button data-mode="m" class="' + (mode === 'm' ? 'on' : '') + '">' + pad(m) + '</button><div class="tp-ampm"><button data-ap="0" class="' + (pm ? '' : 'on') + '">AM</button><button data-ap="1" class="' + (pm ? 'on' : '') + '">PM</button></div></div>' +
          '<div class="dial"><div class="hand" style="height:100px;margin-left:-1px;margin-top:-100px;transform:rotate(' + ang + 'rad)"></div>' +
          '<div class="knob" style="left:' + (128 + 100 * Math.sin(ang)) + 'px;top:' + (128 - 100 * Math.cos(ang)) + 'px"></div><div class="center"></div>' + nums + '</div></div>' +
          '<div class="picker-actions"><button class="text-btn" data-c>Cancel</button><button class="text-btn" data-ok>OK</button></div>';
        box.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { mode = b.dataset.mode; paint(); }; });
        box.querySelectorAll('[data-ap]').forEach(function (b) { b.onclick = function () { var want = b.dataset.ap === '1'; if (want !== (h >= 12)) h = (h + 12) % 24; paint(); }; });
        box.querySelector('[data-c]').onclick = function () { o.close(null); };
        box.querySelector('[data-ok]').onclick = function () { o.close({ h: h, m: m }); };
        var dial = box.querySelector('.dial');
        function pick(e, final) {
          var r = box.querySelector('.dial').getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
          var deg = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
          if (mode === 'h') { var hh = Math.round(deg / 30) % 12; h = (h >= 12 ? 12 : 0) + hh; }
          else m = Math.round(deg / 6) % 60;
          if (final && mode === 'h') mode = 'm';
          paint();
        }
        dial.onpointerdown = function (e) {
          pick(e);
          var mv = function (ev) { pick(ev); }, up = function (ev) { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); pick(ev, true); };
          document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
        };
      }
      paint();
    });
  }
  // Pick an image the way image_picker does on web (the gallery), scaled like
  // pickImage(maxWidth: 1200, maxHeight: 900). The picture stays in this tab.
  function pickImage(maxW, maxH, quality) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        if (!f) return resolve(null);
        var img = new Image(), url = URL.createObjectURL(f);
        img.onload = function () {
          var s = Math.min(1, (maxW || 1200) / img.width, (maxH || 900) / img.height), c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL('image/jpeg', quality || 0.85));
        };
        img.onerror = function () { resolve(null); };
        img.src = url;
      };
      inp.click();
    });
  }
  // The "From photos / Take photo" sheet shown before the picker on phones.
  function imageSourceSheet() {
    return sheet('<div class="handle line"></div><div class="src-list" style="padding:12px 0 12px">' +
      '<button data-s="gallery"><i style="background:#EFF6FF;color:#1D4ED8">' + icon('photo_library_outlined') + '</i><div><b>' + esc(t('fromPhotos')) + '</b><small>' + esc(t('chooseFromGallery')) + '</small></div></button>' +
      '<button data-s="camera"><i style="background:#F0FDF4;color:#15803D">' + icon('camera_alt_outlined') + '</i><div><b>' + esc(t('takePhoto')) + '</b><small>' + esc(t('useCamera')) + '</small></div></button></div>',
    { cls: 'r16', wire: function (s, o) { s.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { o.close(b.dataset.s); }; }); } });
  }
  function pickFromSource(maxW, maxH, q) {
    return imageSourceSheet().then(function (src) {
      if (!src) return null;
      if (src === 'camera') { live('The camera'); return null; }
      return pickImage(maxW, maxH, q);
    });
  }

  /* ==== SplashRouter ====================================================== */
  function SplashRouter() {
    var node = screen('', '<div class="splash pulse"><div class="splash-leaf">' + icon('eco_outlined') + '</div><div class="splash-bar"></div></div>');
    var sc = { el: node };
    sc.enter = function () {
      raf(function () {
        setTimeout(function () { push(token() ? HomePage(false) : LoginPage(), { replaceAll: true }); }, 450);
      });
    };
    return sc;
  }

  /* ==== LoginPage ========================================================= */
  function LoginPage() {
    var node = screen('login', '<div class="login-wrap">' +
      '<button class="lang-link press" data-lang>' + esc(t('selectLanguage')) + '</button>' +
      '<img class="login-logo" src="assets/hq_logo.png" alt="HQ">' +
      '<form class="glass" novalidate autocomplete="off">' +
      '<div class="login-field">' + icon('person_outline_rounded') + '<input name="u" placeholder="' + esc(t('enterUsername')) + '"></div>' +
      '<div class="login-field">' + icon('lock_outline_rounded') + '<input name="p" type="password" placeholder="' + esc(t('enterPassword')) + '">' +
      '<button type="button" class="eye" data-eye aria-label="Show password">' + icon('visibility_off_rounded') + '</button></div>' +
      '<div style="height:6px"></div><button class="primary-btn" type="submit" data-login>' + esc(t('login')) + '</button>' +
      '<button type="button" class="ms-btn press" data-ms><img src="assets/microsoft.png" alt="">Sign in with Microsoft</button></form>' +
      '<div class="version">v1.0.8</div></div>');
    var sc = { el: node, noSwipe: true };
    sc.resume = function () { push(LoginPage(), { replaceAll: true }); };
    var loading = false, msLoading = false, form = node.querySelector('form'), btn = node.querySelector('[data-login]'), ms = node.querySelector('[data-ms]');
    node.querySelector('[data-lang]').onclick = function () { push(LanguagePage()); };
    node.querySelector('[data-eye]').onclick = function () {
      var p = form.p; p.type = p.type === 'password' ? 'text' : 'password';
      this.innerHTML = icon(p.type === 'password' ? 'visibility_off_rounded' : 'visibility_rounded');
    };
    function done(res) {
      if (res.success) push(HomePage(true), { replaceAll: true });
      else errorPopup(res.message);
    }
    form.onsubmit = function (e) {
      e.preventDefault();
      if (loading || msLoading) return;
      if (document.activeElement) document.activeElement.blur();
      if (form.u.value === '') return errorPopup(t('noUsernameError'));
      if (form.p.value === '') return errorPopup(t('noPasswordError'));
      loading = true; busy(btn, true); ms.disabled = true;
      Api.loginUser(form.u.value, form.p.value).then(function (r) {
        loading = false; busy(btn, false); ms.disabled = false; done(r);
      });
    };
    ms.onclick = function () {
      if (loading || msLoading) return;
      msLoading = true; btn.disabled = true;
      ms.innerHTML = '<span class="wave-dots"><i></i><i></i><i></i></span>';
      note('Microsoft sign-in runs through IAM on the live system. The walkthrough signs you straight in as the Microsoft account.');
      setTimeout(function () {
        Api.loginWithMicrosoft('iam-token').then(function (r) {
          msLoading = false; btn.disabled = false;
          ms.innerHTML = '<img src="assets/microsoft.png" alt="">Sign in with Microsoft';
          if (r.success === true) {
            // Outlet accounts have digits in their Microsoft email.
            if (/\d/.test(prefs.email || '')) { Api.forceLogout(); return errorPopup('No Access: This Microsoft account is not allowed to use the HQ app.'); }
            push(HomePage(true), { replaceAll: true });
          } else errorPopup('Error: ' + r.message);
        });
      }, 1100);
    };
    return sc;
  }

  /* ==== hello_animation_screen.dart (LogoDrawPainter) ===================== */
  function helloAnimation() {
    var node = el('<div class="hello" role="presentation"><canvas width="440" height="440"></canvas></div>');
    var o = overlay(node);
    var cv = node.querySelector('canvas'), ctx = cv.getContext('2d'), size = 220, dpr = 2;
    var u = size / 100, P = function (x, y) { return (x * u).toFixed(2) + ' ' + (y * u).toFixed(2); };
    var strokes = [
      { w: 12.4, cap: 'round', weight: 1.1, subs: ['M' + P(21, 28) + 'C' + P(12, 31) + ' ' + P(8.5, 43) + ' ' + P(10.5, 56) + 'C' + P(13, 72) + ' ' + P(26, 84) + ' ' + P(41, 89),
        'M' + P(79, 28) + 'C' + P(88, 31) + ' ' + P(91.5, 43) + ' ' + P(89.5, 56) + 'C' + P(87, 72) + ' ' + P(74, 84) + ' ' + P(59, 89)] },
      { w: 12.8, cap: 'square', weight: 0.45, subs: ['M' + P(50, 94) + 'L' + P(50, 50)] },
      { w: 11.3, cap: 'round', weight: 0.7, subs: ['M' + P(22, 27) + 'C' + P(33, 29) + ' ' + P(43, 38) + ' ' + P(50, 49) + 'C' + P(57, 38) + ' ' + P(67, 29) + ' ' + P(78, 27)] },
      { w: 7.1, cap: 'round', weight: 0.65, subs: ['M' + P(28, 18.5) + 'C' + P(36.5, 19.5) + ' ' + P(43.5, 24) + ' ' + P(50, 30.5) + 'C' + P(56.5, 24) + ' ' + P(63.5, 19.5) + ' ' + P(72, 18.5),
        'M' + P(36.5, 11) + 'Q' + P(43.5, 12) + ' ' + P(50, 17.8) + 'Q' + P(56.5, 12) + ' ' + P(63.5, 11)] }
    ];
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.appendChild(svg);
    strokes.forEach(function (s) {
      s.metrics = s.subs.map(function (d) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', d); svg.appendChild(p);
        return { path: new Path2D(d), el: p, len: p.getTotalLength() };
      });
    });
    var total = strokes.reduce(function (a, s) { return a + s.weight; }, 0);
    function easeInOut(x) { // Curves.easeInOut, cubic-bezier(0.42, 0, 0.58, 1)
      var lo = 0, hi = 1;
      for (var i = 0; i < 24; i++) { var mid = (lo + hi) / 2, bx = 3 * 0.42 * mid * (1 - mid) * (1 - mid) + 3 * 0.58 * mid * mid * (1 - mid) + mid * mid * mid; if (bx < x) lo = mid; else hi = mid; }
      var tt = (lo + hi) / 2; return 3 * tt * tt * (1 - tt) + tt * tt * tt;
    }
    function draw(progress) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      var used = 0, tip = null;
      for (var i = 0; i < strokes.length; i++) {
        var s = strokes[i], st = used / total, en = (used + s.weight) / total;
        used += s.weight;
        if (progress <= st) break;
        var sp = Math.min(1, Math.max(0, (progress - st) / (en - st)));
        ctx.strokeStyle = '#2F8754'; ctx.lineWidth = s.w * u; ctx.lineCap = s.cap; ctx.lineJoin = 'round';
        s.metrics.forEach(function (m) {
          var vis = m.len * sp;
          if (vis <= 0.01) return;
          ctx.setLineDash([vis, m.len + 1]);
          ctx.stroke(m.path);
          if (sp < 1) { var pt = m.el.getPointAtLength(vis); tip = { x: pt.x, y: pt.y }; }
        });
      }
      ctx.setLineDash([]);
      if (tip && progress < 1) {
        ctx.save(); ctx.filter = 'blur(8px)'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(tip.x, tip.y, size * 0.045, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tip.x, tip.y, size * 0.028, 0, Math.PI * 2); ctx.fill();
      }
    }
    var t0 = null, dismissed = false, finished = false, pending = false;
    function frame() {
      pending = false;
      if (finished) return;
      var now = performance.now(); if (t0 === null) t0 = now;
      var e = now - t0 - 400;
      draw(e <= 0 ? 0 : e >= 2800 ? 1 : easeInOut(e / 2800));
      if (e >= 2800 + 700 && !dismissed) return dismiss();
      schedule();
    }
    function schedule() { if (pending) return; pending = true; raf(frame); }
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      node.classList.remove('show');
      setTimeout(function () { finished = true; svg.remove(); o.close(); }, 400);
    }
    node.onclick = dismiss;
    draw(0);
    raf(function () { node.classList.add('show'); schedule(); });
    setTimeout(dismiss, 400 + 2800 + 700 + 200);
  }

  /* ==== weather (features/weather) ======================================== */
  var WEATHER = { cityName: 'Singapore', temp: 31, feels: 36, condition: 'broken clouds', code: 803, humidity: 70, wind: 13, rain: 20,
    forecast: [['Today', 803, 31, 20], [null, 500, 32, 64], [null, 802, 32, 38], [null, 211, 30, 81]] };
  function wiClass(code) {
    if (code >= 200 && code < 300) return 'wi-thunderstorm';
    if (code >= 300 && code < 400) return 'wi-sprinkle';
    if (code >= 500 && code < 510) return 'wi-rain';
    if (code === 511) return 'wi-sleet';
    if (code > 511 && code < 600) return 'wi-showers';
    if (code >= 600 && code < 700) return 'wi-snow';
    if (code >= 700 && code < 800) return 'wi-fog';
    if (code === 800) return 'wi-day-sunny';
    if (code === 801) return 'wi-day-cloudy';
    if (code === 802) return 'wi-cloud';
    if (code === 803 || code === 804) return 'wi-cloudy';
    return 'wi-na';
  }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function weatherChip() {
    return '<button class="weather-chip" data-weather><i class="wi ' + wiClass(WEATHER.code) + '"></i>' + esc(cap(WEATHER.condition)) + ' · ' + WEATHER.temp + '°C</button>';
  }
  function showWeather() {
    var dn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], now = new Date();
    var days = WEATHER.forecast.map(function (f, i) {
      var name = f[0] || dn[(addDays(now, i).getDay() + 6) % 7];
      return '<div class="wx-day"><small>' + name + '</small><i class="wi ' + wiClass(f[1]) + '"></i><b>' + f[2] + '°</b><em>' + f[3] + '%</em></div>';
    }).join('');
    function stat(label, value, cls) { return '<div class="wx-stat"><i class="wi ' + cls + '"></i><b>' + value + '</b><small>' + label + '</small></div>'; }
    sheet('<div class="handle"></div><div class="wx"><div class="wx-city">' + icon('location_on_outlined') + '<span class="name">' + WEATHER.cityName + '</span><button class="wx-close" data-x aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="wx-now"><div><div class="wx-temp">' + WEATHER.temp + '°C</div><div class="wx-cond">' + esc(cap(WEATHER.condition)) + ' · Feels like ' + WEATHER.feels + '°</div></div><i class="wi ' + wiClass(WEATHER.code) + '"></i></div>' +
      '<hr><div class="wx-days">' + days + '</div><hr><div class="wx-stats">' + stat('Humidity', WEATHER.humidity + '%', 'wi-humidity') + stat('Wind', WEATHER.wind + ' km/h', 'wi-strong-wind') + stat('Rain today', WEATHER.rain + '%', 'wi-rain') + '</div></div>',
    { wire: function (s, o) { s.querySelector('[data-x]').onclick = function () { o.close(); }; } });
  }

  /* ==== HomePage ========================================================== */
  var WIDGETS = [
    ['Meetings', 'meeting_room_outlined', 'meet', 'meetings'], ['Apps', 'apps_rounded', 'apps', 'apps'],
    ['IT Ticketing', 'confirmation_number_outlined', 'ticket', 'ticketing'], ['Meal Order', 'restaurant_menu_outlined', 'meal', 'mealOrder'],
    ['Memos', 'sticky_note_2_outlined', 'memo', 'memos'], ['Bulletin Board', 'push_pin_outlined', 'bull', 'bulletinBoardTitle']
  ];
  function HomePage(showAnimation) {
    var roleId = +prefs.role_id || 0, department = prefs.department || '', username = prefs.username || '';
    var canSeeMemos = roleId === 1 || roleId === 2 || ['MERCH', 'MERCH_HQ'].indexOf(department.trim().toUpperCase()) !== -1;
    var items = WIDGETS.filter(function (w) { return canSeeMemos || w[0] !== 'Memos'; });
    var rows = '';
    for (var i = 0; i < items.length; i += 3) {
      var row = items.slice(i, i + 3);
      rows += '<div class="widget-row">' + row.map(function (w) {
        return '<button class="widget press" data-w="' + w[0] + '"><span class="hq-tile" style="--bg:var(--t-' + w[2] + '-bg);--ink:var(--t-' + w[2] + '-ink)">' + icon(w[1]) + '</span><b>' + esc(t(w[3])) + '</b></button>';
      }).join('') + (row.length < 3 ? new Array(3 - row.length + 1).join('<span class="widget ghost"></span>') : '') + '</div>';
    }
    var node = screen('', '<div class="pager" data-noswipe><div class="page">' +
      '<header class="home-head"><div class="home-avatar">' + icon('person') + '</div><div class="home-who"><b>' + esc(username || t('loading')) + '</b>' +
      (department ? '<small>' + esc(department) + '</small>' : '') + '</div>' + weatherChip() + '</header>' +
      '<div class="scroll"><div class="home-body"><div class="entrance" style="animation-delay:60ms"><div class="label-caps">' + esc(t('quickAccess').toUpperCase()) + '</div>' +
      '<div class="widget-card">' + rows + '</div></div><div style="height:10px"></div><div class="entrance" style="animation-delay:140ms" data-upcoming></div></div></div></div>' +
      '<div class="page"><div class="more-head"><img src="assets/hq_logo.png" alt="HQ"></div>' + moreContent() + '</div></div>' +
      '<nav class="glass-nav" aria-label="Main"><div class="inner"><button class="nav-btn home on press" data-nav="0" aria-label="Home"><img src="assets/prime_nav.png" alt=""></button>' +
      '<button class="nav-btn more press" data-nav="1" aria-label="More">' + icon('more_horiz_rounded') + '</button></div></nav>');
    var sc = { el: node, noSwipe: true }, events = [], loadingEvents = false, page = 0;
    var pager = node.querySelector('.pager'), up = node.querySelector('[data-upcoming]');
    function paintEvents() {
      var groups = {}, order = [];
      events.forEach(function (e) {
        var key = e.start_time ? e.start_time.slice(0, 10) : 'Unknown';
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(e);
      });
      var now = new Date(), tomorrow = addDays(now, 1);
      up.innerHTML = '<div class="upcoming-head"><div class="label-caps">' + esc(t('upcomingSection')) + '</div>' +
        '<button class="icon-press press" data-refresh aria-label="Refresh">' + (loadingEvents ? '<span class="spin sm"></span>' : icon('refresh_rounded')) + '</button></div>' +
        '<div class="events-card"><div class="events-top">' + icon('calendar_today_rounded') + esc(t('upcomingEvents')) + '</div><div class="events-body">' +
        order.map(function (k) {
          var d = parseLocal(k), label = d && sameDay(d, now) ? t('today') : d && sameDay(d, tomorrow) ? t('tomorrow') : '';
          return '<div class="ev-date"><b>' + (d ? d.getDate() + ' ' + MON[d.getMonth()] : esc(k)) + '</b>' + (label ? '<span>' + esc(label) + '</span>' : '') + '</div>' +
            groups[k].map(function (e) {
              return '<button class="ev-row press" data-ev="' + esc(e.id) + '"><span class="bar"></span><span class="main"><b>' + esc(e.title) + '</b><small>' + esc(e.location) + '</small></span>' +
                '<span class="side"><b>' + esc(e.time || '') + '</b><small>' + esc(e.duration || '') + '</small></span></button>';
            }).join('') + '<div style="height:4px"></div>';
        }).join('') + '</div></div>';
      up.querySelector('[data-refresh]').onclick = function () { if (!loadingEvents) loadEvents(true); };
      up.querySelectorAll('[data-ev]').forEach(function (b) { b.onclick = function () { openMeetingDetails(b.dataset.ev); }; });
    }
    function loadEvents(refresh) {
      loadingEvents = true; paintEvents();
      Api.fetchCalendar(refresh).then(function (list) { events = list; }).catch(function () {}).then(function () { loadingEvents = false; paintEvents(); });
    }
    function goTo(i) {
      page = i;
      pager.style.transform = 'translateX(' + (-100 * i) + '%)';
      node.querySelectorAll('[data-nav]').forEach(function (b) { b.classList.toggle('on', +b.dataset.nav === i); });
    }
    node.querySelectorAll('[data-nav]').forEach(function (b) { b.onclick = function () { if (page !== +b.dataset.nav) goTo(+b.dataset.nav); }; });
    // PageView: a horizontal swipe flips between Home and More.
    (function () {
      var sx = null, sy = 0;
      pager.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
      pager.addEventListener('pointerup', function (e) {
        if (sx === null) return;
        var dx = e.clientX - sx, dy = Math.abs(e.clientY - sy);
        if (Math.abs(dx) > 70 && dy < Math.abs(dx) * 0.6) goTo(dx < 0 ? 1 : 0);
        sx = null;
      });
    }());
    node.querySelector('[data-weather]').onclick = showWeather;
    node.querySelectorAll('[data-w]').forEach(function (b) {
      b.onclick = function () {
        var w = b.dataset.w, ms = !!prefs.is_microsoft;
        if ((w === 'Meetings' || w === 'IT Ticketing') && !ms) return snack(t('microsoftLoginRequired'), null, 2);
        if (w === 'Meetings') push(HQ.screens.MeetingRoomsPage(), { smooth: true });
        else if (w === 'Apps') push(AppsPage());
        else if (w === 'IT Ticketing') push(HQ.screens.TicketingPage());
        else if (w === 'Meal Order') push(HQ.screens.MealOrderPage());
        else if (w === 'Memos') push(HQ.screens.MemoListPage());
        else if (w === 'Bulletin Board') push(HQ.screens.BulletinBoardPage());
      };
    });
    wireMore(node.querySelector('.more-list'));
    sc.enter = function () {
      loadEvents(false);
      if (showAnimation) raf(helloAnimation);
    };
    sc.sig = lang + '|' + prefs.username + '|' + prefs.department;
    sc.resume = function () {
      // Only a language or account change repaints the page, as the locale
      // rebuild does in Flutter; otherwise the page keeps its state.
      if (sc.sig === lang + '|' + prefs.username + '|' + prefs.department) return;
      var fresh = HomePage(false), keep = page;
      stack[stack.indexOf(sc)] = fresh;
      node.replaceWith(fresh.el);
      fresh.enter();
      if (keep) fresh.goTo(keep);
    };
    sc.goTo = goTo;
    return sc;
  }
  function openMeetingDetails(id) {
    sheet('<div class="md-sheet"><div class="handle" style="margin-top:0"></div><div class="md-body" data-body><div style="display:grid;place-items:center;height:100%"><span class="spin"></span></div></div></div>', {
      height: '90%',
      wire: function (s) {
        var body = s.querySelector('[data-body]');
        Api.fetchMeetingDetails(id).then(function (data) {
          if (data.success === false) throw new Error();
          var STATUS = { accepted: ['Accepted', '#2E7D32'], declined: ['Declined', '#C62828'], tentativelyAccepted: ['Maybe', '#F9A825'] };
          function row(label, v) { return v ? '<div class="md-row"><b>' + esc(label) + ':</b><span>' + esc(v) + '</span></div>' : ''; }
          function link(label, url) { return '<div class="md-row"><b>' + esc(label) + ':</b><span><a data-link>' + esc(url) + '</a></span></div>'; }
          function fmt(v) { var d = parseLocal(v); return d ? dfmt(d, 'yyyy-MM-dd hh:mm a') : ''; }
          body.innerHTML = '<h3>' + esc(data.title || t('noTitle')) + '</h3>' + row(t('start'), fmt(data.start_time)) + row(t('end'), fmt(data.end_time)) +
            row(t('organizer'), data.organizer_name) + row(t('email'), data.organizer_email) +
            '<div style="height:12px"></div><b style="display:block">' + esc(t('details')) + '</b><div style="margin-top:6px;font-size:14px;line-height:1.4">' + (data.body || '') + '</div><div style="height:16px"></div>' +
            (data.web_link ? link('Web Link', data.web_link) : '') + (data.online_meeting_url ? link('Online Meeting', data.online_meeting_url) : '') +
            '<div style="height:16px"></div><b style="display:block;margin-bottom:8px">' + esc(t('attendees')) + '</b>' +
            (data.attendees || []).map(function (a) {
              var org = data.organizer_email === a.email, st = STATUS[a.status] || ['No response', '#757575'];
              return '<div class="md-att">' + icon('person_outline') + '<div><b>' + esc(a.name || 'Unknown') + '</b><small>' + esc(a.email || '') + '</small></div>' +
                '<em style="color:' + st[1] + ';border-color:' + st[1] + ';background:' + st[1] + '1f">' + esc(org ? t('organizer') : st[0]) + '</em></div>';
            }).join('');
          body.querySelectorAll('[data-link], a').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); live('Opening Outlook and Teams links'); }; });
        }).catch(function () {
          body.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:red">Failed to load meeting</div>';
        });
      }
    });
  }

  /* ==== MorePageContent + MyAccount + UpdateAccount + Language ============ */
  function moreContent() {
    return '<div class="more-list"><button class="press" data-acct>' + icon('person_outline_rounded') + '<span>' + esc(t('myAccount')) + '</span></button><i class="more-div"></i>' +
      '<button class="press" data-lang>' + icon('language_rounded') + '<span>' + esc(t('changeLanguage')) + '</span></button><i class="more-div"></i>' +
      '<button class="press red" data-out>' + icon('logout_rounded') + '<span>' + esc(t('logout')) + '</span></button></div>';
  }
  function wireMore(list) {
    list.querySelector('[data-acct]').onclick = function () { push(MyAccountPage()); };
    list.querySelector('[data-lang]').onclick = function () { push(LanguagePage()); };
    list.querySelector('[data-out]').onclick = function () { Api.forceLogout(); };
  }
  function roleName(id) {
    return t({ 1: 'superAdminRole', 2: 'adminRole', 3: 'staffRole', 4: 'approverRole' }[id] || 'userRole');
  }
  function MyAccountPage() {
    var node = screen('', '');
    var sc = { el: node };
    function paint() {
      var un = prefs.username && prefs.username !== '-' ? prefs.username : t('notAvailable');
      node.innerHTML = hero(t('myAccount')) + '<div class="scroll" style="padding:22px 18px 24px"><h2 class="acct-title">' + esc(t('accountDetails')) + '</h2>' +
        '<div class="acct-card"><div class="acct-row"><b>' + esc(t('username')) + '</b><span>' + esc(un) + '</span></div><hr>' +
        '<div class="acct-row"><b>' + esc(t('email')) + '</b><span>' + esc(prefs.email || t('notAvailable')) + '</span></div><hr>' +
        '<div class="acct-row"><b>' + esc(t('role')) + '</b><span>' + esc(roleName(+prefs.role_id)) + '</span></div></div>' +
        '<div style="height:32px"></div><button class="acct-btn" data-upd style="background:var(--green)">' + icon('edit_rounded') + esc(t('updateAccountDetails')) + '</button>' +
        '<div style="height:14px"></div><button class="acct-btn" data-del style="background:var(--danger)">' + icon('delete_forever_rounded') + esc(t('deleteAccount')) + '</button></div>';
      node.querySelector('[data-upd]').onclick = function () { push(UpdateAccountPage()); };
      node.querySelector('[data-del]').onclick = function () {
        dialog('<h2 class="bold">' + esc(t('deleteAccount')) + '</h2><p style="color:#555;font-weight:500;line-height:1.35">' + esc(t('deleteAccountConfirmation')) + '</p>' +
          '<div class="actions"><button class="text-btn" data-c style="font-weight:700">' + esc(t('cancel')) + '</button>' +
          '<button class="btn btn-danger" data-d style="width:auto;height:40px;padding:0 20px;border-radius:8px;font-weight:500">' + esc(t('delete')) + '</button></div>',
        { cls: 'sq', wire: function (d, o) {
          d.querySelector('[data-c]').onclick = function () { o.close(); };
          d.querySelector('[data-d]').onclick = function () {
            o.close();
            Api.deleteAccount(+prefs.user_id).then(function (res) {
              if (res.success === true) Api.forceLogout();
              else snack(res.message || 'Failed to delete account.', 'orange');
            });
          };
        } });
      };
    }
    sc.enter = paint;
    sc.resume = paint;
    return sc;
  }
  function UpdateAccountPage() {
    var node = screen('', hero('Update Account') + '<form class="scroll" style="padding:20px" novalidate>' +
      '<p style="margin:0;text-align:center;font-size:16px;color:#9E9E9E">Edit your account details below.</p><div style="height:25px"></div>' +
      '<div class="outline-field" data-f="u">' + icon('account_circle_outlined') + '<input name="u" placeholder=" " value="' + esc(prefs.username || '') + '"><label>Username</label></div>' +
      '<div style="height:16px"></div><div class="outline-field" data-f="e">' + icon('email_outlined') + '<input name="e" type="email" placeholder=" " value="' + esc(prefs.email || '') + '"><label>Email</label></div>' +
      '<div style="height:30px"></div><button class="primary-btn" type="submit">' + icon('save_rounded') + 'Save Changes</button></form>');
    var sc = { el: node }, form = node.querySelector('form');
    function setErr(f, msg) {
      var box = form.querySelector('[data-f="' + f + '"]'), m = box.querySelector('.msg');
      box.classList.toggle('err', !!msg);
      if (m) m.remove();
      if (msg) box.insertAdjacentHTML('beforeend', '<div class="msg">' + esc(msg) + '</div>');
    }
    form.onsubmit = function (e) {
      e.preventDefault();
      var u = form.u.value, em = form.e.value, ok = true;
      setErr('u', u === '' ? 'Please enter your username' : ''); if (u === '') ok = false;
      var emErr = em === '' ? 'Please enter your email' : /^[^@]+@[^@]+\.[^@]+/.test(em) ? '' : 'Please enter a valid email address';
      setErr('e', emErr); if (emErr) ok = false;
      if (!ok) return;
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.innerHTML = '<span class="spin white"></span>';
      Api.updateAccount({ id: +prefs.user_id, username: u.trim(), email: em.trim() }).then(function (res) {
        btn.disabled = false; btn.innerHTML = icon('save_rounded') + 'Save Changes';
        if (res.success === true) {
          prefs.username = u.trim(); prefs.email = em.trim(); savePrefs();
          snack('Account updated successfully!', 'var(--green)');
          pop();
        } else snack(res.message || 'Update failed', '#FF5252');
      });
    };
    return sc;
  }
  function LanguagePage() {
    var node = screen('', '');
    var sc = { el: node };
    var OPTS = [['en', 'English', 'englishLanguageSubtitle'], ['zh', '简体中文', 'chineseLanguageSubtitle'],
      ['ms', 'Bahasa Melayu', 'malayLanguageSubtitle'], ['ta', 'தமிழ்', 'tamilLanguageSubtitle']];
    function paint() {
      node.innerHTML = '<header class="appbar"><button class="icon-btn" data-back aria-label="Back">' + icon('arrow_back') + '</button><div class="appbar-title"><b>' + esc(t('language')) + '</b><small>' + esc(t('preferredLanguage')) + '</small></div></header>' +
        '<div class="scroll" style="padding:18px 16px 24px"><p style="margin:0 0 16px;color:#555;font-size:13px;font-weight:500;line-height:1.35">' + esc(t('languageInstruction')) + '</p>' +
        OPTS.map(function (o) {
          var on = o[0] === lang;
          return '<button class="lang-card press' + (on ? ' on' : '') + '" data-l="' + o[0] + '"><span class="ico">' + icon('translate_rounded') + '</span><span style="flex:1"><b>' + o[1] + '</b><small>' + esc(t(o[2])) + '</small></span>' +
            '<span class="radio">' + (on ? icon('check_rounded') : '') + '</span></button>';
        }).join('') + '</div>';
      node.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { if (b.dataset.l === lang) return; setLang(b.dataset.l); paint(); }; });
    }
    paint();
    return sc;
  }

  /* ==== AppsPage ========================================================== */
  var APPS = [
    { name: 'BIPO', img: 'assets/app_BIPO.png', category: 'People', bg: '#E6EEF8', ink: '#2E5594' },
    { name: 'Prime', img: 'assets/app_PRIMESG.png', category: 'Retail', bg: '#FBE6D7', ink: '#A0501F' },
    { name: 'POPcard', img: 'assets/app_POPcard.png', category: 'Retail', bg: '#FCE8C0', ink: '#8C6515' },
    { name: 'Forms', img: 'assets/app_forms.png', category: 'Operations', bg: '#E2EEDE', ink: '#3A6B36' },
    { name: 'Retail', img: 'assets/Retail_Icon.jpg', category: 'Operations', bg: '#E3EAF6', ink: '#2E4A8C' }
  ];
  function AppsPage() {
    var active = 'All';
    var node = screen('', hero(t('apps'), t('appsSubtitle')) + '<div class="scroll" style="padding:14px 18px 40px" data-body></div>');
    var sc = { el: node }, body = node.querySelector('[data-body]');
    function catLabel(c) { return c === 'People' ? t('categoryPeople') : c === 'Retail' ? t('categoryRetail') : c === 'Operations' ? t('categoryOperations') : t('all'); }
    function mix(a, b, f) {
      var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), r = [16, 8, 0].map(function (s) { var x = (pa >> s) & 255, y = (pb >> s) & 255; return Math.round(x + (y - x) * f); });
      return 'rgb(' + r.join(',') + ')';
    }
    function paint() {
      var apps = APPS.filter(function (a) { return active === 'All' || a.category === active; });
      body.innerHTML = '<div class="cat-chips hscroll">' + ['All', 'People', 'Retail', 'Operations'].map(function (c) {
        return '<button class="cat-chip' + (c === active ? ' on' : '') + '" data-c="' + c + '">' + esc(catLabel(c)) + '</button>';
      }).join('') + '</div>' + (apps.length ? (function () {
        var a = apps[0];
        return '<div class="app-hero" data-open="0" style="background:linear-gradient(to bottom right,' + a.bg + ',' + mix(a.bg, a.ink, 0.16) + ');border-color:' + a.ink + '1f;box-shadow:0 8px 20px ' + a.ink + '24">' +
          '<img src="' + a.img + '" alt=""><span class="tag" style="background:' + a.ink + '1a;color:' + a.ink + '">FEATURED · ' + a.category.toUpperCase() + '</span>' +
          '<b style="color:' + a.ink + '">' + a.name + '</b><span class="open" style="background:' + a.ink + '">' + esc(t('open')) + ' →</span></div>' +
          (apps.length > 1 ? '<div class="label-caps" style="padding:18px 0 10px 2px">' + esc(t('moreApps')) + '</div><div class="app-grid">' + apps.slice(1).map(function (x, i) {
            return '<button class="app-card" data-open="' + (i + 1) + '"><span class="ic" style="background:' + x.bg + ';border-color:' + x.ink + '1f"><img src="' + x.img + '" alt=""></span><b>' + x.name + '</b><small>' + x.category + '</small></button>';
          }).join('') + '</div>' : '');
      })() : '<p style="padding-top:60px;text-align:center;color:var(--muted);font-size:13px">' + esc(t('noAppsInCategory')) + '</p>');
      body.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { active = b.dataset.c; paint(); }; });
      body.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { live('Opening ' + apps[+b.dataset.open].name + ' in its store or site'); }; });
    }
    paint();
    return sc;
  }

  /* ==== boot ============================================================= */
  function boot() { push(SplashRouter(), { replaceAll: true }); }

  return {
    t: t, locale: locale, esc: esc, icon: icon, el: el, pad: pad, ymd: ymd, parseLocal: parseLocal, dartIso: dartIso, sameDay: sameDay,
    startOfDay: startOfDay, addDays: addDays, MON: MON, MONTH: MONTH, WEEKDAY: WEEKDAY, dfmt: dfmt, avatarColor: avatarColor, initials: initials,
    raf: raf, busy: busy, prefs: function () { return prefs; }, Api: Api, ErrorDescription: ErrorDescription,
    push: push, pop: pop, current: current, screen: screen, hero: hero, pageHeader: pageHeader,
    sheet: sheet, dialog: dialog, alert: alert, errorPopup: errorPopup, errorDialog: errorDialog, cute: cute, snack: snack, note: note, live: live,
    menu: menu, longPress: longPress, datePicker: datePicker, timePicker: timePicker, pickImage: pickImage, pickFromSource: pickFromSource,
    closeAllOverlays: closeAllOverlays, screens: {}, boot: boot
  };
})();
