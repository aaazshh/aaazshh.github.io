// weekly-customer-product-report.php: the rows PHP rendered into the table.
(function () {
  'use strict';
  var f = WeeklyReport.filters(PM.params);
  PM.month = f.month; PM.member = f.member;
  PM.behaviourFrom = World.TODAY.slice(0, 4) + '-01-01'; PM.behaviourTo = World.TODAY;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  PM.body = function () {
    return WeeklyReport.rows(f.month, f.member).map(function (r) {
      var months = Object.keys(r.months).map(function (m) {
        return '<span class="month-badge">' + MONTHS[parseInt(m.slice(5), 10) - 1] + ' ' + m.slice(0, 4) + ' (' + PM.nf(r.months[m]) + ')</span>';
      }).join('');
      var q = PM.query({ period_type: 'weekly', date_from: PM.behaviourFrom, date_to: PM.behaviourTo, member_id: r.member_id, product_sku: r.product_sku, min_repeat: 1 });
      return '<tr><td>' + PM.esc(r.member_id) + '</td><td class="product-name">' + PM.esc(r.product_name) + '</td><td>' + PM.esc(r.product_sku) + '</td><td>' + months +
        '</td><td><a class="btn btn-sm btn-outline-primary mb-0" href="customer-behaviour-report.html?' + q + '" target="_blank" rel="noopener noreferrer">View Behaviour</a></td></tr>';
    }).join('');
  };
})();
