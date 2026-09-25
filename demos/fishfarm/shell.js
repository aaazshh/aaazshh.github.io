/**
 * The page frame every portal page shares, rebuilt from side-menu.php, the top
 * navbar each page prints, and footer.php. Also the helpers the PHP pages lean
 * on: displayFlashMessage(), mb_strimwidth(), number_format(), the pager they
 * all copy, and the POST forms behind Delete and the toggles, which here write
 * to the session copy of the database in db.js and then redirect with ?flash=
 * exactly like the real handlers do.
 */

'use strict';

var UI = (function () {
  var params = new URLSearchParams(location.search);
  var file = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');

  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function q(name) { return (params.get(name) || '').trim(); }
  function qi(name) { return parseInt(params.get(name), 10) || 0; }

  // number_format($n, $dec)
  function nf(n, dec) {
    dec = dec || 0;
    var neg = n < 0, s = Math.abs(+n).toFixed(dec).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg && +s.join('.') !== 0 ? '-' : '') + s.join('.');
  }
  // A MySQL DECIMAL as PHP prints it: fixed places, no grouping.
  function dec(n, places) { return n === null || n === undefined || n === '' ? '' : (+n).toFixed(places); }
  // mb_strimwidth($s, 0, $w, $marker)
  function strim(s, w, marker) {
    s = s || '';
    return s.length <= w ? s : s.slice(0, w - marker.length) + marker;
  }

  // config.php displayFlashMessage()
  function flash(message, type) {
    var bg = '#f8d7da', fg = '#721c24', icon = '<i class="fa-solid fa-triangle-exclamation me-2"></i>';
    if (type === 'success') { bg = '#d4edda'; fg = '#155724'; icon = ''; }
    else if (type === 'info') { bg = '#d1ecf1'; fg = '#0c5460'; icon = '<i class="fas fa-info-circle me-2"></i>'; }
    else if (type === 'notice') { bg = '#fff3cd'; fg = '#856404'; icon = '<i class="fas fa-exclamation-triangle me-2"></i>'; }
    return '<div class="alert alert-dismissible fade show" role="alert" style="background-color: ' + bg +
      '; color: ' + fg + '; border: none; border-radius: 0.375rem; padding: 0.75rem 1.25rem; position: relative;">' +
      icon + message +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" ' +
      'style="position: absolute; right: 1rem; top: 45%; transform: translateY(-50%);">' +
      '<span aria-hidden="true">&times;</span></button></div>';
  }
  function flashFrom(map) {
    var f = q('flash');
    return map[f] ? flash(map[f], 'success') : '';
  }

  // The Prev / 1 2 3 / Next block every list prints under its table.
  function pager(total, perPage) {
    var totalPages = Math.max(1, Math.ceil(total / perPage));
    var page = Math.min(Math.max(1, qi('page') || 1), totalPages);
    function link(p) {
      var u = new URLSearchParams(location.search);
      u.set('page', p);
      return file + '.html?' + u.toString();
    }
    var html = '<div class="d-flex justify-content-between align-items-center px-4 pt-3 flex-wrap gap-2">' +
      '<span class="text-sm text-secondary">Total ' + nf(total) + '</span>';
    if (totalPages > 1) {
      html += '<nav><ul class="pagination pagination-sm mb-0">' +
        '<li class="page-item ' + (page <= 1 ? 'disabled' : '') + '"><a class="page-link" href="' +
        (page <= 1 ? '#' : esc(link(page - 1))) + '">Prev</a></li>';
      for (var p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
        html += '<li class="page-item ' + (p === page ? 'active' : '') + '"><a class="page-link" href="' +
          esc(link(p)) + '">' + p + '</a></li>';
      }
      html += '<li class="page-item ' + (page >= totalPages ? 'disabled' : '') + '"><a class="page-link" href="' +
        (page >= totalPages ? '#' : esc(link(page + 1))) + '">Next</a></li></ul></nav>';
    }
    return { html: html + '</div>', offset: (page - 1) * perPage, page: page, pages: totalPages };
  }

  // <option>s for a select, with the current GET value selected.
  function options(rows, current, label, valueKey) {
    valueKey = valueKey || 'id';
    return rows.map(function (r) {
      var v = r[valueKey];
      return '<option value="' + esc(v) + '"' + (String(current) === String(v) ? ' selected' : '') + '>' +
        esc(label(r)) + '</option>';
    }).join('');
  }

  function byName(a, b) { return String(a.name).localeCompare(String(b.name)); }

  // Row sort helper for ORDER BY x DESC, id DESC.
  function desc(key) {
    return function (a, b) {
      if (a[key] < b[key]) return 1;
      if (a[key] > b[key]) return -1;
      return b.id - a.id;
    };
  }

  // Helpers for the joins most list pages make.
  function prod(id) { return FF.find('fish_production', id) || FF.T.fish_production.filter(function (p) { return p.id === +id; })[0]; }
  // Id lookups, indexed once per table on first use.
  var index = {};
  function byId(table, id) {
    if (!index[table] || index[table].n !== FF.T[table].length) {
      var m = {};
      FF.T[table].forEach(function (r) { m[r.id] = r; });
      index[table] = { n: FF.T[table].length, m: m };
    }
    return index[table].m[+id] || null;
  }
  function cage(id) { return byId('cages', id); }
  function sp(id) { return byId('fish_species', id); }
  function named(table, id) {
    var r = byId(table, id);
    return r ? r.name : null;
  }
  function speciesCell(s) {
    return (s ? esc(s.name) : '-') + '<span class="text-xs text-secondary d-block">' + (s ? esc(s.chinese_name) : '') + '</span>';
  }

  return {
    file: file, params: params, q: q, qi: qi, esc: esc, nf: nf, dec: dec, strim: strim, flash: flash,
    flashFrom: flashFrom, pager: pager, options: options, byName: byName, desc: desc, prod: prod, cage: cage,
    sp: sp, named: named, byId: byId, speciesCell: speciesCell
  };
}());

