// Product mapping (product-mapping.php): the mapping list, the product search
// for the select2 boxes, the duplicate check, replace or add, delete, and the
// form post itself. Mappings are kept in sessionStorage for the visit.
var Mapping = (function () {
  'use strict';
  var W = World;
  var KEY = 'an-demo-mappings';
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY));
    if (saved && saved.length) { Cat.MAPPINGS.length = 0; saved.forEach(function (m) { Cat.MAPPINGS.push(m); }); }
  } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(Cat.MAPPINGS)); } catch (e) {} }
  function now() { var d = new Date(); return W.ymd(d) + ' ' + W.pad(d.getHours()) + ':' + W.pad(d.getMinutes()) + ':' + W.pad(d.getSeconds()); }
  function esc(s) { return PM.esc(s); }
  function ids(v) { return [].concat(v || []).map(String).filter(Boolean); }

  function add(source, target) {
    var active = Cat.MAPPINGS.filter(function (m) { return m.source_product_id === source && m.target_product_id === target; });
    if (active.some(function (m) { return m.status_id === 1; })) return 'skip';
    if (active.length) { active[0].status_id = 1; active[0].created_at = now(); active[0].by = 'Maram Aashna'; return 'reactivated'; }
    Cat.MAPPINGS.push({ id: Cat.MAPPINGS.reduce(function (a, m) { return Math.max(a, m.id); }, 0) + 1, source_product_id: source, target_product_id: target,
      status_id: 1, created_at: now(), by: 'Maram Aashna' });
    return 'inserted';
  }

  Api.route('load-mappings.php', function (p) {
    var page = parseInt(Q.str(p.page), 10) || 1, per = 10;
    var sm = Q.str(p.source_market), tm = Q.str(p.target_market), q = Q.str(p.product_search).toLowerCase();
    var rows = Cat.MAPPINGS.filter(function (m) {
      if (m.status_id !== 1) return false;
      var s = Cat.BY_ID[m.source_product_id], t = Cat.BY_ID[m.target_product_id];
      if (!s || !t) return false;
      if (sm && s.supermarket_name !== sm) return false;
      if (tm && t.supermarket_name !== tm) return false;
      if (q && s.name.toLowerCase().indexOf(q) === -1 && t.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id; });
    var total = rows.length, pages = Math.ceil(total / per);
    var html = rows.slice((page - 1) * per, page * per).map(function (m) {
      var s = Cat.BY_ID[m.source_product_id], t = Cat.BY_ID[m.target_product_id];
      var at = m.created_at.length > 10 ? m.created_at.slice(0, 16) : m.created_at + ' 09:00';
      return '<tr><td><span class="badge badge-sm bg-gradient-success">' + esc(s.supermarket_name) + '</span></td>' +
        '<td class="text-xs">' + esc(s.name) + ' <span class="text-muted">(' + esc(s.uom) + ')</span></td>' +
        '<td><span class="badge badge-sm bg-gradient-info">' + esc(t.supermarket_name) + '</span></td>' +
        '<td class="text-xs">' + esc(t.name) + ' <span class="text-muted">(' + esc(t.uom) + ')</span></td>' +
        '<td class="text-xs text-muted">' + at + '<br><small>by ' + esc(m.by || 'System') + '</small></td>' +
        '<td class="text-center"><a href="delete-mapping.php?id=' + m.id + '" class="btn btn-sm btn-danger delete-mapping-btn" title="Delete"><i class="fas fa-trash"></i></a></td></tr>';
    }).join('') || '<tr><td colspan="6" class="text-center text-muted">No mappings found</td></tr>';
    var nav = '';
    if (pages > 1) {
      var li = function (cls, pg, label) { return '<li class="page-item ' + cls + '"><a class="page-link" href="#" data-page="' + pg + '">' + label + '</a></li>'; };
      nav = '<nav aria-label="Mappings pagination" class="mt-3"><ul class="pagination justify-content-center">' + li(page <= 1 ? 'disabled' : '', page - 1, 'Previous');
      var start = Math.max(1, page - 2), end = Math.min(pages, page + 2);
      if (start > 1) { nav += li('', 1, 1); if (start > 2) nav += '<li class="page-item disabled"><span class="page-link">...</span></li>'; }
      for (var i = start; i <= end; i++) nav += li(i === page ? 'active' : '', i, i);
      if (end < pages) { if (end < pages - 1) nav += '<li class="page-item disabled"><span class="page-link">...</span></li>'; nav += li('', pages, pages); }
      nav += li(page >= pages ? 'disabled' : '', page + 1, 'Next') + '</ul></nav>';
    }
    return { success: true, rows_html: html, pagination_html: nav,
      showing_text: total ? 'Showing ' + ((page - 1) * per + 1) + ' to ' + Math.min(page * per, total) + ' of ' + total + ' mappings' : 'No mappings found',
      total_records: total, current_page: page, total_pages: pages };
  });

  Api.route('delete-mapping.php', function (p) {
    var m = Cat.MAPPINGS.filter(function (x) { return String(x.id) === Q.str(p.id) && x.status_id === 1; })[0];
    if (m) { m.status_id = 0; save(); }
    return '';
  });

  Api.route('product-search-api.php', function (p) {
    var action = Q.str(p.action), sm = Q.str(p.supermarket);
    if (action === 'get-uoms') {
      if (!sm) return { uoms: [] };
      var u = {};
      Cat.PRODUCTS.forEach(function (x) { if (x.supermarket_name === sm && x.uom) u[x.uom] = 1; });
      return { uoms: Object.keys(u).sort() };
    }
    if (action === 'search-products') {
      if (!sm) return { results: [], total_count: 0 };
      var q = Q.str(p.search).toLowerCase(), uom = Q.str(p.uom), page = parseInt(Q.str(p.page), 10) || 1;
      var list = Cat.PRODUCTS.filter(function (x) {
        return x.supermarket_name === sm && (!q || x.name.toLowerCase().indexOf(q) !== -1 || x.barcode.indexOf(q) !== -1) && (!uom || x.uom === uom);
      });
      return { results: list.slice((page - 1) * 10, page * 10).map(function (x) {
        return { id: x.id, text: x.name + ' - ' + x.uom, name: x.name, uom: x.uom, barcode: x.barcode, sku: x.sku, price: Cat.price(x, W.TODAY).toFixed(2), supermarket_name: x.supermarket_name };
      }), total_count: list.length, source: 'elasticsearch', debug: [] };
    }
    return { results: [] };
  });

  Api.route('check-existing-mapping.php', function (p) {
    var source = Q.str(p.source_product_id), tm = Q.str(p.target_market), wanted = ids(p.target_product_ids);
    var existing = Cat.MAPPINGS.filter(function (m) {
      return m.status_id === 1 && m.source_product_id === source && (Cat.BY_ID[m.target_product_id] || {}).supermarket_name === tm;
    }).map(function (m) {
      var t = Cat.BY_ID[m.target_product_id], s = Cat.BY_ID[source];
      return { id: m.id, target_product_id: m.target_product_id, created_at: m.created_at, target_product_name: t.name, target_product_uom: t.uom,
        target_market: t.supermarket_name, source_product_name: s.name, source_product_uom: s.uom, source_market: s.supermarket_name };
    });
    if (!existing.length) return { success: true, has_existing: false, existing_mappings: [], new_products: wanted, duplicates: [] };
    var have = existing.map(function (e) { return e.target_product_id; });
    return { success: true, has_existing: true, existing_mappings: existing,
      new_products: wanted.filter(function (x) { return have.indexOf(x) === -1; }), duplicates: wanted.filter(function (x) { return have.indexOf(x) !== -1; }) };
  });

  Api.route('update-mapping.php', function (p) {
    var action = Q.str(p.action), source = Q.str(p.source_product_id);
    if (!source) return { success: false, message: 'Invalid parameters' };
    if (action !== 'replace' && action !== 'add') return { success: false, message: 'Invalid action' };
    if (action === 'replace') {
      ids(p.old_target_product_ids).forEach(function (t) {
        Cat.MAPPINGS.forEach(function (m) { if (m.source_product_id === source && m.target_product_id === t && m.status_id === 1) m.status_id = 0; });
      });
    }
    var ins = 0, re = 0;
    ids(p.new_target_product_ids).forEach(function (t) { var r = add(source, t); if (r === 'inserted') ins++; if (r === 'reactivated') re++; });
    save();
    var msg = action === 'replace' ? 'Successfully replaced mapping(s). ' : 'Successfully added mapping(s). ';
    if (ins) msg += ins + ' new mapping(s) created. ';
    if (re) msg += re + ' mapping(s) reactivated.';
    return { success: true, message: msg, error: '' };
  });

  // The form posts back to product-mapping.php with submit_mapping.
  Api.post('product-mapping', function (d) {
    var form = document.getElementById('mappingForm'), fd = new FormData(form), source = String(d.source_product || '');
    var created = 0;
    Object.keys(d).forEach(function (k) {
      var m = /^target_product_(\d+)/.exec(k);
      if (!m) return;
      fd.getAll(k).forEach(function (t) { if (t && add(source, String(t)) !== 'skip') created++; });
    });
    save();
    var msg = created > 0 ? created + ' product mapping(s) ' + (d.update_mode === '1' ? 'updated' : 'created') + ' successfully!' : '';
    return 'product-mapping.html' + (msg ? '?mapping_success=' + encodeURIComponent(msg) : '');
  });

  return { save: save };
})();
