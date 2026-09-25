// gp-summary, gp-by-item, gp-by-category and gp-trend from api.php, over the
// synthetic cost index.
(function () {
  'use strict';
  var W = World;

  function distributionOf(rows) {
    var d = { loss: 0, low: 0, medium: 0, high: 0 };
    rows.forEach(function (r) {
      if (r.gp_pct < 0) d.loss++; else if (r.gp_pct < 10) d.low++; else if (r.gp_pct < 20) d.medium++; else d.high++;
    });
    return d;
  }

  Api.route('api:gp-summary', function (p) {
    var a = Q.agg(Q.gpLines(p));
    return Api.json({
      total_sales: W.round(a.sales), total_cost: W.round(a.cost), gross_profit: W.round(a.gp),
      gp_pct: a.sales > 0 ? W.round(a.gp / a.sales * 100) : 0, total_quantity: W.round(a.qty)
    });
  });

  function itemRows(lines) {
    var g = W.groupBy(lines, 'item_no'), rows = [];
    g.keys.forEach(function (k) {
      var b = g.map[k], a = Q.agg(b);
      if (a.sales <= 0) return;
      var it = W.ITEM_BY_NO[k];
      rows.push({
        item_name: it ? it.name : k, item_no: k, uom: it ? it.uom : '',
        category: Q.catName(b[0].product_group_code), quantity: W.round(a.qty), gp: W.round(a.gp),
        gp_pct: W.round(a.gp / a.sales * 100), sales: W.round(a.sales), cost: W.round(a.cost)
      });
    });
    return rows;
  }

  Api.route('api:gp-by-item', function (p) {
    var sortKey = Q.str(p.sort_mode) === 'gp' ? 'gp' : 'gp_pct';
    var rows = itemRows(Q.gpLines(p));
    var breakdown = { profitable: 0, low_margin: 0, loss: 0 };
    rows.forEach(function (r) {
      if (r.gp < 0) breakdown.loss++; else if (r.gp_pct <= 20) breakdown.low_margin++; else breakdown.profitable++;
    });
    rows.sort(function (a, b) { return b[sortKey] - a[sortKey]; });
    return Api.json({
      top: rows.slice(0, 10), bottom: rows.slice().reverse().slice(0, 10), negative: [],
      negative_count: breakdown.loss, breakdown: breakdown, distribution: distributionOf(rows)
    });
  });

  Api.route('api:gp-by-category', function (p) {
    var sortKey = Q.str(p.sort_mode) === 'gp' ? 'gp' : 'gp_pct';
    var g = W.groupBy(Q.gpLines(p), 'product_group_code'), rows = [];
    g.keys.forEach(function (code) {
      var a = Q.agg(g.map[code]);
      if (a.sales <= 0) return;
      rows.push({ category: Q.catName(code), category_code: code, quantity: W.round(a.qty), gp: W.round(a.gp),
        gp_pct: W.round(a.gp / a.sales * 100), sales: W.round(a.sales), cost: W.round(a.cost) });
    });
    rows.sort(function (a, b) { return b[sortKey] - a[sortKey]; });
    return Api.json({ top: rows.slice(0, 10), bottom: rows.slice().reverse().slice(0, 10), distribution: distributionOf(rows) });
  });

  Api.route('api:gp-trend', function (p) {
    var lines = Q.gpLines(p);
    var g = W.groupBy(lines, 'date');
    var from = Q.str(p.date_from) || '2026-01-01', to = Q.str(p.date_to) || W.TODAY;
    var rows = W.days(from, to).map(function (d) {
      var b = g.map[d] || [];
      var sales = W.sum(b, 'net_amount'), gp = W.sum(b, 'gross_profit');
      return { date: d, sales: W.round(sales), gp: W.round(gp), gp_pct: sales > 0 ? W.round(gp / sales * 100) : 0 };
    });
    return Api.json(rows);
  });

  window.GpRows = { itemRows: itemRows, distributionOf: distributionOf };
})();

