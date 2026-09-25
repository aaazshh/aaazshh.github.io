/* settings-list.php and settings-form.php (?entity=), and images-list.php (?category=) */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';

  /* ---- images ---------------------------------------------------------- */
  if (page === 'images-list') {
    var CATS = { 'Treatment': 'Treatment', 'Incidents': 'IncidentReport', 'Dead Fish': 'DeadFishReport',
      'Broken Nets': 'BrokenNet', 'Harvest': 'HarvestRecord' };
    var cat = UI.q('category');
    if (!CATS[cat]) cat = 'Treatment';
    var back = location.pathname.split('/').pop() + location.search;
    Shell.on('delete', function (f) { FF.remove('images', f.dataset.id); Shell.go('images-list.html?category=' + encodeURIComponent(cat) + '&flash=deleted'); });
    var rows = FF.all('images').filter(function (i) { return i.imageable_type === CATS[cat]; }).sort(UI.desc('created_at'));
    var pg = UI.pager(rows.length, 25);
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var cards = rows.slice(pg.offset, pg.offset + 25).map(function (r) {
      var file = r.image.split('/').pop();
      var when = MON[+r.created_at.slice(5, 7) - 1] + ' ' + r.created_at.slice(8, 10) + ', ' + r.created_at.slice(0, 4) + ' ' + r.created_at.slice(11, 16);
      return '<div class="col-sm-6 col-lg-4 col-xl-3"><div class="border rounded-2 overflow-hidden h-100 bg-white">' +
        '<div class="ff-thumb-empty" title="' + esc(file) + '"><i class="fas fa-image"></i>' + esc(file) + '</div>' +
        '<div class="p-3"><div class="d-flex justify-content-between align-items-start gap-2"><div>' +
        '<span class="badge bg-gradient-secondary mb-2">' + esc(r.imageable_type) + '</span>' +
        '<p class="text-sm mb-1" title="' + esc(file) + '">' + esc(UI.strim(file, 34, '...')) + '</p>' +
        '<p class="text-xs text-secondary mb-0">' + when + '</p></div>' +
        '<form data-post="delete" data-id="' + r.id + '" data-confirm="Delete this image?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form>' +
        '</div></div></div></div>';
    }).join('');
    var empty = '<div class="text-center py-5"><div class="icon icon-shape bg-gradient-primary text-white rounded-circle mx-auto mb-3">' +
      '<i class="fas fa-images"></i></div><p class="text-sm text-secondary mb-3">No images found.</p>' +
      '<button type="button" class="btn btn-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#uploadModal"><i class="fas fa-plus me-1"></i> Add Image</button></div>';
    var pagerHtml = pg.html.replace('px-4 pt-3', 'pt-3');
    var modal = '<div class="modal fade" id="uploadModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered">' +
      '<form method="post" class="modal-content" data-export="Uploading images"><div class="modal-header"><h6 class="modal-title">Upload Image</h6>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><p class="text-sm mb-3">Category: <strong>' + esc(cat) + '</strong></p><div class="mb-0">' +
      '<label class="form-label">Image <span class="text-danger">*</span></label>' +
      '<input type="file" name="image_file" class="form-control" accept="image/jpeg,image/png,image/webp,image/gif" required>' +
      '<p class="text-xs text-secondary mt-2 mb-0">JPG, PNG, WEBP, or GIF. Max 8 MB.</p></div></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary mb-0" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary mb-0">Upload</button></div></form></div></div>';
    Shell.render({
      crumbs: [['Images', 'images-list.html?category=Treatment'], [esc(cat)]], title: 'Images - ' + esc(cat),
      body: UI.flashFrom({ uploaded: 'Image uploaded.', deleted: 'Image deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">' +
        '<ul class="nav nav-pills flex-wrap gap-1" role="tablist">' + Object.keys(CATS).map(function (c) {
          return '<li class="nav-item" role="presentation"><a class="nav-link ' + (c === cat ? 'active' : '') + '" href="images-list.html?category=' +
            encodeURIComponent(c) + '">' + esc(c) + '</a></li>';
        }).join('') + '</ul>' +
        '<button type="button" class="btn btn-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#uploadModal"><i class="fas fa-plus me-1"></i> Add</button>' +
        '</div></div><div class="card-body">' + (rows.length ? '<div class="row g-3">' + cards + '</div>' : empty) + pagerHtml + '</div></div>',
      after: modal
    });
    return;
  }

  /* ---- settings -------------------------------------------------------- */
  var NAME = { col: 'name', label: 'Name', type: 'text', required: true };
  var ENTITIES = {
    'supplements': { label: 'Supplements', table: 'supplements', fields: [NAME] },
    'sales-channels': { label: 'Sales Channels', table: 'sales_channels', fields: [NAME] },
    'feed-brands': { label: 'Feed Brands', table: 'feed_brands', fields: [NAME] },
    'feed-pellet-sizes': { label: 'Feed Pellet Size', table: 'feed_pellet_sizes', fields: [{ col: 'size', label: 'Size', type: 'text', required: true }] },
    'vaccines': { label: 'Vaccines', table: 'vaccines', fields: [NAME] },
    'fish-farms': { label: 'Fish Farms', table: 'fish_farms', fields: [NAME] },
    'cages': { label: 'Cage Number', table: 'cages', fields: [
      { col: 'name', label: 'Cage Name', type: 'text', required: true },
      { col: 'fish_farm_id', label: 'Farm', type: 'fk', fk: 'fish_farms', disp: 'name', required: true }],
      cols: [{ header: 'Name', type: 'text', col: 'name' }, { header: 'Fish Farm', type: 'fk', col: 'fish_farm_id' }] },
    'medicines': { label: 'Medicines', table: 'medicines', fields: [NAME] },
    'feed-types': { label: 'Feed Types', table: 'feed_types', fields: [NAME,
      { col: 'feed_brand_id', label: 'Feed Brand', type: 'fk', fk: 'feed_brands', disp: 'name', required: true },
      { col: 'feed_pellet_size_id', label: 'Feed Pellet Size', type: 'fk', fk: 'feed_pellet_sizes', disp: 'size', required: true }],
      status: true, cols: [{ header: 'Name', type: 'text', col: 'name' }, { header: 'Details', type: 'feed_details' }] },
    'supplement-types': { label: 'Supplement Types', table: 'supplement_types', fields: [NAME,
      { col: 'color', label: 'Color', type: 'color', required: false }],
      status: true, cols: [{ header: 'Name', type: 'text', col: 'name' }, { header: 'Color', type: 'color', col: 'color' },
        { header: 'Details', type: 'recipe_details' }] },
    'clinical-signs': { label: 'Clinical Signs', table: 'clinical_signs', fields: [NAME] },
    'net-types': { label: 'Net Types', table: 'net_types', fields: [NAME] },
    'suppliers': { label: 'Suppliers', table: 'suppliers', fields: [NAME] }
  };
  var entity = UI.q('entity');
  var cfg = ENTITIES[entity];
  if (!cfg) { Shell.go(page + '.html?entity=fish-farms'); return; }
  var listUrl = 'settings-list.html?entity=' + entity;
  function fkDisp(f, id) { var r = UI.byId(f.fk, id); return r ? r[f.disp] : null; }

  if (page === 'settings-list') {
    Shell.on('delete', function (f) { FF.remove(cfg.table, f.dataset.id); Shell.go(listUrl + '&flash=deleted'); });
    var cols = cfg.cols || cfg.fields.map(function (f) { return { header: f.label, type: f.type, col: f.col }; });
    function cell(lc, r) {
      if (lc.type === 'fk') {
        var fd = cfg.fields.filter(function (f) { return f.col === lc.col; })[0];
        return esc(fkDisp(fd, r[lc.col]) || '-');
      }
      if (lc.type === 'color') {
        var cv = r[lc.col] || '';
        if (!cv) return '—';
        return '<span class="d-inline-block rounded me-1 align-middle" style="width:14px;height:14px;background:' + esc(cv) +
          ';border:1px solid #ccc;"></span>' + esc(cv);
      }
      if (lc.type === 'feed_details') {
        return 'Feed Brand: ' + esc(UI.named('feed_brands', r.feed_brand_id) || '-') + '<br>Feed Pellet Size: ' +
          esc((UI.byId('feed_pellet_sizes', r.feed_pellet_size_id) || {}).size || '-');
      }
      if (lc.type === 'recipe_details') return '—';
      return esc(r[lc.col] === null || r[lc.col] === undefined ? '-' : r[lc.col]);
    }
    var rows = FF.all(cfg.table).sort(function (a, b) { return b.id - a.id; });
    var pg = UI.pager(rows.length, 25);
    var colCount = cols.length + 3 + (cfg.status ? 1 : 0);
    var body = rows.length ? rows.slice(pg.offset, pg.offset + 25).map(function (r) {
      return '<tr><td class="ps-4 text-sm">' + r.id + '</td>' + cols.map(function (lc) { return '<td class="text-sm">' + cell(lc, r) + '</td>'; }).join('') +
        '<td class="text-sm">' + r.created_at.slice(0, 10) + '</td>' +
        (cfg.status ? '<td class="text-sm"><span class="badge bg-gradient-' + (r.status_id == 1 ? 'success' : 'secondary') + '">' +
          (r.status_id == 1 ? 'Active' : 'Inactive') + '</span></td>' : '') +
        '<td class="text-sm"><a href="settings-form.html?entity=' + entity + '&id=' + r.id + '" class="text-primary me-2">Edit</a>' +
        '<form class="d-inline" data-post="delete" data-id="' + r.id + '" data-confirm="Delete this ' + cfg.label.toLowerCase() + ' record?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
    }).join('') : '<tr><td colspan="' + colCount + '" class="text-center text-sm py-4 text-secondary">No ' + cfg.label.toLowerCase() + ' yet.</td></tr>';
    Shell.render({
      crumbs: [['Settings', listUrl], [cfg.label, null], ['List']], title: cfg.label,
      body: UI.flashFrom({ added: cfg.label + ' added.', updated: cfg.label + ' updated.', deleted: cfg.label + ' deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="mb-3"><a href="settings-form.html?entity=' + entity +
        '" class="btn btn-primary btn-sm mb-0">Add</a></div></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">ID</th>' + cols.map(function (lc) { return '<th class="' + TH + '">' + lc.header + '</th>'; }).join('') +
        '<th class="' + TH + '">Created At</th>' + (cfg.status ? '<th class="' + TH + '">Status</th>' : '') +
        '<th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + body + '</tbody></table></div>' + pg.html + '</div></div>'
    });
    return;
  }

  // settings-form
  var id = UI.qi('id'), isEdit = id > 0;
  var rec = isEdit ? FF.find(cfg.table, id) : null;
  if (isEdit && !rec) { Shell.go(listUrl); return; }
  var values = {};
  cfg.fields.forEach(function (f) { values[f.col] = rec && rec[f.col] !== null && rec[f.col] !== undefined ? String(rec[f.col]) : ''; });
  Shell.render({
    crumbs: [['Settings', listUrl], [cfg.label, listUrl], [isEdit ? 'Edit' : 'Add']],
    title: (isEdit ? 'Edit ' : 'Add ') + cfg.label, body: '<div id="formHost"></div>'
  });
  Form.mount(document.getElementById('formHost'), values, function (v, e) {
    return '<div class="card"><div class="card-body"><h6 class="text-sm text-secondary mb-3">General Information</h6><form method="post">' +
      '<div class="row mb-3">' + cfg.fields.map(function (f) {
        var star = f.required ? '<span class="text-danger">*</span>' : '';
        var ctl;
        if (f.type === 'fk') {
          ctl = '<select name="' + f.col + '" class="form-control' + (e[f.col] ? ' is-invalid' : '') + '"><option value="">-- Select --</option>' +
            FF.all(f.fk).sort(function (a, b) { return String(a[f.disp]).localeCompare(String(b[f.disp])); }).map(function (o) {
              return '<option value="' + o.id + '"' + (+v[f.col] === o.id ? ' selected' : '') + '>' + esc(o[f.disp]) + '</option>';
            }).join('') + '</select>';
        } else if (f.type === 'color') {
          ctl = '<input type="color" name="' + f.col + '" class="form-control form-control-color' + (e[f.col] ? ' is-invalid' : '') +
            '" value="' + esc(v[f.col] || '#000000') + '" title="Choose colour">';
        } else {
          ctl = '<input type="text" name="' + f.col + '" class="form-control' + (e[f.col] ? ' is-invalid' : '') + '" value="' + esc(v[f.col]) + '">';
        }
        return '<div class="col-md-4 mb-3"><label class="form-label">' + f.label + ' ' + star + '</label>' + ctl +
          '<div class="text-danger text-xs">' + (e[f.col] || '') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="d-flex gap-2"><a href="' + listUrl + '" class="btn btn-outline-secondary mb-0">Cancel</a>' +
      '<button type="submit" class="btn btn-primary mb-0">Confirm</button></div></form></div></div>';
  }, function (v) {
    var e = {};
    cfg.fields.forEach(function (f) {
      if (!f.required) return;
      if (f.type === 'fk' ? !(+v[f.col] > 0) : v[f.col] === '') e[f.col] = f.label + ' is required.';
    });
    return e;
  }, function (v) {
    var r = {};
    cfg.fields.forEach(function (f) { r[f.col] = f.type === 'fk' ? +v[f.col] : (v[f.col] !== '' ? v[f.col] : null); });
    if (isEdit) FF.update(cfg.table, id, r); else FF.insert(cfg.table, r);
    Shell.go(listUrl + '&flash=' + (isEdit ? 'updated' : 'added'));
  });
}());
