// weekly-customer-product-report.php: members who bought the same product in
// every week of a month, from the weekly repeat purchase docs. The page also
// answers ?api=1 with the same rows as JSON.
var WeeklyReport = (function () {
  'use strict';
  var W = World;

  function sku(v) { v = String(v || '').trim(); return /^\d{1,9}$/.test(v) ? W.pad(parseInt(v, 10), 10) : v; }
  function weeksInMonth(month) {
    if (!/^\d{4}-\d{2}$/.test(month)) return 0;
    var d = W.parse(month + '-01'), m = d.getMonth(), n = 0;
    while (d.getMonth() === m) { if (d.getDay() === 1) n++; d.setDate(d.getDate() + 1); }
    return n;
  }

  function rows(month, member) {
    var pairs = {}, groups = {};
    Crm.repeatIndex('weekly').forEach(function (d) {
      if (month && d.month !== month) return;
      if (member && String(d.member_id) !== String(member)) return;
      if (/plastic bag/i.test(d.product_name)) return;
      var k = d.member_id + '|' + d.product_sku + '|' + d.month;
      var g = groups[k] || (groups[k] = { member: d.member_id, sku: d.product_sku, month: d.month, name: d.product_name, weeks: {}, count: 0 });
      g.weeks[d.period_key] = 1; g.count += d.txn_count;
    });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k], expected = weeksInMonth(g.month);
      if (!expected || Object.keys(g.weeks).length < expected) return;
      var key = g.member + '|' + sku(g.sku);
      var p = pairs[key] || (pairs[key] = { member_id: String(g.member), product_sku: sku(g.sku), product_name: g.name, months: {} });
      p.months[g.month] = g.count;
    });
    var out = Object.keys(pairs).map(function (k) {
      var p = pairs[k], sorted = {};
      Object.keys(p.months).sort().reverse().forEach(function (m) { sorted[m] = p.months[m]; });
      p.months = sorted;
      return p;
    });
    out.sort(function (a, b) {
      var am = Object.keys(a.months)[0], bm = Object.keys(b.months)[0];
      return (bm < am ? -1 : bm > am ? 1 : 0) || a.member_id.localeCompare(b.member_id) || a.product_sku.localeCompare(b.product_sku);
    });
    return out;
  }

  function filters(p) {
    var month = Q.str(p.month).trim(), member = Q.str(p.member_id).trim();
    if (month && !/^\d{4}-\d{2}$/.test(month)) month = '';
    if (member && !/^\d+$/.test(member)) member = '';
    return { month: month, member: member };
  }

  Api.route('weekly-customer-product-report.php', function (p) {
    var f = filters(p);
    return { success: true, data: rows(f.month, f.member), message: '' };
  });

  return { rows: rows, filters: filters };
})();
