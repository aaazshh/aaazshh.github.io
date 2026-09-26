// edit-vendor_commission_rate.php: the vendor being edited and its rate.
(function () {
  'use strict';
  var no = PM.get('id', '').trim(), r = Commission.load()[no];
  PM.vendorDisplay = no + (Commission.vendorName(no) !== no ? ' - ' + Commission.vendorName(no) : '');
  PM.rate = (r ? r.rate : 0).toFixed(2);
  PM.editAction = 'edit-vendor_commission_rate.html?id=' + encodeURIComponent(no);
})();
