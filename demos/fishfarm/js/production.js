/* fish-production-list.php, add/edit-fish-production.php, fish-production-detail.php,
   import-fish-production.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';

  function deadTotal(pid, key) {
    return FF.all('dead_fish_records').reduce(function (n, d) {
      return d.production_id === pid ? n + (d[key || 'quantity'] || 0) : n;
    }, 0);
  }

  /* ---- list ------------------------------------------------------------ */
  if (page === 'fish-production-list') {
    var back = location.pathname.split('/').pop() + location.search;
    Shell.on('delete', function (f) {
      FF.remove('fish_production', f.dataset.id);
      FF.log('delete', 'fish_production', f.dataset.id, 'Deleted production #' + f.dataset.id);
      Shell.go('fish-production-list.html?flash=deleted');
    });
    function toggle(key) {
      return function (f) {
        var p = FF.find('fish_production', f.dataset.id), patch = {};
        patch[key] = p[key] == 1 ? 0 : 1;
        FF.update('fish_production', p.id, patch);
        Shell.go(back);
      };
    }
    Shell.on('toggle_ongoing', toggle('status_id'));
    Shell.on('toggle_favorited', toggle('is_favorited'));

    var filtered = UI.params.has('filtered');
    var f = {
      serial: UI.q('production_serial_number'), cage: UI.q('cage_name'), from: UI.q('stocking_from'),
      to: UI.q('stocking_to'), species: UI.qi('species_id'), supplier: UI.qi('supplier_id'),
      ongoing: filtered ? UI.params.has('ongoing') : true, fav: UI.params.has('favorited')
    };
    var rows = FF.all('fish_production').filter(function (p) {
      var c = UI.cage(p.cage_id);
      if (f.serial && p.production_serial_number.toLowerCase().indexOf(f.serial.toLowerCase()) === -1) return false;
      if (f.cage && (!c || c.name.toLowerCase().indexOf(f.cage.toLowerCase()) === -1)) return false;
      if (f.from && p.stocking_date < f.from) return false;
      if (f.to && p.stocking_date > f.to) return false;
      if (f.species && p.species_id !== f.species) return false;
      if (f.supplier && p.supplier_id !== f.supplier) return false;
      if (f.ongoing && p.status_id != 1) return false;
      if (f.fav && p.is_favorited != 1) return false;
      return true;
    }).sort(UI.desc('stocking_date'));

    var body = rows.length ? rows.map(function (p) {
      var s = UI.sp(p.species_id), c = UI.cage(p.cage_id);
      return '<tr><td class="ps-4 text-sm">' + esc(p.production_serial_number) + '</td>' +
        '<td class="text-sm">' + esc(c ? c.name : '') + '</td>' +
        '<td class="text-sm">' + UI.speciesCell(s) + '</td>' +
        '<td class="text-sm">' + p.stocking_date + '</td>' +
        '<td class="text-sm text-end">' + p.stocking_quantity + '</td>' +
        '<td class="text-sm text-end">' + UI.dec(p.stocking_size_inch, 2) + '</td>' +
        '<td class="text-sm text-end">' + UI.dec(p.stocking_weight_g, 2) + '</td>' +
        '<td class="text-sm">' + esc(UI.named('suppliers', p.supplier_id)) + '</td>' +
        '<td class="text-sm text-end">' + (p.cost_per_pc !== null ? UI.dec(p.cost_per_pc, 2) : '-') + '</td>' +
        '<td class="text-sm text-end">' + FF.ddiff(p.stocking_date, FF.today) + '</td>' +
        '<td class="text-sm text-end">' + (p.stocking_quantity - deadTotal(p.id)) + '</td>' +
        '<td class="text-center"><form class="d-inline" data-post="toggle_ongoing" data-id="' + p.id + '">' +
        '<div class="form-check form-switch d-inline-block mb-0"><input class="form-check-input" type="checkbox" onchange="this.form.requestSubmit()"' +
        (p.status_id == 1 ? ' checked' : '') + '></div></form></td>' +
        '<td class="text-center"><form class="d-inline" data-post="toggle_favorited" data-id="' + p.id + '">' +
        '<div class="form-check form-switch d-inline-block mb-0"><input class="form-check-input" type="checkbox" onchange="this.form.requestSubmit()"' +
        (p.is_favorited == 1 ? ' checked' : '') + '></div></form></td>' +
        '<td class="text-sm"><a href="fish-production-detail.html?id=' + p.id + '" class="text-info me-2">View</a>' +
        '<a href="edit-fish-production.html?id=' + p.id + '" class="text-primary me-2">Edit</a>' +
        '<form class="d-inline" data-post="delete" data-id="' + p.id + '" data-confirm="Delete this production?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
    }).join('') : '<tr><td colspan="14" class="text-center text-sm py-4 text-secondary">No productions match. Adjust filters or click <strong>Add</strong>.</td></tr>';

    var species = FF.all('fish_species').sort(UI.byName);
    var suppliers = FF.all('suppliers').filter(function (s) { return s.status_id == 1; }).sort(UI.byName);
    Shell.render({
      crumbs: [['Fish Productions', 'index.html'], ['List']], title: 'Fish Production',
      body: UI.flashFrom({ added: 'Production added.', updated: 'Production updated.', deleted: 'Production deleted.' }) +
        '<div class="card"><div class="card-header pb-0">' +
        '<div class="d-flex justify-content-between align-items-center mb-3"><h6 class="mb-0">Production List</h6><div class="d-flex gap-2">' +
        '<a href="add-fish-production.html" class="btn btn-primary btn-sm mb-0">Add</a>' +
        '<a href="import-fish-production.html" class="btn btn-outline-primary btn-sm mb-0">Import</a>' +
        '<a href="#" data-unbuilt="The .xlsx export" class="btn btn-outline-primary btn-sm mb-0">Export</a></div></div>' +
        '<form method="get" action="fish-production-list.html" class="row g-2 align-items-center mb-3"><input type="hidden" name="filtered" value="1">' +
        '<div class="col-md-2"><input type="text" name="production_serial_number" class="form-control form-control-sm" placeholder="Production Serial Number" value="' + esc(f.serial) + '"></div>' +
        '<div class="col-md-2"><input type="text" name="cage_name" class="form-control form-control-sm" placeholder="Cage Name" value="' + esc(f.cage) + '"></div>' +
        '<div class="col-md-1"><input type="date" name="stocking_from" class="form-control form-control-sm" value="' + esc(f.from) + '" title="Stocking date from"></div>' +
        '<div class="col-md-1"><input type="date" name="stocking_to" class="form-control form-control-sm" value="' + esc(f.to) + '" title="Stocking date to"></div>' +
        '<div class="col-md-2"><select name="species_id" class="form-control form-control-sm"><option value="">Fish Species</option>' +
        UI.options(species, f.species, function (s) { return s.name; }) + '</select></div>' +
        '<div class="col-md-2"><select name="supplier_id" class="form-control form-control-sm"><option value="">Supplier</option>' +
        UI.options(suppliers, f.supplier, function (s) { return s.name; }) + '</select></div>' +
        '<div class="col-md-2 d-flex align-items-center gap-3">' +
        '<div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" name="ongoing" id="fOngoing"' + (f.ongoing ? ' checked' : '') + '>' +
        '<label class="form-check-label text-sm" for="fOngoing">Ongoing</label></div>' +
        '<div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" name="favorited" id="fFavorited"' + (f.fav ? ' checked' : '') + '>' +
        '<label class="form-check-label text-sm" for="fFavorited">Favorited</label></div></div>' +
        '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="fish-production-list.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Production Serial Number</th><th class="' + TH + '">Cage</th><th class="' + TH + '">Species</th>' +
        '<th class="' + TH + '">Stocking Date</th><th class="' + TH + ' text-end">Stocking Quantity</th>' +
        '<th class="' + TH + ' text-end">Stocking Size (inch)</th><th class="' + TH + ' text-end">Stocking Weight (g)</th>' +
        '<th class="' + TH + '">Supplier</th><th class="' + TH + ' text-end">Cost (per pc)</th>' +
        '<th class="' + TH + ' text-end">Day of Culture (DOC)</th><th class="' + TH + ' text-end">Current Stock Quantity</th>' +
        '<th class="' + TH + ' text-center">Ongoing</th><th class="' + TH + ' text-center">Favorited</th>' +
        '<th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + body + '</tbody></table></div></div></div>'
    });
    return;
  }

  /* ---- import (a stub in the real portal too) ------------------------- */
  if (page === 'import-fish-production') {
    Shell.render({
      crumbs: [['Fish Production', 'fish-production-list.html'], ['Import']], title: 'Import Fish Production',
      body: '<div class="card"><div class="card-body">' +
        UI.flash('Import is part of the data pipeline (still to be built). It will accept the CMS export file (CSV/XLSX with the same columns as Export) and upsert rows by Production Serial Number.', 'info') +
        '<a href="fish-production-list.html" class="btn btn-outline-secondary mb-0">Back to list</a></div></div>'
    });
    return;
  }

  /* ---- detail ---------------------------------------------------------- */
  if (page === 'fish-production-detail') {
    var p = FF.find('fish_production', UI.qi('id'));
    if (!p) { Shell.go('fish-production-list.html'); return; }
    var s = UI.sp(p.species_id), c = UI.cage(p.cage_id);
    var byDate = {}, totalQty = 0;
    FF.all('dead_fish_records').forEach(function (d) {
      if (d.production_id !== p.id) return;
      var k = d.record_time.slice(0, 10);
      byDate[k] = (byDate[k] || 0) + (d.real_quantity || 0);
      totalQty += d.quantity;
    });
    function days(table, test) {
      var set = {};
      FF.all(table).forEach(function (r) { if (r.production_id === p.id && test(r)) set[r.record_time.slice(0, 10)] = true; });
      return set;
    }
    var itemsBy = {};
    FF.all('treatment_items').forEach(function (i) { (itemsBy[i.treatment_record_id] = itemsBy[i.treatment_record_id] || []).push(i); });
    var oral = days('treatment_records', function (t) { return /Oral/.test(t.treatment_type); });
    var bath = days('treatment_records', function (t) {
      return /Bath/.test(t.treatment_type) || (itemsBy[t.id] || []).some(function (i) { return i.treatable_type === 'Medicine'; });
    });
    var wash = days('net_records', function (n) { return n.record_type === 3; });
    var change = days('net_records', function (n) { return n.record_type === 2; });

    var labels = [], stock = [], flags = { oral: [], wash: [], bath: [], change: [] };
    var cum = 0, minStock = p.stocking_quantity;
    for (var d = p.stocking_date, g = 0; d <= FF.today && g < 2000; d = FF.dadd(d, 1), g++) {
      cum += byDate[d] || 0;
      var st = p.stocking_quantity - cum;
      if (st < minStock) minStock = st;
      labels.push(d); stock.push(st);
      flags.oral.push(!!oral[d]); flags.wash.push(!!wash[d]); flags.bath.push(!!bath[d]); flags.change.push(!!change[d]);
    }
    var baseline = Math.max(0, minStock - Math.max(1, Math.floor((p.stocking_quantity - minStock) * 0.04)));
    function scatter(fl) {
      var out = [];
      fl.forEach(function (on, i) { if (on) out.push({ x: labels[i], y: baseline }); });
      return out;
    }
    function fieldHtml(label, value, isLink) {
      return '<div class="col-md-3 col-sm-6"><p class="text-xs text-uppercase text-secondary font-weight-bolder mb-1">' + esc(label) + '</p>' +
        (value === null || value === '' ? '<p class="text-sm mb-0 text-secondary">-</p>'
          : '<p class="text-sm mb-0 ' + (isLink ? 'text-primary font-weight-bold' : '') + '">' + value + '</p>') + '</div>';
    }
    var speciesHtml = s ? '<a class="text-primary font-weight-bold" href="edit-fish-species.html?id=' + s.id + '">' + esc(s.name) + '</a>' +
      (s.chinese_name ? ' <span class="text-xs text-secondary">' + esc(s.chinese_name) + '</span>' : '') : null;

    Shell.render({
      crumbs: [['Fish Productions', 'fish-production-list.html'], ['Fish Production', 'fish-production-list.html'], ['Detail']],
      title: 'Fish Production Detail',
      body: '<div class="card mb-4"><div class="card-header pb-0 d-flex justify-content-between align-items-center"><h6 class="mb-0">Basic Information</h6>' +
        '<div class="d-flex gap-2 align-items-center">' +
        (p.status_id == 1 ? '<span class="badge bg-gradient-success">Ongoing</span>' : '<span class="badge bg-gradient-secondary">Finished</span>') +
        '<a href="edit-fish-production.html?id=' + p.id + '" class="btn btn-outline-primary btn-sm mb-0">Edit</a></div></div>' +
        '<div class="card-body"><div class="row g-4">' +
        fieldHtml('Serial Number', esc(p.production_serial_number)) +
        fieldHtml('Cage', esc(c ? c.name : '')) +
        fieldHtml('Species', speciesHtml, true) +
        fieldHtml('Stocking date', p.stocking_date) +
        fieldHtml('Stocking quantity', UI.nf(p.stocking_quantity)) +
        fieldHtml('Stocking size (inch)', UI.dec(p.stocking_size_inch, 2)) +
        fieldHtml('Stocking weight (g)', UI.dec(p.stocking_weight_g, 2)) +
        fieldHtml('Supplier', esc(UI.named('suppliers', p.supplier_id) || '')) +
        fieldHtml('Cost (per pc)', p.cost_per_pc !== null ? UI.dec(p.cost_per_pc, 2) : null) +
        fieldHtml('Day of Culture (DOC)', FF.ddiff(p.stocking_date, FF.today)) +
        fieldHtml('Current stock quantity', UI.nf(p.stocking_quantity - totalQty)) +
        fieldHtml('Vaccine Info', esc(p.vaccination || '')) +
        '</div></div></div>' +
        '<div class="card"><div class="card-header pb-0"><h6 class="mb-0">Stock Number</h6></div><div class="card-body">' +
        (labels.length ? '<div style="position:relative;height:460px;"><canvas id="stockChart"></canvas></div>'
          : '<p class="text-sm text-secondary mb-0">No stock history yet.</p>') + '</div></div>'
    });

    document.addEventListener('DOMContentLoaded', function () {
      if (!labels.length || typeof Chart === 'undefined') return;
      new Chart(document.getElementById('stockChart').getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: [
          { label: 'Current stock quantity', data: stock, borderColor: '#5e9bd1', backgroundColor: 'rgba(94,155,209,.08)',
            borderWidth: 2, pointRadius: 0, tension: .35, fill: true, order: 5 },
          { label: 'Oral Medicine', data: scatter(flags.oral), type: 'scatter', backgroundColor: '#2dce89', pointRadius: 6, showLine: false, order: 1 },
          { label: 'Wash Net', data: scatter(flags.wash), type: 'scatter', backgroundColor: '#fb6340', pointRadius: 6, showLine: false, order: 2 },
          { label: 'Medicine Bath', data: scatter(flags.bath), type: 'scatter', backgroundColor: '#11cdef', pointRadius: 6, showLine: false, order: 3 },
          { label: 'Change Net', data: scatter(flags.change), type: 'scatter', backgroundColor: '#5e72e4', pointRadius: 6, showLine: false, order: 4 }
        ] },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: 'nearest', intersect: false },
          plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
            tooltip: { callbacks: { title: function (it) { return it[0].label; } } } },
          scales: { x: { ticks: { maxTicksLimit: 18, font: { size: 10 } }, grid: { display: false }, title: { display: true, text: 'Date' } },
            y: { beginAtZero: false, title: { display: true, text: 'Stock Number' } } }
        }
      });
    });
    return;
  }

  /* ---- add / edit ------------------------------------------------------ */
  var isEdit = page === 'edit-fish-production';
  var rec = isEdit ? FF.find('fish_production', UI.qi('id')) : null;
  if (isEdit && !rec) { Shell.go('fish-production-list.html'); return; }
  var values = rec ? {
    production_serial_number: rec.production_serial_number, cage_id: String(rec.cage_id), species_id: String(rec.species_id),
    stocking_date: rec.stocking_date, stocking_quantity: String(rec.stocking_quantity),
    stocking_size_inch: UI.dec(rec.stocking_size_inch, 2), stocking_weight_g: UI.dec(rec.stocking_weight_g, 2),
    supplier_id: String(rec.supplier_id), cost_per_pc: rec.cost_per_pc === null ? '' : UI.dec(rec.cost_per_pc, 2),
    vaccination: rec.vaccination || '', status_id: String(rec.status_id)
  } : {};

  var sp = FF.all('fish_species').filter(function (s) { return isEdit || s.status_id == 1; }).sort(UI.byName);
  var cages = FF.all('cages').filter(function (c) { return c.status_id == 1; }).sort(function (a, b) {
    return a.fish_farm_id - b.fish_farm_id || String(a.internal_name || '').localeCompare(String(b.internal_name || ''));
  });
  var sup = FF.all('suppliers').filter(function (s) { return s.status_id == 1; }).sort(UI.byName);

  Shell.render({
    crumbs: [['Fish Production', 'fish-production-list.html'], [isEdit ? 'Edit' : 'Add']],
    title: isEdit ? 'Edit Fish Production' : 'Add Fish Production', body: '<div id="formHost"></div>'
  });
  Form.mount(document.getElementById('formHost'), values, function (v, e) {
    return '<div class="card"><div class="card-header pb-0"><h6 class="mb-0">General Information</h6></div><div class="card-body"><form method="post">' +
      Form.row([
        { name: 'production_serial_number', label: 'Production Serial Number', req: true },
        { kind: 'select', name: 'cage_id', label: 'Cage', req: true, blank: 'Please select',
          options: cages.map(function (c) { return [c.id, c.name]; }) },
        { kind: 'select', name: 'species_id', label: 'Species', req: true, blank: 'Please select',
          options: sp.map(function (s) { return [s.id, s.name + ' / ' + s.chinese_name]; }) }], v, e) +
      Form.row([
        { name: 'stocking_date', label: 'Stocking Date', req: true, type: 'date' },
        { name: 'stocking_quantity', label: 'Stocking Quantity', req: true },
        { name: 'stocking_size_inch', label: 'Stocking Size (inch)', req: true }], v, e) +
      Form.row([
        { name: 'stocking_weight_g', label: 'Stocking Weight (g)', req: true },
        { kind: 'select', name: 'supplier_id', label: 'Supplier', req: true, blank: 'Please select',
          options: sup.map(function (s) { return [s.id, s.name]; }) },
        { name: 'cost_per_pc', label: 'Cost (per pc)' }], v, e) +
      Form.row(isEdit ? [
        { name: 'vaccination', label: 'Vaccination', err: false },
        { kind: 'select', name: 'status_id', label: 'Status', options: [['1', 'Ongoing'], ['0', 'Closed']], err: false }]
        : [{ name: 'vaccination', label: 'Vaccination', err: false, col: 'col-md-8' }], v, e) +
      Form.buttons('fish-production-list.html', isEdit ? 'Save' : 'Confirm') + '</form></div></div>';
  }, function (v) {
    var e = {};
    if (!v.production_serial_number) e.production_serial_number = 'Required.';
    if (!(+v.cage_id > 0)) e.cage_id = 'Required.';
    if (!(+v.species_id > 0)) e.species_id = 'Required.';
    if (!v.stocking_date) e.stocking_date = 'Required.';
    if (!Form.isDigits(v.stocking_quantity)) e.stocking_quantity = 'Whole number required.';
    if (!Form.isNum(v.stocking_size_inch)) e.stocking_size_inch = 'Number required.';
    if (!Form.isNum(v.stocking_weight_g)) e.stocking_weight_g = 'Number required.';
    if (!(+v.supplier_id > 0)) e.supplier_id = 'Required.';
    if (v.cost_per_pc !== '' && !Form.isNum(v.cost_per_pc)) e.cost_per_pc = 'Number.';
    return e;
  }, function (v) {
    var r = { production_serial_number: v.production_serial_number, cage_id: +v.cage_id, species_id: +v.species_id,
      stocking_date: v.stocking_date, stocking_quantity: +v.stocking_quantity, stocking_size_inch: +v.stocking_size_inch,
      stocking_weight_g: +v.stocking_weight_g, supplier_id: +v.supplier_id, cost_per_pc: Form.num(v.cost_per_pc),
      vaccination: v.vaccination || null };
    if (isEdit) {
      r.status_id = +v.status_id;
      FF.update('fish_production', rec.id, r);
      FF.log('update', 'fish_production', rec.id, 'Updated production ' + r.production_serial_number);
      Shell.go('fish-production-list.html?flash=updated');
    } else {
      r.is_favorited = 0;
      var id = FF.insert('fish_production', r);
      FF.log('create', 'fish_production', id, 'Added production ' + r.production_serial_number);
      Shell.go('fish-production-list.html?flash=added');
    }
  });
}());
