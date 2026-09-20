/**
 * Builds the Argon sidenav and top navbar around each page, the way
 * side-menu.php does it in the real portal: a fixed white sidebar card with a
 * brand header, a global search, collapsible menu groups whose children carry
 * two-letter mini icons, and a dark mode toggle that writes to localStorage.
 *
 * Every page here is static. The data is made up, there is no PHP and no
 * database behind it.
 */

'use strict';

(function () {
  // The sidenav's own line-art icons, lifted from side-menu.php.
  var icon = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    insights: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    production: '<path d="M3 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M3 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M12 4c3 3 5 5.5 5 8a5 5 0 0 1-10 0c0-2.5 2-5 5-8Z"/>',
    species: '<path d="M16 7c3 1 5 3 6 5-1 2-3 4-6 5-4 1-8-1-11-5 3-4 7-6 11-5Z"/><path d="m3 12-2-3v6l2-3Z"/><circle cx="17" cy="11" r="1"/>',
    feed: '<path d="M12 21V9"/><path d="M12 14c-4 0-7-3-7-7 4 0 7 3 7 7Z"/><path d="M12 11c4 0 7-3 7-7-4 0-7 3-7 7Z"/><path d="M6 21h12"/>',
    dead: '<path d="M12 3c4 0 7 3 7 7 0 3-2 5-4 6v3H9v-3c-2-1-4-3-4-6 0-4 3-7 7-7Z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M10 14h4"/><path d="M10 19v2"/><path d="M14 19v2"/>',
    treatment: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M9 6V4h6v2"/><path d="M12 10v6"/><path d="M9 13h6"/>',
    harvest: '<path d="M3 10h18l-2 10H5L3 10Z"/><path d="M8 10 12 3l4 7"/>',
    sales: '<path d="M12 2v20"/><path d="M17 6.5A4 4 0 0 0 13 4h-2a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6h-2a4 4 0 0 1-4-2.5"/>',
    net: '<path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    alert: '<path d="M10.3 3.9 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v5M12 17.5h.01"/>',
    announce: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    inventory: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    survey: '<path d="M12 3s6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 6-10 6-10Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9Z"/>',
    images: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    log: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    out: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 3v18"/>'
  };

  // Mirrors the real menu. A `kids` entry collapses; its children carry the
  // two-letter mini icon the real sidebar shows when the menu is narrowed.
  var nav = [
    { page: 'index', name: 'Home', icon: 'home' },
    { name: 'Insights', icon: 'insights', kids: [
      { page: 'performance', mini: 'PP', name: 'Production Performance' },
      { mini: 'CM', name: 'Cost &amp; Margin' },
      { mini: 'EI', name: 'Environment Impact' }
    ] },
    { name: 'Fish Productions', icon: 'production', kids: [
      { page: 'production', mini: 'PL', name: 'Production List' },
      { mini: 'AP', name: 'Add Production' }
    ] },
    { name: 'Fish Species', icon: 'species', kids: [
      { page: 'species', mini: 'FL', name: 'Species List' },
      { mini: 'AF', name: 'Add Species' }
    ] },
    { page: 'feed', name: 'Feed', icon: 'feed' },
    { name: 'Dead Fish', icon: 'dead', kids: [
      { page: 'mortality', mini: 'DL', name: 'Dead Fish List' },
      { mini: 'AD', name: 'Add Dead Fish' }
    ] },
    { name: 'Treatment', icon: 'treatment', kids: [
      { page: 'treatment', mini: 'TL', name: 'Treatment List' },
      { mini: 'AT', name: 'Add Treatment' }
    ] },
    { name: 'Harvest', icon: 'harvest', kids: [
      { page: 'harvest', mini: 'HL', name: 'Harvest List' },
      { mini: 'AH', name: 'Add Harvest' }
    ] },
    { name: 'Sales', icon: 'sales', kids: [
      { page: 'sales', mini: 'SL', name: 'Sales List' },
      { mini: 'AS', name: 'Add Sales' }
    ] },
    { name: 'Net Management', icon: 'net', kids: [
      { page: 'nets', mini: 'BN', name: 'Broken Net' },
      { mini: 'CN', name: 'Change Net' },
      { mini: 'WN', name: 'Wash Net' }
    ] },
    { page: 'incidents', name: 'Incidents', icon: 'alert' },
    { page: 'announcements', name: 'Announcements', icon: 'announce' },
    { name: 'Inventory Menu', icon: 'inventory', kids: [
      { page: 'inventory', mini: 'FD', name: 'Feed' },
      { mini: 'SP', name: 'Supplement' },
      { mini: 'MD', name: 'Medicine' },
      { mini: 'VC', name: 'Vaccine' }
    ] },
    { page: 'environment', name: 'Environment Survey', icon: 'survey' },
    { name: 'Settings', icon: 'settings', kids: [
      { mini: 'FM', name: 'Farms' },
      { mini: 'CG', name: 'Cages' },
      { mini: 'UM', name: 'Units of Measure' }
    ] },
    { page: 'images', name: 'Images', icon: 'images' },
    { name: 'Manage Users', icon: 'users', kids: [
      { page: 'users', mini: 'UL', name: 'Users List' },
      { mini: 'AU', name: 'Add User' }
    ] },
    { page: 'activity', name: 'Activity Log', icon: 'log' },
    { page: null, name: 'Log Out', icon: 'out', spaced: true }
  ];

  // Pages that exist in this walkthrough. Anything else says so when clicked.
  var built = ['index', 'cages', 'production', 'feed', 'mortality', 'harvest',
    'environment', 'nets', 'incidents', 'inventory', 'performance'];

  function svg(name) {
    return '<svg class="sidenav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + icon[name] + '</svg>';
  }

  var page = document.body.dataset.page;
  var title = document.body.dataset.title;
  var crumb = document.body.dataset.crumb || title;

  function href(p) {
    return p && built.indexOf(p) !== -1 ? p + '.html' : '#';
  }

  function unbuilt(p, name) {
    return p && built.indexOf(p) !== -1 ? '' : ' data-unbuilt="' + name.replace(/&amp;/g, 'and') + '"';
  }

  var groupId = 0;
  var links = nav.map(function (item) {
    if (!item.kids) {
      return '<li class="nav-item' + (item.spaced ? ' mt-3' : '') + '">' +
        '<a class="nav-link' + (page === item.page ? ' active' : '') + '" href="' + href(item.page) + '"' +
        unbuilt(item.page, item.name) + '>' +
        '<div class="icon icon-shape icon-md text-center d-flex align-items-center justify-content-center">' +
        svg(item.icon) + '</div>' +
        '<span class="nav-link-text">' + item.name + '</span></a></li>';
    }

    groupId++;
    var id = 'ffGroup' + groupId;
    var open = item.kids.some(function (k) { return k.page === page; });

    return '<li class="nav-item">' +
      '<a class="nav-link" data-collapse="' + id + '" href="#' + id + '" aria-expanded="' + open + '">' +
      '<div class="icon icon-shape icon-md text-center d-flex align-items-center justify-content-center">' +
      svg(item.icon) + '</div>' +
      '<span class="nav-link-text">' + item.name + '</span></a>' +
      '<div id="' + id + '" class="collapse submenu submenu-1' + (open ? ' show' : '') + '">' +
      '<ul class="nav nav-sm flex-column">' +
      item.kids.map(function (k) {
        return '<li class="nav-item"><a class="nav-link' + (k.page === page ? ' active' : '') +
          '" href="' + href(k.page) + '"' + unbuilt(k.page, k.name) + '>' +
          '<span class="sidenav-mini-icon">' + k.mini + '</span>' +
          '<span class="sidenav-normal">' + k.name + '</span></a></li>';
      }).join('') +
      '</ul></div></li>';
  }).join('');

  // The page's own markup is moved into the layout rather than rewritten, so
  // the scripts that follow it are left alone.
  var content = document.getElementById('content');
  var inner = content.innerHTML;

  var shell = document.createElement('div');
  shell.innerHTML =
    '<aside class="sidenav bg-white navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-4" id="sidenav-main">' +
      '<div class="position-sticky top-0 z-index-sticky bg-white">' +
        '<div class="sidenav-header">' +
          '<a class="navbar-brand m-0" href="index.html">' +
            '<img src="assets/img/fishfarm-logo.svg" class="navbar-brand-img h-100 brand-logo" alt="" width="32" height="32">' +
            '<span class="ms-2 font-weight-bold">Fish Farm</span>' +
            '<button type="button" class="theme-toggle ms-auto p-2" id="themeToggle" title="Toggle dark mode" aria-label="Toggle dark mode">' +
              '<i class="fas fa-moon"></i><i class="fas fa-sun"></i>' +
            '</button>' +
          '</a>' +
        '</div>' +
        '<div class="px-3 pb-2 sidenav-search">' +
          '<div class="input-group input-group-sm">' +
            '<span class="input-group-text bg-transparent border-end-0"><i class="fas fa-search text-secondary"></i></span>' +
            '<input type="search" class="form-control border-start-0" placeholder="Search cage, serial, species…" ' +
              'aria-label="Search" data-unbuilt="Search">' +
          '</div>' +
        '</div>' +
        '<hr class="horizontal dark mt-0">' +
      '</div>' +
      '<div class="overflow-auto" id="sidenav-scroll" style="max-height: calc(100vh - 170px);">' +
        '<div class="collapse navbar-collapse w-auto h-auto show" id="sidenav-collapse-main">' +
          '<ul class="navbar-nav">' + links + '</ul>' +
        '</div>' +
      '</div>' +
    '</aside>' +
    '<main class="main-content position-relative border-radius-lg">' +
      '<nav class="navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl" id="navbarBlur">' +
        '<div class="container-fluid py-1 px-3">' +
          '<nav aria-label="breadcrumb">' +
            '<ol class="breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0 me-sm-6 me-5">' +
              '<li class="breadcrumb-item text-sm"><a class="opacity-5 text-dark" href="index.html">Dashboard</a></li>' +
              '<li class="breadcrumb-item text-sm text-dark active" aria-current="page">' + crumb + '</li>' +
            '</ol>' +
            '<h6 class="font-weight-bolder mb-0">' + title + '</h6>' +
          '</nav>' +
          '<div class="collapse navbar-collapse mt-sm-0 mt-2 ms-auto flex-grow-0 show">' +
            '<ul class="navbar-nav align-items-center ms-auto justify-content-end">' +
              '<li class="nav-item d-flex align-items-center">' +
                '<span class="nav-link text-body font-weight-bold px-0"><i class="fa fa-user me-sm-1"></i> Maram Aashna</span>' +
              '</li>' +
              '<li class="nav-item d-flex align-items-center">' +
                '<a href="#" class="nav-link text-body font-weight-bold px-3" data-unbuilt="Log out">Log Out</a>' +
              '</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</nav>' +
      '<div class="container-fluid py-4" id="page-body"></div>' +
    '</main>';

  content.remove();
  while (shell.firstChild) document.body.appendChild(shell.firstChild);
  document.getElementById('page-body').innerHTML = inner;

  /* Collapsible groups. Bootstrap's JS is not loaded here, and the collapse is
     the only thing on this page that would have needed it. */
  document.getElementById('sidenav-collapse-main').addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-collapse]');
    if (!toggle) return;
    event.preventDefault();
    var box = document.getElementById(toggle.dataset.collapse);
    var open = box.classList.toggle('show');
    toggle.setAttribute('aria-expanded', open);
  });

  /* Dark mode, persisted the way the real toggle does it. */
  (function () {
    try {
      if (localStorage.getItem('ff-theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {}

    document.getElementById('themeToggle').addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') === 'dark';
      if (dark) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('ff-theme', dark ? 'light' : 'dark'); } catch (e) {}
      // The reef picks its ink when it mounts, so like the real portal it
      // takes the new theme on the next page load rather than repainting here.
    });
  }());

  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-unbuilt]');
    if (!link) return;
    event.preventDefault();
    window.flash(link.dataset.unbuilt + ' is wired to the live system, not to this walkthrough.');
  });

  window.flash = function (text) {
    var el = document.getElementById('demo-note');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el.timer);
    el.timer = setTimeout(function () { el.classList.remove('show'); }, 3400);
  };

  var note = document.createElement('div');
  note.id = 'demo-note';
  note.className = 'demo-note';
  document.body.appendChild(note);
}());
