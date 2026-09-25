/* harvest-list.php, add/edit-harvest.php, sales-list.php, add/edit-sales.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';
  var back = location.pathname.split('/').pop() + location.search;
  function total(h) { return h.normal_weight + h.promo_weight + h.other_weight; }
  function dtl(s) { return s ? s.slice(0, 16).replace(' ', 'T') : ''; }
  function farmSelect(cur) {
    return '<div class="col-md-2"><select name="fish_farm_id" class="form-control form-control-sm"><option value="">Farm</option>' +
      UI.options(FF.all('fish_farms').sort(UI.byName), cur, function (x) { return x.name; }) + '</select></div>';
  }
  function speciesSelect(cur) {
    return '<div class="col-md-2"><select name="species_id" class="form-control form-control-sm"><option value="">Fish Species</option>' +
      UI.options(FF.all('fish_species').sort(UI.byName), cur, function (s) { return s.name; }) + '</select></div>';
  }
  function cageInput(cur) {
    return '<div class="col-md-2"><input type="text" name="cage_name" class="form-control form-control-sm" placeholder="Cage Name" value="' + esc(cur) + '"></div>';
  }
  function filterButtons(file) {
    return '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
      '<a href="' + file + '" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div>';
  }
  function actions(edit, id, confirmText) {
    return '<td class="text-sm"><a href="' + edit + '?id=' + id + '" class="text-primary me-2">Edit</a>' +
      '<form class="d-inline" data-post="delete" data-id="' + id + '" data-confirm="' + confirmText + '">' +
      '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td>';
  }
  function prodOptions(list) {
    return list.map(function (p) {
      var c = UI.cage(p.cage_id), s = UI.sp(p.species_id);
      return [p.id, p.production_serial_number + ' — ' + (c ? c.name : '') + ' (' + (s ? s.name : '') + ')'];
    });
  }

  /* ---- harvest list ---------------------------------------------------- */
  if (page === 'harvest-list') {
    Shell.on('delete', function (f) { FF.remove('harvest_records', f.dataset.id); Shell.go(back); });
    var f = { farm: UI.qi('fish_farm_id'), cage: UI.q('cage_name'), species: UI.qi('species_id'),
      from: UI.q('stock_from'), to: UI.q('stock_to') };
    var rows = FF.all('harvest_records').filter(function (h) {
      var p = UI.byId('fish_production', h.production_id), c = UI.cage(p.cage_id);
      if (f.farm && (!c || c.fish_farm_id !== f.farm)) return false;
      if (f.cage && (!c || c.name.toLowerCase().indexOf(f.cage.toLowerCase()) === -1)) return false;
      if (f.species && p.species_id !== f.species) return false;
      if (f.from && p.stocking_date < f.from) return false;
      if (f.to && p.stocking_date > f.to) return false;
      return true;
    }).sort(UI.desc('record_time'));
    var pg = UI.pager(rows.length, 25);
    var body = rows.length ? rows.slice(pg.offset, pg.offset + 25).map(function (h) {
      var p = UI.byId('fish_production', h.production_id), c = UI.cage(p.cage_id);
      return '<tr><td class="ps-4 text-sm">' + h.record_time.slice(0, 10) + '</td>' +
        '<td class="text-sm">' + esc(p.production_serial_number) + '</td>' +
        '<td class="text-sm">' + esc(c ? c.name : '-') + '</td>' +
        '<td class="text-sm">' + UI.speciesCell(UI.sp(p.species_id)) + '</td>' +
        '<td class="text-sm">' + p.stocking_date + '</td>' +
        '<td class="text-sm text-end">' + UI.nf(p.stocking_quantity) + '</td>' +
        '<td class="text-sm text-end">' + UI.nf(p.stocking_weight_g, 0) + '</td>' +
        '<td class="text-sm text-end">' + UI.nf(h.normal_weight, 1) + '</td>' +
        '<td class="text-sm text-end">' + UI.nf(h.promo_weight, 1) + '</td>' +
        '<td class="text-sm text-end">' + UI.nf(h.other_weight, 1) + '</td>' +
        '<td class="text-sm text-end"><strong>' + UI.nf(total(h), 1) + '</strong></td>' +
        '<td class="text-sm">' + esc(h.harvest_type) + '</td>' +
        '<td class="text-sm">' + esc(h.staff || '') + '</td>' +
        '<td class="text-sm" title="' + esc(h.remarks || '') + '">' + esc(UI.strim(h.remarks, 30, '…')) + '</td>' +
        actions('edit-harvest.html', h.id, 'Delete this harvest record?') + '</tr>';
    }).join('') : '<tr><td colspan="15" class="text-center text-sm py-4 text-secondary">No harvest records match the filters.</td></tr>';
    Shell.render({
      crumbs: [['Harvest &amp; Sales', 'index.html'], ['Harvest List']], title: 'Harvest',
      body: UI.flashFrom({ added: 'Harvest record added.', updated: 'Harvest record updated.', deleted: 'Harvest record deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="mb-3"><a href="add-harvest.html" class="btn btn-primary btn-sm mb-0">Add</a></div>' +
        '<form method="get" action="harvest-list.html" class="row g-2 align-items-center mb-3">' +
        farmSelect(f.farm) + cageInput(f.cage) + speciesSelect(f.species) +
        '<div class="col-md-2"><input type="date" name="stock_from" class="form-control form-control-sm" value="' + esc(f.from) + '" title="Stocking date from"></div>' +
        '<div class="col-md-2"><input type="date" name="stock_to" class="form-control form-control-sm" value="' + esc(f.to) + '" title="Stocking date to"></div>' +
        filterButtons('harvest-list.html') + '</form></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Harvest Date</th><th class="' + TH + '">Production Serial No.</th><th class="' + TH + '">Cage</th>' +
        '<th class="' + TH + '">Fish Species</th><th class="' + TH + '">Stocking Date</th><th class="' + TH + ' text-end">Stocking Qty</th>' +
        '<th class="' + TH + ' text-end">Stocking Wt (g)</th><th class="' + TH + ' text-end">Normal (kg)</th><th class="' + TH + ' text-end">Promo (kg)</th>' +
        '<th class="' + TH + ' text-end">Other (kg)</th><th class="' + TH + ' text-end">Total (kg)</th><th class="' + TH + '">Type</th>' +
        '<th class="' + TH + '">Staff</th><th class="' + TH + '">Remarks</th><th class="text-secondary opacity-7">Actions</th>' +
        '</tr></thead><tbody>' + body + '</tbody></table></div>' + pg.html + '</div></div>'
    });
    return;
  }

  /* ---- sales list ------------------------------------------------------ */
  if (page === 'sales-list') {
    Shell.on('delete', function (f) { FF.remove('sales_records', f.dataset.id); Shell.go(back); });
    var sf = { farm: UI.qi('fish_farm_id'), cage: UI.q('cage_name'), species: UI.qi('species_id') };
    var harvests = {};
    FF.T.harvest_records.forEach(function (h) { harvests[h.id] = h; });
    var srows = FF.all('sales_records').filter(function (s) {
      var h = harvests[s.harvest_record_id];
      if (!h || h.deleted_at) return false;
      var p = UI.byId('fish_production', h.production_id), c = UI.cage(p.cage_id);
      if (sf.farm && (!c || c.fish_farm_id !== sf.farm)) return false;
      if (sf.cage && (!c || c.name.toLowerCase().indexOf(sf.cage.toLowerCase()) === -1)) return false;
      if (sf.species && p.species_id !== sf.species) return false;
      return true;
    }).sort(UI.desc('record_time'));
    var spg = UI.pager(srows.length, 25);
    var sbody = srows.length ? srows.slice(spg.offset, spg.offset + 25).map(function (s) {
      var h = harvests[s.harvest_record_id], p = UI.byId('fish_production', h.production_id), c = UI.cage(p.cage_id);
      return '<tr><td class="ps-4 text-sm">' + s.id + '</td>' +
        '<td class="text-sm">' + esc(p.production_serial_number) + '</td>' +
        '<td class="text-sm">' + esc(c ? c.name : '-') + '</td>' +
        '<td class="text-sm">' + UI.speciesCell(UI.sp(p.species_id)) + '</td>' +
        '<td class="text-sm text-end">' + UI.nf(s.weight_sold, 3) + '</td>' +
        '<td class="text-sm text-end">' + UI.nf(s.weight_sold * 2, 1) + '</td>' +
        '<td class="text-sm text-end">' + (s.sales_amount !== null ? UI.nf(s.sales_amount, 2) : '—') + '</td>' +
        '<td class="text-sm">' + esc(UI.named('sales_channels', s.sales_channel_id) || '-') + '</td>' +
        '<td class="text-sm">' + h.record_time.slice(0, 10) + '</td>' +
        actions('edit-sales.html', s.id, 'Delete this sales record?') + '</tr>';
    }).join('') : '<tr><td colspan="10" class="text-center text-sm py-4 text-secondary">No sales records match the filters.</td></tr>';
    Shell.render({
      crumbs: [['Harvest &amp; Sales', 'index.html'], ['Sales List']], title: 'Sales',
      body: UI.flashFrom({ added: 'Sales record added.', updated: 'Sales record updated.', deleted: 'Sales record deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="mb-3"><a href="add-sales.html" class="btn btn-primary btn-sm mb-0">Add</a></div>' +
        '<form method="get" action="sales-list.html" class="row g-2 align-items-center mb-3">' +
        farmSelect(sf.farm) + cageInput(sf.cage) + speciesSelect(sf.species) + filterButtons('sales-list.html') + '</form></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">ID</th><th class="' + TH + '">Production Serial No.</th><th class="' + TH + '">Cage</th>' +
        '<th class="' + TH + '">Fish Species</th><th class="' + TH + ' text-end">Weight Sold (kg)</th><th class="' + TH + ' text-end">Nos (jin)</th>' +
        '<th class="' + TH + ' text-end">Sales Amount</th><th class="' + TH + '">Sales Channel</th><th class="' + TH + '">Harvest Date</th>' +
        '<th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + sbody + '</tbody></table></div>' + spg.html + '</div></div>'
    });
    return;
  }

  /* ---- add / edit harvest ---------------------------------------------- */
  if (page === 'add-harvest' || page === 'edit-harvest') {
    var isEdit = page === 'edit-harvest';
    var rec = isEdit ? FF.find('harvest_records', UI.qi('id')) : null;
    if (isEdit && !rec) { Shell.go('harvest-list.html'); return; }
    var w3 = function (x) { return x === null || x === undefined ? '' : UI.dec(x, 3); };
    var values = rec ? {
      production_id: String(rec.production_id), record_time: dtl(rec.record_time), harvest_type: rec.harvest_type,
      normal_weight: w3(rec.normal_weight), promo_weight: w3(rec.promo_weight), other_weight: w3(rec.other_weight),
      normal_per_piece_weight: w3(rec.normal_per_piece_weight), promo_per_piece_weight: w3(rec.promo_per_piece_weight),
      other_per_piece_weight: w3(rec.other_per_piece_weight), staff: rec.staff || '', remarks: rec.remarks || ''
    } : { harvest_type: 'Live', normal_weight: '0', promo_weight: '0', other_weight: '0' };
    var prods = FF.all('fish_production').filter(function (p) { return p.status_id == 1; }).sort(UI.desc('stocking_date'));
    Shell.render({
      crumbs: [['Harvest', 'harvest-list.html'], [isEdit ? 'Edit' : 'Add']],
      title: isEdit ? 'Edit Harvest Record' : 'Add Harvest Record', body: '<div id="formHost"></div>'
    });
    Form.mount(document.getElementById('formHost'), values, function (v, e) {
      return '<div class="card"><div class="card-body"><form method="post">' +
        Form.row([
          { kind: 'select', name: 'production_id', label: 'Production', req: true, col: 'col-md-5', blank: '— Select production —', options: prodOptions(prods) },
          { name: 'record_time', label: 'Harvest Date/Time', req: true, type: 'datetime-local', col: 'col-md-3' },
          { kind: 'select', name: 'harvest_type', label: 'Harvest Type', col: 'col-md-2', err: false, options: ['Live', 'Ice Chilled', 'Emergency'] },
          { name: 'staff', label: 'Staff', col: 'col-md-2', err: false }], v, e) +
        Form.row(['<div class="col-12"><h6 class="text-sm text-secondary mb-2">Harvest Weights (kg)</h6></div>',
          { name: 'normal_weight', label: 'Normal', type: 'number', step: '0.001', col: 'col-md-2', err: !isEdit },
          { name: 'promo_weight', label: 'Promo', type: 'number', step: '0.001', col: 'col-md-2', err: !isEdit },
          { name: 'other_weight', label: 'Other', type: 'number', step: '0.001', col: 'col-md-2', err: !isEdit }], v, e) +
        Form.row(['<div class="col-12"><h6 class="text-sm text-secondary mb-2">Per-piece Weight (kg/fish) — optional</h6></div>',
          { name: 'normal_per_piece_weight', label: 'Normal', type: 'number', step: '0.001', col: 'col-md-2', err: false },
          { name: 'promo_per_piece_weight', label: 'Promo', type: 'number', step: '0.001', col: 'col-md-2', err: false },
          { name: 'other_per_piece_weight', label: 'Other', type: 'number', step: '0.001', col: 'col-md-2', err: false },
          { kind: 'textarea', name: 'remarks', label: 'Remarks', col: 'col-md-6', rows: 1 }], v, e) +
        Form.buttons('harvest-list.html') + '</form></div></div>';
    }, function (v) {
      var e = {};
      if (!(+v.production_id > 0)) e.production_id = 'Production is required.';
      if (!v.record_time) e.record_time = 'Record time is required.';
      ['normal_weight', 'promo_weight', 'other_weight'].forEach(function (k) {
        if (!Form.isNum(v[k]) || +v[k] < 0) e[k] = 'Must be a non-negative number.';
      });
      return e;
    }, function (v) {
      var r = { production_id: +v.production_id, record_time: v.record_time.replace('T', ' ') + ':00', harvest_type: v.harvest_type,
        normal_weight: +v.normal_weight, promo_weight: +v.promo_weight, other_weight: +v.other_weight,
        normal_per_piece_weight: Form.num(v.normal_per_piece_weight), promo_per_piece_weight: Form.num(v.promo_per_piece_weight),
        other_per_piece_weight: Form.num(v.other_per_piece_weight), staff: v.staff || null, remarks: v.remarks || null };
      if (isEdit) FF.update('harvest_records', rec.id, r); else FF.insert('harvest_records', r);
      Shell.go('harvest-list.html?flash=' + (isEdit ? 'updated' : 'added'));
    });
    return;
  }

  /* ---- add / edit sales ------------------------------------------------- */
  var isSEdit = page === 'edit-sales';
  var srec = isSEdit ? FF.find('sales_records', UI.qi('id')) : null;
  if (isSEdit && !srec) { Shell.go('sales-list.html'); return; }
  var svalues = srec ? {
    harvest_record_id: String(srec.harvest_record_id), sales_channel_id: String(srec.sales_channel_id),
    weight_sold: UI.dec(srec.weight_sold, 3), sales_amount: srec.sales_amount === null ? '' : UI.dec(srec.sales_amount, 2),
    record_time: dtl(srec.record_time)
  } : {};
  var hopts = FF.all('harvest_records').sort(UI.desc('record_time')).slice(0, 200).map(function (h) {
    var p = UI.byId('fish_production', h.production_id), c = UI.cage(p.cage_id);
    return [h.id, p.production_serial_number + ' — ' + (c ? c.name : '') + ' (' + h.record_time.slice(0, 10) + ', ' +
      h.harvest_type + ', ' + UI.nf(total(h), 1) + ' kg)'];
  });
  Shell.render({
    crumbs: [['Sales', 'sales-list.html'], [isSEdit ? 'Edit' : 'Add']],
    title: isSEdit ? 'Edit Sales Record' : 'Add Sales Record', body: '<div id="formHost"></div>'
  });
  Form.mount(document.getElementById('formHost'), svalues, function (v, e) {
    return '<div class="card"><div class="card-body"><form method="post">' +
      Form.row([
        { kind: 'select', name: 'harvest_record_id', label: 'Harvest Record', req: true, col: 'col-md-5', blank: '— Select harvest —', options: hopts },
        { kind: 'select', name: 'sales_channel_id', label: 'Sales Channel', req: true, col: 'col-md-3', blank: '— Select channel —',
          options: FF.all('sales_channels').sort(UI.byName).map(function (c) { return [c.id, c.name]; }) },
        { name: 'record_time', label: 'Record Time', req: true, type: 'datetime-local', col: 'col-md-2' }], v, e) +
      Form.row([
        { name: 'weight_sold', label: 'Weight Sold (kg)', req: true, type: 'number', step: '0.001', col: 'col-md-2' },
        { name: 'sales_amount', label: 'Sales Amount', type: 'number', step: '0.01', col: 'col-md-2', err: false }], v, e) +
      Form.buttons('sales-list.html') + '</form></div></div>';
  }, function (v) {
    var e = {};
    if (!(+v.harvest_record_id > 0)) e.harvest_record_id = 'Harvest record is required.';
    if (!(+v.sales_channel_id > 0)) e.sales_channel_id = 'Sales channel is required.';
    if (!Form.isNum(v.weight_sold) || +v.weight_sold < 0) e.weight_sold = 'Weight sold must be a non-negative number.';
    if (!v.record_time) e.record_time = 'Record time is required.';
    return e;
  }, function (v) {
    var r = { harvest_record_id: +v.harvest_record_id, sales_channel_id: +v.sales_channel_id, weight_sold: +v.weight_sold,
      sales_amount: v.sales_amount !== '' && Form.isNum(v.sales_amount) ? +v.sales_amount : null,
      record_time: v.record_time.replace('T', ' ') + ':00' };
    if (isSEdit) FF.update('sales_records', srec.id, r); else FF.insert('sales_records', r);
    Shell.go('sales-list.html?flash=' + (isSEdit ? 'updated' : 'added'));
  });
}());
