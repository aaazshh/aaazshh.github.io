// pos-transction-report.php: the KPI cards and outlet lists PHP computed
// from the cost index before rendering.
(function () {
  'use strict';
  var W = World;
  var defTo = PM.daysAgo(1), defFrom = PM.firstOfMonth();
  if (defTo < defFrom) defFrom = defTo;
  var dateFrom = PM.get('date_from', defFrom), dateTo = PM.get('date_to', defTo), outlet = PM.get('store_no', '');
  var rows = W.lines(dateFrom, dateTo, outlet || null);
  var revenue = W.sum(rows, 'net_amount'), tx = W.distinct(rows, 'receipt_no'), gp = W.sum(rows, 'gross_profit');
  PM.dateFrom = dateFrom; PM.dateTo = dateTo; PM.outlet = outlet;
  PM.totalRevenue = revenue; PM.totalItems = rows.length; PM.totalUnits = W.sum(rows, 'quantity');
  PM.totalTransactions = tx; PM.grossProfit = gp;
  PM.avgTransactionValue = tx > 0 ? revenue / tx : 0;
  PM.grossProfitMargin = revenue !== 0 ? gp / revenue * 100 : 0;
  PM.filterQuery = PM.query({ date_from: dateFrom, date_to: dateTo, store_no: outlet });
  PM.outletOptions = function () {
    return W.STORES.map(function (s) {
      return '<option value="' + PM.esc(s.code) + '"' + (outlet === s.code ? ' selected' : '') + '>' + PM.esc(s.code) + '</option>';
    }).join('');
  };
})();
