/* fish-species-list.php, add-fish-species.php, edit-fish-species.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';

  if (page === 'fish-species-list') {
    Shell.on('delete', function (f) {
      FF.remove('fish_species', f.dataset.id);
      Shell.go('fish-species-list.html?flash=deleted');
    });

    var fName = UI.q('name');
    var rows = FF.all('fish_species').filter(function (r) {
      return !fName || r.name.toLowerCase().indexOf(fName.toLowerCase()) !== -1 || r.chinese_name.indexOf(fName) !== -1;
    }).sort(function (a, b) { return b.id - a.id; });

    // fishSpeciesAggregates() in the real page: every figure is still a zero
    // placeholder until its module is wired in, so the list prints exactly that.
    var body = rows.length ? rows.map(function (r) {
      return '<tr><td class="ps-4 text-sm">' + r.id + '</td>' +
        '<td class="text-sm">' + UI.speciesCell(r) + '</td>' +
        '<td class="text-sm text-end">0</td><td class="text-sm text-end">0kg</td>' +
        '<td class="text-sm text-end">0 pieces</td><td class="text-sm text-end">0 pieces</td>' +
        '<td class="text-sm text-end">0 pieces</td><td class="text-sm text-end">0kg</td>' +
        '<td class="text-sm text-end">N.A.%</td>' +
        '<td class="text-sm text-end">' + (r.market_price !== null ? UI.dec(r.market_price, 2) : '-') + '</td>' +
        '<td>' + (r.status_id == 1 ? '<span class="badge badge-sm bg-gradient-success">Active</span>'
          : '<span class="badge badge-sm bg-gradient-secondary">Inactive</span>') + '</td>' +
        '<td class="text-sm"><a href="edit-fish-species.html?id=' + r.id + '" class="text-info me-2">View</a>' +
        '<a href="edit-fish-species.html?id=' + r.id + '" class="text-primary me-2">Edit</a>' +
        '<form class="d-inline" data-post="delete" data-id="' + r.id + '" data-confirm="Delete this species?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
    }).join('') : '<tr><td colspan="12" class="text-center text-sm py-4 text-secondary">No fish species match. Adjust the filter or click <strong>Add</strong>.</td></tr>';

    Shell.render({
      crumbs: [['Fish Species Manager', 'index.html'], ['List']], title: 'Fish Species',
      body: UI.flashFrom({ added: 'Fish species added.', updated: 'Fish species updated.', deleted: 'Fish species deleted.' }) +
        '<div class="card"><div class="card-header pb-0">' +
        '<div class="d-flex justify-content-between align-items-center mb-3"><a href="add-fish-species.html" class="btn btn-primary btn-sm mb-0">Add</a></div>' +
        '<form method="get" action="fish-species-list.html" class="row g-2 align-items-center mb-3">' +
        '<div class="col-md-3"><input type="text" name="name" class="form-control form-control-sm" placeholder="Name" value="' + esc(fName) + '"></div>' +
        '<div class="col d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="fish-species-list.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">ID</th><th class="' + TH + '">Name</th>' +
        '<th class="' + TH + ' text-end">Total Number of FishTypes</th><th class="' + TH + ' text-end">Total Feed Quantity</th>' +
        '<th class="' + TH + ' text-end">Total Stocking Quantity</th><th class="' + TH + ' text-end">Total Dead</th>' +
        '<th class="' + TH + ' text-end">Total Harvest Quantity</th><th class="' + TH + ' text-end">Total Harvest Weight</th>' +
        '<th class="' + TH + ' text-end">Average Survival Rate</th><th class="' + TH + ' text-end">Market Price</th>' +
        '<th class="' + TH + '">Status</th><th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + body +
        '</tbody></table></div></div></div>'
    });
    return;
  }

  // Add and Edit share the form; Edit adds Status and saves with "Save".
  var isEdit = page === 'edit-fish-species';
  var rec = isEdit ? FF.find('fish_species', UI.qi('id')) : null;
  if (isEdit && !rec) { Shell.go('fish-species-list.html'); return; }
  var values = rec ? {
    name: rec.name, chinese_name: rec.chinese_name, market_price: rec.market_price === null ? '' : UI.dec(rec.market_price, 2),
    dead_fish_coefficient: UI.dec(rec.dead_fish_coefficient, 4),
    promo_harvest_weight: rec.promo_harvest_weight === null ? '' : UI.dec(rec.promo_harvest_weight, 2),
    normal_harvest_weight: rec.normal_harvest_weight === null ? '' : UI.dec(rec.normal_harvest_weight, 2),
    status_id: String(rec.status_id)
  } : { name: '', chinese_name: '', market_price: '', dead_fish_coefficient: '', promo_harvest_weight: '', normal_harvest_weight: '' };

  Shell.render({
    crumbs: [['Fish Species', 'fish-species-list.html'], [isEdit ? 'Edit' : 'Add']],
    title: isEdit ? 'Edit Fish Species' : 'Add Fish Species',
    body: '<div id="formHost"></div>'
  });

  Form.mount(document.getElementById('formHost'), values, function (v, e) {
    return '<div class="card"><div class="card-body"><form method="post">' +
      Form.row([
        { name: 'name', label: 'Name', req: true },
        { name: 'chinese_name', label: 'Chinese Name', req: true },
        { name: 'market_price', label: 'Market Price' }], v, e) +
      Form.row([
        { name: 'dead_fish_coefficient', label: 'Dead Fish Coefficient', req: true },
        { name: 'promo_harvest_weight', label: 'Promo Harvest Weight' },
        { name: 'normal_harvest_weight', label: 'Normal Harvest Weight' }], v, e) +
      (isEdit ? Form.row([{ kind: 'select', name: 'status_id', label: 'Status', options: [['1', 'Active'], ['0', 'Inactive']], err: false }], v, e) : '') +
      Form.buttons('fish-species-list.html', isEdit ? 'Save' : 'Confirm') + '</form></div></div>';
  }, function (v) {
    var e = {};
    if (!v.name) e.name = 'Name is required.';
    if (!v.chinese_name) e.chinese_name = 'Chinese name is required.';
    if (!Form.isNum(v.dead_fish_coefficient)) e.dead_fish_coefficient = 'Dead Fish Coefficient must be a number.';
    ['market_price', 'promo_harvest_weight', 'normal_harvest_weight'].forEach(function (k) {
      if (v[k] !== '' && !Form.isNum(v[k])) e[k] = 'Must be a number.';
    });
    return e;
  }, function (v) {
    var r = { name: v.name, chinese_name: v.chinese_name, market_price: Form.num(v.market_price),
      dead_fish_coefficient: +v.dead_fish_coefficient, promo_harvest_weight: Form.num(v.promo_harvest_weight),
      normal_harvest_weight: Form.num(v.normal_harvest_weight) };
    if (isEdit) { r.status_id = +v.status_id; FF.update('fish_species', rec.id, r); }
    else FF.insert('fish_species', r);
    Shell.go('fish-species-list.html?flash=' + (isEdit ? 'updated' : 'added'));
  });
}());
