// add-vendor_commission_rate.php: vendor codes from the NAV vendor items index.
(function () {
  'use strict';
  PM.vendorCount = World.VENDORS.length;
  PM.vendorOptions = function () {
    return World.VENDORS.map(function (v) { return '<option value="' + v.no + '">' + PM.esc(v.no + ' - ' + v.name) + '</option>'; }).join('');
  };
})();
