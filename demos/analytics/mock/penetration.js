// penetration-* actions from api.php. Baskets are distinct receipt numbers.
var Pen = (function () {
  'use strict';
  var W = World;

  // buildPenetrationFilters(): store, one or more items, category prefixes,
  // no carrier bags, and the current month when nothing else is set.
  function lines(p, opts) {
    opts = opts || {};
    var store = opts.store != null ? opts.store : Q.str(p.store_no);
    var from = Q.str(p.date_from), to = Q.str(p.date_to);
    var itemNo = Q.str(p.item_no), category = Q.str(p.category);
    var items = itemNo ? itemNo.split(/[\s,]+/).filter(Boolean) : [];
    if (!from && !to) {
      if (!store && !items.length && !category) { from = W.TODAY.slice(0, 8) + '01'; to = W.TODAY; }
      else { from = '2025-01-01'; to = W.TODAY; }
    }
    if (!from) from = to.slice(0, 8) + '01';
    if (!to) to = W.TODAY;
    var member = opts.memberOnly != null ? opts.memberOnly : Q.memberOnly(p);
    return W.lines(from, to, store || null).filter(function (r) {
      if (items.length && items.indexOf(r.item_no) === -1) return false;
      if (category && !W.inCategory(r, category)) return false;
      if (member && !r.member_id) return false;
      return true;
    });
  }

  function share(n, total) { return total > 0 ? W.round(n / total * 100) : 0; }

  Api.route('api:penetration-summary', function (p) {
    var rows = lines(p);
    var baskets = W.distinct(rows, 'receipt_no'), items = W.sum(rows, 'quantity');
    var byHour = W.groupBy(rows, 'hour'), peak = null, peakQty = -1;
    byHour.keys.forEach(function (h) { var q = W.sum(byHour.map[h], 'quantity'); if (q > peakQty) { peakQty = q; peak = h; } });
    var activeDays = W.groupBy(rows, 'date').keys.length;
    var gp = rows.filter(function (r) { return r.cost_amount > 0 && r.cost_amount >= 0.1 * r.net_amount; });
    var sales = W.sum(gp, 'net_amount'), profit = W.sum(gp, 'gross_profit');
    return Api.json({ total_baskets: baskets, total_items: W.round(items, 3), avg_items_per_day: activeDays ? W.round(items / activeDays) : 0,
      peak_hour: peak == null ? null : String(peak), total_sales: W.round(sales), gross_profit: W.round(profit),
      gp_pct: sales > 0 ? W.round(profit / sales * 100) : 0 });
  });

  Api.route('api:penetration-by-category', function (p) {
    var rows = lines(p), total = W.distinct(rows, 'receipt_no');
    var g = W.groupBy(rows, 'item_category_code');
    var out = g.keys.map(function (code) {
      var b = g.map[code], n = W.distinct(b, 'receipt_no');
      return { category: W.CATEGORY_NAMES[code] || code, code: code, basket_count: n, total_quantity: W.round(W.sum(b, 'quantity'), 3), penetration_pct: share(n, total) };
    });
    out.sort(function (a, b) { return b.penetration_pct - a.penetration_pct; });
    return Api.json(out);
  });

  Api.route('api:penetration-by-subcategory', function (p) {
    var rows = lines(p), total = W.distinct(rows, 'receipt_no');
    var g = W.groupBy(rows, 'product_group_code');
    var out = g.keys.map(function (code) {
      var b = g.map[code], n = W.distinct(b, 'receipt_no');
      return { code: code, subcategory: W.GROUP_NAMES[code] || code, basket_count: n, total_quantity: W.round(W.sum(b, 'quantity'), 3), penetration_pct: share(n, total) };
    });
    out.sort(function (a, b) { return b.penetration_pct - a.penetration_pct; });
    return Api.json(out);
  });

  Api.route('api:penetration-by-item', function (p) {
    var rows = lines(p), total = W.distinct(rows, 'receipt_no');
    var g = W.groupBy(rows, 'item_no');
    var keys = g.keys.slice().sort(function (a, b) { return g.map[b].length - g.map[a].length; }).slice(0, 100);
    var out = keys.map(function (k) {
      var b = g.map[k], n = W.distinct(b, 'receipt_no'), s = W.sum(b, 'net_amount'), gp = W.sum(b, 'gross_profit');
      return { item_no: k, item_name: b[0].name, uom: b[0].uom, basket_count: n, total_quantity: W.round(W.sum(b, 'quantity'), 3),
        penetration_pct: share(n, total), sales: W.round(s), gp: W.round(gp), gp_pct: s > 0 ? W.round(gp / s * 100) : 0 };
    });
    out.sort(function (a, b) { return b.penetration_pct - a.penetration_pct; });
    return Api.json(out);
  });

  Api.route('api:penetration-hourly', function (p) {
    var g = W.groupBy(lines(p), 'hour');
    var keys = g.keys.map(Number).sort(function (a, b) { return a - b; });
    return Api.json(keys.map(function (h) {
      return { key: String(h), doc_count: g.map[h].length, total_qty: { value: W.round(W.sum(g.map[h], 'quantity'), 3) } };
    }));
  });

  Api.route('api:penetration-hour-items', function (p) {
    var hour = parseInt(Q.str(p.hour), 10);
    if (isNaN(hour) || hour < 0 || hour > 23) return Api.json({ rows: [], totals: { quantity: 0, sales: 0, gp: 0, baskets: 0 } });
    var rows = lines(p).filter(function (r) { return r.hour === hour; });
    var hourQty = W.sum(rows, 'quantity');
    var g = W.groupBy(rows, 'item_no');
    var out = g.keys.map(function (k) {
      var b = g.map[k], q = W.sum(b, 'quantity'), s = W.sum(b, 'net_amount'), gp = W.sum(b, 'gross_profit');
      return { item_no: k, item_name: b[0].name, uom: b[0].uom, basket_count: W.distinct(b, 'receipt_no'), quantity: W.round(q, 3),
        sales: W.round(s), gp: W.round(gp), gp_pct: s > 0 ? W.round(gp / s * 100) : 0, qty_share_pct: share(q, hourQty) };
    });
    out.sort(function (a, b) { return b.quantity - a.quantity; });
    return Api.json({ rows: out, totals: { quantity: W.round(hourQty, 3), sales: W.round(W.sum(rows, 'net_amount')),
      gp: W.round(W.sum(rows, 'gross_profit')), baskets: W.distinct(rows, 'receipt_no') } });
  });

  Api.route('api:penetration-categories', function () {
    var out = Object.keys(W.CATEGORY_NAMES).map(function (c) { return { code: c, name: W.CATEGORY_NAMES[c] }; });
    out.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return Api.json(out);
  });

  Api.route('api:penetration-by-outlet', function (p) {
    var g = W.groupBy(lines(p, { store: '' }), 'store_no');
    var out = g.keys.map(function (s) {
      var b = g.map[s];
      return { store_no: s, basket_count: W.distinct(b, 'receipt_no'), total_quantity: W.round(W.sum(b, 'quantity'), 3), total_revenue: W.round(W.sum(b, 'net_amount')) };
    });
    out.sort(function (a, b) { return b.basket_count - a.basket_count; });
    return Api.json(out);
  });

  return { lines: lines, share: share };
})();

