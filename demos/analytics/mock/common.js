// Helpers shared by the api.php handlers: the filter builders and the lookup
// lists (outlets, product groups) that most report pages ask for first.
var Q = (function () {
  'use strict';
  var W = World;

  function str(v) { return v == null ? '' : String(Array.isArray(v) ? v[0] : v); }

  // buildGpFilters(): lines with a cost, cost at least 10% of net, in range.
  function gpLines(p, opts) {
    opts = opts || {};
    var from = str(p.date_from), to = str(p.date_to);
    if (!from && !to) { from = '2026-01-01'; to = '2026-12-31'; }
    if (!from) from = to.slice(0, 8) + '01';
    if (!to) to = W.TODAY;
    var store = opts.store != null ? opts.store : str(p.store_no);
    var item = str(p.item_no), category = str(p.category);
    var rows = W.lines(from, to, store || null);
    return rows.filter(function (r) {
      if (r.cost_amount <= 0 || r.cost_amount < 0.1 * r.net_amount) return false;
      if (item && r.item_no !== item) return false;
      if (category && !W.inCategory(r, category)) return false;
      if (opts.memberOnly && !r.member_id) return false;
      return true;
    });
  }

  function memberOnly(p) { return ['1', 'true', 'on', 'yes'].indexOf(str(p.member_only).toLowerCase()) !== -1; }

  // Plain sales lines (penetration, basket and POS reports use the
  // unfiltered trans-sales-entry index).
  function salesLines(p, opts) {
    opts = opts || {};
    var from = str(p.date_from || p.start_date), to = str(p.date_to || p.end_date);
    if (!to) to = W.ymd(W.addDays(new Date(), -1));
    if (!from) from = to.slice(0, 8) + '01';
    var store = opts.store != null ? opts.store : str(p.store_no || p.outlet);
    var item = str(p.item_no), category = str(p.category);
    return W.lines(from, to, store || null).filter(function (r) {
      if (item && r.item_no !== item) return false;
      if (category && !W.inCategory(r, category)) return false;
      if (opts.memberOnly && !r.member_id) return false;
      return true;
    });
  }

  function outletOptions() {
    return W.STORES.map(function (s) { return { code: s.code, name: s.name }; });
  }

  function productGroups() {
    var out = [];
    W.GROUPS.forEach(function (c) { c[2].forEach(function (g) { out.push({ id: g[0], text: g[1] }); }); });
    return out.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  }

  function catName(code) { return W.GROUP_NAMES[code] || W.CATEGORY_NAMES[code] || code; }

  function agg(rows) {
    return {
      sales: W.sum(rows, 'net_amount'), cost: W.sum(rows, 'cost_amount'), gp: W.sum(rows, 'gross_profit'),
      qty: W.sum(rows, 'quantity'), receipts: W.distinct(rows, 'receipt_no'), discount: W.sum(rows, 'discount_amount')
    };
  }

  function pct(a, b, n) { return b > 0 ? W.round(a / b * 100, n == null ? 2 : n) : 0; }

  return { str: str, gpLines: gpLines, salesLines: salesLines, memberOnly: memberOnly, outletOptions: outletOptions,
    productGroups: productGroups, catName: catName, agg: agg, pct: pct };
})();

Api.route('api:product-groups', function () { return Api.json(Q.productGroups()); });
Api.route('api:gp-outlets', function () { return Api.json(Q.outletOptions()); });
Api.route('api:penetration-outlets', function () { return Api.json(Q.outletOptions()); });
