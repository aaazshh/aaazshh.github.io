/* inventory-list.php, inventory-detail.php, inventory-form.php behind the
   feed / supplement / medicine / vaccine wrappers */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';
  var key = page.replace(/^(add|edit)-/, '').replace(/-inventory(-list|-detail)?$/, '');
  var CONFIG = {
    feed: { label: 'Feed', productType: 'FeedBrand', table: 'feed_brands', nameHeader: 'Feed Brand', productLabel: 'Brand',
      amount: 'weight', amountLabel: 'Weight', pellet: true, batch: false, extrasRequired: true },
    supplement: { label: 'Supplement', productType: 'Supplement', table: 'supplements', nameHeader: 'Supplement Name',
      productLabel: 'Name', amount: 'dosage', amountLabel: 'Dosage', pellet: false, batch: false, extrasRequired: true },
    medicine: { label: 'Medicine', productType: 'Medicine', table: 'medicines', nameHeader: 'Medicine Name',
      productLabel: 'Name', amount: 'dosage', amountLabel: 'Dosage', pellet: false, batch: false, extrasRequired: true },
    vaccine: { label: 'Vaccine', productType: 'Vaccine', table: 'vaccines', nameHeader: 'Vaccine Name', productLabel: 'Name',
      amount: 'dosage', amountLabel: 'Dosage', pellet: false, batch: true, extrasRequired: false }
  };
  var cfg = CONFIG[key];
  var list = key + '-inventory-list.html', detail = key + '-inventory-detail.html';
  var add = 'add-' + key + '-inventory.html', edit = 'edit-' + key + '-inventory.html';
  // rtrim(rtrim(number_format($v, 3), '0'), '.')
  function fmtNum(v) { return v === null ? '—' : UI.nf(v, 3).replace(/0+$/, '').replace(/\.$/, ''); }
  function fmtMoney(v) { return v === null || v === '' ? '—' : UI.nf(v, 2); }
  function mine() {
    return FF.all('inventory_records').filter(function (r) { return r.inventory_product_type === cfg.productType; });
  }
  function pelletSize(id) { var p = UI.byId('feed_pellet_sizes', id); return p ? p.size : null; }

  if (/-list$/.test(page)) {
    var groups = {}, order = [];
    mine().forEach(function (r) {
      var k = r.inventory_product_id + ':' + (cfg.pellet ? r.feed_pellet_size_id : '');
      if (!groups[k]) {
        groups[k] = { pid: r.inventory_product_id, pellet: cfg.pellet ? r.feed_pellet_size_id : null,
          name: UI.named(cfg.table, r.inventory_product_id), size: cfg.pellet ? pelletSize(r.feed_pellet_size_id) : null, total: 0 };
        order.push(k);
      }
      groups[k].total += r[cfg.amount] || 0;
    });
    var rows = order.map(function (k) { return groups[k]; }).sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name)) || String(a.size).localeCompare(String(b.size));
    });
    var colspan = cfg.pellet ? 5 : 4;
    var body = rows.length ? rows.map(function (g) {
      var link = detail + '?product_id=' + g.pid + (cfg.pellet && g.pellet !== null ? '&pellet_size_id=' + g.pellet : '');
      return '<tr><td class="ps-4 text-sm">' + esc(g.name || '-') + '</td>' +
        (cfg.pellet ? '<td class="text-sm">' + esc(g.size || '-') + '</td>' : '') +
        '<td class="text-sm">' + fmtNum(g.total) + '</td><td class="text-sm">' + fmtNum(g.total) + '</td>' +
        '<td class="text-sm"><a href="' + link + '" class="btn btn-outline-primary btn-sm mb-0">View</a></td></tr>';
    }).join('') : '<tr><td colspan="' + colspan + '" class="text-center text-sm py-4 text-secondary">No ' + cfg.label.toLowerCase() + ' inventory yet.</td></tr>';
    Shell.render({
      crumbs: [['Inventory Menu', list], [cfg.label, null], ['List']], title: cfg.label + ' Inventory',
      body: UI.flashFrom({ added: cfg.label + ' inventory record added.', updated: cfg.label + ' inventory record updated.',
        deleted: cfg.label + ' inventory record deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex gap-2 mb-3"><a href="' + add + '" class="btn btn-primary btn-sm mb-0">Add</a></div></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">' + cfg.nameHeader + '</th>' + (cfg.pellet ? '<th class="' + TH + '">Pellet Size</th>' : '') +
        '<th class="' + TH + '">Total Stock</th><th class="' + TH + '">Remaining Stock</th><th class="text-secondary opacity-7">Actions</th>' +
        '</tr></thead><tbody>' + body + '</tbody></table></div></div></div>'
    });
    return;
  }

  if (/-detail$/.test(page)) {
    var pid = UI.qi('product_id'), pel = cfg.pellet ? UI.qi('pellet_size_id') : 0;
    var name = UI.named(cfg.table, pid);
    if (!pid || !name) { Shell.go(list); return; }
    var self = detail + '?product_id=' + pid + (cfg.pellet && pel > 0 ? '&pellet_size_id=' + pel : '');
    Shell.on('delete', function (f) { FF.remove('inventory_records', f.dataset.id); Shell.go(self + '&flash=deleted'); });
    var items = mine().filter(function (r) {
      if (r.inventory_product_id !== pid) return false;
      if (cfg.pellet) return pel > 0 ? r.feed_pellet_size_id === pel : r.feed_pellet_size_id === null;
      return true;
    }).sort(function (a, b) { return b.id - a.id; });
    var totalStock = items.reduce(function (n, r) { return n + (r[cfg.amount] || 0); }, 0);
    var cols = cfg.batch ? 8 : 7;
    var ibody = items.length ? items.map(function (r) {
      return '<tr><td class="ps-4 text-sm">' + r.id + '</td>' +
        '<td class="text-sm">' + esc(UI.named('suppliers', r.supplier_id) || '-') + '</td>' +
        '<td class="text-sm">' + esc(name) + '</td><td class="text-sm">' + esc(r.invoice_number || '-') + '</td>' +
        '<td class="text-sm text-end">' + fmtNum(r[cfg.amount]) + '</td>' +
        (cfg.batch ? '<td class="text-sm">' + esc(r.batch_number || '-') + '</td>' : '') +
        '<td class="text-sm text-end">' + fmtMoney(r.unit_price) + '</td>' +
        '<td class="text-sm"><a href="' + edit + '?id=' + r.id + '&' + self.split('?')[1] + '" class="text-primary me-2">Edit</a>' +
        '<form class="d-inline" data-post="delete" data-id="' + r.id + '" data-confirm="Delete this inventory record?">' +
        '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form></td></tr>';
    }).join('') : '<tr><td colspan="' + cols + '" class="text-center text-sm py-4 text-secondary">No inventory records.</td></tr>';
    function info(label, value) {
      return '<div class="col-md-3"><span class="text-xs text-secondary text-uppercase font-weight-bolder">' + label + '</span>' +
        '<p class="text-sm mb-0">' + value + '</p></div>';
    }
    Shell.render({
      crumbs: [['Inventory Menu', list], [cfg.label, list], ['Detail']], title: cfg.label + ' Inventory Detail',
      body: (UI.q('flash') === 'deleted' ? UI.flash('Inventory record deleted.', 'success') : '') +
        '<div class="card mb-4"><div class="card-header pb-0"><h6>Basic Information</h6></div><div class="card-body"><div class="row">' +
        info(cfg.nameHeader, esc(name)) +
        (cfg.pellet ? info('Pellet Size', esc(pel > 0 ? pelletSize(pel) || '-' : '-')) : '') +
        info('Total Stock', fmtNum(totalStock)) + info('Remaining Stock', fmtNum(totalStock)) + '</div></div></div>' +
        '<div class="card"><div class="card-header pb-0 d-flex justify-content-between align-items-center"><h6 class="mb-0">Inventory Record</h6>' +
        '<a href="' + add + '" class="btn btn-primary btn-sm mb-0">Add</a></div>' +
        '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">ID</th><th class="' + TH + '">Supplier</th><th class="' + TH + '">Name</th>' +
        '<th class="' + TH + '">Invoice Number</th><th class="' + TH + ' text-end">' + cfg.amountLabel + '</th>' +
        (cfg.batch ? '<th class="' + TH + '">Batch/Lot No.</th>' : '') +
        '<th class="' + TH + ' text-end">Unit Price</th><th class="text-secondary opacity-7">Actions</th></tr></thead><tbody>' + ibody +
        '</tbody></table></div></div></div>'
    });
    return;
  }

  var isEdit = /^edit-/.test(page);
  var rec = isEdit ? FF.find('inventory_records', UI.qi('id')) : null;
  if (isEdit && (!rec || rec.inventory_product_type !== cfg.productType)) { Shell.go(list); return; }
  var m2 = function (v) { return v === null || v === undefined ? '' : UI.dec(v, 2); };
  var values = rec ? {
    supplier_id: String(rec.supplier_id), product_id: String(rec.inventory_product_id),
    pellet_size_id: rec.feed_pellet_size_id ? String(rec.feed_pellet_size_id) : '', invoice_number: rec.invoice_number || '',
    amount: rec[cfg.amount] === null ? '' : UI.dec(rec[cfg.amount], 3), unit_price: m2(rec.unit_price),
    transportation_cost: m2(rec.transportation_cost), custom_fees: m2(rec.custom_fees), batch_number: rec.batch_number || ''
  } : {};
  Shell.render({
    crumbs: [['Inventory Menu', list], [cfg.label, list], [isEdit ? 'Edit' : 'Add']],
    title: (isEdit ? 'Edit ' : 'Add ') + cfg.label + ' Inventory Record', body: '<div id="formHost"></div>'
  });
  Form.mount(document.getElementById('formHost'), values, function (v, e) {
    var second = [];
    if (cfg.pellet) second.push({ kind: 'select', name: 'pellet_size_id', label: 'Pellet Size', req: true, blank: '-- Select --',
      options: FF.all('feed_pellet_sizes').map(function (p) { return [p.id, p.size]; }) });
    second.push({ name: 'amount', label: cfg.amountLabel, req: true, type: 'number', step: '0.001' });
    second.push({ name: 'unit_price', label: 'Unit Price', req: true, type: 'number', step: '0.01' });
    var third = [
      { name: 'transportation_cost', label: 'Transportation Cost', req: cfg.extrasRequired, type: 'number', step: '0.01' },
      { name: 'custom_fees', label: 'Customs Fees', req: cfg.extrasRequired, type: 'number', step: '0.01' }];
    if (cfg.batch) third.push({ name: 'batch_number', label: 'Batch/Lot Number', req: true });
    return '<div class="card"><div class="card-body"><h6 class="text-sm text-secondary mb-3">General Information</h6><form method="post">' +
      Form.row([
        { kind: 'select', name: 'supplier_id', label: 'Supplier', req: true, blank: '-- Select supplier --',
          options: FF.all('suppliers').sort(UI.byName).map(function (s) { return [s.id, s.name]; }) },
        { name: 'invoice_number', label: 'Invoice Number', req: true },
        { kind: 'select', name: 'product_id', label: cfg.productLabel, req: true, blank: '-- Select --',
          options: FF.all(cfg.table).sort(UI.byName).map(function (p) { return [p.id, p.name]; }) }], v, e) +
      Form.row(second, v, e) + Form.row(third, v, e) + Form.buttons(list) + '</form></div></div>';
  }, function (v) {
    var e = {};
    function nn(x) { return Form.isNum(x) && +x >= 0; }
    if (!(+v.supplier_id > 0)) e.supplier_id = 'Supplier is required.';
    if (!(+v.product_id > 0)) e.product_id = cfg.productLabel + ' is required.';
    if (!v.invoice_number) e.invoice_number = 'Invoice number is required.';
    if (cfg.pellet && !(+v.pellet_size_id > 0)) e.pellet_size_id = 'Pellet size is required.';
    if (!nn(v.amount)) e.amount = cfg.amountLabel + ' must be a non-negative number.';
    if (!nn(v.unit_price)) e.unit_price = 'Unit price must be a non-negative number.';
    if (cfg.extrasRequired) {
      if (!nn(v.transportation_cost)) e.transportation_cost = 'Transportation cost must be a non-negative number.';
      if (!nn(v.custom_fees)) e.custom_fees = 'Customs fees must be a non-negative number.';
    } else {
      if (v.transportation_cost !== '' && !nn(v.transportation_cost)) e.transportation_cost = 'Must be a non-negative number.';
      if (v.custom_fees !== '' && !nn(v.custom_fees)) e.custom_fees = 'Must be a non-negative number.';
    }
    if (cfg.batch && !v.batch_number) e.batch_number = 'Batch/Lot number is required.';
    return e;
  }, function (v) {
    var r = { inventory_product_id: +v.product_id, feed_pellet_size_id: cfg.pellet && +v.pellet_size_id > 0 ? +v.pellet_size_id : null,
      supplier_id: +v.supplier_id, invoice_number: v.invoice_number,
      weight: cfg.amount === 'weight' ? +v.amount : null, dosage: cfg.amount === 'dosage' ? +v.amount : null,
      unit_price: +v.unit_price, transportation_cost: Form.num(v.transportation_cost), custom_fees: Form.num(v.custom_fees),
      batch_number: cfg.batch && v.batch_number ? v.batch_number : null };
    if (isEdit) FF.update('inventory_records', rec.id, r);
    else { r.inventory_product_type = cfg.productType; FF.insert('inventory_records', r); }
    Shell.go(list + '?flash=' + (isEdit ? 'updated' : 'added'));
  });
}());
