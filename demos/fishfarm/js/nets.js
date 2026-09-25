/* net-record-list.php / net-record-form.php, behind the broken-, change- and
   wash-net wrappers (record_type 1, 2, 3). */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';
  var slug = page.replace(/^(add|edit)-/, '').replace(/-list$/, '');
  var CONFIG = {
    'broken-net': { type: 1, label: 'Broken Net', flash: 'Broken net record', showNetType: false },
    'change-net': { type: 2, label: 'Change Net', flash: 'Change net record', showNetType: true },
    'wash-net': { type: 3, label: 'Wash Net', flash: 'Wash net record', showNetType: false }
  };
  var cfg = CONFIG[slug];
  var list = slug + '-list.html', add = 'add-' + slug + '.html', edit = 'edit-' + slug + '.html';

  if (/-list$/.test(page)) {
    var back = location.pathname.split('/').pop() + location.search;
    Shell.on('delete', function (f) { FF.remove('net_records', f.dataset.id); Shell.go(back); });
    var f = { cage: UI.q('cage_name'), from: UI.q('record_from'), to: UI.q('record_to') };
    var rows = FF.all('net_records').filter(function (n) {
      if (n.record_type !== cfg.type) return false;
      var p = UI.byId('fish_production', n.production_id), c = UI.cage(p.cage_id), day = n.record_time.slice(0, 10);
      if (f.cage && (!c || c.name.toLowerCase().indexOf(f.cage.toLowerCase()) === -1)) return false;
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      return true;
    }).sort(UI.desc('record_time'));
    var pg = UI.pager(rows.length, 25);
    var cols = cfg.showNetType ? 9 : 8;
    var body = rows.length ? rows.slice(pg.offset, pg.offset + 25).map(function (n) {
      var p = UI.byId('fish_production', n.production_id), c = UI.cage(p.cage_id);
      return '<tr><td class="ps-4 text-sm">' + esc(p.production_serial_number) + '</td>' +
        '<td class="text-sm">' + esc(c ? c.name : '-') + '</td>' +
        '<td class="text-sm">' + cfg.label + '</td>' +
        '<td class="text-sm">' + n.record_time.slice(0, 10) + '</td>' +
        '<td class="text-sm" title="' + esc(n.remarks || '') + '">' + esc(UI.strim(n.remarks, 36, '...')) + '</td>' +
        '<td class="text-sm">' + esc(n.cage_status || '') + '</td>' +
        (cfg.showNetType ? '<td class="text-sm">' + esc(UI.named('net_types', n.net_type_id) || '') + '</td>' : '') +
        '<td class="text-sm">' + esc(n.staff || '') + '</td>' +
        '<td class="text-sm"><a href="' + edit + '?id=' + n.id + '" class="text-primary me-2">Edit</a>' +
        '<form class="d-inline" data-post="delete" data-id="' + n.id + '" data-confirm="Delete this ' + cfg.label.toLowerCase() + ' record?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
    }).join('') : '<tr><td colspan="' + cols + '" class="text-center text-sm py-4 text-secondary">No ' + cfg.label.toLowerCase() + ' records match the filters.</td></tr>';

    var modal = '<div class="modal fade" id="exportModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered">' +
      '<form method="get" class="modal-content" data-export="The ' + cfg.label.toLowerCase() + ' export">' +
      '<div class="modal-header"><h6 class="modal-title">Confirmation</h6>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><label class="form-label">Record Date</label><div class="row g-2">' +
      '<div class="col-md-6"><input type="date" name="start" class="form-control" required></div>' +
      '<div class="col-md-6"><input type="date" name="end" class="form-control" required></div></div></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary mb-0" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary mb-0">Confirm</button></div></form></div></div>';

    Shell.render({
      crumbs: [['Net Management', list], [cfg.label, null], ['List']], title: cfg.label,
      body: UI.flashFrom({ added: cfg.flash + ' added.', updated: cfg.flash + ' updated.', deleted: cfg.flash + ' deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex gap-2 mb-3">' +
        '<a href="' + add + '" class="btn btn-primary btn-sm mb-0">Add</a>' +
        '<button type="button" class="btn btn-outline-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#exportModal">Export</button></div>' +
        '<form method="get" action="' + list + '" class="row g-2 align-items-center mb-3">' +
        '<div class="col-md-3"><input type="text" name="cage_name" class="form-control form-control-sm" placeholder="Cage" value="' + esc(f.cage) + '"></div>' +
        '<div class="col-md-2"><input type="date" name="record_from" class="form-control form-control-sm" value="' + esc(f.from) + '" title="Record date from"></div>' +
        '<div class="col-md-2"><input type="date" name="record_to" class="form-control form-control-sm" value="' + esc(f.to) + '" title="Record date to"></div>' +
        '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="' + list + '" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Production Serial Number</th><th class="' + TH + '">Cage</th><th class="' + TH + '">Action Type</th>' +
        '<th class="' + TH + '">Record Date</th><th class="' + TH + '">Remarks</th><th class="' + TH + '">Status</th>' +
        (cfg.showNetType ? '<th class="' + TH + '">Type of Net</th>' : '') +
        '<th class="' + TH + '">Staff</th><th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + body +
        '</tbody></table></div>' + pg.html + '</div></div>',
      after: modal
    });
    return;
  }

  var isEdit = /^edit-/.test(page);
  var rec = isEdit ? FF.find('net_records', UI.qi('id')) : null;
  if (isEdit && (!rec || rec.record_type !== cfg.type)) { Shell.go(list); return; }
  var values = rec ? {
    production_id: String(rec.production_id), record_time: rec.record_time.slice(0, 16).replace(' ', 'T'),
    net_type_id: rec.net_type_id ? String(rec.net_type_id) : '', cage_status: rec.cage_status || '',
    contractor: rec.contractor || '', operation_staff: rec.operation_staff || '', staff: rec.staff || '', remarks: rec.remarks || ''
  } : {};
  var prods = FF.all('fish_production').filter(function (p) { return p.status_id == 1; }).sort(UI.desc('stocking_date'));
  Shell.render({
    crumbs: [[cfg.label, list], [isEdit ? 'Edit' : 'Add']],
    title: (isEdit ? 'Edit ' : 'Add ') + cfg.label + ' Record', body: '<div id="formHost"></div>'
  });
  Form.mount(document.getElementById('formHost'), values, function (v, e) {
    var first = [
      { kind: 'select', name: 'production_id', label: 'Production', req: true, col: 'col-md-5', blank: '-- Select production --',
        options: prods.map(function (p) {
          var c = UI.cage(p.cage_id), s = UI.sp(p.species_id);
          return [p.id, p.production_serial_number + ' - ' + (c ? c.name : '') + ' (' + (s ? s.name : '') + ')'];
        }) },
      { name: 'record_time', label: 'Record Date/Time', req: true, type: 'datetime-local', col: 'col-md-3' }];
    if (cfg.showNetType) first.push({ kind: 'select', name: 'net_type_id', label: 'Type of Net', req: true, col: 'col-md-2',
      blank: '-- Select --', options: FF.all('net_types').map(function (n) { return [n.id, n.name]; }) });
    first.push({ name: 'staff', label: 'Staff', col: 'col-md-2', err: false });
    return '<div class="card"><div class="card-body"><form method="post">' + Form.row(first, v, e) +
      Form.row([
        { kind: 'select', name: 'cage_status', label: 'Status', col: 'col-md-3', err: false, blank: '-- Select --',
          options: ['Washed', 'Empty', 'Blank', 'Prepare'] },
        { name: 'contractor', label: 'Contractor', col: 'col-md-3', err: false },
        { name: 'operation_staff', label: 'Operation Staff', col: 'col-md-3', err: false },
        { kind: 'textarea', name: 'remarks', label: 'Remarks', col: 'col-md-3', rows: 1 }], v, e) +
      Form.buttons(list) + '</form></div></div>';
  }, function (v) {
    var e = {};
    if (!(+v.production_id > 0)) e.production_id = 'Production is required.';
    if (!v.record_time) e.record_time = 'Record date/time is required.';
    if (cfg.showNetType && !(+v.net_type_id > 0)) e.net_type_id = 'Type of net is required.';
    return e;
  }, function (v) {
    var r = { production_id: +v.production_id, record_time: v.record_time.replace('T', ' ') + ':00',
      net_type_id: cfg.showNetType && +v.net_type_id > 0 ? +v.net_type_id : null, contractor: v.contractor || null,
      cage_status: v.cage_status || null, operation_staff: v.operation_staff || null, staff: v.staff || null,
      remarks: v.remarks || null };
    if (isEdit) FF.update('net_records', rec.id, r);
    else { r.record_type = cfg.type; FF.insert('net_records', r); }
    Shell.go(list + '?flash=' + (isEdit ? 'updated' : 'added'));
  });
}());