var Shell = (function () {
  var icon = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    insights: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    production: '<path d="M3 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M3 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M12 4c3 3 5 5.5 5 8a5 5 0 0 1-10 0c0-2.5 2-5 5-8Z"/>',
    species: '<path d="M16 7c3 1 5 3 6 5-1 2-3 4-6 5-4 1-8-1-11-5 3-4 7-6 11-5Z"/><path d="m3 12-2-3v6l2-3Z"/><circle cx="17" cy="11" r="1"/>',
    feed: '<path d="M12 21V9"/><path d="M12 14c-4 0-7-3-7-7 4 0 7 3 7 7Z"/><path d="M12 11c4 0 7-3 7-7-4 0-7 3-7 7Z"/><path d="M6 21h12"/>',
    dead: '<path d="M12 3c4 0 7 3 7 7 0 3-2 5-4 6v3H9v-3c-2-1-4-3-4-6 0-4 3-7 7-7Z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M10 14h4"/><path d="M10 19v2"/><path d="M14 19v2"/>',
    treatment: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M9 6V4h6v2"/><path d="M12 10v6"/><path d="M9 13h6"/>',
    harvest: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13"/><path d="M5 12h14"/><path d="M5 12c0 5 3 8 7 8s7-3 7-8"/><path d="m7 14-2-2-2 2"/><path d="m17 14 2-2 2 2"/>',
    sales: '<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h3l3 12h10l3-8H7"/>',
    net: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 10h16"/><path d="M4 16h16"/><path d="M10 4v16"/><path d="M16 4v16"/>',
    alert: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
    announce: '<path d="M4 5h16v12H7l-3 3V5Z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
    inventory: '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    survey: '<path d="M4 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2"/><path d="M4 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2"/><path d="M8 6h8"/><path d="M12 3v6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    images: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="m21 15-5-5L5 19"/>',
    log: '<path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
    out: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 3v18"/>'
  };

  // settings-common.php settingsEntities(), in the real sidebar order.
  var SETTINGS = [
    ['supplements', 'Supplements'], ['sales-channels', 'Sales Channels'], ['feed-brands', 'Feed Brands'],
    ['feed-pellet-sizes', 'Feed Pellet Size'], ['vaccines', 'Vaccines'], ['fish-farms', 'Fish Farms'],
    ['cages', 'Cage Number'], ['medicines', 'Medicines'], ['feed-types', 'Feed Types'],
    ['supplement-types', 'Supplement Types'], ['clinical-signs', 'Clinical Signs'], ['net-types', 'Net Types'],
    ['suppliers', 'Suppliers']
  ];
  var IMAGE_CATS = ['Treatment', 'Incidents', 'Dead Fish', 'Broken Nets', 'Harvest'];

  // The menu groups config.php defines, used to open the right submenu.
  var groups = {
    home: ['index', 'map-report', 'cage-map-editor', 'comparison-report', 'dead-fish-monthly-report'],
    insights: ['production-performance', 'cost-margin', 'environment-impact'],
    productions: ['fish-production-list', 'add-fish-production', 'edit-fish-production', 'fish-production-detail', 'import-fish-production'],
    species: ['fish-species-list', 'add-fish-species', 'edit-fish-species'],
    feed: ['feed-list'],
    dead: ['dead-fish-list', 'add-dead-fish', 'edit-dead-fish'],
    treatment: ['treatment-list', 'add-treatment', 'edit-treatment'],
    harvest: ['harvest-list', 'add-harvest', 'edit-harvest'],
    sales: ['sales-list', 'add-sales', 'edit-sales'],
    nets: ['broken-net-list', 'add-broken-net', 'edit-broken-net', 'change-net-list', 'add-change-net', 'edit-change-net',
      'wash-net-list', 'add-wash-net', 'edit-wash-net'],
    incidents: ['incident-list', 'add-incident', 'edit-incident'],
    announcements: ['announcement-list', 'add-announcement', 'edit-announcement'],
    survey: ['environment-survey-list', 'add-environment-survey', 'edit-environment-survey', 'import-environment-survey'],
    inventory: ['feed', 'supplement', 'medicine', 'vaccine'].reduce(function (a, t) {
      return a.concat([t + '-inventory-list', t + '-inventory-detail', 'add-' + t + '-inventory', 'edit-' + t + '-inventory']);
    }, []),
    settings: ['settings-list', 'settings-form'],
    images: ['images-list']
  };

  var cur = UI.file;
  function inGroup(g) { return groups[g].indexOf(cur) !== -1; }

  function svg(name) {
    return '<svg class="sidenav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icon[name] + '</svg>';
  }
  function iconBox(name) {
    return '<div class="icon icon-shape icon-md text-center d-flex align-items-center justify-content-center">' + svg(name) + '</div>';
  }
  function single(href, label, name, active, extra) {
    return '<li class="nav-item' + (extra || '') + '"><a class="nav-link ' + (active ? 'active' : '') + '" href="' + href + '">' +
      iconBox(name) + '<span class="nav-link-text">' + label + '</span></a></li>';
  }
  function sub(id, label, name, open, kids) {
    return '<li class="nav-item has-submenu"><a class="nav-link" href="#' + id + '" data-bs-toggle="collapse" ' +
      'data-bs-target="#' + id + '" aria-controls="' + id + '">' + iconBox(name) +
      '<span class="nav-link-text">' + label + '</span><span class="submenu-arrow"></span></a>' +
      '<div id="' + id + '" class="collapse submenu submenu-1 ' + (open ? 'show' : '') + '"><ul class="nav ms-4">' +
      kids.map(function (k) {
        return '<li class="nav-item"><a class="nav-link ' + (k[3] ? 'active' : '') + '" href="' + k[0] + '">' +
          '<span class="sidenav-mini-icon">' + k[1] + '</span><span class="sidenav-normal">' + k[2] + '</span></a></li>';
      }).join('') + '</ul></div></li>';
  }
  function is(page) { return cur === page; }
  function isAny(list) { return list.indexOf(cur) !== -1; }

  function sidebar() {
    var entity = UI.q('entity');
    var cat = UI.q('category') || 'Treatment';
    return '<aside class="sidenav bg-white navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-4" id="sidenav-main">' +
      '<div class="position-sticky top-0 z-index-sticky bg-white"><div class="sidenav-header">' +
      '<i class="fas fa-times p-3 cursor-pointer text-secondary opacity-5 position-absolute end-0 top-0 d-none d-xl-none" aria-hidden="true" id="iconSidenav"></i>' +
      '<a class="navbar-brand m-0" href="index.html">' +
      '<img src="assets/img/fishfarm-logo.svg" class="navbar-brand-img h-100 brand-logo" alt="Fish Farm" width="32" height="32">' +
      '<span class="ms-2 font-weight-bold">Fish Farm</span>' +
      '<button type="button" class="theme-toggle ms-auto p-2" id="themeToggle" title="Toggle dark mode" aria-label="Toggle dark mode">' +
      '<i class="fas fa-moon"></i><i class="fas fa-sun"></i></button></a></div>' +
      '<div class="px-3 pb-2 sidenav-search"><form action="search.html" method="get" role="search">' +
      '<div class="input-group input-group-sm"><span class="input-group-text bg-transparent border-end-0"><i class="fas fa-search text-secondary"></i></span>' +
      '<input type="search" name="q" class="form-control border-start-0" placeholder="Search cage, serial, species…" value="' +
      UI.esc(UI.q('q')) + '" aria-label="Search"></div></form></div>' +
      '<hr class="horizontal dark mt-0"></div>' +
      '<div class="overflow-auto" id="sidenav-scroll" style="max-height: calc(100vh - 170px);">' +
      '<div class="collapse navbar-collapse w-auto h-auto" id="sidenav-collapse-main"><ul class="navbar-nav">' +
      single('index.html', 'Home', 'home', inGroup('home')) +
      sub('manageInsights', 'Insights', 'insights', inGroup('insights'), [
        ['./production-performance.html', 'PP', 'Production Performance', is('production-performance')],
        ['./cost-margin.html', 'CM', 'Cost &amp; Margin', is('cost-margin')],
        ['./environment-impact.html', 'EI', 'Environment Impact', is('environment-impact')]]) +
      sub('manageFishProductions', 'Fish Productions', 'production', inGroup('productions'), [
        ['./fish-production-list.html', 'PL', 'Production List', is('fish-production-list')],
        ['./add-fish-production.html', 'AP', 'Add Production', is('add-fish-production')]]) +
      sub('manageFishSpecies', 'Fish Species', 'species', inGroup('species'), [
        ['./fish-species-list.html', 'FL', 'Species List', is('fish-species-list')],
        ['./add-fish-species.html', 'AF', 'Add Species', is('add-fish-species')]]) +
      single('feed-list.html', 'Feed', 'feed', inGroup('feed')) +
      sub('manageDeadFish', 'Dead Fish', 'dead', inGroup('dead'), [
        ['./dead-fish-list.html', 'DL', 'Dead Fish List', is('dead-fish-list')],
        ['./add-dead-fish.html', 'AD', 'Add Dead Fish', is('add-dead-fish')]]) +
      sub('manageTreatment', 'Treatment', 'treatment', inGroup('treatment'), [
        ['./treatment-list.html', 'TL', 'Treatment List', is('treatment-list')],
        ['./add-treatment.html', 'AT', 'Add Treatment', is('add-treatment')]]) +
      sub('manageHarvest', 'Harvest', 'harvest', inGroup('harvest'), [
        ['./harvest-list.html', 'HL', 'Harvest List', is('harvest-list')],
        ['./add-harvest.html', 'AH', 'Add Harvest', is('add-harvest')]]) +
      sub('manageSales', 'Sales', 'sales', inGroup('sales'), [
        ['./sales-list.html', 'SL', 'Sales List', is('sales-list')],
        ['./add-sales.html', 'AS', 'Add Sales', is('add-sales')]]) +
      sub('manageNetManagement', 'Net Management', 'net', inGroup('nets'), [
        ['./broken-net-list.html', 'BN', 'Broken Net', isAny(['broken-net-list', 'add-broken-net', 'edit-broken-net'])],
        ['./change-net-list.html', 'CN', 'Change Net', isAny(['change-net-list', 'add-change-net', 'edit-change-net'])],
        ['./wash-net-list.html', 'WN', 'Wash Net', isAny(['wash-net-list', 'add-wash-net', 'edit-wash-net'])]]) +
      single('./incident-list.html', 'Incidents', 'alert', inGroup('incidents')) +
      single('./announcement-list.html', 'Announcements', 'announce', inGroup('announcements')) +
      sub('manageInventory', 'Inventory Menu', 'inventory', inGroup('inventory'), [
        ['./feed-inventory-list.html', 'FD', 'Feed', is('feed-inventory-list')],
        ['./supplement-inventory-list.html', 'SP', 'Supplement', is('supplement-inventory-list')],
        ['./medicine-inventory-list.html', 'MD', 'Medicine', is('medicine-inventory-list')],
        ['./vaccine-inventory-list.html', 'VC', 'Vaccine', is('vaccine-inventory-list')]]) +
      single('./environment-survey-list.html', 'Environment Survey', 'survey', inGroup('survey')) +
      sub('manageSettings', 'Settings', 'settings', inGroup('settings'), SETTINGS.map(function (e) {
        return ['./settings-list.html?entity=' + e[0], e[0].replace(/[^a-z]/g, '').slice(0, 2).toUpperCase(), e[1],
          inGroup('settings') && entity === e[0]];
      })) +
      sub('manageImages', 'Images', 'images', inGroup('images'), IMAGE_CATS.map(function (c) {
        return ['./images-list.html?category=' + encodeURIComponent(c), c.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase(), c,
          inGroup('images') && cat === c];
      })) +
      single('./activity-log.html', 'Activity Log', 'log', is('activity-log')) +
      '<li class="nav-item mt-3"><a class="nav-link" href="#" data-unbuilt="Log Out">' + iconBox('out') +
      '<span class="nav-link-text">Log Out</span></a></li>' +
      '</ul></div></div></aside>';
  }

  /**
   * opts: crumbs [[label, href?], ...], title, user (the index-style navbar
   * with the name and Log Out), scroll (data-scroll="true"), body (HTML).
   */
  function render(opts) {
    var crumbs = opts.crumbs.map(function (c, i) {
      var last = i === opts.crumbs.length - 1;
      if (last) return '<li class="breadcrumb-item text-sm text-dark active" aria-current="page">' + c[0] + '</li>';
      return c[1] ? '<li class="breadcrumb-item text-sm"><a class="opacity-5 text-dark" href="' + c[1] + '">' + c[0] + '</a></li>'
        : '<li class="breadcrumb-item text-sm text-dark">' + c[0] + '</li>';
    }).join('');
    var nav = '<nav class="navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl' +
      (opts.user ? '' : ' mt-3') + '" id="navbarBlur"' + (opts.user ? ' data-scroll="true"' : '') + '>' +
      '<div class="container-fluid py-1 px-3"><nav aria-label="breadcrumb">' +
      '<ol class="breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0' + (opts.user ? ' me-sm-6 me-5' : '') + '">' + crumbs + '</ol>' +
      '<h6 class="font-weight-bolder mb-0">' + opts.title + '</h6></nav>' +
      (opts.user ? '<div class="collapse navbar-collapse mt-sm-0 mt-2 ms-auto flex-grow-0" id="navbar">' +
        '<ul class="navbar-nav align-items-center ms-auto justify-content-end">' +
        '<li class="nav-item d-flex align-items-center"><span class="nav-link text-body font-weight-bold px-0">' +
        '<i class="fa fa-user me-sm-1"></i> Maram Aashna</span></li>' +
        '<li class="nav-item d-flex align-items-center"><a href="#" data-unbuilt="Log Out" class="nav-link text-body font-weight-bold px-3">Log Out</a></li>' +
        '</ul></div>' : '') +
      '</div></nav>';
    var footer = '<footer class="footer pt-3"><div class="container-fluid"><div class="row align-items-center justify-content-lg-between">' +
      '<div class="col-lg-12 mb-lg-0 mb-4"><div class="copyright text-center text-muted">' +
      '<small class="copyright">Copyright ©' + new Date().getFullYear() + ' Fish Farm</small></div></div></div></div></footer>';

    var mount = document.createElement('div');
    mount.innerHTML = sidebar() + '<main class="main-content position-relative border-radius-lg">' + nav +
      '<div class="container-fluid py-4" id="page">' + opts.body + footer + '</div></main>' + (opts.after || '');
    while (mount.firstChild) document.body.appendChild(mount.firstChild);
    wire();
  }

  function wire() {
    // Keep the sidebar where it was across page loads, as side-menu.php does.
    var el = document.getElementById('sidenav-scroll');
    try {
      var saved = sessionStorage.getItem('sidenavScrollTop');
      if (saved !== null) el.scrollTop = parseInt(saved, 10) || 0;
    } catch (e) {}
    var t;
    el.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () { try { sessionStorage.setItem('sidenavScrollTop', el.scrollTop); } catch (e) {} }, 100);
    });

    document.getElementById('themeToggle').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') === 'dark';
      if (dark) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('ff-theme', dark ? 'light' : 'dark'); } catch (err) {}
    });
  }

  // POST forms: data-post names a handler, data-confirm is the onsubmit confirm().
  var handlers = {};
  function on(name, fn) { handlers[name] = fn; }
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.dataset.post) {
      e.preventDefault();
      if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) return;
      handlers[form.dataset.post](form);
    } else if (form.dataset.export !== undefined) {
      e.preventDefault();
      var modal = form.closest('.modal');
      if (modal && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modal).hide();
      toast((form.dataset.export || 'Export') + ' is wired to the live system, not to this walkthrough.');
    }
  });

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-unbuilt]');
    if (!link) return;
    e.preventDefault();
    toast(link.dataset.unbuilt + ' is wired to the live system, not to this walkthrough.');
  });

  function toast(text) {
    var el = document.getElementById('demo-note');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-note';
      el.className = 'demo-note';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el.timer);
    el.timer = setTimeout(function () { el.classList.remove('show'); }, 3400);
  }

  function go(url) { location.href = url; }

  return { render: render, on: on, toast: toast, go: go, SETTINGS: SETTINGS, IMAGE_CATS: IMAGE_CATS };
}());

