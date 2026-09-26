// Competitor price monitoring: the scraped product lists (MySQL products and
// the prod_analytic_products index), the product mappings between PRIME and
// the other supermarkets, and a daily price history for each listing.
var Cat = (function () {
  'use strict';
  var W = World;

  var SUPERMARKETS = [
    { id: 1, name: 'PRIME', factor: 1, cover: 1 },
    { id: 2, name: 'NTUC', factor: 1.04, cover: 0.82 },
    { id: 3, name: 'Cold Storage', factor: 1.12, cover: 0.64 },
    { id: 4, name: 'Sheng Siong', factor: 0.97, cover: 0.71 },
    { id: 5, name: 'RedMart', factor: 1.06, cover: 0.45 },
    { id: 6, name: 'GrabMart', factor: 1.09, cover: 0.3 }
  ];
  var CATEGORY_LABELS = {
    '10': 'Fruits & Vegetables', '11': 'Beverages', '12': 'Dairy, Chilled & Eggs', '13': 'Meat & Seafood', '14': 'Rice, Noodles & Cooking',
    '15': 'Snacks & Confectionery', '16': 'Frozen', '17': 'Bakery & Breakfast', '18': 'Household', '19': 'Personal Care'
  };

  function title(s) { return s.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

  var PRODUCTS = [], MAPPINGS = [], BY_ID = {};
  (function build() {
    var r = W.rng(777), id = 1000;
    var mains = W.ITEMS.filter(function (it) { return !/ (VALUE PACK|ORGANIC|LESS SUGAR|FAMILY SIZE|MINI|IMPORTED|PREMIUM|TWIN PACK|REFILL|LIMITED EDITION)$/.test(it.name); });
    mains.forEach(function (it, i) {
      var category = CATEGORY_LABELS[it.product_group_code.slice(0, 2)];
      var prime = { id: String(++id), supermarket_id: 1, supermarket_name: 'PRIME', barcode: it.barcode, sku: '', name: it.name, uom: it.uom,
        category: category, origin: '', price: it.price, item_no: it.item_no, status_id: 1, created_at: W.TODAY + ' 06:00:00' };
      PRODUCTS.push(prime);
      var mapped = r() < 0.72, mapDate = W.ymd(W.addDays(new Date(), -Math.floor(r() * 200)));
      SUPERMARKETS.slice(1).forEach(function (sm) {
        if (r() > sm.cover) return;
        var p = { id: String(++id), supermarket_id: sm.id, supermarket_name: sm.name,
          barcode: sm.name === 'NTUC' || sm.name === 'RedMart' ? it.barcode : '', sku: sm.name === 'Sheng Siong' ? 'SS' + (40000 + id) : '',
          name: sm.name === 'PRIME' ? it.name : title(it.name), uom: it.uom, category: category,
          origin: '',
          price: W.round(it.price * sm.factor * (0.9 + r() * 0.2), 2), status_id: 1, created_at: prime.created_at };
        PRODUCTS.push(p);
        if (mapped && r() < 0.85) MAPPINGS.push({ id: MAPPINGS.length + 1, source_product_id: prime.id, target_product_id: p.id, status_id: 1, created_at: mapDate });
      });
    });
    PRODUCTS.forEach(function (p) { BY_ID[p.id] = p; });
  })();

  function mappedTo(productId) {
    var src = null;
    MAPPINGS.forEach(function (m) { if (m.status_id === 1 && (m.source_product_id === productId || m.target_product_id === productId)) src = m.source_product_id; });
    if (!src) return [productId];
    var ids = [src];
    MAPPINGS.forEach(function (m) { if (m.status_id === 1 && m.source_product_id === src) ids.push(m.target_product_id); });
    return ids;
  }
  function hasMapping(p) { return mappedTo(p.id).length > 1; }
  function lastMappedAt(p) {
    var best = '';
    MAPPINGS.forEach(function (m) { if (m.status_id === 1 && (m.source_product_id === p.id || m.target_product_id === p.id) && m.created_at > best) best = m.created_at; });
    return best;
  }
  function supermarketCount(p) {
    var seen = {};
    PRODUCTS.forEach(function (x) { if (x.barcode && x.barcode === p.barcode) seen[x.supermarket_name] = 1; });
    return Math.max(1, Object.keys(seen).length);
  }

  // Price of a listing on a day, in dollars: weekly jitter and the odd promo.
  function price(p, date) {
    var week = Math.floor(W.parse(date).getTime() / (7 * 86400000));
    var r = W.rng(W.hash(p.id + ':' + week));
    var v = p.price * (0.96 + r() * 0.08);
    if (r() < 0.14) v *= 0.8 + r() * 0.1;
    return W.round(v, 2);
  }
  function latest(p) { return { date: W.TODAY, price: price(p, W.TODAY) }; }

  return { SUPERMARKETS: SUPERMARKETS, PRODUCTS: PRODUCTS, MAPPINGS: MAPPINGS, BY_ID: BY_ID, CATEGORY_LABELS: CATEGORY_LABELS,
    mappedTo: mappedTo, hasMapping: hasMapping, lastMappedAt: lastMappedAt, supermarketCount: supermarketCount, price: price, latest: latest };
})();

// elastic-query-graph and get-categories (Graph page), plus the two JSON
// endpoints the price chart modal calls.
(function () {
  'use strict';
  var W = World;

  Api.route('api:get-categories', function () {
    var seen = {};
    Cat.PRODUCTS.forEach(function (p) { seen[p.category] = 1; });
    return Api.json(Object.keys(seen).sort());
  });

  Api.route('api:elastic-query-graph', function (p) {
    var draw = parseInt(Q.str(p.draw), 10) || 1, start = parseInt(Q.str(p.start), 10) || 0, length = parseInt(Q.str(p.length), 10) || 25;
    var search = Q.str(p['search[value]']), category = Q.str(p.category);
    var col = ['product_id', 'name', 'unit_of_measure', 'category'][parseInt(Q.str(p['order[0][column]']), 10) || 0] || 'name';
    var dir = Q.str(p['order[0][dir]']).toLowerCase() === 'desc' ? -1 : 1;
    var low = search.toLowerCase();
    var rows = Cat.PRODUCTS.filter(function (x) {
      if (category && x.category !== category) return false;
      if (search && x.id.indexOf(search) === -1 && x.barcode.indexOf(search) === -1 && x.sku.indexOf(search) === -1 &&
        (x.item_no || '').indexOf(search) === -1 && x.name.toLowerCase().indexOf(low) === -1 &&
        x.uom.toLowerCase().indexOf(low) === -1 && x.category.toLowerCase().indexOf(low) === -1) return false;
      return true;
    });
    var key = { product_id: 'id', name: 'name', unit_of_measure: 'uom', category: 'category' }[col];
    rows.sort(function (a, b) {
      var ma = Cat.hasMapping(a), mb = Cat.hasMapping(b);
      if (ma !== mb) return ma ? -1 : 1;
      var la = Cat.lastMappedAt(a), lb = Cat.lastMappedAt(b);
      if (la !== lb) return la < lb ? 1 : -1;
      return String(a[key]).localeCompare(String(b[key])) * dir;
    });
    var barcodes = {};
    Cat.PRODUCTS.forEach(function (x) { barcodes[x.barcode || x.id] = 1; });
    return { draw: draw, recordsTotal: Object.keys(barcodes).length, recordsFiltered: rows.length,
      data: rows.slice(start, start + length).map(function (x) {
        return { id: x.id, name: x.name, UOM: x.uom, category: x.category, has_mapping: Cat.hasMapping(x), supermarket_count: Cat.supermarketCount(x) };
      }) };
  });

  Api.route('get_mapped_prices.php', function (p) {
    if (!p.product_id) return { success: false, message: 'Product ID is required' };
    var seen = {}, products = [];
    Cat.mappedTo(String(p.product_id)).forEach(function (id) {
      var x = Cat.BY_ID[id];
      if (!x || seen[x.supermarket_name]) return;
      seen[x.supermarket_name] = 1;
      products.push({ id: x.id, name: x.name, price: Cat.latest(x).price, supermarket_name: x.supermarket_name, UOM: x.uom,
        category: x.category, is_source: x.id === String(p.product_id) });
    });
    return { success: true, products: products, total_count: products.length, has_mappings: products.length > 1 };
  });

  Api.route('get-price-history.php', function (p) {
    var list = p.mapped_products || [];
    if (!list.length) return { error: 'No mapped products provided', price_histories: [] };
    var period = p.period || 'day', now = new Date(), start, end;
    if (period === 'month') { start = W.ymd(new Date(now.getFullYear(), now.getMonth(), 1)); end = W.ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)); }
    else if (period === 'year') { start = now.getFullYear() + '-01-01'; end = now.getFullYear() + '-12-31'; }
    else { start = end = W.TODAY; }
    var valid = function (d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d); };
    if (valid(p.start_date) && valid(p.end_date)) { start = p.start_date; end = p.end_date; }
    var last = W.TODAY, out = { success: true, price_histories: {} };
    list.forEach(function (m) {
      var x = Cat.BY_ID[String(m.id)];
      if (!x) return;
      var data = [];
      var days = W.days(start, end < last ? end : last);
      if (period === 'year') {
        var months = {};
        days.forEach(function (d) { var k = d.slice(0, 7); (months[k] = months[k] || []).push(Cat.price(x, d)); });
        Object.keys(months).sort().forEach(function (k) {
          var v = months[k]; data.push({ date: k + '-01', price: (v.reduce(function (a, b) { return a + b; }, 0) / v.length).toFixed(2) });
        });
      } else {
        days.forEach(function (d) { data.push({ date: d, price: Cat.price(x, d).toFixed(2) }); });
      }
      if (!data.length) { var l = Cat.latest(x); data.push({ date: l.date, price: l.price.toFixed(2) }); }
      out.price_histories[x.id] = { supermarket: x.supermarket_name, barcode: x.barcode, sku: x.sku, name: x.name, uom: x.uom,
        matched_by: 'elasticsearch', has_real_data: data.length > 0, data: data };
    });
    return out;
  });
})();

