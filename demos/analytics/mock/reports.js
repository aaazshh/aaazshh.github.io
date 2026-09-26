// The report-table actions behind the Jet and Supplier report pages:
// consignment-report-table and friends.
var Rep = (function () {
  'use strict';
  var W = World;

  function vendorOptions(withRate) {
    return W.VENDORS.map(function (v) {
      var o = { id: v.no, text: v.no + ' - ' + v.name };
      if (withRate) o.rate = window.Commission && Commission.load()[v.no] ? Commission.load()[v.no].rate : 0;
      return o;
    });
  }

  // 4 digit system category codes, "code - name", as buildCategoryCodeNameMap gives them.
  function systemCategories() {
    return Object.keys(W.CATEGORY_NAMES).sort().map(function (c) { return { id: c, text: c + ' - ' + W.CATEGORY_NAMES[c] }; });
  }

  function vendorItems(vendor) {
    return W.ITEMS.filter(function (it) { return it.vendor_no === vendor; }).map(function (it) { return it.item_no; });
  }

  function codes(v) { return Q.str([].concat(v || '').join(',')).split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

  Api.route('api:consignment-report-table', function (p) {
    if (Q.str(p.sub_action) === 'get-filters') return { vendors: vendorOptions(true), categories: [] };
    var from = Q.str(p.date_from) || W.TODAY.slice(0, 8) + '01', to = Q.str(p.date_to) || W.TODAY;
    var vendor = Q.str(p.vendor || p.vendorSelect);
    var cats = codes(p.item_category || p.itemCategorySelect);
    if (!vendor && !cats.length) return { status: 'awaiting_filters', message: 'Please select a specific Vendor or Category to generate report metrics.' };
    var items = vendor ? vendorItems(vendor) : [];
    var rows = W.lines(from, to).filter(function (r) {
      if (cats.length && !cats.some(function (c) { return r.item_no.indexOf(c) === 0; })) return false;
      if (vendor && !cats.length && items.indexOf(r.item_no) === -1) return false;
      return true;
    });
    var aggs = EsAgg.run(rows, {
      group_by_outlet: { terms: { field: 'store_no', size: 100 }, aggs: { total_taxable_sales: { sum: { field: 'net_amount' } } } },
      by_outlet_nested: { terms: { field: 'store_no', size: 100 }, aggs: {
        by_product_group: { terms: { field: 'product_group_code', size: 100, missing: 'UNASSIGNED' }, aggs: {
          by_item: { terms: { field: 'item_no', size: 500 }, aggs: {
            top_description: { top_hits: { size: 1, _source: { includes: ['name', 'item_description', 'description'] } } },
            total_qty: { sum: { field: 'quantity' } }, total_net_sales: { sum: { field: 'net_amount' } }, total_discount: { sum: { field: 'discount_amount' } } } },
          group_total_qty: { sum: { field: 'quantity' } }, group_total_net_sales: { sum: { field: 'net_amount' } }, group_total_discount: { sum: { field: 'discount_amount' } } } },
        outlet_total_qty: { sum: { field: 'quantity' } }, outlet_total_net_sales: { sum: { field: 'net_amount' } }, outlet_total_discount: { sum: { field: 'discount_amount' } } } },
      global_grand_total_qty: { sum: { field: 'quantity' } }, global_grand_total_net_sales: { sum: { field: 'net_amount' } }, global_grand_total_discount: { sum: { field: 'discount_amount' } }
    });
    var outlets = [], total = 0;
    aggs.group_by_outlet.buckets.forEach(function (b) {
      var s = b.total_taxable_sales.value;
      if (s > 0) { outlets.push({ code: b.key, sales: W.round(s) }); total += s; }
    });
    outlets.sort(function (a, b) { return a.code < b.code ? -1 : 1; });
    return { status: 'success', summary: { taxable_sales: W.round(total), outlets: outlets },
      filters: { vendors: vendorOptions(false), categories: systemCategories(), items: items }, part2_aggregations: aggs };
  });

  return { vendorOptions: vendorOptions, systemCategories: systemCategories, vendorItems: vendorItems, codes: codes };
})();

// abc-report-data (ABC Analysis Report).
(function () {
  'use strict';
  var W = World;

  Api.route('api:abc-report-data', function (p) {
    if (Q.str(p.sub_action) === 'get-filters') {
      var groups = Object.keys(W.GROUP_NAMES).sort().map(function (c) { return { id: c, text: c }; });
      return { categories: groups, vendors: Rep.vendorOptions(false) };
    }
    var group = Q.str(p.item_category).trim(), vendorNo = Q.str(p.vendor_no).trim();
    var from = Q.str(p.date_from) || W.TODAY.slice(0, 8) + '01', to = Q.str(p.date_to) || W.TODAY;
    var rows = W.lines(from, to).filter(function (r) { return !group || r.product_group_code === group; });
    var g = W.groupBy(rows, 'item_no'), out = [];
    g.keys.forEach(function (k) {
      var it = W.ITEM_BY_NO[k], b = g.map[k];
      // The real handler compares the vendor name against the vendor number here.
      if (vendorNo !== '' && it.vendor_name.toLowerCase() !== vendorNo.toLowerCase()) return;
      out.push({ barcode: it.barcode, item_no: k, description: it.name, item_category_code: it.item_category_code,
        item_category: it.item_category_code, product_group: it.product_group_code, product_group_code: it.product_group_code,
        vendor_name: it.vendor_name, quantity: W.round(W.sum(b, 'quantity'), 3), sales: W.round(W.sum(b, 'net_amount')), abc_class: '' });
    });
    out.sort(function (a, b) { return b.sales - a.sales; });
    return { status: 'success', data: out, total_count: out.length };
  });
})();

// get-product-master (Product Master Listing), 50 per page.
(function () {
  'use strict';
  var W = World;

  Api.route('api:get-product-master', function (p) {
    if (Q.str(p.sub_action) === 'get-filters') return { categories: Rep.systemCategories(), vendors: Rep.vendorOptions(false) };
    var vendor = Q.str(p.vendor), cat = Q.str(p.item_category), search = Q.str(p.search).toLowerCase();
    var page = Math.max(1, parseInt(Q.str(p.page), 10) || 1), size = 50;
    var bad = function (v) { return !v || v === 'undefined' || v === 'null'; };
    var list = W.ITEMS.filter(function (it) {
      if (!bad(vendor) && it.vendor_no !== vendor) return false;
      if (!bad(cat) && it.product_group_code.slice(0, 4) !== cat) return false;
      if (!bad(search) && it.item_no.toLowerCase().indexOf(search) !== 0 && it.name.toLowerCase().indexOf(search) !== 0) return false;
      return true;
    });
    var total = list.length;
    var products = list.slice((page - 1) * size, page * size).map(function (it) {
      var price = it.price;
      return { vendor_code: bad(vendor) ? it.vendor_no : vendor, vendor_name: it.vendor_name, barcode: it.barcode, item_no: it.item_no,
        description: it.name, unit_price_vat: price, price_uom: it.uom, cost_uom: it.uom, direct_cost: it.cost, last_cost: it.cost,
        margin: price > 0 ? W.round((price - it.cost) / price * 100) : null };
    });
    return { status: 'success', products: products, total: total, page: page, pages: total > 0 ? Math.ceil(total / size) : 0 };
  });
})();

// retail-item-sales-table (Retail Item Sales).
(function () {
  'use strict';
  var W = World;

  function outletOptions() { return W.STORES.map(function (s) { return { id: s.code, text: s.code + ' - ' + s.name }; }); }

  Api.route('api:retail-item-sales-table', function (p) {
    if (Q.str(p.sub_action) === 'get-filters') return { categories: Rep.systemCategories(), outlets: outletOptions() };
    var from = Q.str(p.date_from) || W.TODAY.slice(0, 8) + '01', to = Q.str(p.date_to) || W.TODAY;
    var cat = Q.str(p.item_category);
    var stores = Q.str([].concat(p.store_no || '').join(',')).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var rows = W.lines(from, to, stores.length ? stores : null).filter(function (r) { return !cat || r.item_category_code === cat; });
    var tree = {}, order = [];
    rows.forEach(function (r) {
      var s = tree[r.store_no];
      if (!s) { s = tree[r.store_no] = { key: r.store_no, outlet_total_qty: { value: 0 }, outlet_total_net_sales: { value: 0 }, outlet_total_discount: { value: 0 }, groups: {}, order: [] }; order.push(r.store_no); }
      s.outlet_total_qty.value += r.quantity; s.outlet_total_net_sales.value += r.net_amount; s.outlet_total_discount.value += r.discount_amount;
      var g = s.groups[r.product_group_code];
      if (!g) { g = s.groups[r.product_group_code] = { key: r.product_group_code, group_total_qty: { value: 0 }, group_total_net_sales: { value: 0 }, group_total_discount: { value: 0 }, items: {}, order: [] }; s.order.push(r.product_group_code); }
      g.group_total_qty.value += r.quantity; g.group_total_net_sales.value += r.net_amount; g.group_total_discount.value += r.discount_amount;
      var it = g.items[r.item_no];
      if (!it) { it = g.items[r.item_no] = { key: r.item_no, total_qty: { value: 0 }, total_net_sales: { value: 0 }, total_discount: { value: 0 }, top_description: { buckets: [{ key: r.name }] } }; g.order.push(r.item_no); }
      it.total_qty.value += r.quantity; it.total_net_sales.value += r.net_amount; it.total_discount.value += r.discount_amount;
    });
    var fix = function (o) { ['value'].forEach(function () {}); return o; };
    var outlets = order.map(function (sk) {
      var s = tree[sk];
      return fix({ key: s.key, outlet_total_qty: s.outlet_total_qty, outlet_total_net_sales: s.outlet_total_net_sales, outlet_total_discount: s.outlet_total_discount,
        by_product_group: { buckets: s.order.map(function (gk) {
          var g = s.groups[gk];
          return { key: g.key, group_total_qty: g.group_total_qty, group_total_net_sales: g.group_total_net_sales, group_total_discount: g.group_total_discount,
            by_item: { buckets: g.order.map(function (ik) { return g.items[ik]; }) } };
        }) } });
    });
    return { part2_aggregations: {
      global_grand_total_qty: { value: W.sum(rows, 'quantity') }, global_grand_total_net_sales: { value: W.sum(rows, 'net_amount') },
      global_grand_total_discount: { value: W.sum(rows, 'discount_amount') }, by_outlet_nested: { buckets: outlets } } };
  });

  Rep.outletOptions = outletOptions;
})();

// sales-item-cat-report-data (Sales Report By Item Category).
(function () {
  'use strict';
  var W = World;

  Api.route('api:sales-item-cat-report-data', function (p) {
    var sub = Q.str(p.sub_action);
    if (sub === 'get-filters') return { stores: W.STORES.map(function (s) { return { id: s.code, text: s.code }; }) };
    if (sub === 'search-items') {
      var q = Q.str(p.q).trim(), up = q.toUpperCase(), low = q.toLowerCase();
      if (!q) return { results: [] };
      return { results: W.ITEMS.filter(function (it) {
        return it.item_no.indexOf(up) !== -1 || it.name.toLowerCase().indexOf(low) === 0 || it.barcode.indexOf(q) !== -1;
      }).slice(0, 100).map(function (it) { return { id: it.item_no, text: it.item_no + ' - ' + it.name }; }) };
    }
    var from = Q.str(p.date_from).trim(), to = Q.str(p.date_to).trim();
    if (!from || !to) { from = '2025-01-01'; to = W.TODAY; }
    var store = Q.str(p.store_no).trim();
    var items = [].concat(p.item_no || []).join(',').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var rows = W.lines(from, to, store || null).filter(function (r) { return !items.length || items.indexOf(r.item_no) !== -1; });
    var locations = {}, itemsMap = {}, order = [];
    rows.forEach(function (r) {
      locations[r.store_no] = { code: r.store_no, name: r.store_no };
      var it = itemsMap[r.item_no];
      if (!it) { it = itemsMap[r.item_no] = { item_no: r.item_no, description: r.name, locations: {} }; order.push(r.item_no); }
      var l = it.locations[r.store_no] || (it.locations[r.store_no] = { qty: 0, net: 0 });
      l.qty = W.round(l.qty + r.quantity, 3); l.net = W.round(l.net + r.net_amount);
    });
    order.sort();
    return { locations: Object.keys(locations).sort().map(function (k) { return locations[k]; }), items: order.map(function (k) { return itemsMap[k]; }) };
  });
})();

// gp-matrix-by-category (GP By Item Category), a year of months per category.
(function () {
  'use strict';
  var W = World;

  Api.route('api:gp-matrix-by-category', function (p) {
    if (Q.str(p.sub_action) === 'get-filters') {
      return { stores: W.STORES.map(function (s) { return { id: s.code, text: s.code }; }),
        categories: Object.keys(W.CATEGORY_NAMES).sort().map(function (c) { return { id: c, text: W.CATEGORY_NAMES[c] }; }) };
    }
    var year = parseInt(Q.str(p.year), 10) || new Date().getFullYear();
    var store = Q.str(p.store_no).trim(), cat = Q.str(p.item_category).trim();
    var stores = W.storeList(store || null);
    var cats = {}, order = [];
    W.days(year + '-01-01', year + '-12-31').forEach(function (d) {
      var m = parseInt(d.slice(5, 7), 10);
      stores.forEach(function (s) {
        var sum = W.daySummary(s, d);
        Object.keys(sum).forEach(function (itemNo) {
          var code = W.ITEM_BY_NO[itemNo].item_category_code;
          if (cat && code !== cat) return;
          var c = cats[code];
          if (!c) { c = cats[code] = {}; order.push(code); }
          var t = c[m] || (c[m] = { sales: 0, cost: 0 });
          t.sales += sum[itemNo].net; t.cost += sum[itemNo].cost;
        });
      });
    });
    return { year: year, categories: order.map(function (code) {
      var months = {};
      Object.keys(cats[code]).forEach(function (m) {
        var t = cats[code][m], profit = t.sales - t.cost;
        months[m] = { sales: W.round(t.sales), cost: W.round(t.cost), profit: W.round(profit), profit_pct: t.sales > 0 ? W.round(profit / t.sales * 100) : 0 };
      });
      return { category_code: code, category_name: W.CATEGORY_NAMES[code] || code, months: months };
    }) };
  });
})();

// sales-claim-vendor (Sales Claim From Vendor): quantity per outlet, times the claim rate.
(function () {
  'use strict';
  var W = World;

  Api.route('api:sales-claim-vendor', function (p) {
    var from = Q.str(p.date_from).trim(), to = Q.str(p.date_to).trim();
    if (Q.str(p.sub_action) === 'get-filters') {
      var q = Q.str(p.q || p.search || p.term).trim().toLowerCase();
      var items = W.ITEMS.filter(function (it) { return !q || it.item_no.toLowerCase().indexOf(q) !== -1 || it.name.toLowerCase().indexOf(q) === 0; })
        .slice(0, q ? 100 : 200).map(function (it) { return { id: it.item_no, text: it.item_no + ' - ' + it.name }; });
      var batches = {};
      W.lines(W.ymd(W.addDays(new Date(), -120)), W.TODAY, 'S001').forEach(function (r) { batches[r.batch_no] = 1; });
      return { stores: W.STORES.map(function (s) { return { id: s.code, text: s.code }; }), vendors: Rep.vendorOptions(false),
        batches: Object.keys(batches).sort().map(function (b) { return { id: b, text: b }; }), items: items };
    }
    var itemNo = Q.str(p.item_no || p.item || p.itemSelect).trim(), vendor = Q.str(p.vendor).trim();
    var store = Q.str(p.store_no).trim(), batch = Q.str(p.batch_no).trim(), search = Q.str(p.search).trim();
    var claim = Q.str(p.claim) !== '' ? parseFloat(Q.str(p.claim)) : null;
    var vendorItems = vendor ? Rep.vendorItems(vendor) : null;
    var rows = W.lines(from || '2026-01-01', to || W.TODAY, store || null).filter(function (r) {
      if (itemNo && r.item_no !== itemNo) return false;
      if (vendorItems && vendorItems.indexOf(r.item_no) === -1) return false;
      if (batch && r.batch_no.slice(0, 8) !== batch.slice(0, 8)) return false;
      if (search && r.item_no !== search && r.barcode_no !== search && r.name.indexOf(search.toUpperCase()) === -1) return false;
      return true;
    });
    var g = W.groupBy(rows, 'store_no');
    var data = g.keys.sort().map(function (s) {
      var qty = Math.abs(W.sum(g.map[s], 'quantity'));
      var amount = claim !== null && claim > 0 ? qty * claim : 0, gst = amount * 0.09;
      return { store_no: s, quantity: W.round(qty, 3), base_uom: g.map[s][0].uom || 'PCS', claim_amount: W.round(amount), gst: W.round(gst), total: W.round(amount + gst) };
    });
    return { status: 'success', data: data, total: data.length };
  });
})();
