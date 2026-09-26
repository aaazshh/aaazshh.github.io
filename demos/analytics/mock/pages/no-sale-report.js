// no-sale-report.php: outlets and snapshot dates from the daily SOH index,
// and the filter values echoed back into the form.
(function () {
  'use strict';
  var W = World;
  var dates = W.snapshotDates();
  PM.allOutlets = W.STORES.map(function (s) { return s.code; });
  PM.firstSnapshot = dates[0]; PM.lastSnapshot = dates[dates.length - 1];
  PM.outlet = PM.get('store_no', PM.allOutlets[0]);
  var period = PM.get('period', '1w');
  PM.period = ['1w', '2w', '1m', 'custom'].indexOf(period) === -1 ? '1w' : period;
  PM.dateTo = PM.get('date_to', PM.lastSnapshot); PM.dateFrom = PM.get('date_from', PM.firstSnapshot);
  PM.outletOptions = function () {
    return PM.allOutlets.map(function (c) {
      return '<option value="' + PM.esc(c) + '"' + (PM.outlet === c ? ' selected' : '') + '>' + PM.esc(c) + '</option>';
    }).join('');
  };
})();
