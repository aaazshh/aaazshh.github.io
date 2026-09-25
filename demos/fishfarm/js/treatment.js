/* treatment-list.php, add-treatment.php, edit-treatment.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';

  function itemsOf(id) {
    return FF.all('treatment_items').filter(function (i) { return i.treatment_record_id === id; })
      .sort(function (a, b) { return a.id - b.id; });
  }
  var TABLE = { Medicine: 'medicines', Supplement: 'supplements', Vaccine: 'vaccines' };

  if (page === 'treatment-list') {
    var back = location.pathname.split('/').pop() + location.search;
    Shell.on('delete', function (f) {
      var id = +f.dataset.id;
      FF.remove('treatment_records', id);
      itemsOf(id).forEach(function (i) { FF.remove('treatment_items', i.id); });
      Shell.go(back);
    });

    var f = { farm: UI.qi('fish_farm_id'), cage: UI.q('cage_name'), from: UI.q('record_from'), to: UI.q('record_to'),
      species: UI.qi('species_id'), serial: UI.q('production_serial_number') };
    var rows = FF.all('treatment_records').filter(function (t) {
      var p = UI.byId('fish_production', t.production_id), c = UI.cage(p.cage_id), day = t.record_time.slice(0, 10);
      if (f.farm && (!c || c.fish_farm_id !== f.farm)) return false;
      if (f.cage && (!c || c.name.toLowerCase().indexOf(f.cage.toLowerCase()) === -1)) return false;
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (f.species && p.species_id !== f.species) return false;
      if (f.serial && p.production_serial_number.toLowerCase().indexOf(f.serial.toLowerCase()) === -1) return false;
      return true;
    }).sort(UI.desc('record_time'));

    var pg = UI.pager(rows.length, 25);
    var body = rows.length ? rows.slice(pg.offset, pg.offset + 25).map(function (t) {
      var p = UI.byId('fish_production', t.production_id), c = UI.cage(p.cage_id);
      var lines = itemsOf(t.id).map(function (i) {
        return '<div>' + (i.treatable_type === 'Vaccine' ? 'Vaccine' : 'Medication') + ': ' +
          esc(UI.named(TABLE[i.treatable_type], i.treatable_id) || '?') +
          ' | Dose: ' + (i.dosage !== null ? UI.nf(i.dosage, 1) + ' L' : '-') +
          ' | Duration: ' + (i.duration !== null ? UI.nf(i.duration, 1) + ' mins' : '-') + '</div>';
      }).join('');
      return '<tr><td class="ps-4 text-sm">' + t.record_time.slice(0, 10) + '</td>' +
        '<td class="text-sm">' + esc(p.production_serial_number) + '</td>' +
        '<td class="text-sm">' + esc(c ? c.name : '-') + '</td>' +
        '<td class="text-sm">' + UI.speciesCell(UI.sp(p.species_id)) + '</td>' +
        '<td class="text-sm">' + esc(t.tarp_size || '-') + '</td>' +
        '<td class="text-sm">' + esc(t.treatment_type || '-') + '</td>' +
        '<td class="text-sm text-xs">' + (lines || '<span class="text-secondary">—</span>') + '</td>' +
        '<td class="text-sm" title="' + esc(t.clinical_diagnosis || '') + '">' + esc(UI.strim(t.clinical_diagnosis, 40, '…')) + '</td>' +
        '<td class="text-sm" title="' + esc(t.lab_diagnosis || '') + '">' + esc(UI.strim(t.lab_diagnosis, 40, '…')) + '</td>' +
        '<td class="text-sm">' + esc(t.staff || '') + '</td>' +
        '<td class="text-sm" title="' + esc(t.remarks || '') + '">' + esc(UI.strim(t.remarks, 30, '…')) + '</td>' +
        '<td class="text-sm"><a href="edit-treatment.html?id=' + t.id + '" class="text-primary me-2">Edit</a>' +
        '<form class="d-inline" data-post="delete" data-id="' + t.id + '" data-confirm="Delete this treatment record and all its items?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
    }).join('') : '<tr><td colspan="12" class="text-center text-sm py-4 text-secondary">No treatment records match the filters.</td></tr>';

    Shell.render({
      crumbs: [['Treatment Manager', 'index.html'], ['List']], title: 'Treatment',
      body: UI.flashFrom({ added: 'Treatment record added.', updated: 'Treatment record updated.', deleted: 'Treatment record deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex justify-content-between align-items-center mb-3">' +
        '<a href="add-treatment.html" class="btn btn-primary btn-sm mb-0">Add</a></div>' +
        '<form method="get" action="treatment-list.html" class="row g-2 align-items-center mb-3">' +
        '<div class="col-md-2"><select name="fish_farm_id" class="form-control form-control-sm"><option value="">Farm</option>' +
        UI.options(FF.all('fish_farms').sort(UI.byName), f.farm, function (x) { return x.name; }) + '</select></div>' +
        '<div class="col-md-2"><input type="text" name="cage_name" class="form-control form-control-sm" placeholder="Cage Name" value="' + esc(f.cage) + '"></div>' +
        '<div class="col-md-2"><input type="date" name="record_from" class="form-control form-control-sm" value="' + esc(f.from) + '" title="Record date from"></div>' +
        '<div class="col-md-2"><input type="date" name="record_to" class="form-control form-control-sm" value="' + esc(f.to) + '" title="Record date to"></div>' +
        '<div class="col-md-2"><select name="species_id" class="form-control form-control-sm"><option value="">Fish Species</option>' +
        UI.options(FF.all('fish_species').sort(UI.byName), f.species, function (s) { return s.name; }) + '</select></div>' +
        '<div class="col-md-3"><input type="text" name="production_serial_number" class="form-control form-control-sm" placeholder="Production Serial Number" value="' + esc(f.serial) + '"></div>' +
        '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="treatment-list.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Treatment Date</th><th class="' + TH + '">Production Serial No.</th><th class="' + TH + '">Cage</th>' +
        '<th class="' + TH + '">Fish Species</th><th class="' + TH + '">Canvas Size</th><th class="' + TH + '">Treatment Type</th>' +
        '<th class="' + TH + '" style="min-width:260px">Treatment Detail</th><th class="' + TH + '">Clinical Diagnosis</th>' +
        '<th class="' + TH + '">Lab Diagnosis</th><th class="' + TH + '">Staff</th><th class="' + TH + '">Remarks</th>' +
        '<th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + body + '</tbody></table></div>' + pg.html + '</div></div>'
    });
    return;
  }

  /* ---- add / edit ------------------------------------------------------ */
  var isEdit = page === 'edit-treatment';
  var rec = isEdit ? FF.find('treatment_records', UI.qi('id')) : null;
  if (isEdit && !rec) { Shell.go('treatment-list.html'); return; }
  var TREATABLES = {};
  Object.keys(TABLE).forEach(function (k) {
    TREATABLES[k] = FF.all(TABLE[k]).filter(function (r) { return r.status_id == 1; }).sort(UI.byName);
  });
  function dtl(s) { return s ? s.slice(0, 16).replace(' ', 'T') : ''; }
  var values = rec ? {
    production_id: String(rec.production_id), record_time: dtl(rec.record_time), tarp_size: rec.tarp_size || 'Small',
    treatment_type: rec.treatment_type || 'Medicinal Bath', clinical_diagnosis: rec.clinical_diagnosis || '',
    lab_diagnosis: rec.lab_diagnosis || '', remarks: rec.remarks || '', staff: rec.staff || '',
    items: itemsOf(rec.id).map(function (i) {
      return { type: i.treatable_type, treatable_id: i.treatable_id, dosage: i.dosage === null ? '' : UI.dec(i.dosage, 3),
        duration: i.duration === null ? '' : UI.dec(i.duration, 2), batch_number: i.batch_number || '',
        fish_size: i.fish_size || '', treatment_time: dtl(i.treatment_time) };
    })
  } : { tarp_size: 'Small', treatment_type: 'Medicinal Bath', items: [] };

  var prods = FF.all('fish_production').filter(function (p) { return p.status_id == 1; }).sort(UI.desc('stocking_date'));

  function itemRow(it, idx, e) {
    function bad(k) { return e[k + '_' + idx] ? ' is-invalid' : ''; }
    return '<div class="item-row border rounded p-3 mb-2 bg-light"><div class="row g-2 align-items-end">' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">Type <span class="text-danger">*</span></label>' +
      '<select name="item_type[]" class="form-control form-control-sm item-type-select' + bad('item_type') + '">' +
      ['Medicine', 'Supplement', 'Vaccine'].map(function (t) {
        return '<option value="' + t + '"' + (it.type === t ? ' selected' : '') + '>' + t + '</option>';
      }).join('') + '</select></div>' +
      '<div class="col-md-3"><label class="form-label text-xs mb-1">Name <span class="text-danger">*</span></label>' +
      '<select name="item_treatable_id[]" class="form-control form-control-sm item-name-select' + bad('item_id') + '" data-selected="' + (+it.treatable_id || 0) + '"></select></div>' +
      '<div class="col-md-1"><label class="form-label text-xs mb-1">Dosage (L)</label>' +
      '<input type="number" step="0.001" name="item_dosage[]" class="form-control form-control-sm' + bad('item_dosage') + '" value="' + esc(it.dosage) + '"></div>' +
      '<div class="col-md-1"><label class="form-label text-xs mb-1">Duration (min)</label>' +
      '<input type="number" step="0.1" name="item_duration[]" class="form-control form-control-sm' + bad('item_duration') + '" value="' + esc(it.duration) + '"></div>' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">Batch Number</label>' +
      '<input type="text" name="item_batch_number[]" class="form-control form-control-sm" value="' + esc(it.batch_number) + '"></div>' +
      '<div class="col-md-1"><label class="form-label text-xs mb-1">Fish Size</label>' +
      '<input type="text" name="item_fish_size[]" class="form-control form-control-sm" value="' + esc(it.fish_size) + '"></div>' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">Treatment Time</label>' +
      '<input type="datetime-local" name="item_treatment_time[]" class="form-control form-control-sm" value="' + esc(it.treatment_time) + '"></div>' +
      '<div class="col-md-1 d-flex align-items-end"><button type="button" class="btn btn-outline-danger btn-sm mb-0 remove-item-btn">✕</button></div>' +
      '</div></div>';
  }

  // FormData arrays back into item objects, the way the PHP loop collects them.
  function collect(v) {
    if (!v['item_type[]']) return v;
    v.items = v['item_type[]'].map(function (t, i) {
      return { type: t, treatable_id: v['item_treatable_id[]'][i] || '', dosage: v['item_dosage[]'][i] || '',
        duration: v['item_duration[]'][i] || '', batch_number: v['item_batch_number[]'][i] || '',
        fish_size: v['item_fish_size[]'][i] || '', treatment_time: v['item_treatment_time[]'][i] || '' };
    });
    return v;
  }

  Shell.render({
    crumbs: [['Treatment', 'treatment-list.html'], [isEdit ? 'Edit' : 'Add']],
    title: isEdit ? 'Edit Treatment Record' : 'Add Treatment Record', body: '<div id="formHost"></div>'
  });

  function draw(v, e) {
    v = collect(v);
    var items = v.items && v.items.length ? v.items : [{ type: 'Medicine', treatable_id: 0 }];
    return '<div class="card"><div class="card-body"><form method="post" id="treatmentForm">' +
      Form.row([
        { kind: 'select', name: 'production_id', label: 'Production', req: true, col: 'col-md-5', blank: '— Select production —',
          options: prods.map(function (p) {
            var c = UI.cage(p.cage_id), s = UI.sp(p.species_id);
            return [p.id, p.production_serial_number + ' — ' + (c ? c.name : '') + ' (' + (s ? s.name : '') + ')'];
          }) },
        { name: 'record_time', label: 'Record Time', req: true, type: 'datetime-local', col: 'col-md-3' },
        { kind: 'select', name: 'tarp_size', label: 'Canvas Size', col: 'col-md-2', err: false,
          options: ['Small', 'Large', 'XL'] },
        { name: 'treatment_type', label: 'Treatment Type', col: 'col-md-2', err: false }], v, e) +
      Form.row([
        { name: 'staff', label: 'Staff', col: 'col-md-2', err: false },
        { name: 'clinical_diagnosis', label: 'Clinical Diagnosis', err: false },
        { name: 'lab_diagnosis', label: 'Lab Diagnosis', err: false },
        { name: 'remarks', label: 'Remarks', col: 'col-md-2', err: false }], v, e) +
      '<hr><div class="d-flex justify-content-between align-items-center mb-2"><h6 class="mb-0">Treatment Items</h6>' +
      '<button type="button" class="btn btn-outline-primary btn-sm mb-0" id="addItemBtn">+ Add Item</button></div>' +
      (e.items ? '<div class="text-danger text-xs mb-2">' + e.items + '</div>' : '') +
      '<div id="itemsContainer">' + items.map(function (it, i) { return itemRow(it, i, e); }).join('') + '</div>' +
      '<hr>' + Form.buttons('treatment-list.html') + '</form></div></div>';
  }
  // Wire the item rows once the form is on the page (the real page's inline script).
  draw.after = function (host) {
    function populate(typeSel, nameSel, selected) {
      nameSel.innerHTML = '<option value="">— Select —</option>';
      (TREATABLES[typeSel.value] || []).forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.id; opt.textContent = o.name;
        if (o.id === selected) opt.selected = true;
        nameSel.appendChild(opt);
      });
    }
    function initRow(row) {
      var t = row.querySelector('.item-type-select'), n = row.querySelector('.item-name-select');
      populate(t, n, parseInt(n.dataset.selected || '0', 10));
      t.addEventListener('change', function () { populate(t, n, 0); });
      row.querySelector('.remove-item-btn').addEventListener('click', function () {
        if (host.querySelectorAll('.item-row').length > 1) row.remove();
      });
    }
    host.querySelectorAll('.item-row').forEach(initRow);
    host.querySelector('#addItemBtn').addEventListener('click', function () {
      var tpl = host.querySelector('.item-row').cloneNode(true);
      tpl.querySelectorAll('input').forEach(function (el) { el.value = ''; });
      tpl.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
      tpl.querySelector('.item-type-select').value = 'Medicine';
      tpl.querySelector('.item-name-select').dataset.selected = '0';
      host.querySelector('#itemsContainer').appendChild(tpl);
      initRow(tpl);
    });
  };

  Form.mount(document.getElementById('formHost'), values, draw, function (v) {
    v = collect(v);
    var e = {};
    if (!(+v.production_id > 0)) e.production_id = 'Production is required.';
    if (!v.record_time) e.record_time = 'Record time is required.';
    if (!v.items || !v.items.length) e.items = 'At least one treatment item is required.';
    (v.items || []).forEach(function (it, i) {
      if (!TABLE[it.type]) e['item_type_' + i] = 'Select a valid type.';
      if (!(+it.treatable_id > 0)) e['item_id_' + i] = 'Select a medicine/supplement/vaccine.';
      if (it.dosage !== '' && !Form.isNum(it.dosage)) e['item_dosage_' + i] = 'Dosage must be a number.';
      if (it.duration !== '' && !Form.isNum(it.duration)) e['item_duration_' + i] = 'Duration must be a number.';
    });
    return e;
  }, function (v) {
    v = collect(v);
    var r = { production_id: +v.production_id, record_time: v.record_time.replace('T', ' ') + ':00', tarp_size: v.tarp_size || null,
      treatment_type: v.treatment_type || 'Medicinal Bath', lab_diagnosis: v.lab_diagnosis || null,
      clinical_diagnosis: v.clinical_diagnosis || null, remarks: v.remarks || null, staff: v.staff || null };
    var id;
    if (isEdit) {
      id = rec.id;
      FF.update('treatment_records', id, r);
      itemsOf(id).forEach(function (i) { FF.remove('treatment_items', i.id); });
    } else {
      id = FF.insert('treatment_records', r);
    }
    v.items.forEach(function (it) {
      FF.insert('treatment_items', { treatment_record_id: id, treatable_type: it.type, treatable_id: +it.treatable_id,
        dosage: Form.num(it.dosage), duration: Form.num(it.duration), batch_number: it.batch_number || null,
        fish_size: it.fish_size || null, treatment_time: it.treatment_time ? it.treatment_time.replace('T', ' ') + ':00' : null });
    });
    Shell.go('treatment-list.html?flash=' + (isEdit ? 'updated' : 'added'));
  });
}());