/**
 * Add/Edit forms. Each field prints the same markup the PHP forms do; the form
 * is re-rendered with the submitted values and the error messages when
 * validation fails, the way a POST back to the same page behaves.
 */
var Form = (function () {
  var esc = UI.esc;
  function star(req) { return req ? ' <span class="text-danger">*</span>' : ''; }
  function inv(errors, name) { return errors[name] ? ' is-invalid' : ''; }
  function errLine(errors, name, show) {
    return show === false ? '' : '<div class="text-danger text-xs">' + (errors[name] || '') + '</div>';
  }
  function wrap(col, inner) { return '<div class="' + (col || 'col-md-4') + '">' + inner + '</div>'; }

  function input(o, v, e) {
    return wrap(o.col, '<label class="form-label">' + o.label + star(o.req) + '</label>' +
      '<input type="' + (o.type || 'text') + '"' + (o.step ? ' step="' + o.step + '"' : '') + ' name="' + o.name +
      '" class="form-control' + inv(e, o.name) + '" value="' + esc(v[o.name]) + '"' +
      (o.placeholder ? ' placeholder="' + o.placeholder + '"' : '') + '>' + errLine(e, o.name, o.err));
  }
  function select(o, v, e) {
    return wrap(o.col, '<label class="form-label">' + o.label + star(o.req) + '</label>' +
      '<select name="' + o.name + '" class="form-control' + inv(e, o.name) + '">' +
      (o.blank !== undefined ? '<option value="">' + o.blank + '</option>' : '') +
      o.options.map(function (op) {
        var val = Array.isArray(op) ? op[0] : op, lab = Array.isArray(op) ? op[1] : op;
        return '<option value="' + esc(val) + '"' + (String(v[o.name]) === String(val) ? ' selected' : '') + '>' +
          esc(lab) + '</option>';
      }).join('') + '</select>' + errLine(e, o.name, o.err));
  }
  function textarea(o, v, e) {
    return wrap(o.col, '<label class="form-label">' + o.label + star(o.req) + '</label>' +
      '<textarea name="' + o.name + '" class="form-control' + inv(e, o.name) + '" rows="' + (o.rows || 2) + '"' +
      (o.placeholder ? ' placeholder="' + o.placeholder + '"' : '') + '>' + esc(v[o.name]) + '</textarea>' +
      (o.err ? errLine(e, o.name) : ''));
  }
  function field(o, v, e) {
    if (o.kind === 'select') return select(o, v, e);
    if (o.kind === 'textarea') return textarea(o, v, e);
    return input(o, v, e);
  }
  function row(fields, v, e, cls) {
    return '<div class="' + (cls || 'row mb-3') + '">' + fields.map(function (o) {
      return typeof o === 'string' ? o : field(o, v, e);
    }).join('') + '</div>';
  }
  function buttons(cancelHref, label) {
    return '<div class="d-flex gap-2"><a href="' + cancelHref + '" class="btn btn-outline-secondary mb-0">Cancel</a>' +
      '<button type="submit" class="btn btn-primary mb-0">' + (label || 'Confirm') + '</button></div>';
  }

  /**
   * Mount a form. draw(values, errors) returns the card HTML; check(values)
   * returns an errors object; save(values) persists and redirects.
   */
  function mount(host, values, draw, check, save) {
    function paint(v, e) {
      host.innerHTML = draw(v, e);
      var form = host.querySelector('form');
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var data = {};
        new FormData(form).forEach(function (val, key) {
          if (key.slice(-2) === '[]') (data[key] = data[key] || []).push(String(val).trim());
          else data[key] = String(val).trim();
        });
        form.querySelectorAll('input[type=checkbox]').forEach(function (c) {
          if (!c.checked && !(c.name in data)) data[c.name] = '';
        });
        var errs = check(data);
        if (Object.keys(errs).length) { paint(data, errs); return; }
        save(data);
      });
      if (draw.after) draw.after(host, v);
    }
    paint(values, {});
  }

  // PHP is_numeric / ctype_digit, close enough for form input.
  function isNum(s) { return s !== '' && s !== null && s !== undefined && !isNaN(+s) && /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(s); }
  function isDigits(s) { return /^\d+$/.test(String(s)); }
  function num(s) { return s === '' || s === undefined ? null : +s; }

  return { field: field, row: row, buttons: buttons, mount: mount, isNum: isNum, isDigits: isDigits, num: num };
}());
