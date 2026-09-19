/**
 * Builds the sidebar and top bar around each demo page, the way index.php does
 * it in the real app. Every page here is static: the data is made up, there is
 * no PHP and no database behind it.
 */

'use strict';

(function () {
  var icon = {
    grid: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
    radar: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"></path><path d="M4 6h.01"></path><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"></path><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"></path><path d="M12 18h.01"></path><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"></path><circle cx="12" cy="12" r="2"></circle><path d="m13.41 10.59 5.66-5.66"></path>',
    package: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
    'alert-triangle': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    history: '<path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path>',
    'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    truck: '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="9" y1="22" x2="9" y2="18"></line><line x1="15" y1="22" x2="15" y2="18"></line><line x1="8" y1="6" x2="8" y2="6.01"></line><line x1="12" y1="6" x2="12" y2="6.01"></line><line x1="16" y1="6" x2="16" y2="6.01"></line><line x1="8" y1="10" x2="8" y2="10.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="16" y1="10" x2="16" y2="10.01"></line>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>'
  };

  var nav = [
    { section: 'Operations' },
    { page: 'index', label: 'Dashboard', icon: 'grid' },
    { page: 'control-center', label: 'Control Center', icon: 'radar' },
    { page: 'orders', label: 'Assign Orders', icon: 'package' },
    { page: 'incidents', label: 'Incidents', icon: 'alert-triangle' },
    { page: 'trip-routes', label: 'Trip Routes', icon: 'history' },
    { section: 'Manage' },
    { page: 'locations', label: 'Locations', icon: 'map-pin' },
    { page: 'fleet', label: 'Fleet Management', icon: 'truck' },
    { page: 'users', label: 'User Management', icon: 'users' },
    { section: 'Setup' },
    { page: 'companies', label: 'Company Management', icon: 'building' },
    { page: 'roles', label: 'Role Management', icon: 'shield' }
  ];

  var built = ['index', 'control-center', 'orders', 'incidents', 'trip-routes',
    'locations', 'fleet', 'users', 'companies', 'roles'];

  function svg(name, size) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (size || 18) + '" height="' + (size || 18) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      icon[name] + '</svg>';
  }

  var app = document.querySelector('.app');
  var here = app.dataset.page;
  var title = app.dataset.title;
  var content = app.innerHTML;

  var links = nav.map(function (item) {
    if (item.section) return '<div class="nav-section-label">' + item.section + '</div>';
    var live = built.indexOf(item.page) !== -1;
    var href = live ? item.page + '.html' : '#';
    return '<a href="' + href + '" class="nav-item' + (here === item.page ? ' active' : '') + '"' +
      (live ? '' : ' data-unbuilt="' + item.label + '"') + '>' +
      '<span class="nav-icon">' + svg(item.icon) + '</span>' + item.label + '</a>';
  }).join('');

  app.innerHTML =
    '<aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">' +
      '<div class="sidebar-logo">' +
        '<img src="logo.png" alt="" class="sidebar-logo-img">' +
        '<div><div class="logo-text">Logistics</div><div class="logo-sub">Management System</div></div>' +
      '</div>' +
      '<nav class="sidebar-nav">' + links + '</nav>' +
      '<div class="sidebar-footer"><div class="nav-section-label">Admin</div>' +
        '<a href="#" class="nav-item" data-unbuilt="Logout"><span class="nav-icon">' + svg('log-out') + '</span>Logout</a>' +
      '</div>' +
    '</aside>' +
    '<div class="sidebar-backdrop" id="sidebar-backdrop" aria-hidden="true"></div>' +
    '<div class="main-content">' +
      '<header class="topbar" role="banner">' +
        '<div class="topbar-left" style="display:flex;align-items:center;gap:14px;">' +
          '<button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar" style="background:none;border:none;color:rgba(255,255,255,0.85);cursor:pointer;display:flex;align-items:center;padding:4px;">' + svg('menu', 20) + '</button>' +
          '<nav class="topbar-breadcrumb" aria-label="Breadcrumb">' +
            '<a href="index.html" class="bc-home">Home</a>' +
            '<span class="bc-sep" aria-hidden="true">|</span>' +
            '<span class="bc-current">' + title + '</span>' +
          '</nav>' +
        '</div>' +
        '<div class="topbar-right"><div class="topbar-user">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(255,255,255,0.75);flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
          '<strong>Maram Aashna</strong>' +
          '<span class="topbar-divider" aria-hidden="true">|</span>' +
          '<a href="#" class="topbar-logout" data-unbuilt="Logout">Log Out</a>' +
        '</div></div>' +
      '</header>' +
      '<main class="page-content" id="page-content" role="main">' + content + '</main>' +
    '</div>';

  // Sidebar toggle, same behaviour as main.js in the app.
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  document.getElementById('sidebar-toggle').addEventListener('click', function () {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  });
  backdrop.addEventListener('click', function () {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
  });

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
