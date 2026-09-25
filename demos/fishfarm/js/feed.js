/* feed-list.php: delete-only, like the real CMS, plus the two date-range exports */
'use strict';

(function () {
  var esc = UI.esc;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';
  var back = location.pathname.split('/').pop() + location.search;

  Shell.on('delete', function (f) {
    FF.remove('feed', f.dataset.id);
    Shell.go(back);
  });

  var f = { cage: UI.q('cage_name'), from: UI.q('record_from'), to: UI.q('record_to'),
    species: UI.qi('species_id'), type: UI.qi('feed_type_id') };
  var prods = {};
  FF.T.fish_production.forEach(function (p) { prods[p.id] = p; });
  var rows = FF.all('feed').filter(function (r) {
    var p = prods[r.production_id], c = UI.cage(p.cage_id);
    if (f.cage && (!c || c.name.toLowerCase().indexOf(f.cage.toLowerCase()) === -1)) return false;
    if (f.from && r.record_date < f.from) return false;
    if (f.to && r.record_date > f.to) return false;
    if (f.species && p.species_id !== f.species) return false;
    if (f.type && r.feed_type_id !== f.type) return false;
    return true;
  }).sort(UI.desc('record_date'));

  var pg = UI.pager(rows.length, 25);
  var body = rows.length ? rows.slice(pg.offset, pg.offset + 25).map(function (r) {
    var p = prods[r.production_id], c = UI.cage(p.cage_id);
    return '<tr><td class="ps-4 text-sm">' + esc(p.production_serial_number) + '</td>' +
      '<td class="text-sm">' + esc(c ? c.name : '') + '</td>' +
      '<td class="text-sm">' + p.stocking_date + '</td>' +
      '<td class="text-sm">' + UI.speciesCell(UI.sp(p.species_id)) + '</td>' +
      '<td class="text-sm">' + esc(UI.named('feed_types', r.feed_type_id)) + '</td>' +
      '<td class="text-sm text-end">' + UI.dec(r.quantity_kg, 2) + '</td>' +
      '<td class="text-sm">' + r.record_date + '</td>' +
      '<td class="text-sm">' + esc(r.session) + '</td>' +
      '<td class="text-sm">' + esc(r.staff || '') + '</td>' +
      '<td class="text-sm"><form class="d-inline" data-post="delete" data-id="' + r.id + '" data-confirm="Delete this feed record?">' +
      '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
  }).join('') : '<tr><td colspan="10" class="text-center text-sm py-4 text-secondary">No feed records match the filters.</td></tr>';

  var modal = '<div class="modal fade" id="exportModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog">' +
    '<form class="modal-content" id="exportForm" method="get" data-export="">' +
    '<div class="modal-header"><h6 class="modal-title" id="exportModalTitle">Export</h6>' +
    '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
    '<div class="modal-body"><label class="form-label text-sm"><span class="text-danger">*</span> Record date</label>' +
    '<div class="d-flex align-items-center gap-2"><input type="date" name="start" class="form-control form-control-sm" required>' +
    '<span class="text-sm">To</span><input type="date" name="end" class="form-control form-control-sm" required></div>' +
    '<div class="text-danger text-xs mt-1 d-none" id="exportErr">Record date is required.</div></div>' +
    '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary btn-sm mb-0" data-bs-dismiss="modal">Cancel</button>' +
    '<button type="submit" class="btn btn-primary btn-sm mb-0">Confirm</button></div></form></div></div>';

  Shell.render({
    crumbs: [['Feed Manager', 'index.html'], ['List']], title: 'Feed',
    body: UI.flashFrom({ deleted: 'Feed record deleted.' }) +
      '<div class="card"><div class="card-header pb-0">' +
      '<div class="d-flex justify-content-between align-items-center mb-3"><div class="d-flex gap-2">' +
      '<button type="button" class="btn btn-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#exportModal" data-title="Export Feed History">Export Feed History</button>' +
      '<button type="button" class="btn btn-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#exportModal" data-title="Export Feeding Summary By Farm">Export Feeding Summary By Farm</button>' +
      '</div></div>' +
      '<form method="get" action="feed-list.html" class="row g-2 align-items-center mb-3">' +
      '<div class="col-md-3"><input type="text" name="cage_name" class="form-control form-control-sm" placeholder="Cage Name" value="' + esc(f.cage) + '"></div>' +
      '<div class="col-md-2"><input type="date" name="record_from" class="form-control form-control-sm" value="' + esc(f.from) + '" title="Record date from"></div>' +
      '<div class="col-md-2"><input type="date" name="record_to" class="form-control form-control-sm" value="' + esc(f.to) + '" title="Record date to"></div>' +
      '<div class="col-md-2"><select name="species_id" class="form-control form-control-sm"><option value="">Fish Species</option>' +
      UI.options(FF.all('fish_species').sort(UI.byName), f.species, function (s) { return s.name; }) + '</select></div>' +
      '<div class="col-md-2"><select name="feed_type_id" class="form-control form-control-sm"><option value="">Feed Type</option>' +
      UI.options(FF.all('feed_types').filter(function (t) { return t.status_id == 1; }).sort(UI.byName), f.type, function (t) { return t.name; }) + '</select></div>' +
      '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
      '<a href="feed-list.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
      '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
      '<th class="' + TH + ' ps-4">Production Serial Number</th><th class="' + TH + '">Cage</th><th class="' + TH + '">Stocking Date</th>' +
      '<th class="' + TH + '">Fish Species</th><th class="' + TH + '">Feed Type</th><th class="' + TH + ' text-end">Quantity (kg)</th>' +
      '<th class="' + TH + '">Record Date</th><th class="' + TH + '">Session</th><th class="' + TH + '">Staff</th>' +
      '<th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + body + '</tbody></table></div>' + pg.html + '</div></div>',
    after: modal
  });

  // The button that opened the modal names the export, as in the real page.
  var m = document.getElementById('exportModal'), form = document.getElementById('exportForm');
  m.addEventListener('show.bs.modal', function (e) {
    var t = e.relatedTarget.getAttribute('data-title');
    document.getElementById('exportModalTitle').textContent = t;
    form.dataset.export = t.replace(/^Export /, 'The ');
    document.getElementById('exportErr').classList.add('d-none');
  });
}());
