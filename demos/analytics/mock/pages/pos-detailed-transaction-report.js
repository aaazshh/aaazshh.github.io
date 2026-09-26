// pos-detailed-transaction-report.php: outlet list and the filter values.
(function () {
  'use strict';
  var W = World;
  var dateFrom = PM.get('date_from', PM.firstOfMonth()), dateTo = PM.get('date_to', W.TODAY);
  if (dateTo < dateFrom) dateTo = dateFrom;
  PM.dateFrom = dateFrom; PM.dateTo = dateTo;
  PM.outlet = PM.get('store_no', ''); PM.terminal = PM.get('terminal_no', ''); PM.staff = PM.get('staff_id', '');
  PM.outletOptions = function () {
    return W.STORES.map(function (s) {
      return '<option value="' + PM.esc(s.code) + '"' + (PM.outlet === s.code ? ' selected' : '') + '>' + PM.esc(s.code + ' - ' + s.name) + '</option>';
    }).join('');
  };
})();
