// vendor_default_commission-list.php: the configured default rates and the
// vendor list for the quick-add modal.
(function () {
  'use strict';
  var rows = Commission.load();
  PM.body = function () {
    var codes = Object.keys(rows).sort();
    if (!codes.length) return '<tr><td colspan="5" class="text-center text-muted py-4">No default commission rates configured yet. Click "Add Default Rate" to assign one.</td></tr>';
    return codes.map(function (c) {
      var r = rows[c], name = Commission.vendorName(c), rate = PM.nf(r.rate, 2) + '%', d = r.updated_at;
      var stamp = d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) + ' ' + d.slice(11);
      return '<tr><td class="font-weight-bold">' + PM.esc(c) + '</td><td>' + PM.esc(name) + '</td><td class="text-center font-weight-bolder text-success">' + rate + '</td>' +
        '<td>' + stamp + '</td><td><a href="edit-vendor_commission_rate.html?id=' + encodeURIComponent(c) + '" class="text-decoration-none text-primary"><i class="fas fa-edit"></i></a> | ' +
        '<a href="javascript:void(0)" class="btn-link text-danger px-2 mb-0 open-delete-modal-btn" data-code="' + PM.esc(c) + '" data-name="' + PM.esc(name) + '" data-rate="' + rate + '"><i class="fas fa-trash-alt"></i></a></td></tr>';
    }).join('');
  };
  PM.vendorOptions = function () {
    return World.VENDORS.map(function (v) { return '<option value="' + v.no + '">' + PM.esc(v.name) + '</option>'; }).join('');
  };
})();
