// customer-behaviour-report.php: repeat purchases per member, product and
// period from the repeat purchase index, with the summary cards, the trend and
// (for one member) the basket split by category. The page body is PHP
// rendered, so it is rebuilt here from the same template.
(function () {
  'use strict';
  var W = World;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var h = PM.esc;

  var today = W.TODAY, df = W.parse(today);
  df.setMonth(df.getMonth() - 2); df.setDate(1);
  var defaultFrom = W.ymd(df);
  var f = {
    period_type: PM.get('period_type', 'monthly').toLowerCase(), date_from: PM.get('date_from', defaultFrom).trim(), date_to: PM.get('date_to', today).trim(),
    member_id: PM.get('member_id', '').trim(), product_sku: PM.get('product_sku', PM.get('sku', '')).trim(), category: PM.get('category', '').trim(),
    min_repeat: Math.max(2, Math.min(999, parseInt(PM.get('min_repeat', PM.get('min_txn', '2')), 10) || 0))
  };
  if (['weekly', 'monthly'].indexOf(f.period_type) === -1) f.period_type = 'monthly';
  if (f.member_id && !/^\d+$/.test(f.member_id)) f.member_id = '';
  if (f.date_from && !/^\d{4}-\d{2}-\d{2}$/.test(f.date_from)) f.date_from = defaultFrom;
  if (f.date_to && !/^\d{4}-\d{2}-\d{2}$/.test(f.date_to)) f.date_to = today;
  PM.f = f;

  function sku(v) { v = String(v || '').trim(); return /^\d{1,9}$/.test(v) ? W.pad(parseInt(v, 10), 10) : v; }
  function variants(v) {
    v = String(v || '').trim();
    if (!v) return [];
    var out = [v];
    if (/^\d+$/.test(v)) { out.push(W.pad(parseInt(v, 10), 10)); out.push(v.replace(/^0+/, '')); }
    return out.filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  }
  function dmy(d, withYear) { var x = W.parse(d); return W.pad(x.getDate()) + ' ' + SHORT[x.getMonth()] + (withYear ? ' ' + x.getFullYear() : ''); }
  function periodLabel(r) {
    if (r.period_type === 'monthly') return MONTHS[parseInt(r.period_key.slice(5), 10) - 1] + ' ' + r.period_key.slice(0, 4);
    return dmy(r.period_start) + ' - ' + dmy(r.period_end, true);
  }

  var categories = Object.keys(W.CATEGORY_NAMES).map(function (c) { return W.CATEGORY_NAMES[c]; }).sort();
  var categorySkus = [];
  if (f.category) {
    W.ITEMS.forEach(function (it) { if (W.CATEGORY_NAMES[it.item_category_code] === f.category) categorySkus = categorySkus.concat(variants(it.item_no)); });
  }

  var filters = [{ term: { period_type: f.period_type } }, { range: { txn_count: { gte: f.min_repeat } } },
    { bool: { must_not: [{ match_phrase: { product_name: 'Plastic Bag' } }] } }];
  if (f.date_from) filters.push({ range: { period_end: { gte: f.date_from } } });
  if (f.date_to) filters.push({ range: { period_start: { lte: f.date_to } } });
  if (f.member_id) filters.push({ term: { member_id: parseInt(f.member_id, 10) } });
  if (f.product_sku) {
    var parts = [];
    f.product_sku.split(/[\s,]+/).filter(Boolean).forEach(function (p) { parts = parts.concat(variants(p)); });
    filters.push(parts.length > 1 ? { terms: { product_sku: parts } } : { wildcard: { product_sku: '*' + parts[0] + '*' } });
  }
  if (f.category) filters.push(categorySkus.length ? { terms: { product_sku: categorySkus } } : { term: { product_sku: '__NO_CATEGORY_MATCH__' } });

  var docs = Crm.repeatIndex(f.period_type);
  var sum = Es.search(docs, { size: 0, query: { bool: { filter: filters } }, aggs: {
    customers: { cardinality: { field: 'member_id' } }, repeat_purchases: { sum: { field: 'txn_count' } },
    top_customer: { terms: { field: 'member_id', size: 1, order: { customer_repeat_purchases: 'desc' } }, aggs: { customer_repeat_purchases: { sum: { field: 'txn_count' } } } }
  } });
  var summary = { total_customers: sum.aggregations.customers.value, total_repeat_purchases: Math.round(sum.aggregations.repeat_purchases.value),
    most_frequent_customer: '-', most_frequent_customer_count: 0, total_rows: sum.hits.total.value };
  summary.average_repeat_purchases = summary.total_customers ? summary.total_repeat_purchases / summary.total_customers : 0;
  var top = sum.aggregations.top_customer.buckets[0];
  if (top) { summary.most_frequent_customer = String(top.key); summary.most_frequent_customer_count = Math.round(top.customer_repeat_purchases.value); }

  var hits = Es.search(docs, { size: 10000, query: { bool: { filter: filters } },
    sort: [{ txn_count: 'desc' }, { last_seen: 'desc' }, { member_id: 'asc' }, { product_sku: 'asc' }, { period_key: 'asc' }] }).hits.hits;
  var rows = hits.map(function (x) {
    var s = x._source;
    return { member_id: s.member_id, product_sku: sku(s.product_sku), product_name: s.product_name, period: periodLabel(s),
      period_sort: s.period_start, txn_count: s.txn_count, last_seen: s.last_seen };
  });

  var periods = {};
  rows.forEach(function (r) { var p = periods[r.period] || (periods[r.period] = { label: r.period, sort: r.period_sort, count: 0 }); p.count += r.txn_count; });
  var trend = Object.keys(periods).map(function (k) { return periods[k]; }).sort(function (a, b) { return a.sort < b.sort ? -1 : 1; });
  PM.trendLabels = trend.map(function (p) { return p.label; });
  PM.trendValues = trend.map(function (p) { return p.count; });

  var basket = [];
  var avgLabel = 'Avg Repeat Purchases / Customer', avgValue = summary.average_repeat_purchases;
  var cardLabel = 'Most Frequent Repeat Customer', cardValue = summary.most_frequent_customer;
  var cardDetail = PM.nf(summary.most_frequent_customer_count) + ' repeat purchases', cardUrl = '', visitUrl = '';
  if (f.member_id) {
    var mid = 'M' + W.pad(parseInt(f.member_id, 10), 6);
    var lines = Crm.txDocs(f.date_from || defaultFrom, f.date_to || today).filter(function (d) { return d.member_id === mid && !/plastic bag/i.test(d.product_name); });
    var tx = {}, bySku = {};
    lines.forEach(function (l) { tx[l.transaction_code] = 1; (bySku[l.sku] = bySku[l.sku] || { n: 0, name: l.product_name }).n++; });
    var txCount = Object.keys(tx).length;
    avgLabel = 'Avg Purchase per Transaction'; avgValue = txCount ? lines.length / txCount : 0;
    var best = Object.keys(bySku).sort(function (a, b) { return bySku[b].n - bySku[a].n || (a < b ? -1 : 1); })[0];
    cardLabel = 'Most Purchased Product';
    cardValue = best ? bySku[best].name : '-';
    cardDetail = best ? sku(best) + ' · ' + PM.nf(bySku[best].n) + ' purchases' : 'No purchases found';
    var totals = {}, order = [];
    Object.keys(bySku).forEach(function (k) {
      var it = W.ITEM_BY_NO[k], code = it ? it.item_category_code : '';
      var cat = code ? '(' + code + ') ' + W.CATEGORY_NAMES[code] : 'Others';
      if (!(cat in totals)) { totals[cat] = 0; order.push(cat); }
      totals[cat] += bySku[k].n;
    });
    order.sort(function (a, b) { return totals[b] - totals[a]; });
    var grand = order.reduce(function (s, k) { return s + totals[k]; }, 0), other = 0;
    order.forEach(function (k, i) {
      if (i < 4) basket.push({ category: k, count: totals[k], percent: Math.round(totals[k] / grand * 1000) / 10 });
      else other += totals[k];
    });
    if (other) basket.push({ category: 'Others', count: other, percent: Math.round(other / grand * 1000) / 10 });
    visitUrl = '#visit-consistency-chart.php?' + PM.query({ member_id: f.member_id, date_from: f.date_from, date_to: f.date_to, period_type: f.period_type });
  } else if (f.product_sku) {
    cardLabel = 'Top Customer for Product';
  }
  if (!f.member_id && /^\d+$/.test(String(summary.most_frequent_customer))) {
    var q = {};
    ['period_type', 'date_from', 'date_to', 'member_id', 'product_sku', 'category', 'min_repeat'].forEach(function (k) {
      var v = k === 'member_id' ? summary.most_frequent_customer : f[k];
      if (v !== '') q[k] = v;
    });
    cardUrl = 'customer-behaviour-report.html?' + PM.query(q);
  }

  function sel(v) { return String(v) === String(f.period_type) ? ' selected' : ''; }
  function pct(v) { var s = (Math.round(v * 10) / 10).toFixed(1); return s.replace(/\.0$/, ''); }

  PM.main = function () {
    var catOptions = categories.map(function (c) { return '<option value="' + h(c) + '"' + (c === f.category ? ' selected' : '') + '>' + h(c) + '</option>'; }).join('');
    var card = function (label, value) {
      return '<div class="col-lg-3 col-md-6 mb-4"><div class="card customer-summary-card"><div class="card-body"><p class="text-sm mb-1">' + label +
        '</p><h4>' + value + '</h4></div></div></div>';
    };
    var last = '<div class="card customer-summary-card"><div class="card-body"><p class="text-sm mb-1">' + h(cardLabel) + '</p><h4>' + h(cardValue) +
      '</h4><div class="customer-muted">' + h(cardDetail) + '</div></div></div>';
    if (cardUrl) last = '<a class="customer-summary-link" href="' + cardUrl + '">' + last + '</a>';
    var basketHtml;
    if (basket.length) {
      basketHtml = basket.map(function (r) {
        return '<div class="basket-distribution-row"><div class="basket-distribution-category" title="' + h(r.category) + '">' + h(r.category) + '</div>' +
          '<div class="basket-distribution-track" aria-label="' + h(r.category) + ' ' + r.percent + '%"><div class="basket-distribution-fill" style="width: ' +
          Math.max(0, Math.min(100, r.percent)) + '%;"></div></div><div class="basket-distribution-percent">' + pct(r.percent) + '%</div></div>';
      }).join('');
    } else if (!f.member_id) {
      basketHtml = '<p class="text-sm text-muted mb-0">Select a customer to view their shopping basket distribution.</p>';
    } else {
      basketHtml = '<p class="text-sm text-muted mb-0">No basket distribution data matched the selected filters.</p>';
    }
    var body = rows.map(function (r) {
      var visit = '#visit-consistency-chart.php?' + PM.query({ member_id: r.member_id, product_sku: r.product_sku, date_from: f.date_from, date_to: f.date_to, period_type: f.period_type });
      return '<tr data-href="' + visit + '" tabindex="0" role="link" aria-label="View visit consistency for member ' + h(r.member_id) + ' and product ' + h(r.product_sku) + '">' +
        '<td>' + h(r.member_id) + '</td><td>' + h(r.product_sku) + '</td><td class="product-name-cell">' + h(r.product_name) + '</td><td>' + h(r.period) + '</td>' +
        '<td class="text-end">' + PM.nf(r.txn_count) + '</td><td>' + (r.last_seen ? h(r.last_seen.slice(0, 16).replace('T', ' ')) : '-') + '</td></tr>';
    }).join('');
    return '<div class="row mb-4"><div class="col-12"><div class="card"><div class="card-header pb-0"><h5 class="mb-1">Customer Behaviour Report</h5>' +
      '<p class="text-sm mb-0">Identify which customers repeatedly purchase selected products and review their buying habits over time.</p></div><div class="card-body">' +
      '<form method="get" class="row g-3 customer-filter-form" id="customerFilterForm"><input type="hidden" name="period_type" value="' + h(f.period_type) + '">' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Date From</label><input type="date" class="form-control" name="date_from" id="mainDateFrom" value="' + h(f.date_from) + '"></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Date To</label><input type="date" class="form-control" name="date_to" id="mainDateTo" value="' + h(f.date_to) + '"></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Member ID</label><input type="text" class="form-control" name="member_id" inputmode="numeric" pattern="[0-9]*" value="' + h(f.member_id) + '" placeholder="Optional"></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Item No</label><input type="text" class="form-control" name="product_sku" value="' + h(f.product_sku) + '" placeholder="Optional"></div>' +
      '<div class="col-xl-3 col-lg-4 col-md-6"><label class="form-label">Category</label><select class="form-control customer-category-select" name="category" data-placeholder="Search category"><option value="">All Categories</option>' + catOptions + '</select></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Transaction Frequency</label><input type="number" class="form-control" name="min_repeat" min="2" max="999" value="' + f.min_repeat + '"></div>' +
      '<div class="col-xl-1 col-lg-2 col-md-6 customer-filter-action"><button type="submit" class="btn btn-primary w-100 mb-0" style="background-color: rgb(12,99,38);">Run</button></div></form>' +
      '<p class="text-xs text-muted mt-3 mb-0">Source index: prod-customer-repeat-purchases. Category options and category filtering use prod-crm-outlet-transactions.</p></div></div></div></div>' +
      '<div class="row mb-4">' + card('Total Customers', PM.nf(summary.total_customers)) + card('Total Repeat Purchases', PM.nf(summary.total_repeat_purchases)) +
      card(h(avgLabel), PM.nf(avgValue, 1)) + '<div class="col-lg-3 col-md-6 mb-4">' + last + '</div></div>' +
      '<div class="row mb-4"><div class="col-xl-6 mb-4"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">Repeat Purchases Over Time</h6>' +
      '<p class="text-sm mb-0">Summed repeat purchases across the selected filters.</p></div><div class="card-body">' +
      (PM.trendLabels.length ? '<div class="customer-chart-wrap"><canvas id="repeatPurchaseTrendChart"></canvas></div>' : '<p class="text-sm text-muted mb-0">No repeat purchase trend data matched the selected filters.</p>') +
      '</div></div></div><div class="col-xl-6 mb-4"><div class="card h-100"><div class="card-header pb-0 d-flex justify-content-between align-items-start gap-3"><div>' +
      '<h6 class="mb-0">Shopping Basket Distribution</h6><p class="text-sm mb-0">Category share of the customer\'s full basket within the selected date range.</p></div>' +
      (visitUrl ? '<a class="btn btn-outline-secondary btn-sm mb-0" href="' + visitUrl + '">View Visit Consistency</a>' : '') +
      '</div><div class="card-body">' + basketHtml + '</div></div></div></div>' +
      '<div class="card"><div class="card-header pb-0 d-flex justify-content-between align-items-center customer-table-toolbar"><div><h6 class="mb-0">Repeat Purchase Customers</h6>' +
      '<p class="text-sm mb-0">Showing ' + PM.nf(rows.length) + ' of ' + PM.nf(summary.total_rows) + ' matching rows.' +
      (f.category ? ' Category matched ' + PM.nf(categorySkus.length) + ' product SKUs.' : '') + '</p></div>' +
      '<form method="get" class="customer-period-filter" id="customerPeriodFilterForm"><input type="hidden" name="date_from" id="periodDateFrom" value="' + h(f.date_from) + '">' +
      '<input type="hidden" name="date_to" id="periodDateTo" value="' + h(f.date_to) + '"><input type="hidden" name="member_id" value="' + h(f.member_id) + '">' +
      '<input type="hidden" name="product_sku" value="' + h(f.product_sku) + '"><input type="hidden" name="category" value="' + h(f.category) + '">' +
      '<input type="hidden" name="min_repeat" value="' + f.min_repeat + '"><label class="form-label text-xs text-muted">Period Type</label><div class="d-flex gap-2">' +
      '<select class="form-control" name="period_type" id="periodTypeFilter"><option value="weekly"' + sel('weekly') + '>Weekly</option><option value="monthly"' + sel('monthly') + '>Monthly</option></select>' +
      '<button type="button" class="btn btn-outline-secondary btn-sm mb-0" id="periodFilterResetBtn">Reset</button></div></form></div>' +
      '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-3"><table class="table align-items-center mb-0 customer-table" id="customerBehaviourTable">' +
      '<thead><tr><th>Member ID</th><th>Item NO</th><th>Product Name</th><th>Period</th><th class="text-end">Repeat Purchase Count</th><th>Last Purchase</th></tr></thead>' +
      '<tbody>' + body + '</tbody></table></div></div></div>';
  };
})();
