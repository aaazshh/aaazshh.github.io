// Builds Elasticsearch-shaped aggregation results from plain rows, for the
// handlers whose PHP passes ES buckets straight through to the page.
var EsAgg = (function () {
  'use strict';

  function field(f) { return String(f || '').replace(/\.keyword$/, ''); }
  function value(row, f) { return typeof f === 'function' ? f(row) : row[field(f)]; }

  function metric(rows, spec) {
    var type = Object.keys(spec)[0], s = spec[type];
    var vals, i, n;
    switch (type) {
      case 'sum':
        n = 0; for (i = 0; i < rows.length; i++) n += +value(rows[i], s.field) || 0;
        return { value: Math.round(n * 10000) / 10000 };
      case 'avg':
        if (!rows.length) return { value: null };
        n = 0; for (i = 0; i < rows.length; i++) n += +value(rows[i], s.field) || 0;
        return { value: n / rows.length };
      case 'min': case 'max':
        vals = rows.map(function (r) { return +value(r, s.field); }).filter(function (v) { return !isNaN(v); });
        return { value: vals.length ? Math[type].apply(null, vals) : null };
      case 'value_count':
        return { value: rows.filter(function (r) { return value(r, s.field) != null && value(r, s.field) !== ''; }).length };
      case 'cardinality':
        var seen = {}; n = 0;
        rows.forEach(function (r) { var v = value(r, s.field); if (v != null && v !== '' && !seen[v]) { seen[v] = 1; n++; } });
        return { value: n };
      case 'top_hits':
        var src = s._source && s._source.includes ? s._source.includes : s._source;
        var list = rows.slice();
        if (s.sort) list.sort(s.sort);
        return { hits: { total: { value: rows.length, relation: 'eq' }, max_score: null, hits: list.slice(0, s.size || 3).map(function (r) {
          var o = {};
          if (Array.isArray(src)) src.forEach(function (k) { if (r[k] !== undefined) o[k] = r[k]; });
          else Object.keys(r).forEach(function (k) { o[k] = r[k]; });
          return { _index: 'demo', _id: String(r.id || r.receipt_no || ''), _score: null, _source: o };
        }) } };
    }
    return null;
  }

  // spec is { name: { terms|sum|...: {...}, aggs: {...} } }.
  function run(rows, aggs) {
    var out = {};
    Object.keys(aggs || {}).forEach(function (name) {
      var spec = aggs[name];
      var sub = spec.aggs;
      var type = Object.keys(spec).filter(function (k) { return k !== 'aggs'; })[0];
      var s = spec[type];
      if (type === 'terms') {
        var groups = {}, order = [];
        rows.forEach(function (r) {
          var k = value(r, s.field || s.script);
          if (k == null || k === '') { if (s.missing === undefined) return; k = s.missing; }
          [].concat(k).forEach(function (kk) {
            if (!(kk in groups)) { groups[kk] = []; order.push(kk); }
            groups[kk].push(r);
          });
        });
        var buckets = order.map(function (k) {
          var b = { key: k, doc_count: groups[k].length };
          if (sub) { var r = run(groups[k], sub); for (var x in r) b[x] = r[x]; }
          return b;
        });
        var ord = s.order || { _count: 'desc' };
        var ok = Object.keys(ord)[0], dir = ord[ok] === 'asc' ? 1 : -1;
        buckets.sort(function (a, b) {
          var va, vb;
          if (ok === '_count') { va = a.doc_count; vb = b.doc_count; }
          else if (ok === '_key') { va = a.key; vb = b.key; }
          else { va = path(a, ok); vb = path(b, ok); }
          if (va < vb) return -dir; if (va > vb) return dir;
          return ok === '_count' ? (a.key < b.key ? -1 : 1) : 0;
        });
        var size = s.size == null ? 10 : s.size;
        out[name] = { doc_count_error_upper_bound: 0, sum_other_doc_count: Math.max(0, buckets.length - size), buckets: buckets.slice(0, size) };
      } else if (type === 'filter') {
        var hit = rows.filter(s);
        var o = { doc_count: hit.length };
        if (sub) { var rr = run(hit, sub); for (var y in rr) o[y] = rr[y]; }
        out[name] = o;
      } else if (type === 'date_histogram') {
        var keyFn = s.key || function (r) { return r.date; };
        var g = {}, keys = [];
        rows.forEach(function (r) { var k = keyFn(r); if (!(k in g)) { g[k] = []; keys.push(k); } g[k].push(r); });
        keys.sort();
        if (s.fill) keys = s.fill;
        out[name] = { buckets: keys.map(function (k) {
          var list = g[k] || [];
          var b = { key_as_string: k, key: Date.parse(k.length === 7 ? k + '-01' : k.slice(0, 10)) || 0, doc_count: list.length };
          if (sub) { var r2 = run(list, sub); for (var z in r2) b[z] = r2[z]; }
          return b;
        }) };
      } else {
        out[name] = metric(rows, spec);
      }
    });
    return out;
  }

  function path(bucket, p) {
    var parts = p.split(/[>.]/), cur = bucket;
    for (var i = 0; i < parts.length && cur; i++) cur = cur[parts[i]];
    if (cur && typeof cur === 'object' && 'value' in cur) return cur.value;
    return cur;
  }

  return { run: run, metric: metric };
})();
