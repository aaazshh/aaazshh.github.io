// Page chrome shared by every IAM page: the orange header band, side-menu.php,
// navbar.php, footer.php and plugin.php, plus the small helpers the pages use
// in place of PHP (flash messages from the query string, form designs from
// config.php, the delete modal and the DataTables defaults).
var Shell = (function () {
  'use strict';

  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');

  var GROUPS = {
    manageUsers: ['add-user', 'edit-user', 'users-list'],
    manageRoles: ['add-role', 'edit-role', 'roles-list'],
    manageAccess: ['assign-access', 'edit-access', 'access-list', 'whitelist-forms-categories-list'],
    manageDepartment: ['add-department', 'department-list', 'edit-department'],
    managePortals: ['add-portal', 'edit-portal', 'portal-list'],
    manageOutlets: ['outlet-list'],
    manageMapping: ['department-mapping-list', 'add-department-mapping', 'edit-department-mapping',
      'bm-mapping-list', 'add-bm-mapping', 'edit-bm-mapping']
  };

  var CRUMBS = {
    'index': ['Home', 'Dashboard'],
    'add-user': ['User', 'Add User'], 'edit-user': ['User', 'Edit User'], 'users-list': ['User', 'Users List'],
    'add-role': ['User', 'Add Role'], 'edit-role': ['User', 'Edit Role'], 'roles-list': ['User', 'Roles List'],
    'assign-access': ['Access', 'Assign Access'], 'edit-access': ['Access', 'Edit Access'],
    'access-list': ['Access', 'Access List'], 'whitelist-forms-categories-list': ['Access', 'Forms Categories'],
    'department-list': ['Department', 'Department List'], 'add-department': ['Department', 'Add Department'],
    'edit-department': ['Department', 'Edit Department'], 'outlet-list': ['Outlet', 'Outlet List'],
    'add-portal': ['Portals', 'Add Portal'], 'portal-list': ['Portals', 'Portal List'], 'edit-portal': ['Portals', 'Edit Portal'],
    'department-mapping-list': ['Mapping', 'Department Mapping List'],
    'add-department-mapping': ['Mapping', 'Add Department Mapping'],
    'edit-department-mapping': ['Mapping', 'Edit Department Mapping'],
    'add-bm-mapping': ['Mapping', 'Add BM Mapping'], 'edit-bm-mapping': ['Mapping', 'Edit BM Mapping'],
    'bm-mapping-list': ['Mapping', 'BM Mapping List']
  };

  var USERNAME = 'Maram Aashna';

  // $formDesign, $buttonDesign and $tableDesign from config.php.
  var F = {
    sectionDiv: 'row mb-3 align-items-center', labelDiv: 'col-md-3', label: 'form-label fs-6 mb-0',
    inputDiv: 'col-md-9', input: 'form-control fs-6', selectDiv: 'col-md-9', select: 'form-control fs-6',
    errorMessage: 'invalid-feedback', inputHasError: 'is-invalid', checkBoxListDiv: 'col-md-9',
    checkBox: 'form-check-input', checkBoxLabel: 'form-check-label fs-6'
  };
  var B = {
    submitClass: 'btn btn-success fs-6', submitStyle: 'background-color: rgb(0, 133, 62)',
    blackButton: 'btn btn-dark mb-0'
  };
  var T = { actionButton: 'text-decoration-none text-primary' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

  function q(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  // displayFlashMessage() from config.php.
  function flashHtml(message, type) {
    if (!message) return '';
    var bg = '#f8d7da', fg = '#721c24';
    if (type === 'success') { bg = '#d4edda'; fg = '#155724'; }
    else if (type === 'info') { bg = '#d1ecf1'; fg = '#0c5460'; }
    return '<div class="alert alert-dismissible fade show" role="alert" style="background-color: ' + bg + '; color: ' + fg +
      '; border: none; border-radius: 0.375rem; padding: 0.75rem 1.25rem; position: relative;">' + esc(message) +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="position: absolute; right: 1rem; top: 45%; transform: translateY(-50%);">' +
      '<span aria-hidden="true">&times;</span></button></div>';
  }

  function flash() {
    var success = q('success'), message = q('message');
    if (success === '1' && message) return flashHtml(message, 'success');
    if (success === '0' && message) return flashHtml(message, 'danger');
    return '';
  }

  function badge(active, label) {
    return '<span class="badge w-100 bg-' + (active ? 'success' : 'danger') + '">' + (label || (active ? 'Active' : 'Inactive')) + '</span>';
  }

  function statusFilter(value) {
    return '<div class="col-md-3">' +
      '<label for="status" class="form-control-label">Filter by Status</label>' +
      '<select class="form-select" id="status" name="status">' +
      '<option value=""' + (value === '' ? ' selected' : '') + '>All Statuses</option>' +
      '<option value="1"' + (value === '1' ? ' selected' : '') + '>Active</option>' +
      '<option value="0"' + (value === '0' ? ' selected' : '') + '>Inactive</option>' +
      '</select></div>';
  }

  function actions(editHref, deleteClass, id) {
    return '<a href="' + editHref + '" class="' + T.actionButton + '"><i class="fas fa-edit"></i></a> | ' +
      '<a href="#" class="' + T.actionButton + ' ' + deleteClass + '" data-id="' + id + '"><i class="fas fa-trash-alt"></i></a>';
  }

  function deleteModal(id, bodyText, confirmId) {
    return '<div class="modal fade" id="' + id + '" tabindex="-1" aria-labelledby="' + id + 'Label" aria-hidden="true">' +
      '<div class="modal-dialog"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title" id="' + id + 'Label">Confirm Delete</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body" id="' + id + 'Body">' + bodyText + '</div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>' +
      '<a href="#" id="' + (confirmId || 'confirmDeleteBtn') + '" class="btn btn-danger">Delete</a></div>' +
      '</div></div></div>';
  }

  // Wraps a page body the way the list pages do (card, h3 header, card-body).
  function listCard(title, inner, bodyStyle) {
    return '<div class="row"><div class="col-md-12"><div class="card">' +
      '<h3 class="card-header text-center font-weight-bolder text-uppercase py-4">' + title + '</h3>' +
      '<div class="card-body px-3 pb-30 table-responsive"' + (bodyStyle ? ' style="' + bodyStyle + '"' : '') + '>' + inner + '</div>' +
      '<div class="card-footer text-center pt-0"></div></div></div></div>';
  }

  function formCard(title, inner) {
    return '<div class="card"><h3 class="card-header text-center font-weight-bolder text-uppercase py-4">' + title + '</h3>' +
      '<div class="card-body">' + inner + '</div></div>';
  }

  function submitButton(edit) {
    return '<div class="row mt-4"><div class="col-12 text-center">' +
      '<button type="submit" class="' + B.submitClass + '" style="' + B.submitStyle + '">' +
      (edit ? '<i class="fas fa-edit me-2"></i>Update' : '<i class="fas fa-save me-2"></i>Save') +
      '</button></div></div>';
  }

  function menu() {
    var wrap = document.createElement('div');
    wrap.innerHTML = window.IAM_MENU;
    var aside = wrap.firstElementChild;
    Object.keys(GROUPS).forEach(function (g) {
      if (GROUPS[g].indexOf(PAGE) === -1) return;
      var box = aside.querySelector('#' + g);
      if (box) box.classList.add('show');
    });
    var link = aside.querySelector('.submenu a.nav-link[href="' + PAGE + '.html"]');
    if (link) link.classList.add('active');
    return aside;
  }

  function navbar() {
    var c = CRUMBS[PAGE] || ['', ''];
    return '<nav class="navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl " id="navbarBlur" data-scroll="false">' +
      '<div class="container-fluid py-1 px-3">' +
      '<nav aria-label="breadcrumb"><ol class="breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0 me-sm-6 me-5">' +
      '<li class="breadcrumb-item text-sm text-white active">' + c[0] + ' | ' + c[1] + '</li></ol></nav>' +
      '<div class="collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4" id="navbar">' +
      '<div class="ms-md-auto pe-md-3 d-flex align-items-center"></div>' +
      '<ul class="navbar-nav  justify-content-end">' +
      '<li class="nav-item d-flex align-items-center">' +
      '<a href="#" class="nav-link text-white font-weight-bold px-0" data-unbuilt="Log Out">' +
      '<i class="fa fa-user me-sm-1"></i><span class="d-sm-inline d-none">' + esc(USERNAME) + ' | Log Out</span></a></li>' +
      '<li class="nav-item d-xl-none ps-3 d-flex align-items-center">' +
      '<a href="javascript:;" class="nav-link text-white p-0" id="iconNavbarSidenav"><div class="sidenav-toggler-inner">' +
      '<i class="sidenav-toggler-line bg-white"></i><i class="sidenav-toggler-line bg-white"></i><i class="sidenav-toggler-line bg-white"></i>' +
      '</div></a></li></ul></div></div></nav>';
  }

  function footer() {
    return '<footer class="footer pt-3"><div class="container-fluid"><div class="row align-items-center justify-content-lg-between">' +
      '<div class="col-lg-12 mb-lg-0 mb-4"><div class="copyright text-center text-muted">' +
      '<small class="copyright">Copyright &copy;' + new Date().getFullYear() + ' Prime Supermarket Ltd</small>' +
      '</div></div></div></div></footer>';
  }

  function plugin() {
    return '<div class="fixed-plugin"><a class="fixed-plugin-button text-dark position-fixed px-3 py-2"><i class="fa fa-cog py-2"> </i></a>' +
      '<div class="card shadow-lg"><div class="card-header pb-0 pt-3 "><div class="float-start"><h5 class="mt-3 mb-0">Configuration</h5></div>' +
      '<div class="float-end mt-4"><button class="btn btn-link text-dark p-0 fixed-plugin-close-button"><i class="fa fa-close"></i></button></div></div>' +
      '<hr class="horizontal dark my-1"><div class="card-body pt-sm-3 pt-0 overflow-auto">' +
      '<div><h6 class="mb-0">Sidebar Colors</h6></div>' +
      '<a href="javascript:void(0)" class="switch-trigger background-color"><div class="badge-colors my-2 text-start">' +
      '<span class="badge filter bg-gradient-primary active" data-color="primary" onclick="sidebarColor(this)"></span>' +
      '<span class="badge filter bg-gradient-dark" data-color="dark" onclick="sidebarColor(this)"></span>' +
      '<span class="badge filter bg-gradient-info" data-color="info" onclick="sidebarColor(this)"></span>' +
      '<span class="badge filter bg-gradient-success" data-color="success" onclick="sidebarColor(this)"></span>' +
      '<span class="badge filter bg-gradient-warning" data-color="warning" onclick="sidebarColor(this)"></span>' +
      '<span class="badge filter bg-gradient-danger" data-color="danger" onclick="sidebarColor(this)"></span>' +
      '</div></a>' +
      '<div class="mt-3"><h6 class="mb-0">Sidenav Type</h6><p class="text-sm">Choose between 2 different sidenav types.</p></div>' +
      '<div class="d-flex"><button class="btn bg-gradient-primary w-100 px-3 mb-2 active me-2" data-class="bg-white" onclick="sidebarType(this)">White</button>' +
      '<button class="btn bg-gradient-primary w-100 px-3 mb-2" data-class="bg-default" onclick="sidebarType(this)">Dark</button></div>' +
      '<p class="text-sm d-xl-none d-block mt-2">You can change the sidenav type just on desktop view.</p>' +
      '<div class="d-flex my-3"><h6 class="mb-0">Navbar Fixed</h6><div class="form-check form-switch ps-0 ms-auto my-auto">' +
      '<input class="form-check-input mt-1 ms-auto" type="checkbox" id="navbarFixed" onclick="navbarFixed(this)"></div></div>' +
      '<hr class="horizontal dark my-sm-4">' +
      '<div class="mt-2 mb-5 d-flex"><h6 class="mb-0">Light / Dark</h6><div class="form-check form-switch ps-0 ms-auto my-auto">' +
      '<input class="form-check-input mt-1 ms-auto" type="checkbox" id="dark-version" onclick="darkMode(this)"></div></div>' +
      '</div></div></div>';
  }

  var inits = [];

  // opts.body goes inside container-fluid. opts.footer is 'inside' (list pages
  // include footer.php inside the container), 'after' (forms include it after
  // the container) or 'none' (index.php has no footer). opts.after is markup
  // placed after <main>, such as modals.
  function render(opts) {
    var body = document.body;
    var band = document.createElement('div');
    band.className = 'min-height-300 position-absolute w-100';
    band.style.backgroundColor = 'rgba(214, 119, 9, 1)';
    if (opts.before) body.insertAdjacentHTML('beforeend', opts.before);
    body.appendChild(band);
    body.appendChild(menu());
    var main = document.createElement('main');
    main.className = 'main-content position-relative border-radius-lg';
    var foot = opts.footer || 'inside';
    main.innerHTML = navbar() +
      '<div class="container-fluid py-4">' + opts.body + (foot === 'inside' ? footer() : '') + '</div>' +
      (foot === 'after' ? footer() : '');
    body.appendChild(main);
    if (opts.after) body.insertAdjacentHTML('beforeend', opts.after);
    body.insertAdjacentHTML('beforeend', plugin());
    if (opts.init) inits.push(opts.init);
  }

  // Runs once jQuery, Bootstrap, select2 and DataTables have loaded.
  function start() {
    var scroller = document.querySelector('.sidenav .overflow-auto');
    if (scroller) {
      try {
        var saved = sessionStorage.getItem('sidebarScrollPosition');
        if (saved !== null) scroller.scrollTop = parseInt(saved, 10);
      } catch (e) {}
      scroller.addEventListener('scroll', function () {
        try { sessionStorage.setItem('sidebarScrollPosition', this.scrollTop); } catch (e) {}
      });
    }
    window.jQuery(function ($) { inits.forEach(function (fn) { fn($); }); });
  }

  // The options every list page passes to DataTable().
  function table($, selector, extra) {
    var opts = {
      pageLength: 25, lengthMenu: [25, 50, 100, 250], stateSave: true, order: [[0, 'asc']],
      stripeClasses: ['odd', 'even'], stripe: true,
      columnDefs: [{ className: 'align-middle', targets: '_all' }]
    };
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) opts[k] = extra[k];
    return $(selector).DataTable(opts);
  }

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
    el.timer = setTimeout(function () { el.classList.remove('show'); }, Math.max(3400, text.length * 55));
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-unbuilt]');
    if (!link) return;
    e.preventDefault();
    toast(link.getAttribute('data-unbuilt') + ' is wired to the live system, not to this walkthrough.');
  });

  // Redirect the way the PHP handlers do: list.php?success=1&action=x&message=...
  function go(page, success, action, message) {
    location.href = page + '.html?success=' + success + '&action=' + action + '&message=' + encodeURIComponent(message);
  }

  // Filters submit a GET form; keep the value in the URL like the real page.
  function filterSubmit(ids) {
    var params = [];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      params.push(el.name + '=' + encodeURIComponent(el.value));
    });
    location.href = PAGE + '.html?' + params.join('&');
  }

  function options(list, selected, placeholder) {
    var html = placeholder != null ? '<option value="">' + placeholder + '</option>' : '';
    list.forEach(function (o) {
      var sel = Array.isArray(selected) ? selected.map(String).indexOf(String(o[0])) !== -1 : String(o[0]) === String(selected);
      html += '<option value="' + esc(o[0]) + '"' + (sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    });
    return html;
  }

  function setError(input, message) {
    var span = input.parentNode.querySelector('.invalid-feedback');
    if (message) input.classList.add('is-invalid'); else input.classList.remove('is-invalid');
    if (span) span.textContent = message || '';
  }

  return {
    PAGE: PAGE, F: F, B: B, T: T, USERNAME: USERNAME,
    esc: esc, q: q, flash: flash, flashHtml: flashHtml, badge: badge, statusFilter: statusFilter,
    actions: actions, deleteModal: deleteModal, listCard: listCard, formCard: formCard,
    submitButton: submitButton, render: render, start: start, table: table, toast: toast,
    go: go, filterSubmit: filterSubmit, options: options, setError: setError
  };
})();
