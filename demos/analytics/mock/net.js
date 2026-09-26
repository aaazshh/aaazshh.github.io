// Stands in for the PHP back end. Requests the pages make to api.php and the
// other JSON endpoints are answered in the browser by the handlers registered
// with Api.route(); exports, uploads and anything else that needs the live
// servers show a note instead of pretending.
var Api = (function () {
  'use strict';

  var routes = {};

  // Collected so the walkthrough can be checked page by page for errors.
  window.__demoErrors = [];
  window.addEventListener('error', function (e) { window.__demoErrors.push(String(e.message || e.target && e.target.src || e)); }, true);
  window.addEventListener('unhandledrejection', function (e) { window.__demoErrors.push('rejection: ' + String(e.reason && e.reason.stack || e.reason)); });
  var realError = console.error;
  console.error = function () {
    window.__demoErrors.push(Array.prototype.map.call(arguments, function (a) { return a && a.stack || String(a); }).join(' '));
    return realError.apply(console, arguments);
  };
  var DELAY = 120;

  function route(key, fn) { routes[key] = fn; }

  function parseUrl(url) {
    var a = document.createElement('a');
    a.href = url;
    var file = a.pathname.split('/').pop();
    var params = {};
    a.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, ' '));
      var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      if (/\[\]$/.test(k)) { k = k.slice(0, -2); (params[k] = params[k] || []).push(v); }
      else if (k in params) { params[k] = [].concat(params[k], v); }
      else params[k] = v;
    });
    return { file: file, params: params };
  }

  function bodyParams(body) {
    var out = {};
    if (!body) return out;
    if (typeof body === 'string') {
      try { var j = JSON.parse(body); if (j && typeof j === 'object') return j; } catch (e) {}
      return parseUrl('x?' + body).params;
    }
    if (body instanceof URLSearchParams) return parseUrl('x?' + body.toString()).params;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      body.forEach(function (v, k) {
        if (/\[\]$/.test(k)) { k = k.slice(0, -2); (out[k] = out[k] || []).push(v); } else out[k] = v;
      });
    }
    return out;
  }

  function handles(url) {
    var u = parseUrl(url);
    // A page that is also its own DataTables endpoint (comparison.php?draw=...).
    if (/\.html$/.test(u.file) && Object.keys(u.params).some(function (k) { return /^(draw|ajax|api)/.test(k); }) && routes[u.file.replace(/\.html$/, '.php')]) {
      return { key: u.file.replace(/\.html$/, '.php'), params: u.params, file: u.file };
    }
    if (!/\.php$/.test(u.file)) return null;
    var key = u.file === 'api.php' ? 'api:' + (u.params.action || '') : u.file;
    return { key: key, params: u.params, file: u.file };
  }

  function answer(match, body) {
    var params = match.params;
    var extra = bodyParams(body);
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) params[k] = extra[k];
    if (match.file === 'api.php' && !params.action && extra.action) match.key = 'api:' + extra.action;
    var fn = routes[match.key];
    if (!fn) {
      console.warn('No demo handler for', match.key);
      return { status: 404, body: { status: 0, error: 'Invalid action provided' } };
    }
    try {
      return { status: 200, body: fn(params) };
    } catch (e) {
      console.error(e);
      return { status: 500, body: { status: 0, error: String(e) } };
    }
  }

  // fetch()
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var match = handles(url);
    if (!match) return realFetch(input, init);
    return new Promise(function (resolve) {
      setTimeout(function () {
        var res = answer(match, init && init.body);
        var text = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
        resolve(new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } }));
      }, DELAY);
    });
  };

  // XMLHttpRequest, for $.ajax and DataTables server-side calls.
  var XHR = window.XMLHttpRequest;
  var open = XHR.prototype.open, send = XHR.prototype.send;
  XHR.prototype.open = function (method, url) {
    this._demo = handles(url);
    return open.apply(this, arguments);
  };
  XHR.prototype.send = function (body) {
    if (!this._demo) return send.apply(this, arguments);
    var xhr = this, match = this._demo;
    setTimeout(function () {
      var res = answer(match, body);
      var text = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
      var def = function (k, v) { Object.defineProperty(xhr, k, { value: v, configurable: true }); };
      def('readyState', 4); def('status', res.status); def('statusText', res.status === 200 ? 'OK' : 'Error');
      def('responseText', text); def('response', text); def('responseURL', location.href);
      xhr.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
      xhr.getResponseHeader = function (h) { return /content-type/i.test(h) ? 'application/json' : null; };
      if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
      xhr.dispatchEvent(new Event('readystatechange'));
      if (typeof xhr.onload === 'function') xhr.onload();
      xhr.dispatchEvent(new Event('load'));
      if (typeof xhr.onloadend === 'function') xhr.onloadend();
      xhr.dispatchEvent(new Event('loadend'));
    }, DELAY);
  };

  function note(text) {
    var el = document.getElementById('demo-note');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-note';
      el.className = 'demo-note';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el.timer);
    el.timer = setTimeout(function () { el.classList.remove('show'); }, 3600);
  }

  function describe(file) {
    if (/^export|excel|pdf|print/i.test(file)) return 'This export';
    if (/sync/i.test(file)) return 'This sync';
    return 'This page';
  }
  function unbuilt(file) {
    note(describe(file) + ' (' + file + ') is wired to the live system, not to this walkthrough.');
  }

  // Exports are opened by setting location to '#export-...php?...', which the
  // page generator rewrites them to.
  function onHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!/\.php/.test(h)) return;
    unbuilt(h.split('?')[0]);
    history.replaceState(null, '', location.pathname + location.search);
  }
  window.addEventListener('hashchange', onHash);

  var realOpen = window.open;
  window.open = function (url) {
    if (url && /\.php/.test(String(url)) && !/^https?:/.test(String(url))) { unbuilt(String(url).replace(/^#/, '').split('?')[0]); return null; }
    return realOpen.apply(window, arguments);
  };

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    // Runs after the page's own handlers, so a link a script already handled
    // (a delete button that opens a modal) is left alone.
    if (e.defaultPrevented) return;
    // Endpoints the page's own script calls (a delete link it turns into an
    // AJAX call) are left to that script.
    if (routes[href.split('?')[0]]) return;
    if (/^#?[\w./-]+\.php/.test(href)) { e.preventDefault(); unbuilt(href.replace(/^#/, '').split('?')[0]); }
  });

  // POST forms back to a page: the page model registers what the PHP did
  // with the fields and where it redirected.
  var posts = {};
  function post(page, fn) { posts[page] = fn; }
  function handlePost(form) {
    if (String(form.getAttribute('method') || '').toLowerCase() !== 'post') return false;
    var file = parseUrl(form.getAttribute('action') || location.href);
    var fn = posts[file.file.replace(/\.html$/, '')];
    if (!fn) return false;
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    var to = fn(data, file.params);
    if (to) location.href = to;
    return true;
  }

  function blockForm(form) {
    if (handlePost(form)) return true;
    var action = form.getAttribute('action') || '';
    if (/\.php/.test(action) && !/^https?:/.test(action)) { unbuilt(action.replace(/^#/, '').split('?')[0]); return true; }
    return false;
  }
  document.addEventListener('submit', function (e) { if (blockForm(e.target)) e.preventDefault(); }, true);
  var realSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () { if (!blockForm(this)) realSubmit.call(this); };

  // PHP echoed the GET parameters back into the filter forms. The pages are
  // static here, so put the values back from the query string instead.
  function restoreForms() {
    if (window.PM && PM.apply) PM.apply();
    var q = parseUrl(location.href).params;
    Object.keys(q).forEach(function (name) {
      if (name === 'success' || name === 'message') return;
      var els = document.querySelectorAll('[name="' + name + '"], [name="' + name + '[]"]');
      Array.prototype.forEach.call(els, function (el) {
        var val = q[name];
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = [].concat(val).indexOf(el.value) !== -1 || (el.type === 'checkbox' && val === 'on');
        } else if (el.multiple) {
          var vals = [].concat(val);
          Array.prototype.forEach.call(el.options, function (o) { o.selected = vals.indexOf(o.value) !== -1; });
        } else if (el.tagName === 'SELECT') {
          var has = Array.prototype.some.call(el.options, function (o) { return o.value === val; });
          if (has) el.value = val;
          else waitForOption(el, val);
        } else if (el.type !== 'file' && el.type !== 'hidden') {
          el.value = val;
        }
      });
    });
  }

  // Outlet and category lists arrive by fetch after the page loads, so pick
  // the requested value as soon as its option turns up.
  function waitForOption(select, val) {
    var obs = new MutationObserver(function () {
      var hit = Array.prototype.some.call(select.options, function (o) { return o.value === val; });
      if (hit) { select.value = val; obs.disconnect(); }
    });
    obs.observe(select, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 8000);
  }

  function json(data) { return { status: 1, count: Array.isArray(data) ? data.length : Object.keys(data || {}).length, data: data }; }

  return { post: post, route: route, restoreForms: restoreForms, note: note, unbuilt: unbuilt, json: json, parseUrl: parseUrl, routes: routes };
})();
