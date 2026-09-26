// mobile-transaction-report.php: everything PHP computed before rendering,
// from the same port that answers the page's ?ajax=dashboard refreshes.
(function () {
  'use strict';
  var r = MobileReport.compute(PM.params), pr = r.params, m = r.metrics;
  PM.mr = r;
  PM.dateFrom = pr.dateFrom; PM.dateTo = pr.dateTo;
  PM.bGroup = pr.breakdownGroupBy; PM.bInterval = pr.breakdownInterval; PM.bDisplay = pr.breakdownDisplay;
  PM.cGroup = pr.comboGroupBy; PM.cBar = pr.comboBarMetric; PM.cLine = pr.comboLineMetric;
  PM.options = function (values, selected) {
    return values.map(function (v) { return '<option value="' + PM.esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + PM.esc(v) + '</option>'; }).join('');
  };
  PM.outletOptions = function () { return PM.options(World.STORES.map(function (s) { return s.code; }), pr.outlet); };
  PM.ageOptions = function () { return PM.options(Crm.AGE, pr.ageGroup); };
  PM.alert = function () {
    if (r.hasData) return '';
    return '<div class="alert alert-warning text-white mb-4">No mobile transaction records found for ' + PM.esc(pr.dateFrom) + ' to ' + PM.esc(pr.dateTo) +
      (pr.outlet ? ' at outlet ' + PM.esc(pr.outlet) : '') + '. Latest mobile data in this index is ' + PM.esc(r.latestDataDate) + '.</div>';
  };
  PM.kpi = {
    totalRevenue: '$' + PM.nf(m.totalRevenue, 2), totalTransactions: PM.nf(m.totalTransactions), totalQuantity: PM.nf(m.totalQuantity, 2),
    uniqueMembers: PM.nf(m.uniqueMembers), aov: '$' + PM.nf(m.aov, 2), avgItemsPerTransaction: PM.nf(m.avgItemsPerTransaction, 2)
  };
})();
