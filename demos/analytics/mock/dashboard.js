// The home dashboard counters: get-unique-transaction-count,
// get-category-count, get-product-count, get-member-comparison-over-time and
// get-monthly-transaction-amount.
(function () {
  'use strict';
  var W = World;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function totals(from, to) {
    var t = { receipts: 0, net: 0, gp: 0, members: {} };
    W.days(from, to).forEach(function (d) {
      W.STORES.forEach(function (s) {
        var x = W.dayTotals(s, d);
        t.receipts += x.receipts; t.net += x.net; t.gp += x.gp;
        x.members.forEach(function (m) { t.members[m] = 1; });
      });
    });
    return t;
  }

  Api.route('api:get-unique-transaction-count', function () {
    var ytd = totals(W.TODAY.slice(0, 4) + '-01-01', W.TODAY);
    var barcodes = {};
    Cat.PRODUCTS.forEach(function (p) { barcodes[p.barcode || p.id] = 1; });
    return Api.json({ receipt_count: ytd.receipts, item_count: Object.keys(barcodes).length, total_transaction_amount: W.round(ytd.net),
      total_gross_profit: W.round(ytd.gp), total_net_amount: W.round(ytd.net * 0.46), active_members: Object.keys(ytd.members).length });
  });

  Api.route('api:get-category-count', function () {
    var seen = {};
    Cat.PRODUCTS.forEach(function (p) { seen[p.category] = 1; });
    return Api.json({ count: Object.keys(seen).length });
  });

  Api.route('api:get-product-count', function () {
    var seen = {};
    Cat.PRODUCTS.forEach(function (p) { seen[p.id] = 1; });
    return Api.json({ count: Object.keys(seen).length });
  });

  Api.route('api:get-member-comparison-over-time', function () {
    var daily = [], now = new Date();
    for (var i = 11; i >= 0; i--) {
      var start = new Date(now.getFullYear(), now.getMonth() - i, 1), end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      var to = W.ymd(end) > W.TODAY ? W.TODAY : W.ymd(end);
      var t = totals(W.ymd(start), to);
      daily.push({ date: W.ymd(start).slice(0, 7), day: MONTHS[start.getMonth()] + ' ' + start.getFullYear(),
        total_members: W.MEMBERS, active_members: Object.keys(t.members).length });
    }
    return Api.json({ total_members: W.MEMBERS, daily: daily });
  });

  Api.route('api:get-monthly-transaction-amount', function () {
    var daily = [], sum = 0, count = 0;
    W.days(W.TODAY.slice(0, 8) + '01', W.TODAY).forEach(function (d) {
      var amt = 0, n = 0;
      W.STORES.forEach(function (s) { var x = W.dayTotals(s, d); amt += x.net; n += x.receipts; });
      sum += amt; count += n;
      daily.push({ date: d, day: String(parseInt(d.slice(8), 10)) + ' ' + MONTHS[parseInt(d.slice(5, 7), 10) - 1],
        total_transaction_amount: W.round(amt), transaction_count: n });
    });
    return Api.json({ total_transaction_amount: W.round(sum), transaction_count: count, daily: daily });
  });
})();
