// member-point-list.php: the latest 100 point transactions for the filters,
// with member names from the CRM members table.
(function () {
  'use strict';
  var W = World;
  function day(v, fb) { return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fb; }
  PM.dateFrom = day(PM.get('date_from', ''), PM.daysAgo(90)); PM.dateTo = day(PM.get('date_to', ''), W.TODAY);
  PM.type = PM.get('transaction_type', '').trim(); PM.memberId = PM.get('member_id', '').trim(); PM.receiptId = PM.get('receipt_id', '').trim();
  var filters = [{ range: { transaction_date: { gte: PM.dateFrom + 'T00:00:00', lte: PM.dateTo + 'T23:59:59' } } }];
  if (PM.type !== '') filters.push({ term: { transaction_type: parseInt(PM.type, 10) } });
  if (PM.memberId !== '') filters.push({ term: { member_id: parseInt(PM.memberId, 10) } });
  if (PM.receiptId !== '') filters.push({ bool: { should: [{ term: { 'receipt_id.keyword': PM.receiptId } }, { term: { 'receipt_no.keyword': PM.receiptId } }], minimum_should_match: 1 } });
  var res = Es.search(Crm.points(), { size: 100, query: { bool: { filter: filters } }, sort: [{ transaction_date: { order: 'desc' } }, { id: { order: 'desc' } }] });
  PM.rows = res.hits.hits.map(function (h) {
    var s = h._source, m = Crm.MEMBERS[s.member_id - 1];
    return { member_id: s.member_id, name: m ? m.name : '-', receipt_id: s.receipt_id, transaction_type: Crm.TRANSACTION_TYPES[s.transaction_type] || 'Type ' + s.transaction_type,
      before_points: s.before_points, transaction_points: s.transaction_points, after_points: s.after_points, transaction_date: s.transaction_date.replace('T', ' ') };
  });
  PM.typeOptions = function () {
    return Object.keys(Crm.TRANSACTION_TYPES).filter(function (k) { return Crm.TRANSACTION_TYPES[k].toLowerCase() !== 'winning'; }).map(function (k) {
      return '<option value="' + k + '"' + (PM.type === k ? ' selected' : '') + '>' + PM.esc(Crm.TRANSACTION_TYPES[k]) + '</option>';
    }).join('');
  };
  PM.body = function () {
    if (!PM.rows.length) return '<tr><td colspan="9" class="text-center text-muted">No point transactions found.</td></tr>';
    return PM.rows.map(function (r) {
      return '<tr><td>' + r.member_id + '</td><td>' + PM.esc(r.name) + '</td><td>' + PM.esc(r.receipt_id) + '</td><td>' + PM.esc(r.transaction_type) + '</td>' +
        '<td class="text-end">' + PM.nf(r.before_points) + '</td><td class="text-end">' + PM.nf(r.transaction_points) + '</td>' +
        '<td class="text-end">$' + PM.nf(Math.abs(r.transaction_points) / 200, 2) + '</td><td class="text-end">' + PM.nf(r.after_points) + '</td><td>' + PM.esc(r.transaction_date) + '</td></tr>';
    }).join('');
  };
})();