// gp-item-kpis, gp-item-table, active-categories, gp-category-dashboard and
// gp-category-drilldown.
(function () {
  'use strict';
  var W = World;

  Api.route('api:gp-item-kpis', function (p) {
    var a = Q.agg(Q.gpLines(p));
    return { status: 1, count: 1, data: { total_sales: W.round(a.sales), total_cost: W.round(a.cost), total_gp: W.round(a.gp),
      gp_pct: a.sales > 0 ? W.round(a.gp / a.sales * 100) : 0 } };
  });

  Api.route('api:gp-item-table', function (p) {
    var g = W.groupBy(Q.gpLines(p), 'item_no'), out = [];
    g.keys.forEach(function (k) {
      var b = g.map[k], a = Q.agg(b);
      if (a.sales <= 0) return;
      var pct = a.gp / a.sales * 100, src = b[0];
      out.push({ item_no: k, item_name: src.name, category: Q.catName(src.product_group_code), uom: src.uom,
        category_code: src.product_group_code, sales: W.round(a.sales), cost: W.round(a.cost), gp: W.round(a.gp),
        gp_pct: W.round(pct), qty: Math.round(a.qty), is_loss: a.gp < 0, is_low_margin: a.gp >= 0 && pct < 10 });
    });
    out.sort(function (a, b) { return b.gp - a.gp; });
    return { status: 1, count: out.length, data: out };
  });

  Api.route('api:active-categories', function (p) {
    var lines = Q.gpLines(p, { memberOnly: Q.memberOnly(p) });
    var codes = W.groupBy(lines, 'product_group_code').keys;
    return { status: 1, count: codes.length, data: codes };
  });

  function bucket(pct) { return pct < 0 ? 'loss' : pct < 10 ? 'low' : pct < 20 ? 'medium' : 'high'; }

  Api.route('api:gp-category-dashboard', function (p) {
    var lines = Q.gpLines(p);
    var g = W.groupBy(lines, 'product_group_code');
    var cats = [], breakdown = [];
    g.keys.forEach(function (code) {
      var rows = g.map[code], a = Q.agg(rows);
      if (a.sales <= 0) return;
      var name = Q.catName(code);
      cats.push({ category: name, codes: [code], sales: W.round(a.sales), cost: W.round(a.cost), gp: W.round(a.gp),
        quantity: W.round(a.qty), category_code: code, category_codes: [code], gp_pct: W.round(a.gp / a.sales * 100) });
      var c = { loss: 0, low: 0, medium: 0, high: 0, total: 0 };
      var items = W.groupBy(rows, 'item_no');
      items.keys.forEach(function (it) {
        var s = W.sum(items.map[it], 'net_amount'), gp = W.sum(items.map[it], 'gross_profit');
        if (s <= 0) return;
        c[bucket(gp / s * 100)]++; c.total++;
      });
      var pc = function (n) { return c.total > 0 ? W.round(n / c.total * 100) : 0; };
      breakdown.push({ category: name, category_code: code, category_codes: [code],
        loss_count: c.loss, loss_pct: pc(c.loss), low_count: c.low, low_pct: pc(c.low),
        medium_count: c.medium, medium_pct: pc(c.medium), high_count: c.high, high_pct: pc(c.high) });
    });
    cats.sort(function (a, b) { return b.gp - a.gp; });
    breakdown.sort(function (a, b) { return a.category < b.category ? -1 : a.category > b.category ? 1 : 0; });
    return Api.json({ categories: cats, margin_breakdown: breakdown });
  });

  Api.route('api:gp-category-drilldown', function (p) {
    var group = Q.str(p.margin_group);
    if (!Q.str(p.category) || ['loss', 'low', 'medium', 'high'].indexOf(group) === -1) return Api.json([]);
    var g = W.groupBy(Q.gpLines(p), 'item_no'), rows = [];
    g.keys.forEach(function (k) {
      var b = g.map[k], a = Q.agg(b);
      if (a.sales <= 0) return;
      var pct = a.gp / a.sales * 100;
      if (bucket(pct) !== group) return;
      rows.push({ item_name: b[0].name, item_no: k, sales: W.round(a.sales), cost: W.round(a.cost), gp: W.round(a.gp),
        gp_pct: W.round(pct), quantity: W.round(a.qty) });
    });
    rows.sort(function (a, b) { return a.gp_pct - b.gp_pct; });
    return Api.json(rows);
  });
})();
