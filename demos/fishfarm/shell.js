/**
 * Wraps each page in the sidebar and top bar, the way header.php and
 * side-menu.php do it in the real portal. The dark mode is the farm's own: the
 * crew work off the pontoon before sunrise and the white theme is blinding.
 */

'use strict';

(function () {
  var icon = {
    home: '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V20h14V9.5"></path><path d="M10 20v-6h4v6"></path>',
    chart: '<path d="M4 19h16"></path><rect x="6" y="11" width="3" height="6" rx="1"></rect><rect x="12" y="7" width="3" height="10" rx="1"></rect><rect x="18" y="13" width="2.5" height="4" rx="1"></rect>',
    cage: '<rect x="3" y="4" width="8" height="7" rx="1.5"></rect><rect x="13" y="4" width="8" height="7" rx="1.5"></rect><rect x="3" y="13" width="8" height="7" rx="1.5"></rect><rect x="13" y="13" width="8" height="7" rx="1.5"></rect>',
    fish: '<path d="M3 12c3.5-5 8-7 12-7 2.7 0 4.6 1 6 2-1.4 1-3.3 2-6 2"></path><path d="M3 12c3.5 5 8 7 12 7 2.7 0 4.6-1 6-2-1.4-1-3.3-2-6-2"></path><circle cx="16.5" cy="10" r="0.8" fill="currentColor"></circle>',
    feed: '<path d="M5 7h14l-1.2 12.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8z"></path><path d="M9 7V5a3 3 0 0 1 6 0v2"></path>',
    dead: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"></path><path d="m9 9 2.5 2.5M14.5 9 12 11.5"></path><path d="M9 16h6"></path>',
    drop: '<path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3z"></path>',
    net: '<path d="M4 4h16v16H4z"></path><path d="M4 9h16M4 14h16M9 4v16M14 4v16"></path>',
    basket: '<path d="M4 9h16l-1.5 10.2a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8z"></path><path d="m8 9 3-6M16 9l-3-6"></path>',
    alert: '<path d="M10.3 3.9 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v5M12 17.5h.01"></path>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"></path><path d="m3 8 9 5 9-5M12 13v8"></path>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>'
  };

  var nav = [
    { label: 'Operations' },
    { page: 'index', name: 'Home', icon: 'home' },
    { page: 'cages', name: 'Cage Map', icon: 'cage' },
    { page: 'production', name: 'Fish Productions', icon: 'fish' },
    { page: 'feed', name: 'Feed', icon: 'feed' },
    { page: 'mortality', name: 'Dead Fish', icon: 'dead' },
    { page: 'harvest', name: 'Harvest & Sales', icon: 'basket' },
    { label: 'Records' },
    { page: 'environment', name: 'Environment Survey', icon: 'drop' },
    { page: 'nets', name: 'Net Management', icon: 'net' },
    { page: 'incidents', name: 'Incidents', icon: 'alert' },
    { page: 'inventory', name: 'Inventory', icon: 'box' },
    { label: 'Insights' },
    { page: 'performance', name: 'Production Performance', icon: 'chart' }
  ];

  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + icon[name] + '</svg>';
  }

  var page = document.body.dataset.page;
  var title = document.body.dataset.title;
  var sub = document.body.dataset.sub || 'Fish Farm';
  var content = document.getElementById('content');

  var links = nav.map(function (item) {
    if (item.label) return '<div class="side-label">' + item.label + '</div>';
    return '<a href="' + item.page + '.html" class="' + (page === item.page ? 'on' : '') + '">' +
      '<span class="ico">' + svg(item.icon) + '</span>' + item.name + '</a>';
  }).join('');

  // The page's own markup is moved into the layout rather than re-written, so
  // the scripts that follow are left alone.
  var shell = document.createElement('div');
  shell.innerHTML =
    '<div class="layout">' +
      '<aside class="side">' +
        '<div class="brand">' +
          '<span class="mark">' + svg('fish') + '</span>' +
          '<span><b>Fish Farm</b><span>Operations portal</span></span>' +
        '</div>' +
        '<nav>' + links +
          '<div class="side-label">Account</div>' +
          '<a href="#" data-skip="Signing out"><span class="ico">' + svg('out') + '</span>Log Out</a>' +
        '</nav>' +
      '</aside>' +
      '<div class="main">' +
        '<header class="top">' +
          '<div class="crumb">' + sub + '<b>' + title + '</b></div>' +
          '<div class="right">' +
            '<button type="button" class="theme-btn" id="theme" aria-label="Switch theme">' +
              '<svg viewBox="0 0 24 24" class="moon"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>' +
            '</button>' +
            '<div class="who"><span class="av">MA</span><span>Maram Aashna<br><span class="dim" style="font-size:11.5px;">Admin</span></span></div>' +
          '</div>' +
        '</header>' +
        '<main class="page" id="page"></main>' +
      '</div>' +
    '</div>' +
    '<div class="toast" id="toast"></div>';

  while (shell.firstChild) document.body.insertBefore(shell.firstChild, content);
  document.getElementById('page').appendChild(content);
  content.removeAttribute('id');

  /* Dark mode, remembered the way the portal remembers it. */
  var root = document.documentElement;
  try {
    if (localStorage.getItem('ff-theme') === 'dark') root.setAttribute('data-theme', 'dark');
  } catch (err) {}

  document.getElementById('theme').addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') === 'dark';
    if (dark) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'dark');
    try {
      localStorage.setItem('ff-theme', dark ? 'light' : 'dark');
    } catch (err) {}
  });

  window.flash = function (text) {
    var el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el.timer);
    el.timer = setTimeout(function () { el.classList.remove('show'); }, 3400);
  };

  document.addEventListener('click', function (event) {
    var skip = event.target.closest('[data-skip]');
    if (!skip) return;
    event.preventDefault();
    window.flash(skip.dataset.skip + ' belongs to the live portal, not to this walkthrough.');
  });
}());
