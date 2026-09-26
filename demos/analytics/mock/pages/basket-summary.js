// basket-summary.php: basket size and value from the cost index, overall,
// per outlet and per day, as PHP computed them before rendering.
(function () {
  'use strict';
  var W = World;
  var blank = !PM.get('date_from', '') && !PM.get('date_to', '');
  function norm(v, fb) {
    v = String(v || '').trim();
    if (!v) return fb;
    if (v.toLowerCase() === 'today') return W.TODAY;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) || /^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/.exec(v);
    if (!m) return fb;
    return m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + m[2] + '-' + m[1];
  }
  var back30 = PM.daysAgo(30);
  PM.dateFrom = blank ? back30 : norm(PM.get('date_from', ''), back30);
  PM.dateTo = blank ? W.TODAY : norm(PM.get('date_to', ''), W.TODAY);
  PM.outlet = PM.get('store_no', '');
  PM.memberOnly = ['1', 'on', 'true', 'yes'].indexOf(PM.get('member_only', '').toLowerCase()) !== -1;
  PM.category = PM.get('category', '');
  PM.metricType = PM.get('metric_type', 'avg');
  var rows = W.lines(PM.dateFrom, PM.dateTo, PM.outlet || null).filter(function (r) {
    if (PM.memberOnly && !r.member_id) return false;
    return !PM.category || W.inCategory(r, PM.category);
  });
  var aggs = EsAgg.run(rows, {
    total_sales: { sum: { field: 'net_amount' } }, total_units: { sum: { field: 'quantity' } }, total_receipts: { cardinality: { field: 'receipt_no' } },
    per_outlet: { terms: { field: 'store_no', size: 50 }, aggs: { units: { sum: { field: 'quantity' } }, sales: { sum: { field: 'net_amount' } }, receipts: { cardinality: { field: 'receipt_no' } } } },
    per_day: { date_histogram: { key: function (r) { return r.date + 'T00:00:00.000+08:00'; } }, aggs: { units: { sum: { field: 'quantity' } }, sales: { sum: { field: 'net_amount' } }, receipts: { cardinality: { field: 'receipt_no' } } } }
  });
  PM.aggs = aggs;
  var units = aggs.total_units.value, sales = aggs.total_sales.value, receipts = aggs.total_receipts.value;
  var items = [], values = [];
  aggs.per_outlet.buckets.forEach(function (o) {
    if (o.receipts.value > 0) { items.push(o.units.value / o.receipts.value); values.push(o.sales.value / o.receipts.value); }
  });
  function median(a) {
    if (!a.length) return 0;
    a = a.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  var med = PM.metricType === 'median';
  PM.totalUnits = units; PM.totalSales = sales; PM.totalReceipts = receipts;
  PM.basketSize = med ? median(items) : (receipts ? units / receipts : 0);
  PM.basketValue = med ? median(values) : (receipts ? sales / receipts : 0);
  PM.avgValueAllOutlets = med ? median(values) : mean(values);
  PM.spendLabel = med ? 'Median Spend' : 'Avg Spend';
  PM.outletOptions = function () {
    var outs = W.STORES.map(function (s) { return s.code; });
    return outs.map(function (c) { return '<option value="' + c + '"' + (PM.outlet === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
  };
})();