// sob-summary, sob-by-category and sob-by-outlet (share of basket).
(function () {
  'use strict';
  var W = World;

  Api.route('api:sob-summary', function (p) {
    var rows = Pen.lines(p), n = W.distinct(rows, 'receipt_no');
    var value = W.sum(rows, 'net_amount'), units = W.sum(rows, 'quantity');
    return Api.json({ total_baskets: n, total_sales_value: W.round(value), total_units: Math.round(units),
      avg_value_per_basket: n ? W.round(value / n) : 0, avg_units_per_basket: n ? W.round(units / n) : 0 });
  });

  Api.route('api:sob-by-category', function (p) {
    var rows = Pen.lines(p), g = W.groupBy(rows, 'product_group_code');
    var keys = g.keys.slice().sort(function (a, b) { return g.map[b].length - g.map[a].length; });
    return Api.json({
      rows: keys.map(function (code) {
        var b = g.map[code];
        return { category: W.GROUP_NAMES[code] || code, basket_count: W.distinct(b, 'receipt_no'), sales_value: W.round(W.sum(b, 'net_amount')), units: Math.round(W.sum(b, 'quantity')) };
      }),
      total_value: W.round(W.sum(rows, 'net_amount')), total_units: Math.round(W.sum(rows, 'quantity'))
    });
  });

  Api.route('api:sob-by-outlet', function (p) {
    var g = W.groupBy(Pen.lines(p, { store: '' }), 'store_no');
    var out = g.keys.map(function (s) {
      var b = g.map[s];
      return { store_no: s, basket_count: W.distinct(b, 'receipt_no'), sales_value: W.round(W.sum(b, 'net_amount')), units: Math.round(W.sum(b, 'quantity')) };
    });
    out.sort(function (a, b) { return b.sales_value - a.sales_value; });
    return Api.json(out);
  });
})();
