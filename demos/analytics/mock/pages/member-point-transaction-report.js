// member-point-transaction-report.php: point totals, member activity segments,
// balance buckets and month on month retention over the point ledger.
(function () {
  'use strict';
  var W = World;
  function day(v, fb) { return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fb; }
  PM.dateFrom = day(PM.get('date_from', ''), PM.daysAgo(90)); PM.dateTo = day(PM.get('date_to', ''), W.TODAY);
  PM.type = PM.get('transaction_type', '').trim();
  var filters = [{ range: { transaction_date: { gte: PM.dateFrom + 'T00:00:00', lte: PM.dateTo + 'T23:59:59' } } }];
  if (PM.type !== '') filters.push({ term: { transaction_type: parseInt(PM.type, 10) } });
  var docs = Crm.points();
  var a = Es.search(docs, { size: 0, query: { bool: { filter: filters } }, aggs: {
    total_transactions: { value_count: { field: 'id' } }, total_points: { sum: { field: 'transaction_points' } },
    earned_scope: { filter: { range: { transaction_points: { gt: 0 } } }, aggs: { total_points_earned: { sum: { field: 'transaction_points' } } } },
    total_points_expired: { sum: { field: 'expired' } }, unique_members: { cardinality: { field: 'member_id' } },
    total_point_delta: { sum: { script: function (d) { return d.after_points - d.before_points; } } },
    type_breakdown: { terms: { field: 'transaction_type', size: 20 } }
  } }).aggregations;
  PM.totalTransactions = a.total_transactions.value; PM.totalPointsEarned = a.earned_scope.total_points_earned.value;
  PM.totalPointsExpired = a.total_points_expired.value; PM.uniqueMembers = a.unique_members.value;
  PM.avgPointsPerTransaction = PM.uniqueMembers > 0 ? a.total_point_delta.value / PM.uniqueMembers : 0;
  var typeBreakdown = a.type_breakdown.buckets.map(function (b) {
    return { type_id: +b.key, type: Crm.TRANSACTION_TYPES[b.key] || 'Type ' + b.key, count: b.doc_count };
  }).filter(function (r) { return r.type.toLowerCase() !== 'winning'; });

  var hits = docs.filter(function (d) { return Es.match(d, { bool: { filter: filters } }); });
  var members = {};
  hits.forEach(function (d) {
    var m = members[d.member_id] || (members[d.member_id] = { count: 0, latest: null });
    m.count++;
    if (!m.latest || d.transaction_date > m.latest.transaction_date) m.latest = d;
  });
  var seg = [['Low Activity', 0], ['Medium Activity', 0], ['High Activity', 0], ['Very High Activity', 0]];
  var dist = [['0-50 stamps', 0], ['51-100 stamps', 0], ['101-200 stamps', 0], ['201-500 stamps', 0], ['501-1000 stamps', 0], ['1000+ stamps', 0]];
  Object.keys(members).forEach(function (k) {
    var m = members[k], n = m.count, b = m.latest.after_points;
    seg[n <= 2 ? 0 : n <= 5 ? 1 : n <= 10 ? 2 : 3][1]++;
    dist[b <= 50 ? 0 : b <= 100 ? 1 : b <= 200 ? 2 : b <= 500 ? 3 : b <= 1000 ? 4 : 5][1]++;
  });
  var months = {};
  hits.forEach(function (d) { var mo = d.transaction_date.slice(0, 7); (months[mo] = months[mo] || {})[d.member_id] = 1; });
  var retention = [], prev = {};
  Object.keys(months).sort().forEach(function (mo) {
    var cur = months[mo], active = Object.keys(cur).length, repeat = 0, pc = Object.keys(prev).length;
    Object.keys(cur).forEach(function (m) { if (prev[m]) repeat++; });
    retention.push({ month: mo, active_members: active, repeat_members: repeat, retention_rate: pc > 0 ? repeat / pc * 100 : 0 });
    prev = cur;
  });
  PM.latestRetention = retention.length ? retention[retention.length - 1].retention_rate : 0;
  PM.chartData = { memberSegmentation: seg.map(function (s) { return { segment: s[0], count: s[1] }; }), typeBreakdown: typeBreakdown,
    pointBalanceDistribution: dist.map(function (s) { return { bucket: s[0], count: s[1] }; }), retentionTrend: retention };
  PM.typeOptions = function () {
    return Object.keys(Crm.TRANSACTION_TYPES).filter(function (k) { return Crm.TRANSACTION_TYPES[k].toLowerCase() !== 'winning'; }).map(function (k) {
      return '<option value="' + k + '"' + (PM.type === k ? ' selected' : '') + '>' + PM.esc(Crm.TRANSACTION_TYPES[k]) + '</option>';
    }).join('');
  };
})();
