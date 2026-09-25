/* dead-fish-list.php, add-dead-fish.php, edit-dead-fish.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';

  if (page === 'dead-fish-list') {
    var back = location.pathname.split('/').pop() + location.search;
    Shell.on('delete', function (f) {
      FF.remove('dead_fish_records', f.dataset.id);
      FF.log('delete', 'dead_fish_records', f.dataset.id, 'Deleted dead fish record #' + f.dataset.id);
      Shell.go(back);
    });

    var f = { cage: UI.q('cage_name'), from: UI.q('record_from'), to: UI.q('record_to'), species: UI.qi('species_id'),
      sign: UI.qi('clinical_sign_id'), serial: UI.q('production_serial_number'), ongoing: UI.q('ongoing') === '1' };
    var rows = FF.all('dead_fish_records').filter(function (d) {
      var p = UI.byId('fish_production', d.production_id), c = UI.cage(p.cage_id), day = d.record_time.slice(0, 10);
      if (f.ongoing && p.status_id != 1) return false;
      if (f.cage && (!c || c.name.toLowerCase().indexOf(f.cage.toLowerCase()) === -1)) return false;
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (f.species && p.species_id !== f.species) return false;
      if (f.sign && d.clinical_sign_id !== f.sign) return false;
      if (f.serial && p.production_serial_number.toLowerCase().indexOf(f.serial.toLowerCase()) === -1) return false;
      return true;
    }).sort(UI.desc('record_time'));

    var pg = UI.pager(rows.length, 25);
    var body = rows.length ? rows.slice(pg.offset, pg.offset + 25).map(function (d) {
      var p = UI.byId('fish_production', d.production_id), c = UI.cage(p.cage_id);
      return '<tr><td class="ps-4 text-sm">' + d.record_time + '</td>' +
        '<td class="text-sm">' + esc(c ? c.name : '-') + '</td>' +
        '<td class="text-sm">' + esc(p.production_serial_number) + '</td>' +
        '<td class="text-sm">' + UI.speciesCell(UI.sp(p.species_id)) + '</td>' +
        '<td class="text-sm text-end">' + d.quantity + '</td>' +
        '<td class="text-sm text-end">' + (d.real_quantity !== null ? d.real_quantity : '-') + '</td>' +
        '<td class="text-sm text-end">' + (d.estimated_quantity !== null ? d.estimated_quantity : '-') + '</td>' +
        '<td class="text-sm">' + esc(d.session) + '</td>' +
        '<td class="text-sm">' + esc(UI.named('clinical_signs', d.clinical_sign_id) || '-') + '</td>' +
        '<td class="text-sm">' + esc(d.staff || '') + '</td>' +
        '<td class="text-sm" title="' + esc(d.remarks || '') + '">' + esc(UI.strim(d.remarks, 30, '…')) + '</td>' +
        '<td class="text-sm"><a href="edit-dead-fish.html?id=' + d.id + '" class="text-primary me-2">Edit</a>' +
        '<form class="d-inline" data-post="delete" data-id="' + d.id + '" data-confirm="Delete this dead fish record?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
    }).join('') : '<tr><td colspan="12" class="text-center text-sm py-4 text-secondary">No dead fish records match the filters.</td></tr>';

    var modal = '<div class="modal fade" id="exportModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog">' +
      '<form class="modal-content" method="get" data-export="The dead fish export">' +
      '<div class="modal-header"><h6 class="modal-title">Export Dead Fish Records</h6>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><label class="form-label text-sm"><span class="text-danger">*</span> Record date</label>' +
      '<div class="d-flex align-items-center gap-2"><input type="date" name="start" class="form-control form-control-sm" required>' +
      '<span class="text-sm">To</span><input type="date" name="end" class="form-control form-control-sm" required></div></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary btn-sm mb-0" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm mb-0">Confirm</button></div></form></div></div>';

    Shell.render({
      crumbs: [['Dead Fish Manager', 'index.html'], ['List']], title: 'Dead Fish',
      body: UI.flashFrom({ added: 'Dead fish record added.', updated: 'Dead fish record updated.', deleted: 'Dead fish record deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex justify-content-between align-items-center mb-3"><div class="d-flex gap-2">' +
        '<a href="add-dead-fish.html" class="btn btn-primary btn-sm mb-0">Add</a>' +
        '<button type="button" class="btn btn-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#exportModal">Export</button></div></div>' +
        '<form method="get" action="dead-fish-list.html" class="row g-2 align-items-center mb-3">' +
        '<div class="col-md-3"><input type="text" name="production_serial_number" class="form-control form-control-sm" placeholder="Production Serial Number" value="' + esc(f.serial) + '"></div>' +
        '<div class="col-md-2"><input type="text" name="cage_name" class="form-control form-control-sm" placeholder="Cage Name" value="' + esc(f.cage) + '"></div>' +
        '<div class="col-md-2"><input type="date" name="record_from" class="form-control form-control-sm" value="' + esc(f.from) + '" title="Record date from"></div>' +
        '<div class="col-md-2"><input type="date" name="record_to" class="form-control form-control-sm" value="' + esc(f.to) + '" title="Record date to"></div>' +
        '<div class="col-md-2"><select name="species_id" class="form-control form-control-sm"><option value="">Fish Species</option>' +
        UI.options(FF.all('fish_species').sort(UI.byName), f.species, function (s) { return s.name; }) + '</select></div>' +
        '<div class="col-md-3"><select name="clinical_sign_id" class="form-control form-control-sm"><option value="">Clinical Sign</option>' +
        UI.options(FF.all('clinical_signs'), f.sign, function (s) { return s.name; }) + '</select></div>' +
        '<div class="col-md-2 d-flex align-items-center"><div class="form-check form-switch mb-0">' +
        '<input class="form-check-input" type="checkbox" role="switch" id="ongoing" name="ongoing" value="1"' + (f.ongoing ? ' checked' : '') + '>' +
        '<label class="form-check-label text-sm" for="ongoing">Ongoing</label></div></div>' +
        '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="dead-fish-list.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Record Time</th><th class="' + TH + '">Cage</th><th class="' + TH + '">Production Serial Number</th>' +
        '<th class="' + TH + '">Fish Species</th><th class="' + TH + ' text-end">Quantity</th><th class="' + TH + ' text-end">Real Qty</th>' +
        '<th class="' + TH + ' text-end">Est. Qty</th><th class="' + TH + '">Session</th><th class="' + TH + '">Clinical Sign</th>' +
        '<th class="' + TH + '">Staff</th><th class="' + TH + '">Remarks</th><th class="text-secondary opacity-7">Actions</th>' +
        '</tr></thead><tbody>' + body + '</tbody></table></div>' + pg.html + '</div></div>',
      after: modal
    });
    return;
  }

  var isEdit = page === 'edit-dead-fish';
  var rec = isEdit ? FF.find('dead_fish_records', UI.qi('id')) : null;
  if (isEdit && !rec) { Shell.go('dead-fish-list.html'); return; }
  var values = rec ? {
    production_id: String(rec.production_id), record_time: rec.record_time.slice(0, 16).replace(' ', 'T'),
    quantity: String(rec.quantity), real_quantity: rec.real_quantity === null ? '' : String(rec.real_quantity),
    estimated_quantity: rec.estimated_quantity === null ? '' : String(rec.estimated_quantity), session: rec.session,
    clinical_sign_id: rec.clinical_sign_id === null ? '' : String(rec.clinical_sign_id), staff: rec.staff || '',
    remarks: rec.remarks || '', status_id: String(rec.status_id)
  } : { session: 'Morning' };

  var prods = FF.all('fish_production').filter(function (p) { return isEdit || p.status_id == 1; }).sort(UI.desc('stocking_date'));
  Shell.render({
    crumbs: [['Dead Fish', 'dead-fish-list.html'], [isEdit ? 'Edit' : 'Add']],
    title: isEdit ? 'Edit Dead Fish Record' : 'Add Dead Fish Record', body: '<div id="formHost"></div>'
  });
  Form.mount(document.getElementById('formHost'), values, function (v, e) {
    return '<div class="card"><div class="card-body"><form method="post">' +
      Form.row([
        { kind: 'select', name: 'production_id', label: 'Production', req: true, col: 'col-md-6', blank: '— Select production —',
          options: prods.map(function (p) {
            var c = UI.cage(p.cage_id), s = UI.sp(p.species_id);
            return [p.id, p.production_serial_number + ' — ' + (c ? c.name : '') + ' (' + (s ? s.name : '') + ')'];
          }) },
        { name: 'record_time', label: 'Record Time', req: true, type: 'datetime-local', col: 'col-md-3' },
        { kind: 'select', name: 'session', label: 'Session', col: 'col-md-3', err: false, options: ['Morning', 'Afternoon', 'Evening'] }], v, e) +
      Form.row([
        { name: 'quantity', label: 'Quantity', req: true, col: 'col-md-3' },
        { name: 'real_quantity', label: 'Real Quantity', col: 'col-md-3' },
        { name: 'estimated_quantity', label: 'Estimated Quantity', col: 'col-md-3' },
        { name: 'staff', label: 'Staff', col: 'col-md-3', err: false }], v, e) +
      Form.row([
        { kind: 'select', name: 'clinical_sign_id', label: 'Clinical Sign', err: false, blank: '— None —',
          options: FF.all('clinical_signs').map(function (s) { return [s.id, s.name]; }) },
        { kind: 'textarea', name: 'remarks', label: 'Remarks', col: isEdit ? 'col-md-6' : 'col-md-8' }].concat(isEdit ? [
        { kind: 'select', name: 'status_id', label: 'Status', col: 'col-md-2', err: false, options: [['1', 'Active'], ['0', 'Inactive']] }] : []), v, e) +
      Form.buttons('dead-fish-list.html') + '</form></div></div>';
  }, function (v) {
    var e = {};
    if (!(+v.production_id > 0)) e.production_id = 'Production is required.';
    if (!v.record_time) e.record_time = 'Record time is required.';
    if (!Form.isDigits(v.quantity)) e.quantity = 'Quantity must be a non-negative integer.';
    ['real_quantity', 'estimated_quantity'].forEach(function (k) {
      if (v[k] !== '' && !Form.isDigits(v[k])) e[k] = 'Must be a non-negative integer.';
    });
    return e;
  }, function (v) {
    var r = { production_id: +v.production_id, record_time: v.record_time.replace('T', ' ') + ':00', quantity: +v.quantity,
      real_quantity: Form.num(v.real_quantity), estimated_quantity: Form.num(v.estimated_quantity), session: v.session,
      clinical_sign_id: Form.num(v.clinical_sign_id), staff: v.staff || null, remarks: v.remarks || null };
    if (isEdit) {
      r.status_id = +v.status_id;
      FF.update('dead_fish_records', rec.id, r);
      FF.log('update', 'dead_fish_records', rec.id, 'Updated dead fish record #' + rec.id);
      Shell.go('dead-fish-list.html?flash=updated');
    } else {
      var id = FF.insert('dead_fish_records', r);
      FF.log('create', 'dead_fish_records', id, 'Logged ' + r.quantity + ' dead fish (production #' + r.production_id + ')');
      Shell.go('dead-fish-list.html?flash=added');
    }
  });
}());
