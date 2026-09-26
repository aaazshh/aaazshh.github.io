// Helpers for the page models: the pages whose PHP computed numbers before
// rendering get a small model (mock/pages/<page>.js) that computes the same
// values in the browser, and the generated HTML writes them in place.
var PM = (function () {
  'use strict';
  var params = Api.parseUrl(location.href).params;

  function get(name, fallback) {
    return Object.prototype.hasOwnProperty.call(params, name) ? Q.str(params[name]) : fallback;
  }
  function has(name) { return Object.prototype.hasOwnProperty.call(params, name); }

  // PHP number_format with the default separators.
  function nf(v, d) {
    d = d || 0;
    var n = Number(v) || 0;
    var s = Math.abs(n).toFixed(d).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 && Number(s.join('.').replace(/,/g, '')) !== 0 ? '-' : '') + s.join('.');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }
  function firstOfMonth() { return World.TODAY.slice(0, 8) + '01'; }
  function daysAgo(n) { return World.ymd(World.addDays(new Date(), -n)); }
  function query(obj) {
    return Object.keys(obj).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&amp;');
  }

  // Values PHP wrote into attributes: data-pm-value="name" sets the field's
  // value, data-pm-query appends the model's filterQuery to a link.
  function apply() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pm-value]'), function (el) {
      var v = PM[el.getAttribute('data-pm-value')];
      if (v != null) el.value = v;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-pm-attrs]'), function (el) {
      el.getAttribute('data-pm-attrs').split(';').forEach(function (pair) {
        var kv = pair.split('='), v = PM[kv[1]];
        if (v == null) return;
        if (kv[0] === 'value') el.value = v; else el.setAttribute(kv[0], v);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-pm-query]'), function (el) {
      var q = String(PM.filterQuery || '').replace(/&amp;/g, '&');
      el.setAttribute('href', el.getAttribute('href').split('?')[0] + (q ? '?' + q : ''));
    });
  }

  return { apply: apply, params: params, get: get, has: has, nf: nf, esc: esc, firstOfMonth: firstOfMonth, daysAgo: daysAgo, query: query };
})();
