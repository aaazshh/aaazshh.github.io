// product-frequency-behaviour.php: products customers bought repeatedly, per
// product, from the repeat purchase index, rebuilt from the PHP template.
(function () {
  'use strict';
  var W = World;
  var h = PM.esc;
  var today = W.TODAY, df = W.parse(today);
  df.setMonth(df.getMonth() - 2); df.setDate(1);
  var defaultFrom = W.ymd(df);
  var f = {
    period_type: PM.get('period_type', 'monthly').toLowerCase(), date_from: PM.get('date_from', defaultFrom).trim(), date_to: PM.get('date_to', today).trim(),
    category: PM.get('category', '').trim(), product_sku: PM.get('product_sku', PM.get('sku', '')).trim(),
    min_repeat: Math.max(1, Math.min(999, parseInt(PM.get('min_repeat', PM.get('min_txn', '3')), 10) || 0)), member_id: PM.get('member_id', '').trim()
  };
  if (['weekly', 'monthly'].indexOf(f.period_type) === -1) f.period_type = 'monthly';
  if (f.member_id && !/^\d+$/.test(f.member_id)) f.member_id = '';
  if (f.date_from && !/^\d{4}-\d{2}-\d{2}$/.test(f.date_from)) f.date_from = defaultFrom;
  if (f.date_to && !/^\d{4}-\d{2}-\d{2}$/.test(f.date_to)) f.date_to = today;

  function sku(v) { v = String(v || '').trim(); return /^\d{1,9}$/.test(v) ? W.pad(parseInt(v, 10), 10) : v; }
  function variants(v) {
    v = String(v || '').trim();
    if (!v) return [];
    var out = [v];
    if (/^\d+$/.test(v)) { out.push(W.pad(parseInt(v, 10), 10)); out.push(v.replace(/^0+/, '')); }
    return out.filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  }
  var categories = Object.keys(W.CATEGORY_NAMES).map(function (c) { return W.CATEGORY_NAMES[c]; }).sort();
  var categorySkus = [];
  if (f.category) W.ITEMS.forEach(function (it) { if (W.CATEGORY_NAMES[it.item_category_code] === f.category) categorySkus = categorySkus.concat(variants(it.item_no)); });

  var filters = [{ term: { period_type: f.period_type } }, { range: { txn_count: { gte: f.min_repeat } } }];
  if (f.date_from) filters.push({ range: { period_end: { gte: f.date_from } } });
  if (f.date_to) filters.push({ range: { period_start: { lte: f.date_to } } });
  if (f.member_id) filters.push({ term: { member_id: parseInt(f.member_id, 10) } });
  if (f.product_sku) {
    var parts = [];
    f.product_sku.split(/[\s,]+/).filter(Boolean).forEach(function (p) { parts = parts.concat(variants(p)); });
    if (parts.length > 1) filters.push({ terms: { product_sku: parts } });
    else if (parts.length === 1) filters.push({ wildcard: { product_sku: '*' + parts[0] + '*' } });
  }
  if (f.category) filters.push(categorySkus.length ? { terms: { product_sku: categorySkus } } : { term: { product_sku: '__NO_CATEGORY_MATCH__' } });

  var a = Es.search(Crm.repeatIndex(f.period_type), { size: 0, query: { bool: { filter: filters } }, aggs: {
    products: { cardinality: { field: 'product_sku' } }, customers: { cardinality: { field: 'member_id' } }, repeat_purchases: { sum: { field: 'txn_count' } },
    by_product: { terms: { field: 'product_sku', size: 50000 }, aggs: { repeat_purchases: { sum: { field: 'txn_count' } }, customers: { cardinality: { field: 'member_id' } },
      last_purchase: { max: { field: 'last_seen' } }, product_name: { terms: { field: 'product_name.keyword', size: 1 } } } }
  } }).aggregations;
  var summary = { total_products: a.products.value, total_customers: a.customers.value, total_repeat_purchases: Math.round(a.repeat_purchases.value), top_product: '-', top_product_count: 0 };
  var products = a.by_product.buckets.map(function (b) {
    var it = W.ITEM_BY_NO[b.key];
    return { product_sku: sku(b.key), product_name: (b.product_name.buckets[0] || {}).key || sku(b.key), repeat_purchases: Math.round(b.repeat_purchases.value),
      customer_count: b.customers.value, last_purchase: b.last_purchase.value ? new Date(b.last_purchase.value) : null,
      category: it ? '(' + it.item_category_code + ') ' + W.CATEGORY_NAMES[it.item_category_code] : '-' };
  });
  products.sort(function (x, y) { return y.repeat_purchases - x.repeat_purchases || x.product_name.localeCompare(y.product_name); });
  if (products.length) { summary.top_product = products[0].product_name; summary.top_product_count = products[0].repeat_purchases; }

  var base = { period_type: f.period_type, date_from: f.date_from, date_to: f.date_to, min_repeat: f.min_repeat, member_id: f.member_id };
  function drill(skuValue) {
    var q = {};
    Object.keys(base).forEach(function (k) { if (base[k] !== '') q[k] = base[k]; });
    q.product_sku = skuValue;
    return 'customer-behaviour-report.html?' + PM.query(q);
  }
  var chart = products.slice(0, 30);
  PM.chartLabels = chart.map(function (p) { return p.product_name || p.product_sku; });
  PM.chartValues = chart.map(function (p) { return p.repeat_purchases; });
  PM.chartLinks = chart.map(function (p) { return drill(p.product_sku).replace(/&amp;/g, '&'); });

  function stamp(d) { return d ? d.getFullYear() + '-' + W.pad(d.getMonth() + 1) + '-' + W.pad(d.getDate()) + ' ' + W.pad(d.getHours()) + ':' + W.pad(d.getMinutes()) : '-'; }
  function sel(v, s) { return String(v) === String(s) ? ' selected' : ''; }
  function card(label, value, extra) {
    return '<div class="col-lg-3 col-md-6 mb-4"><div class="card frequency-summary-card"><div class="card-body"><p class="text-sm mb-1">' + label + '</p><h4>' + value + '</h4>' + (extra || '') + '</div></div></div>';
  }

  PM.main = function () {
    var rows = products.map(function (p) {
      return '<tr><td>' + h(p.product_sku) + '</td><td class="product-name-cell">' + h(p.product_name) + '</td><td>' + h(p.category) + '</td>' +
        '<td class="text-end">' + PM.nf(p.repeat_purchases) + '</td><td class="text-end">' + PM.nf(p.customer_count) + '</td><td>' + stamp(p.last_purchase) + '</td>' +
        '<td class="text-end"><a class="btn btn-sm btn-outline-success mb-0" href="' + drill(p.product_sku) + '">View Customers</a></td></tr>';
    }).join('');
    return '<div class="row mb-4"><div class="col-12"><div class="card"><div class="card-header pb-0"><h5 class="mb-1">Product Frequency Behaviour</h5>' +
      '<p class="text-sm mb-0">Review products and categories that customers repeatedly purchase before drilling into individual customer behaviour.</p></div><div class="card-body">' +
      '<form method="get" class="row g-3 frequency-filter-form">' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Period Type</label><select class="form-control" name="period_type"><option value="weekly"' + sel('weekly', f.period_type) + '>Weekly</option><option value="monthly"' + sel('monthly', f.period_type) + '>Monthly</option></select></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Date From</label><input type="date" class="form-control" name="date_from" value="' + h(f.date_from) + '"></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Date To</label><input type="date" class="form-control" name="date_to" value="' + h(f.date_to) + '"></div>' +
      '<div class="col-xl-3 col-lg-4 col-md-6"><label class="form-label">Category</label><select class="form-control frequency-category-select" name="category" data-placeholder="Search category"><option value="">All Categories</option>' +
      categories.map(function (c) { return '<option value="' + h(c) + '"' + sel(c, f.category) + '>' + h(c) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Product SKU / Item No</label><input type="text" class="form-control" name="product_sku" value="' + h(f.product_sku) + '" placeholder="Optional"></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Minimum Transaction Count</label><input type="number" class="form-control" name="min_repeat" min="1" max="999" value="' + f.min_repeat + '"></div>' +
      '<div class="col-xl-2 col-lg-3 col-md-6"><label class="form-label">Member ID</label><input type="text" class="form-control" name="member_id" inputmode="numeric" pattern="[0-9]*" value="' + h(f.member_id) + '" placeholder="Optional"></div>' +
      '<div class="col-xl-1 col-lg-2 col-md-6 frequency-filter-action"><button type="submit" class="btn btn-primary w-100 mb-0" style="background-color: rgb(12,99,38);">Run</button></div></form>' +
      '<p class="text-xs text-muted mt-3 mb-0">Source index: prod-customer-repeat-purchases. Category options and filtering use prod-crm-outlet-transactions. Click a chart bar to open Customer Behaviour Report for that product.</p>' +
      '</div></div></div></div>' +
      '<div class="row mb-4">' + card('Repeat Products', PM.nf(summary.total_products)) + card('Total Repeat Purchase Count', PM.nf(summary.total_repeat_purchases)) +
      card('Repeat Customers', PM.nf(summary.total_customers)) +
      card('Top Repeat Product', h(summary.top_product), '<div class="frequency-muted">' + PM.nf(summary.top_product_count) + ' repeat purchases</div>') + '</div>' +
      '<div class="row mb-4"><div class="col-12"><div class="card"><div class="card-header pb-0"><h6 class="mb-0">Repeat Purchase Count by Product</h6>' +
      '<p class="text-sm mb-0">Top ' + PM.nf(chart.length) + ' products by summed repeat purchase count.</p></div><div class="card-body"><div class="frequency-chart-wrap"><canvas id="productFrequencyChart"></canvas></div>' +
      (chart.length ? '' : '<p class="text-center text-muted mt-3 mb-0">No products matched the selected filters.</p>') + '</div></div></div></div>' +
      '<div class="card"><div class="card-header pb-0"><h6 class="mb-0">Product Frequency Details</h6><p class="text-sm mb-0">Showing ' + PM.nf(products.length) + ' matching products.' +
      (f.category ? ' Category matched ' + PM.nf(categorySkus.length) + ' product SKUs.' : '') + '</p></div>' +
      '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-3"><table class="table align-items-center mb-0 frequency-table" id="productFrequencyTable"><thead><tr>' +
      '<th>Item No</th><th>Product Name</th><th>Category</th><th class="text-end">Total Repeat Purchase Count</th><th class="text-end">Customers</th><th>Last Purchase</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div></div>';
  };
})();