// elastic-query-comparison (Comparison page): one row per product group (a
// product and everything mapped to it), with the price per chain rendered as
// the badges api.php builds.
(function () {
  'use strict';
  var W = World;
  var KEYS = { PRIME: 'prime', NTUC: 'ntuc', 'Sheng Siong': 'ss', 'Cold Storage': 'cs', RedMart: 'rm', GrabMart: 'gm' };
  var COLOURS = { prime: '#0c6326', ntuc: '#5266EF', ss: '#fd7e14', cs: '#90EE90', rm: '#E74C3C', gm: '#00B14F' };
  var esc = function (s) { return PM.esc(s); };

  function groups(p) {
    var category = Q.str(p.category), search = Q.str(p.filter_search).toLowerCase();
    var seen = {}, out = [];
    Cat.PRODUCTS.forEach(function (x) {
      if (category && x.category !== category) return;
      var ids = Cat.mappedTo(x.id), mapped = ids.length > 1, head = mapped ? Cat.BY_ID[ids[0]] : x;
      if (seen[head.id]) return;
      if (search && head.name.toLowerCase().indexOf(search) === -1 && head.barcode.indexOf(search) === -1) return;
      seen[head.id] = 1;
      out.push({ head: head, mapped: mapped, ids: mapped ? ids : [x.id] });
    });
    out.sort(function (a, b) { return (b.mapped - a.mapped) || a.head.name.localeCompare(b.head.name); });
    return out;
  }

  Api.route('api:elastic-query-comparison', function (p) {
    var draw = parseInt(Q.str(p.draw), 10) || 1, start = parseInt(Q.str(p.start), 10) || 0, length = parseInt(Q.str(p.length), 10) || 25;
    var date = Q.str(p.price_date) || W.TODAY;
    var list = groups(p);
    var data = list.slice(start, start + length).map(function (g) {
      var prices = { prime: null, ntuc: null, ss: null, cs: null, rm: null, gm: null };
      g.ids.forEach(function (id) { var x = Cat.BY_ID[id], k = KEYS[x.supermarket_name]; if (k && prices[k] == null) prices[k] = Cat.price(x, date); });
      var valid = ['prime', 'ntuc', 'ss', 'cs', 'gm'].map(function (k) { return prices[k]; }).filter(function (v) { return v != null; });
      var best = valid.length ? Math.min.apply(null, valid) : null;
      function badge(k) {
        var v = prices[k];
        // The typographic quotes are in the real api.php as well.
        if (v == null) return '<span class=\u201dtext-secondary text-xs\u201d>&mdash;</span>';
        var isBest = best === v;
        return '<span class="badge badge-sm' + (isBest ? ' best-price' : '') + '" style="background-color: ' + COLOURS[k] + ';">$' + PM.nf(v, 2) + (isBest ? ' &#9733;' : '') + '</span>';
      }
      var name = esc(g.head.name);
      return { id: g.head.id,
        barcode: '<span class="text-xs font-weight-bold">' + esc(g.head.barcode || 'N/A') + '</span>',
        product_name: g.mapped ? '<span class="text-xs"><i class="fas fa-link text-info me-1" title="Mapped Product"></i>' + name + '</span>' : '<span class="text-xs">' + name + '</span>',
        category: '<span class="badge badge-sm bg-gradient-secondary">' + esc(g.head.category) + '</span>',
        uom: '<span class="text-xs">' + esc(g.head.uom) + '</span>',
        price_prime: badge('prime'), price_ntuc: badge('ntuc'), price_ss: badge('ss'), price_cs: badge('cs'), price_rm: badge('rm'), price_gm: badge('gm'),
        best_price: best == null ? '<span class="text-secondary text-xs">&mdash;</span>' :
          '<span class="badge badge-sm" style="background-color: #dc3545; color: #fff; text-decoration: none;">$' + PM.nf(best, 2) + '</span>' };
    });
    return { draw: draw, recordsTotal: groups({}).length, recordsFiltered: list.length, data: data };
  });
})();
