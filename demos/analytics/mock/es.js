// A small in-browser Elasticsearch: the query and aggregation subset the
// analytics pages send, run over arrays of plain documents. The page models
// keep the PHP query bodies as they are and call Es.search(docs, body).
var Es = (function () {
  'use strict';

  function f(name) { return String(name).replace(/\.keyword$/, ''); }
  function get(doc, name) { return doc[f(name)]; }
  function asTime(v) {
    if (v == null || v === '') return NaN;
    if (typeof v === 'number') return v;
    var s = String(v);
    if (/^now/.test(s)) return nowMath(s);
    if (/^\d{4}-\d{2}$/.test(s)) s += '-01';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00';
    return new Date(s.replace(/Z$/, '')).getTime();
  }
  function nowMath(s) {
    var d = new Date(), m = /^now(-(\d+)([dMy]))?(\/([dMy]))?$/.exec(s);
    if (!m) return d.getTime();
    if (m[2]) {
      var n = parseInt(m[2], 10);
      if (m[3] === 'd') d.setDate(d.getDate() - n); else if (m[3] === 'M') d.setMonth(d.getMonth() - n); else d.setFullYear(d.getFullYear() - n);
    }
    if (m[5]) {
      d.setHours(0, 0, 0, 0);
      if (m[5] === 'M') d.setDate(1);
      if (m[5] === 'y') { d.setMonth(0); d.setDate(1); }
    }
    return d.getTime();
  }

  function cmp(a, b) {
    var na = asTime(a), nb = asTime(b);
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (!isNaN(na) && !isNaN(nb) && /\d{4}-\d{2}/.test(String(a))) return na - nb;
    if (!isNaN(Number(a)) && !isNaN(Number(b)) && a !== '' && b !== '') return Number(a) - Number(b);
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  }

  function match(doc, q) {
    if (!q) return true;
    var type = Object.keys(q)[0], s = q[type];
    switch (type) {
      case 'match_all': return true;
      case 'bool':
        var ok = true;
        [].concat(s.filter || [], s.must || []).forEach(function (c) { if (ok && !match(doc, c)) ok = false; });
        if (!ok) return false;
        if ((s.must_not ? [].concat(s.must_not) : []).some(function (c) { return match(doc, c); })) return false;
        if (s.should && [].concat(s.should).length) {
          var min = s.minimum_should_match != null ? s.minimum_should_match : ((s.filter || s.must) ? 0 : 1);
          var hits = [].concat(s.should).filter(function (c) { return match(doc, c); }).length;
          if (hits < min) return false;
        }
        return true;
      case 'term':
        var k = Object.keys(s)[0], v = s[k];
        if (v && typeof v === 'object') v = v.value;
        return String(get(doc, k)) === String(v);
      case 'terms':
        var tk = Object.keys(s)[0], list = s[tk].map(String);
        var dv = get(doc, tk);
        return [].concat(dv).some(function (x) { return list.indexOf(String(x)) !== -1; });
      case 'prefix':
        var pk = Object.keys(s)[0], pv = s[pk];
        if (pv && typeof pv === 'object') pv = pv.value;
        return String(get(doc, pk) || '').indexOf(String(pv)) === 0;
      case 'wildcard':
        var wk = Object.keys(s)[0], wv = s[wk];
        if (wv && typeof wv === 'object') wv = wv.value;
        var re = new RegExp('^' + String(wv).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        return re.test(String(get(doc, wk) || ''));
      case 'exists': return get(doc, s.field) != null && get(doc, s.field) !== '';
      case 'range':
        var rk = Object.keys(s)[0], r = s[rk], val = get(doc, rk);
        if (val == null || val === '') return false;
        if (r.gte != null && cmp(val, r.gte) < 0) return false;
        if (r.gt != null && cmp(val, r.gt) <= 0) return false;
        if (r.lte != null && cmp(val, r.lte) > 0) return false;
        if (r.lt != null && cmp(val, r.lt) >= 0) return false;
        return true;
      case 'match': case 'match_phrase': case 'match_phrase_prefix':
        var mk = Object.keys(s)[0], mv = s[mk];
        if (mv && typeof mv === 'object') mv = mv.query;
        return String(get(doc, mk) || '').toLowerCase().indexOf(String(mv).toLowerCase()) !== -1;
      case 'script':
        return typeof s === 'function' ? s(doc) : true;
    }
    return true;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(t, format) {
    var d = new Date(t);
    var y = d.getFullYear(), M = pad(d.getMonth() + 1), D = pad(d.getDate()), H = pad(d.getHours()), m = pad(d.getMinutes());
    if (format === 'yyyy-MM') return y + '-' + M;
    if (format === 'yyyy-MM-dd') return y + '-' + M + '-' + D;
    if (format === 'HH:mm') return H + ':' + m;
    return y + '-' + M + '-' + D + 'T' + H + ':' + m + ':00.000+08:00';
  }
  function floorTo(t, interval) {
    var d = new Date(t);
    if (interval === 'hour') { d.setMinutes(0, 0, 0); return d.getTime(); }
    d.setHours(0, 0, 0, 0);
    if (interval === 'week') { var dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); }
    if (interval === 'month') d.setDate(1);
    if (interval === 'year') { d.setMonth(0); d.setDate(1); }
    return d.getTime();
  }
  function step(t, interval) {
    var d = new Date(t);
    if (interval === 'hour') d.setHours(d.getHours() + 1);
    else if (interval === 'day') d.setDate(d.getDate() + 1);
    else if (interval === 'week') d.setDate(d.getDate() + 7);
    else if (interval === 'month') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d.getTime();
  }

  function metric(docs, type, s) {
    var vals, n = 0, i;
    var read = function (d) { return typeof s.script === 'function' ? s.script(d) : get(d, s.field); };
    switch (type) {
      case 'sum': for (i = 0; i < docs.length; i++) n += +read(docs[i]) || 0; return { value: n };
      case 'avg':
        vals = docs.map(read).filter(function (v) { return v != null && v !== ''; });
        return { value: vals.length ? vals.reduce(function (a, b) { return a + +b; }, 0) / vals.length : null };
      case 'min': case 'max':
        vals = docs.map(read).filter(function (v) { return v != null && v !== ''; }).map(function (v) { return typeof v === 'number' ? v : asTime(v); });
        if (!vals.length) return { value: null };
        var x = Math[type].apply(null, vals);
        var out = { value: x };
        if (s.format || typeof read(docs[0]) === 'string') out.value_as_string = fmt(x, s.format);
        return out;
      case 'stats':
        vals = docs.map(read).filter(function (v) { return v != null && v !== ''; }).map(function (v) { return typeof v === 'number' ? v : asTime(v); });
        if (!vals.length) return { count: 0, min: null, max: null, avg: null, sum: 0 };
        var st = { count: vals.length, min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), sum: vals.reduce(function (a, b) { return a + b; }, 0) };
        st.avg = st.sum / st.count;
        if (s.format) { st.min_as_string = fmt(st.min, s.format); st.max_as_string = fmt(st.max, s.format); }
        return st;
      case 'value_count': return { value: docs.filter(function (d) { var v = read(d); return v != null && v !== ''; }).length };
      case 'cardinality':
        var seen = {}; n = 0;
        docs.forEach(function (d) { var v = read(d); if (v != null && v !== '' && !seen[v]) { seen[v] = 1; n++; } });
        return { value: n };
      case 'top_hits':
        var src = s._source && s._source.includes ? s._source.includes : s._source;
        var list = docs.slice();
        if (s.sort) {
          var sk = Object.keys(s.sort[0] || {})[0], sd = ((s.sort[0] || {})[sk] || {}).order === 'desc' ? -1 : 1;
          if (sk) list.sort(function (a, b) { return cmp(get(a, sk), get(b, sk)) * sd; });
        }
        return { hits: { total: { value: docs.length, relation: 'eq' }, hits: list.slice(0, s.size == null ? 3 : s.size).map(function (d) {
          var o = {};
          if (Array.isArray(src)) src.forEach(function (k) { if (d[k] !== undefined) o[k] = d[k]; });
          else for (var k in d) o[k] = d[k];
          return { _source: o };
        }) } };
    }
    return null;
  }

  function aggregate(docs, aggs) {
    var out = {};
    Object.keys(aggs || {}).forEach(function (name) {
      var spec = aggs[name], sub = spec.aggs;
      var type = Object.keys(spec).filter(function (k) { return k !== 'aggs'; })[0], s = spec[type];
      var withSub = function (b, list) { if (sub) { var r = aggregate(list, sub); for (var k in r) b[k] = r[k]; } return b; };
      if (type === 'terms') {
        var groups = {}, order = [];
        docs.forEach(function (d) {
          var k = typeof s.script === 'function' ? s.script(d) : get(d, s.field);
          if (k == null || k === '') { if (s.missing === undefined) return; k = s.missing; }
          [].concat(k).forEach(function (kk) { if (!(kk in groups)) { groups[kk] = []; order.push(kk); } groups[kk].push(d); });
        });
        var buckets = order.map(function (k) { return withSub({ key: k, doc_count: groups[k].length }, groups[k]); });
        var ord = s.order || { _count: 'desc' };
        var ok = Object.keys(ord)[0], dir = ord[ok] === 'asc' ? 1 : -1;
        buckets.sort(function (a, b) {
          var va, vb;
          if (ok === '_count') { va = a.doc_count; vb = b.doc_count; }
          else if (ok === '_key') { va = a.key; vb = b.key; }
          else { va = pathValue(a, ok); vb = pathValue(b, ok); }
          var c = cmp(va, vb) * dir;
          return c || (ok === '_count' ? cmp(a.key, b.key) : 0);
        });
        var size = s.size == null ? 10 : s.size;
        out[name] = { doc_count_error_upper_bound: 0, sum_other_doc_count: Math.max(0, docs.length), buckets: buckets.slice(0, size) };
      } else if (type === 'rare_terms') {
        var rc = {}, ro = [];
        docs.forEach(function (d) { var k = get(d, s.field); if (k == null || k === '') return; if (!(k in rc)) { rc[k] = 0; ro.push(k); } rc[k]++; });
        out[name] = { buckets: ro.filter(function (k) { return rc[k] <= (s.max_doc_count || 1); }).map(function (k) { return { key: k, doc_count: rc[k] }; }) };
      } else if (type === 'filter') {
        var hit = docs.filter(function (d) { return match(d, s); });
        out[name] = withSub({ doc_count: hit.length }, hit);
      } else if (type === 'filters') {
        var fb = {};
        Object.keys(s.filters).forEach(function (k) {
          var h = docs.filter(function (d) { return match(d, s.filters[k]); });
          fb[k] = withSub({ doc_count: h.length }, h);
        });
        out[name] = { buckets: fb };
      } else if (type === 'date_histogram') {
        var interval = s.calendar_interval || s.interval || 'day';
        var g = {}, times = [];
        docs.forEach(function (d) {
          var t = asTime(get(d, s.field));
          if (isNaN(t)) return;
          var k = floorTo(t, interval);
          if (!(k in g)) { g[k] = []; times.push(k); }
          g[k].push(d);
        });
        times.sort(function (a, b) { return a - b; });
        var keys = times;
        if (s.min_doc_count === 0 && (times.length || s.extended_bounds)) {
          var lo = times.length ? times[0] : Infinity, hi = times.length ? times[times.length - 1] : -Infinity;
          if (s.extended_bounds) {
            if (s.extended_bounds.min != null) lo = Math.min(lo, floorTo(asTime(s.extended_bounds.min), interval));
            if (s.extended_bounds.max != null) hi = Math.max(hi, floorTo(asTime(s.extended_bounds.max), interval));
          }
          keys = [];
          for (var t = lo; t <= hi && keys.length < 5000; t = step(t, interval)) keys.push(t);
        }
        out[name] = { buckets: keys.map(function (k) { return withSub({ key_as_string: fmt(k, s.format), key: k, doc_count: (g[k] || []).length }, g[k] || []); }) };
      } else {
        out[name] = metric(docs, type, s);
      }
    });
    return out;
  }

  function pathValue(bucket, p) {
    var parts = p.split(/[>.]/), cur = bucket;
    for (var i = 0; i < parts.length && cur; i++) cur = cur[parts[i]];
    if (cur && typeof cur === 'object' && 'value' in cur) return cur.value;
    return cur;
  }

  // body: { query, aggs, size, from, sort, _source }
  function search(docs, body) {
    body = body || {};
    var hits = docs.filter(function (d) { return match(d, body.query); });
    var res = { hits: { total: { value: hits.length, relation: 'eq' }, hits: [] } };
    if (body.size) {
      var list = hits;
      if (body.sort) {
        var sorts = [].concat(body.sort);
        list = hits.slice().sort(function (a, b) {
          for (var i = 0; i < sorts.length; i++) {
            var k = Object.keys(sorts[i])[0], o = sorts[i][k], dir = (typeof o === 'string' ? o : (o.order || 'asc')) === 'desc' ? -1 : 1;
            var c = cmp(get(a, k), get(b, k));
            if (c) return c * dir;
          }
          return 0;
        });
      }
      res.hits.hits = list.slice(body.from || 0, (body.from || 0) + body.size).map(function (d) { return { _source: d }; });
    }
    if (body.aggs) res.aggregations = aggregate(hits, body.aggs);
    return res;
  }

  return { search: search, match: match, aggregate: aggregate };
})();
