// store-outlet-comparison, store-hourly-revenue, store-weekly-revenue and
// store-outlet-benchmark (POS Transaction Report).
(function () {
  'use strict';
  var W = World;

  function range(p, defFrom, defTo) {
    var from = Q.str(p.date_from) || defFrom, to = Q.str(p.date_to) || defTo;
    if (to < from) from = to;
    return [from, to];
  }
  function storeNos(p) { return [].concat(p.store_nos || []).map(String).filter(function (s) { return s.trim() !== ''; }); }
  function yesterday() { return W.ymd(W.addDays(new Date(), -1)); }
  function iso(d) { return d + 'T00:00:00.000+08:00'; }

  Api.route('api:store-outlet-comparison', function (p) {
    var r = range(p, W.TODAY.slice(0, 8) + '01', yesterday()), store = Q.str(p.store_no);
    var g = W.groupBy(W.lines(r[0], r[1], store || null), 'store_no');
    var rows = g.keys.map(function (s) {
      var b = g.map[s], rev = W.sum(b, 'net_amount'), gp = W.sum(b, 'gross_profit'), tx = W.distinct(b, 'receipt_no');
      return { store_no: s, outlet_name: s, outlet_label: s + ' - ' + W.storeName(s), total_revenue: W.round(rev), gross_profit: W.round(gp),
        gp_percent: rev > 0 ? W.round(gp / rev * 100) : 0, total_items: b.length, total_units: W.round(W.sum(b, 'quantity')),
        transactions: tx, total_discount: W.round(W.sum(b, 'discount_amount')), avg_txn_value: tx ? W.round(rev / tx) : 0 };
    });
    rows.sort(function (a, b) { return b.total_revenue - a.total_revenue; });
    return Api.json(rows);
  });

  function hourly(rows) {
    var v = []; for (var h = 0; h < 24; h++) v.push(0);
    rows.forEach(function (r) { v[r.hour] += r.net_amount; });
    return v.map(function (x) { return W.round(x); });
  }

  Api.route('api:store-hourly-revenue', function (p) {
    var from = Q.str(p.date_from) || yesterday(), to = Q.str(p.date_to) || from;
    var stores = storeNos(p);
    var rows = W.lines(from, to, stores.length ? stores : null);
    var series = [];
    if (stores.length) {
      var g = W.groupBy(rows, 'store_no');
      g.keys.forEach(function (s) { series.push({ outlet_name: s, store_no: s, hours: hourly(g.map[s]) }); });
    } else series.push({ outlet_name: 'All Outlets', store_no: 'ALL', hours: hourly(rows) });
    return Api.json({ series: series });
  });

  Api.route('api:store-weekly-revenue', function (p) {
    var month = Q.str(p.month);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
      month = W.ymd(d).slice(0, 7);
    }
    var from = month + '-01', end = W.parse(from); end.setMonth(end.getMonth() + 1); end.setDate(0);
    var to = W.ymd(end);
    var labels = [], weeks = Math.ceil(W.days(from, to).length / 7);
    for (var i = 1; i <= weeks; i++) labels.push('Week ' + i);
    var stores = storeNos(p);
    var rows = W.lines(from, to, stores.length ? stores : null);
    function weekly(list) {
      var v = labels.map(function () { return 0; });
      list.forEach(function (r) { var idx = Math.floor((W.parse(r.date) - W.parse(from)) / 86400000 / 7); if (idx >= 0 && idx < v.length) v[idx] += r.net_amount; });
      return v.map(function (x) { return W.round(x); });
    }
    var series = [];
    if (stores.length) {
      var g = W.groupBy(rows, 'store_no');
      g.keys.forEach(function (s) { series.push({ outlet_name: s, store_no: s, values: weekly(g.map[s]) }); });
    } else series.push({ outlet_name: 'All Outlets', store_no: 'ALL', values: weekly(rows) });
    return Api.json({ labels: labels, series: series });
  });

  Api.route('api:store-outlet-benchmark', function (p) {
    var store = Q.str(p.store_no);
    if (!store) return { status: 0, error: 'Outlet is required.' };
    var group = W.OUTLET_GROUPS.filter(function (g) { return g.store_nos.indexOf(store) !== -1; })[0];
    if (!group) return { status: 0, error: 'Outlet group is not configured for ' + store + '.' };
    var r = range(p, W.TODAY.slice(0, 8) + '01', yesterday());
    var labels = [], sel = [], avg = [];
    W.days(r[0], r[1]).forEach(function (d) {
      labels.push(iso(d));
      var selRev = 0, grpRev = 0;
      W.STORES.forEach(function (s) {
        if (s.code !== store && group.store_nos.indexOf(s.code) === -1) return;
        var t = W.sum(W.dayLines(s, d), 'net_amount');
        if (s.code === store) selRev += t;
        if (group.store_nos.indexOf(s.code) !== -1) grpRev += t;
      });
      sel.push(W.round(selRev)); avg.push(W.round(grpRev / group.store_nos.length));
    });
    var st = sel.reduce(function (a, b) { return a + b; }, 0), at = avg.reduce(function (a, b) { return a + b; }, 0);
    return Api.json({ store_no: store, benchmark_group_name: group.name, benchmark_group_store_nos: group.store_nos,
      benchmark_group_outlet_count: group.store_nos.length, labels: labels, selected_daily_revenue: sel,
      benchmark_avg_daily_revenue_by_day: avg, difference_percent: at > 0 ? W.round((st - at) / at * 100) : 0 });
  });
})();

