// vendor_commission_defaults (CRM): the default commission rate per vendor,
// kept in sessionStorage so adds and edits last for the visit.
var Commission = (function () {
  'use strict';
  var KEY = 'an-demo-commission';
  var rows = null;
  function load() {
    if (rows) return rows;
    try { rows = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { rows = null; }
    if (!rows) {
      rows = {};
      World.VENDORS.forEach(function (v, i) {
        if (v.rate > 0) rows[v.no] = { rate: v.rate, updated_at: World.ymd(World.addDays(new Date(), -(20 + i * 9))) + ' 1' + (i % 10) + ':2' + (i % 6) + ':00' };
      });
    }
    return rows;
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(rows)); } catch (e) {} }
  function now() { var d = new Date(); return World.ymd(d) + ' ' + World.pad(d.getHours()) + ':' + World.pad(d.getMinutes()) + ':' + World.pad(d.getSeconds()); }
  function set(vendor, rate) { load()[vendor] = { rate: Math.round(rate * 100) / 100, updated_at: now() }; save(); }
  function vendorName(no) { var v = World.VENDORS.filter(function (x) { return x.no === no; })[0]; return v ? v.name : no; }

  // add-vendor_commission_rate.php?ajax_check_vendor=
  Api.route('add-vendor_commission_rate.php', function (p) {
    var no = Q.str(p.ajax_check_vendor).trim(), r = load()[no];
    return { exists: !!r, current_rate: r ? r.rate : 0 };
  });
  Api.post('add-vendor_commission_rate', function (d) {
    var no = String(d.vendor_no || '').trim();
    if (!no) return 'add-vendor_commission_rate.html?success=0&message=' + encodeURIComponent('Please select a valid vendor profile container.');
    set(no, parseFloat(d.default_commission_rate) || 0);
    return 'vendor_default_commission-list.html?success=1&message=' + encodeURIComponent('Default commission rate assigned successfully!');
  });
  Api.post('edit-vendor_commission_rate', function (d, q) {
    set(Q.str(q.id).trim(), parseFloat(d.default_commission_rate) || 0);
    return 'vendor_default_commission-list.html?success=1&message=' + encodeURIComponent('Commission rate updated successfully!');
  });

  return { load: load, set: set, vendorName: vendorName };
})();
