// mobile-transaction-report.php: the member transaction dashboard. PHP builds
// everything before rendering and answers ?ajax=dashboard with the same data
// as JSON; both are ported here over Crm.txDocs() and Crm.stampDocs().
var MobileReport = (function () {
  'use strict';
  var W = World;
  var LABELS = { revenue: 'Revenue ($)', transaction_count: 'Transaction Count', quantity_sold: 'Quantity Sold', total_stamps: 'Total Stamps', aov: 'AOV ($)' };
  function money(v) { return Math.round((+v || 0) / 100 * 100) / 100; }
  function s(p, k) { return p[k] == null ? null : Q.str(p[k]); }

  function categoryFilter(selected) {
    var codes = selected.split(',').map(function (c) { return c.trim().replace(/^0+/, ''); }).filter(Boolean);
    var pf = codes.map(function (c) { return { prefix: { sku: c } }; });
    return pf.length === 1 ? pf[0] : { bool: { should: pf, minimum_should_match: 1 } };
  }
  function outletFilter(o) {
    return { bool: { should: [{ term: { 'store_code.keyword': o } }, { term: { 'location_code.keyword': o } }], minimum_should_match: 1 } };
  }

  function compute(p) {
    var latest = W.ymd(W.addDays(new Date(), -1));
    var dateFrom = s(p, 'date_from') || W.TODAY.slice(0, 8) + '01', dateTo = s(p, 'date_to') || W.TODAY;
    if (dateTo < dateFrom) dateTo = dateFrom;
    var outlet = s(p, 'store_no') || '', age = s(p, 'age_group') || '', category = s(p, 'category') || '';
    var bGroup = s(p, 'breakdown_group_by') || 'date', bInterval = s(p, 'breakdown_interval') || 'daily', bDisplay = s(p, 'breakdown_display') || 'top10';
    var cGroup = s(p, 'combo_group_by') || 'age_group', cBar = s(p, 'combo_bar_metric') || 'revenue', cLine = s(p, 'combo_line_metric') || 'transaction_count';
    var cGender = s(p, 'combo_gender') || '';
    if (['date', 'outlet', 'age_group'].indexOf(bGroup) === -1) bGroup = 'date';
    if (['daily', 'weekly', 'monthly'].indexOf(bInterval) === -1) bInterval = 'daily';
    if (['top5', 'top10', 'bottom5', 'all'].indexOf(bDisplay) === -1) bDisplay = 'top10';
    if (['outlet', 'age_group'].indexOf(cGroup) === -1) cGroup = 'age_group';
    if (!LABELS[cBar]) cBar = 'revenue';
    if (!LABELS[cLine]) cLine = 'transaction_count';
    if (cBar === cLine) cLine = cBar === 'transaction_count' ? 'revenue' : 'transaction_count';

    var docs = Crm.txDocs(dateFrom, dateTo), stamps = Crm.stampDocs(dateFrom, dateTo);
    var range = { gte: dateFrom + 'T00:00:00', lte: dateTo + 'T23:59:59' };
    var filters = [{ range: { transaction_date: range } }];
    if (outlet) filters.push(outletFilter(outlet));
    if (age) filters.push({ bool: { should: [{ term: { 'age_group.keyword': age } }], minimum_should_match: 1 } });
    if (category) filters.push(categoryFilter(category));
    var ageChartFilters = [{ range: { transaction_date: range } }];
    if (outlet) ageChartFilters.push(outletFilter(outlet));
    if (category) ageChartFilters.push(categoryFilter(category));
    var base = { bool: { filter: filters } };
    var tx = { cardinality: { field: 'transaction_code.keyword' } };
    var sub = function () { return { revenue: { sum: { field: 'total_amount' } }, quantity: { sum: { field: 'quantity' } }, transactions: tx }; };

    var res = Es.search(docs, { size: 0, query: base, aggs: {
      total_revenue: { sum: { field: 'total_amount' } }, transactions: tx, quantity: { sum: { field: 'quantity' } }, members: { cardinality: { field: 'member_id' } },
      sales_daily: { date_histogram: { field: 'transaction_date', calendar_interval: 'day', format: 'yyyy-MM-dd', min_doc_count: 0, extended_bounds: { min: dateFrom, max: dateTo } }, aggs: sub() },
      sales_weekly: { date_histogram: { field: 'transaction_date', calendar_interval: 'week', format: 'yyyy-MM-dd', min_doc_count: 0, extended_bounds: { min: dateFrom, max: dateTo } }, aggs: sub() },
      sales_monthly: { date_histogram: { field: 'transaction_date', calendar_interval: 'month', format: 'yyyy-MM', min_doc_count: 0, extended_bounds: { min: dateFrom.slice(0, 7), max: dateTo.slice(0, 7) } }, aggs: sub() },
      age_groups: { terms: { field: 'age_group.keyword', size: 50 }, aggs: { members: { cardinality: { field: 'member_id' } }, revenue: { sum: { field: 'total_amount' } }, transactions: tx } },
      members_table: { terms: { field: 'member_id', size: 1000, order: { revenue: 'desc' } }, aggs: {
        revenue: { sum: { field: 'total_amount' } }, transactions: tx, quantity: { sum: { field: 'quantity' } },
        age_group: { terms: { field: 'age_group.keyword', size: 1, missing: 'Unknown' } }, gender: { terms: { field: 'gender.keyword', size: 1, missing: 'Unknown' } } } }
    } });
    var aggs = res.aggregations;

    var stampFilters = [{ range: { transaction_date: range } }, { term: { 'transaction_type.keyword': 'stamp' } }];
    if (outlet) stampFilters.push({ term: { 'location_code.keyword': outlet } });
    if (age) stampFilters.push({ term: { 'age_group.keyword': age } });
    var memberStamps = Es.search(stamps, { size: 0, query: { bool: { filter: stampFilters } }, aggs: { members: {
      terms: { field: 'member_id', size: 10000, order: { total_stamps: 'desc' } },
      aggs: { total_stamps: { sum: { field: 'transaction_stamps' } }, stamp_transactions: { cardinality: { field: 'member_transaction_id' } } } } } });

    var byId = {}, memberRows = [];
    aggs.members_table.buckets.forEach(function (b) {
      var rev = money(b.revenue.value), t = b.transactions.value;
      byId[b.key] = { member_id: String(b.key), revenue: rev, transactions: t, quantity: b.quantity.value, aov: t > 0 ? rev / t : 0,
        stamps: 0, stamp_transactions: 0, age_group: (b.age_group.buckets[0] || {}).key || 'Unknown', gender: (b.gender.buckets[0] || {}).key || 'Unknown' };
      memberRows.push(byId[b.key]);
    });
    memberStamps.aggregations.members.buckets.forEach(function (b) {
      if (!byId[b.key]) return;
      byId[b.key].stamps = b.total_stamps.value; byId[b.key].stamp_transactions = b.stamp_transactions.value;
    });

    aggs.age_groups = Es.search(docs, { size: 0, query: { bool: { filter: ageChartFilters } }, aggs: { age_groups: {
      terms: { field: 'age_group.keyword', size: 50 }, aggs: { members: { cardinality: { field: 'member_id' } }, revenue: { sum: { field: 'total_amount' } }, transactions: tx } } } })
      .aggregations.age_groups;

    var bSub = { revenue: { sum: { field: 'total_amount' } }, transactions: tx }, bAgg;
    if (bGroup === 'date') {
      var monthly = bInterval === 'monthly';
      bAgg = { date_histogram: { field: 'transaction_date', calendar_interval: { daily: 'day', weekly: 'week', monthly: 'month' }[bInterval],
        format: monthly ? 'yyyy-MM' : 'yyyy-MM-dd', min_doc_count: 0,
        extended_bounds: { min: monthly ? dateFrom.slice(0, 7) : dateFrom, max: monthly ? dateTo.slice(0, 7) : dateTo } }, aggs: bSub };
    } else if (bGroup === 'outlet') {
      bAgg = { terms: { field: 'store_code.keyword', size: ['top5', 'bottom5'].indexOf(bDisplay) !== -1 ? 5 : (bDisplay === 'all' ? 200 : 10),
        order: { revenue: bDisplay === 'bottom5' ? 'asc' : 'desc' } }, aggs: bSub };
    } else {
      bAgg = { filter: { bool: { must_not: [{ term: { 'age_group.keyword': 'NA' } }] } }, aggs: { groups: {
        terms: { field: 'age_group.keyword', size: 50, order: { revenue: 'desc' } }, aggs: bSub } } };
    }
    var breakdown = Es.search(docs, { size: 0, query: base, aggs: { performance_breakdown: bAgg } }).aggregations.performance_breakdown;
    if (bGroup === 'age_group') breakdown = breakdown.groups || { buckets: [] };

    var comboFilters = [{ range: { transaction_date: range } }];
    if (outlet) comboFilters.push(outletFilter(outlet));
    if (age) comboFilters.push({ term: { 'age_group.keyword': age } });
    if (cGender) comboFilters.push({ term: { 'gender.keyword': cGender } });
    if (category) comboFilters.push(categoryFilter(category));
    var stampComboFilters = [{ range: { transaction_date: range } }, { term: { 'transaction_type.keyword': 'stamp' } }];
    if (outlet) stampComboFilters.push({ term: { 'location_code.keyword': outlet } });
    var gField = cGroup === 'outlet' ? 'store_code.keyword' : 'age_group.keyword', gSize = cGroup === 'outlet' ? 200 : 50;
    var groupAgg = { terms: { field: gField, size: gSize, order: { revenue: 'desc' }, missing: 'Unknown' },
      aggs: { revenue: { sum: { field: 'total_amount' } }, transaction_count: tx, quantity_sold: { sum: { field: 'quantity' } } } };
    var bridgeAgg = { terms: { field: gField, size: gSize, missing: 'Unknown' }, aggs: { members: { terms: { field: 'member_id', size: 10000 } } } };
    if (cGroup === 'age_group') {
      var notNa = { bool: { must_not: [{ terms: { 'age_group.keyword': ['NA', 'Unknown'] } }] } };
      groupAgg = { filter: notNa, aggs: { groups: groupAgg } };
      bridgeAgg = { filter: notNa, aggs: { groups: bridgeAgg } };
    }
    var combo = Es.search(docs, { size: 0, query: { bool: { filter: comboFilters } }, aggs: { combo_groups: groupAgg, combo_member_bridge: bridgeAgg } }).aggregations;
    var stampCombo = Es.search(stamps, { size: 0, query: { bool: { filter: stampComboFilters } }, aggs: { members: {
      terms: { field: 'member_id', size: 10000 }, aggs: { total_stamps: { sum: { field: 'transaction_stamps' } } } } } }).aggregations;
    var stampByMember = {};
    stampCombo.members.buckets.forEach(function (b) { stampByMember[b.key] = b.total_stamps.value; });
    var stampTotals = {};
    var bridge = cGroup === 'age_group' ? combo.combo_member_bridge.groups.buckets : combo.combo_member_bridge.buckets;
    bridge.forEach(function (b) {
      stampTotals[b.key] = 0;
      b.members.buckets.forEach(function (m) { stampTotals[b.key] += stampByMember[m.key] || 0; });
    });
    var rows = (cGroup === 'age_group' ? combo.combo_groups.groups.buckets : combo.combo_groups.buckets).map(function (b) {
      var rev = money(b.revenue.value), n = b.transaction_count.value;
      return { group: String(b.key), revenue: rev, transaction_count: n, quantity_sold: b.quantity_sold.value, total_stamps: stampTotals[b.key] || 0, aov: n > 0 ? rev / n : 0 };
    });
    var note = category && (cBar === 'total_stamps' || cLine === 'total_stamps') ?
      'Total Stamps is not category-filtered because prod-crm-stamp-transactions has no category field.' : '';
    var comboAnalysis = { labels: rows.map(function (r) { return r.group; }), barMetric: cBar, lineMetric: cLine, barLabel: LABELS[cBar], lineLabel: LABELS[cLine],
      barData: rows.map(function (r) { return r[cBar]; }), lineData: rows.map(function (r) { return r[cLine]; }), rawRows: rows, note: note };

    var totalRevenue = money(aggs.total_revenue.value), totalTx = aggs.transactions.value, totalQty = aggs.quantity.value, members = aggs.members.value;
    return {
      aggs: aggs, breakdown: breakdown, comboAnalysis: comboAnalysis, memberRows: memberRows, hasData: res.hits.total.value > 0, latestDataDate: latest,
      params: { dateFrom: dateFrom, dateTo: dateTo, outlet: outlet, ageGroup: age, category: category, breakdownGroupBy: bGroup, breakdownInterval: bInterval,
        breakdownDisplay: bDisplay, comboGroupBy: cGroup, comboBarMetric: cBar, comboLineMetric: cLine, comboGender: cGender },
      metrics: { totalRevenue: totalRevenue, totalTransactions: totalTx, totalQuantity: totalQty, uniqueMembers: members,
        aov: totalTx > 0 ? totalRevenue / totalTx : 0, avgItemsPerTransaction: totalTx > 0 ? totalQty / totalTx : 0 },
      labels: LABELS
    };
  }

  Api.route('mobile-transaction-report.php', function (p) {
    var r = compute(p);
    delete r.labels;
    return r;
  });

  return { compute: compute, LABELS: LABELS };
})();