// pos-detailed-transactions: server side DataTables over single receipt lines.
(function () {
  'use strict';
  var W = World;
  var COLS = { 0: 'datetime', 1: 'store_no', 2: 'pos_terminal_no', 3: 'receipt_no', 4: 'transaction_no', 5: 'line_no', 6: 'staff_id',
    8: 'item_no', 9: 'name', 10: 'unit_of_measure', 11: 'quantity', 12: 'discount_amount', 13: 'gst_amount', 14: 'net_amount', 15: 'gross_profit' };

  function day(v, fallback) { v = Q.str(v).trim().slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback; }

  Api.route('api:pos-detailed-transactions', function (p) {
    var from = day(p.date_from, W.TODAY.slice(0, 8) + '01'), to = day(p.date_to, W.TODAY);
    if (to < from) to = from;
    var store = Q.str(p.store_no).trim(), terminal = Q.str(p.terminal_no).trim(), staff = Q.str(p.staff_id).trim();
    var base = W.lines(from, to, store || null);
    if (Q.str(p.sub_action) === 'get-filters') {
      var t = {}, s = {};
      base.forEach(function (r) { t[r.pos_terminal_no] = 1; s[r.staff_id] = 1; });
      return { status: 1, terminals: Object.keys(t).sort(), staff: Object.keys(s).sort() };
    }
    var draw = parseInt(Q.str(p.draw), 10) || 1, start = Math.max(0, parseInt(Q.str(p.start), 10) || 0);
    var length = parseInt(Q.str(p.length), 10) || 25;
    if (length < 1 || length > 500) length = 25;
    var empty = { lines: 0, receipts: 0, units: 0, discount: 0, gst: 0, net: 0, gp: 0 };
    if (start + length > 10000) {
      return { draw: draw, recordsTotal: 0, recordsFiltered: 0, data: [], summary: empty,
        error: 'Elasticsearch only pages through the first 10,000 rows. Narrow the filters, or use Export to Excel for the full result.' };
    }
    var search = Q.str(p['search[value]'] || (p.search && p.search.value) || '').trim();
    var rows = base.filter(function (r) {
      if (terminal && r.pos_terminal_no !== terminal) return false;
      if (staff && r.staff_id !== staff) return false;
      if (search && [r.receipt_no, r.transaction_no, r.item_no, r.barcode_no].indexOf(search) === -1 && r.name.indexOf(search.toUpperCase()) === -1) return false;
      return true;
    });
    var col = COLS[parseInt(Q.str(p['order[0][column]']), 10) || 0] || 'datetime';
    var dir = Q.str(p['order[0][dir]']).toLowerCase() === 'asc' ? 1 : -1;
    rows = rows.slice().sort(function (a, b) {
      var va = a[col], vb = b[col];
      if (va < vb) return -dir; if (va > vb) return dir;
      if (a.datetime !== b.datetime) return a.datetime < b.datetime ? 1 : -1;
      return a.line_no - b.line_no;
    });
    var page = rows.slice(start, start + length).map(function (r) {
      return { datetime: r.datetime.replace('T', ' '), store_no: r.store_no, outlet_name: W.storeName(r.store_no), pos_terminal_no: r.pos_terminal_no,
        receipt_no: r.receipt_no, transaction_no: r.transaction_no, line_no: r.line_no, staff_id: r.staff_id, member_id: r.member_id,
        item_no: r.item_no, item_name: r.name, unit_of_measure: r.unit_of_measure, quantity: W.round(r.quantity, 3),
        discount_amount: r.discount_amount, gst_amount: r.gst_amount, net_amount: r.net_amount, gross_profit: r.gross_profit };
    });
    return { draw: draw, recordsTotal: rows.length, recordsFiltered: rows.length, data: page,
      summary: { lines: rows.length, receipts: W.distinct(rows, 'receipt_no'), units: W.round(W.sum(rows, 'quantity'), 3),
        discount: W.round(W.sum(rows, 'discount_amount')), gst: W.round(W.sum(rows, 'gst_amount')), net: W.round(W.sum(rows, 'net_amount')),
        gp: W.round(W.sum(rows, 'gross_profit')) } };
  });
})();
