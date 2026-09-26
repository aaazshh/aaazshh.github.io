// no-sale-* actions (No Sale & Slow Moving Report), ported from the
// noSaleAnalyse() family in api.php over the synthetic SOH snapshots.
var NoSale = (function () {
  'use strict';
  var W = World;

  function nearest(dates, target, dir) {
    if (!dates.length) return target;
    if (dir === 'before') { var best = dates[0]; dates.forEach(function (d) { if (d <= target) best = d; }); return best; }
    for (var i = 0; i < dates.length; i++) if (dates[i] >= target) return dates[i];
    return dates[dates.length - 1];
  }
  function resolveWindow(period, endDate, startDate) {
    var dates = W.snapshotDates();
    var end = nearest(dates, endDate || dates[dates.length - 1], 'before'), start;
    if (period === 'custom' && startDate) start = nearest(dates, startDate, 'after');
    else start = nearest(dates, W.ymd(W.addDays(W.parse(end), -({ '1w': 7, '2w': 14, '1m': 28 }[period] || 7))), 'after');
    if (start > end) start = end;
    return { start: start, end: end, days: Math.round((W.parse(end) - W.parse(start)) / 86400000) };
  }
  function options(p) {
    var period = Q.str(p.period) || '1w';
    if (['1w', '2w', '1m', 'custom'].indexOf(period) === -1) period = '1w';
    var w = resolveWindow(period, Q.str(p.date_to), Q.str(p.date_from));
    var threshold = parseFloat(Q.str(p.threshold)); if (isNaN(threshold)) threshold = 2; if (threshold < 0) threshold = 0;
    var minSoh = parseFloat(Q.str(p.min_soh)); if (isNaN(minSoh)) minSoh = 1; if (minSoh < 0) minSoh = 0;
    return { store_no: Q.str(p.store_no).trim(), period: period, start: w.start, end: w.end, days: w.days,
      threshold: threshold, min_soh: minSoh, status: Q.str(p.status).trim(), category: Q.str(p.category).trim() };
  }
  function storeOf(code) { return W.STORES.filter(function (x) { return x.code === code; })[0]; }

  var rowCache = {};
  function analyse(store, start, end) {
    var key = store + start + end;
    if (rowCache[key]) return rowCache[key];
    if (!storeOf(store)) return [];
    var s = W.soh(store), i0 = s.dates.indexOf(start), i1 = s.dates.indexOf(end);
    if (i0 < 0 || i1 < 0) return [];
    var sold = {};
    W.lines(start, end, store).forEach(function (l) {
      var t = sold[l.item_no] || (sold[l.item_no] = { units: 0, revenue: 0, receipts: {}, last: '' });
      t.units += l.quantity; t.revenue += l.net_amount; t.receipts[l.receipt_no] = 1; if (l.datetime > t.last) t.last = l.datetime;
    });
    var lastEver = {};
    for (var back = 0; back < 365; back++) {
      var d = W.ymd(W.addDays(W.parse(end), -back));
      var sum = W.daySummary(storeOf(store), d);
      Object.keys(sum).forEach(function (k) { if (!lastEver[k]) lastEver[k] = d; });
    }
    var weeks = Math.max(1, Math.round((W.parse(end) - W.parse(start)) / 86400000)) / 7;
    var rows = W.ITEMS.map(function (it) {
      var t = s.items[it.item_no], win = t.days.slice(i0, i1 + 1);
      var flat = Math.max.apply(null, win) - Math.min.apply(null, win) < 0.0001;
      var sale = sold[it.item_no] || { units: 0, revenue: 0, receipts: {}, last: '' };
      var price = sale.units > 0 ? W.round(sale.revenue / sale.units) : it.price;
      var sohEnd = W.round(t.days[i1]);
      return { item_no: it.item_no, item_name: it.name, uom_lines: [{ uom: it.uom, start: t.days[i0], end: t.days[i1], flat: flat }],
        soh_start: W.round(t.days[i0]), soh_end: sohEnd, soh_flat: flat, snapshots: i1 - i0 + 1,
        category_code: it.item_category_code, product_group_code: it.product_group_code, category_name: W.CATEGORY_NAMES[it.item_category_code],
        uom: it.uom, soh_change: W.round(t.days[i1] - t.days[i0]), units_sold: W.round(sale.units), revenue: W.round(sale.revenue),
        receipts: Object.keys(sale.receipts).length, last_sold: sale.last ? sale.last.slice(0, 10) : '',
        last_sold_ever: lastEver[it.item_no] || '',
        days_since_sale: lastEver[it.item_no] ? Math.round((W.parse(end) - W.parse(lastEver[it.item_no])) / 86400000) : null,
        price: price, stock_value: W.round(sohEnd * price), weeks_cover: sale.units > 0 ? W.round(sohEnd / (sale.units / weeks), 1) : null };
    });
    return (rowCache[key] = rows);
  }
  function statusFor(row, threshold, minSoh) {
    if (row.soh_end < minSoh) return 'out_of_stock';
    if (row.units_sold <= 0) return row.soh_flat ? 'no_sale' : 'no_pos_sale';
    if (row.units_sold <= threshold) return 'slow';
    return 'healthy';
  }
  function counts(store, start, end, threshold, minSoh) {
    var c = { no_sale: 0, slow: 0, no_pos_sale: 0, healthy: 0, out_of_stock: 0 };
    analyse(store, start, end).forEach(function (r) { c[statusFor(r, threshold, minSoh)]++; });
    return c;
  }
  function err(msg) { return { status: 0, error: msg }; }

  Api.route('api:no-sale-summary', function (p) {
    var o = options(p);
    if (!o.store_no) return err('Select an outlet to run the no-sale analysis.');
    var rows = analyse(o.store_no, o.start, o.end);
    var c = { no_sale: 0, slow: 0, no_pos_sale: 0, healthy: 0, out_of_stock: 0 }, cats = {}, order = [];
    var deadUnits = 0, deadValue = 0, slowUnits = 0;
    rows.forEach(function (r) {
      var st = statusFor(r, o.threshold, o.min_soh);
      c[st]++;
      var cat = cats[r.category_code];
      if (!cat) { cat = cats[r.category_code] = { code: r.category_code, name: r.category_name, total: 0, no_sale: 0, slow: 0, dead_value: 0 }; order.push(r.category_code); }
      cat.total++;
      if (st === 'no_sale') { cat.no_sale++; cat.dead_value += r.stock_value || 0; deadUnits += r.soh_end; deadValue += r.stock_value || 0; }
      else if (st === 'slow') { cat.slow++; slowUnits += r.soh_end; }
    });
    var list = order.map(function (k) { cats[k].dead_value = W.round(cats[k].dead_value); return cats[k]; });
    list.sort(function (a, b) { return b.no_sale - a.no_sale; });
    var stocked = c.no_sale + c.slow + c.no_pos_sale + c.healthy;
    return Api.json({ window: { start: o.start, end: o.end, days: o.days, period: o.period }, store_no: o.store_no, threshold: o.threshold,
      min_soh: o.min_soh, counts: c, lines_total: rows.length, stocked: stocked,
      no_sale_pct: stocked ? W.round(c.no_sale / stocked * 100) : 0, slow_pct: stocked ? W.round(c.slow / stocked * 100) : 0,
      dead_units: W.round(deadUnits), dead_value: W.round(deadValue), slow_units: W.round(slowUnits), categories: list.slice(0, 200) });
  });

  function matchesCategory(row, codes) {
    return codes.some(function (c) { return c && (row.product_group_code.indexOf(c) === 0 || row.category_code.indexOf(c) === 0); });
  }

  Api.route('api:no-sale-items', function (p) {
    var o = options(p);
    if (!o.store_no) return err('Select an outlet to run the no-sale analysis.');
    var draw = parseInt(Q.str(p.draw), 10) || 1, start = Math.max(0, parseInt(Q.str(p.start), 10) || 0);
    var length = parseInt(Q.str(p.length), 10) || 25;
    var search = Q.str(p['search[value]']).trim().toLowerCase();
    var rows = analyse(o.store_no, o.start, o.end);
    var codes = o.category.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var filtered = [];
    rows.forEach(function (row) {
      var st = statusFor(row, o.threshold, o.min_soh);
      if (o.status === '' || o.status === 'attention') { if (['no_sale', 'slow', 'no_pos_sale'].indexOf(st) === -1) return; }
      else if (st !== o.status) return;
      if (codes.length && !matchesCategory(row, codes)) return;
      if (search && row.item_no.toLowerCase().indexOf(search) === -1 && row.item_name.toLowerCase().indexOf(search) === -1 &&
        row.category_name.toLowerCase().indexOf(search) === -1) return;
      var copy = {};
      for (var k in row) copy[k] = row[k];
      copy.status = st;
      filtered.push(copy);
    });
    var cols = ['item_no', 'item_name', 'category_name', 'uom', 'price', 'soh_start', 'soh_end', 'soh_change', 'units_sold', 'revenue', 'last_sold_ever', 'status'];
    var col = cols[parseInt(Q.str(p['order[0][column]']), 10) || 0] || 'item_no';
    var dir = Q.str(p['order[0][dir]']).toLowerCase() === 'desc' ? -1 : 1;
    filtered.sort(function (a, b) {
      var x = a[col], y = b[col];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x == null ? '' : x).localeCompare(String(y == null ? '' : y)) * dir;
    });
    return { draw: draw, recordsTotal: rows.length, recordsFiltered: filtered.length, data: filtered.slice(start, start + length),
      window: { start: o.start, end: o.end } };
  });

  Api.route('api:no-sale-item-trend', function (p) {
    var o = options(p), itemNo = Q.str(p.item_no).trim();
    if (!o.store_no || !itemNo) return err('Outlet and item are required.');
    var s = W.soh(o.store_no), it = W.ITEM_BY_NO[itemNo], store = storeOf(o.store_no);
    var labels = W.days(o.start, o.end);
    var values = labels.map(function (d) { var i = s.dates.indexOf(d); return i < 0 ? null : W.round(s.items[itemNo].days[i]); });
    var units = labels.map(function (d) { var x = W.daySummary(store, d)[itemNo]; return x ? W.round(x.qty) : 0; });
    var others = [], mine = 0;
    W.STORES.forEach(function (st) {
      var u = 0;
      labels.forEach(function (d) { var x = W.daySummary(st, d)[itemNo]; if (x) u += x.qty; });
      u = W.round(u);
      if (st.code === o.store_no) mine = u; else if (u > 0) others.push({ store_no: st.code, units: u });
    });
    others.sort(function (a, b) { return b.units - a.units; });
    return Api.json({ item_no: itemNo, item_name: it ? it.name : itemNo, store_no: o.store_no, labels: labels,
      soh_series: [{ uom: it ? it.uom : '', values: values }], units_sold: units, this_outlet_units: mine,
      other_outlet_count: others.length, other_outlet_units: W.round(others.reduce(function (a, b) { return a + b.units; }, 0)),
      top_other_outlets: others.slice(0, 5) });
  });

  Api.route('api:no-sale-item-transactions', function (p) {
    var store = Q.str(p.store_no).trim(), itemNo = Q.str(p.item_no).trim();
    if (!store || !itemNo) return err('Outlet and item are required.');
    var o = options(p), end = o.end || W.TODAY;
    var months = Math.max(1, Math.min(24, parseInt(Q.str(p.months), 10) || 12));
    var sd = W.parse(end); sd.setMonth(sd.getMonth() - months);
    var start = W.ymd(sd), limit = Math.max(1, Math.min(500, parseInt(Q.str(p.limit), 10) || 200));
    var rows = W.lines(start, end, store).filter(function (r) { return r.item_no === itemNo; });
    rows.sort(function (a, b) { return a.datetime < b.datetime ? 1 : -1; });
    return Api.json({ item_no: itemNo, store_no: store, item_name: rows.length ? rows[0].name : '', range: { start: start, end: end, months: months },
      total_lines: rows.length, returned: Math.min(limit, rows.length), total_units: W.round(W.sum(rows, 'quantity')),
      total_revenue: W.round(W.sum(rows, 'net_amount')), receipts: W.distinct(rows, 'receipt_no'),
      transactions: rows.slice(0, limit).map(function (r) {
        return { datetime: r.datetime.replace('T', ' '), receipt_no: r.receipt_no, terminal: r.pos_terminal_no, transaction_no: r.transaction_no,
          staff_id: r.staff_id, uom: r.unit_of_measure, quantity: W.round(r.quantity, 3), net_amount: r.net_amount,
          unit_price: r.quantity > 0 ? W.round(r.net_amount / r.quantity) : null, discount_amount: r.discount_amount, gross_profit: r.gross_profit };
      }) });
  });

  Api.route('api:no-sale-outlet', function (p) {
    var o = options(p);
    if (!o.store_no) return err('Outlet is required.');
    var c = counts(o.store_no, o.start, o.end, o.threshold, o.min_soh), stocked = c.no_sale + c.slow + c.no_pos_sale + c.healthy;
    return Api.json({ store_no: o.store_no, counts: c, stocked: stocked, no_sale_pct: stocked ? W.round(c.no_sale / stocked * 100) : 0,
      slow_pct: stocked ? W.round(c.slow / stocked * 100) : 0 });
  });

  Api.route('api:no-sale-persistence', function (p) {
    var store = Q.str(p.store_no).trim();
    if (!store) return err('Outlet is required.');
    var end = Q.str(p.date_to).trim();
    var threshold = parseFloat(Q.str(p.threshold)); if (isNaN(threshold)) threshold = 2;
    var minSoh = parseFloat(Q.str(p.min_soh)); if (isNaN(minSoh)) minSoh = 1;
    var series = [];
    [['1w', 'Last 1 week'], ['2w', 'Last 2 weeks'], ['1m', 'Last 1 month']].forEach(function (x) {
      var w = resolveWindow(x[0], end);
      var c = counts(store, w.start, w.end, threshold, minSoh);
      series.push({ period: x[0], label: x[1], start: w.start, end: w.end, no_sale: c.no_sale, slow: c.slow });
    });
    return Api.json(series);
  });

  return { resolveWindow: resolveWindow };
})();
