// assign-access.php, edit-access.php, access-list.php and
// whitelist-forms-categories-list.php.
(function () {
  'use strict';
  var S = Shell, F = S.F, esc = S.esc, db = IAM.db;

  var PLATFORMS = [[1, 'Fruits'], [2, 'Vegetables'], [3, 'Seafood (NOT USED)'], [4, 'Eggs'], [5, 'Packing Materials'], [6, 'Frozen'], [7, 'Non-trade (NOT USED)']];

  function portal(id) { return IAM.find('portals', id) || { name: '' }; }
  function dept(id) { var d = IAM.find('departments', id); return d ? d.name : 'No Department'; }
  function userLabel(u) { return u.username + ' [' + dept(u.department_id) + ']'; }

  // $rolesData: active roles on existing portals, labelled "Portal - Role".
  function rolesData() {
    return db.roles.filter(function (r) { return r.status_id === 1 && IAM.find('portals', r.portal_id); })
      .sort(function (a, b) { return a.id - b.id; });
  }

  function activeRoles(userId) {
    return db.access.filter(function (a) { return a.user_id === userId && a.status_id === 1; }).map(function (a) { return a.role_id; });
  }
  function userCategories(userId) {
    return db.category_groups.filter(function (c) { return c.user_id === userId; }).map(function (c) { return c.category_id; });
  }

  // Platform ids already used by each Fresh role (roleToPlatformId).
  function roleToPlatform() {
    var map = {};
    db.access.forEach(function (a) {
      var r = IAM.find('roles', a.role_id);
      if (a.status_id === 1 && r && r.portal_id === 1 && a.platform_id && !map[a.role_id]) map[a.role_id] = a.platform_id.split(',');
    });
    return map;
  }

  function accessForm(access) {
    var edit = !!access;
    var roles = rolesData();
    var cats = db.categories;
    var html = '<form action="#" method="post" novalidate>';
    if (edit) {
      var u = IAM.find('users', access.user_id);
      html += '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="user_display" class="' + F.label + '">User*</label></div>' +
        '<div class="' + F.inputDiv + '"><div class="' + F.input + '" style="padding: 0.375rem 0.75rem; background-color: #e9ecef; border: 1px solid #ced4da; border-radius: 0.25rem;">' +
        '<div style="font-weight: bold;">' + esc(u.username) + '</div><div style="color: #6c757d; font-size: 0.875rem;">' + esc(dept(u.department_id)) + '</div></div>' +
        '<input type="hidden" name="user_id" value="' + u.id + '"><small class="form-text text-muted">User cannot be changed when editing access</small></div></div>';
    } else {
      var users = db.users.filter(function (x) { return x.status_id === 1; }).sort(function (a, b) { return a.id - b.id; });
      html += '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="user_id" class="' + F.label + '">User*</label></div>' +
        '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="user_id" name="user_id"><option value="">Select User</option>' +
        users.map(function (x) {
          return '<option value="' + x.id + '" data-username="' + esc(x.username) + '" data-department="' + esc(dept(x.department_id)) + '" data-microsoft="' + x.is_microsoft + '">' +
            esc(userLabel(x)) + '</option>';
        }).join('') + '</select></div></div>';
    }
    var selected = edit ? activeRoles(access.user_id) : [];
    html += '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="role_ids" class="' + F.label + '">Role(s)*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="role_ids" name="role_ids[]" multiple="multiple">' +
      S.options(roles.map(function (r) { return [r.id, portal(r.portal_id).name + ' - ' + r.name]; }), selected) + '</select>' +
      (edit ? '<small class="form-text text-muted">Select roles to assign</small>' : '') + '</div></div>';

    var platformIds = [];
    if (edit) {
      db.access.forEach(function (a) {
        var r = IAM.find('roles', a.role_id);
        if (a.user_id === access.user_id && a.status_id === 1 && r && r.portal_id === 1 && a.platform_id) platformIds = a.platform_id.split(',');
      });
    }
    html += '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="platform_ids" class="' + F.label + '">Fresh Platform(s)*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="platform_ids" name="platform_ids[]" multiple="multiple">' +
      S.options(PLATFORMS, edit ? platformIds : []) + '</select></div></div>';
    html += '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="forms_categories" class="' + F.label + '">Category(s)</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="forms_categories" name="forms_categories[]" multiple="multiple">' +
      S.options(Object.keys(cats).map(function (k) { return [k, cats[k]]; }), edit ? userCategories(access.user_id) : []) + '</select></div></div>';
    if (edit) {
      html += '<div class="' + F.sectionDiv + '" style="display: none;"><div class="' + F.labelDiv + '"><label for="status_id" class="' + F.label + '">Status*</label></div>' +
        '<div class="' + F.selectDiv + '"><select class="' + F.select + '" id="status_id" name="status_id"><option value="1" selected>Active</option><option value="0">Inactive</option></select></div></div>';
    }
    return html + S.submitButton(edit) + '</form>';
  }

  function wireAccessForm($, access) {
    var edit = !!access;
    var freshRoles = [], formsRoles = [];
    rolesData().forEach(function (r) {
      if (r.portal_id === 1) freshRoles.push(r.id);
      else if (r.portal_id === 7) formsRoles.push(r.id);
    });
    var map = roleToPlatform();

    $('#platform_ids').select2({ placeholder: edit ? 'Select Platform(s)' : 'Select Platforms(s)', allowClear: true, width: '100%', closeOnSelect: false });
    $('#platform_ids').parent().parent().hide();
    $('#forms_categories').select2({ placeholder: 'Select Category(s)', allowClear: true, width: '100%', closeOnSelect: false });
    $('#forms_categories').parent().parent().hide();

    if (!edit) {
      var formatUserOption = function (option) {
        if (!option.id) return option.text;
        var $opt = $(option.element);
        var html = '<div style="display: flex; justify-content: space-between; align-items: center;"><div><strong>' + esc($opt.data('username')) +
          '</strong><br><small style="color: #6c757d;">' + esc($opt.data('department')) + '</small></div>';
        if (Number($opt.data('microsoft')) === 1) html += '<div style="text-align: right; font-size: 0.75rem; color: #6c757d;">Microsoft Account</div>';
        return $(html + '</div>');
      };
      var formatUserSelection = function (option) {
        if (!option.id) return option.text;
        var $opt = $(option.element);
        return $('<div style="display: flex; flex-direction: row; gap: 20px;"><span style="font-weight: bold;">' + esc($opt.data('username')) +
          '</span><small style="color: #6c757d;">' + esc($opt.data('department')) + '</small></div>');
      };
      $('#user_id').select2({
        placeholder: 'Select User', allowClear: true, width: '100%', minimumInputLength: 1,
        templateResult: formatUserOption, templateSelection: formatUserSelection,
        language: { inputTooShort: function () { return 'Please enter 1 or more characters'; } }
      });
    }
    $('#role_ids').select2({ placeholder: 'Select Role(s)', allowClear: true, width: '100%', closeOnSelect: false });

    var keepPlatforms = edit;
    $('#role_ids').on('change', function () {
      var selectedRoles = $(this).val() || [];
      var fresh = selectedRoles.filter(function (e) { return freshRoles.indexOf(Number(e)) !== -1; });
      var forms = selectedRoles.filter(function (e) { return formsRoles.indexOf(Number(e)) !== -1; });
      if (fresh.length) {
        $('#platform_ids').parent().parent().show();
        if (!keepPlatforms) {
          var ids = map[fresh[0]];
          $('#platform_ids').val(ids && ids.length ? ids : null).trigger('change');
        }
      } else {
        $('#platform_ids').parent().parent().hide();
        $('#platform_ids').val(null).trigger('change');
      }
      keepPlatforms = false;
      if (forms.length) $('#forms_categories').parent().parent().show();
      else {
        $('#forms_categories').parent().parent().hide();
        $('#forms_categories').val(null).trigger('change');
      }
    });
    $('#role_ids').trigger('change');

    if (!edit) {
      // get-user-roles.php: active roles and category groups for the user.
      $('#user_id').on('change', function () {
        var id = Number($(this).val());
        if (id) {
          var roles = activeRoles(id);
          $('#role_ids').val(roles.length ? roles : null).trigger('change');
          var cats = userCategories(id);
          $('#forms_categories').val(cats.length ? cats : null).trigger('change');
        } else {
          $('#role_ids').val(null).trigger('change');
        }
      });
    }

    $('form').on('submit', function (e) {
      e.preventDefault();
      var userId = edit ? access.user_id : Number($('#user_id').val());
      $('.error-message').remove();
      if (!userId) {
        $('#user_id').after('<div class="error-message">Please select a user.</div>');
        return;
      }
      var roleIds = ($('#role_ids').val() || []).map(Number);
      var isFresh = roleIds.some(function (r) { return freshRoles.indexOf(r) !== -1; });
      var platforms = ($('#platform_ids').val() || []).join(',');
      if (isFresh && !platforms) {
        $('#platform_ids').parent().append('<div class="error-message">' + (edit ? 'You need to add a platform Id for Fresh.' : 'You need to add at least one platform for Fresh.') + '</div>');
        return;
      }

      var current = db.access.filter(function (a) { return a.user_id === userId && a.status_id === 1; });
      var added = 0, updated = 0, removed = 0;
      current.forEach(function (a) {
        if (roleIds.indexOf(a.role_id) === -1) {
          a.status_id = 0; a.deleted_by = IAM.USER_ID; a.deleted_at = IAM.stamp(new Date());
          removed++;
        }
      });
      roleIds.forEach(function (rid) {
        var pid = freshRoles.indexOf(rid) !== -1 ? platforms : null;
        var existing = current.filter(function (a) { return a.role_id === rid; })[0];
        if (existing) {
          if (pid && existing.platform_id !== pid) { existing.platform_id = pid; updated++; }
          return;
        }
        var old = db.access.filter(function (a) { return a.user_id === userId && a.role_id === rid && a.status_id === 0; })[0];
        if (old) { old.status_id = 1; old.deleted_by = null; old.deleted_at = null; old.platform_id = pid; }
        else IAM.insert('access', { user_id: userId, role_id: rid, platform_id: pid, status_id: 1 });
        added++;
      });

      if (roleIds.some(function (r) { return formsRoles.indexOf(r) !== -1; })) {
        var cats = ($('#forms_categories').val() || []).map(Number);
        db.category_groups = db.category_groups.filter(function (c) { return c.user_id !== userId || cats.indexOf(c.category_id) !== -1; });
        cats.forEach(function (c) {
          if (!db.category_groups.some(function (g) { return g.user_id === userId && g.category_id === c; })) {
            db.category_groups.push({ id: db.category_groups.length + 1000, user_id: userId, category_id: c });
          }
        });
      }
      IAM.save();

      var label = userLabel(IAM.find('users', userId));
      var parts = [];
      if (added) parts.push('added ' + added + ' role(s)');
      if (updated) parts.push('updated ' + updated + ' role(s)');
      if (removed) parts.push('removed ' + removed + ' role(s)');
      var message = parts.length ? 'Successfully ' + parts.join(' and ') + ' for ' + label + '.' : 'No changes made to roles for ' + label + '.';
      S.go('access-list', 1, 'update', message);
    });
  }

  function accessList() {
    var status = S.q('status'); if (status === null) status = '1';
    var portalFilter = Number(S.q('portal_id') || 0);
    var list = db.access.filter(function (a) {
      if (a.deleted_by) return false;
      var r = IAM.find('roles', a.role_id);
      if (!r || !IAM.find('portals', r.portal_id)) return false;
      if (status !== '' && String(a.status_id) !== status) return false;
      if (portalFilter && r.portal_id !== portalFilter) return false;
      return true;
    }).sort(function (a, b) { return a.user_id - b.user_id; });

    var rows = list.map(function (a) {
      var u = IAM.find('users', a.user_id), r = IAM.find('roles', a.role_id);
      var out = IAM.find('outlets', u.outlet_id);
      return '<tr><td>' + esc(u.username) + '</td><td>' + esc(u.email) + '</td><td>' + esc(out ? out.code : '-') + '</td>' +
        '<td>' + esc(portal(r.portal_id).name) + '</td><td>' + esc(r.name) + '</td><td>' + S.badge(a.status_id > 0) + '</td>' +
        '<td>' + S.actions('edit-access.html?id=' + a.id, 'delete-access', a.id) + '</td></tr>';
    }).join('');

    var portals = db.portals.filter(function (p) { return p.status_id === 1; }).map(function (p) { return [p.id, p.name]; });
    var filters = '<div class="filter-section mb-3 mt-3"><form action="" method="GET" id="filterForm" class="row g-3">' + S.statusFilter(status) +
      '<div class="col-md-3"><label for="portal_id" class="form-control-label">Filter by Portal</label><select class="form-select" id="portal_id" name="portal_id">' +
      S.options(portals, portalFilter || '', 'All Portals') + '</select></div>' +
      '<div class="text-end"><a href="assign-access.html" class="' + S.B.blackButton + '"><i class="fas fa-plus me-2"></i>Assign Access</a></div></form></div>';
    var table = '<table id="access_list" class="table table-hover data-table" cellspacing="0" style="width:100%"><thead class="thead-light"><tr>' +
      '<th>Username</th><th>Email</th><th>Outlet</th><th>Portal</th><th>Role</th><th>Status</th><th class="col-md-1">Action</th></tr></thead><tbody>' + rows + '</tbody></table>';

    S.render({
      body: S.listCard('Access List', S.flash() + filters + table),
      after: S.deleteModal('deleteAccessModal', 'Are you sure you want to remove this access?'),
      init: function ($) {
        S.table($, '#access_list');
        $('#access_list').on('click', '.delete-access', function (e) {
          e.preventDefault();
          var a = IAM.find('access', $(this).data('id'));
          var u = IAM.find('users', a.user_id), r = IAM.find('roles', a.role_id);
          var modal = new bootstrap.Modal(document.getElementById('deleteAccessModal'));
          document.getElementById('deleteAccessModalBody').innerHTML = 'Are you sure you want to delete ' + esc(r.name) + ' role (' + esc(portal(r.portal_id).name) + ') from ' + esc(u.username) + '?';
          document.getElementById('confirmDeleteBtn').onclick = function (ev) {
            ev.preventDefault();
            IAM.update('access', a.id, { status_id: 0, deleted_by: IAM.USER_ID, deleted_at: IAM.stamp(new Date()) });
            S.go('access-list', 1, 'remove', 'Successfully removed ' + portal(r.portal_id).name + ' - ' + r.name + ' access from ' + u.username + '.');
          };
          modal.show();
        });
        $('#status, #portal_id').on('change', function () { S.filterSubmit(['status', 'portal_id']); });
      }
    });
  }

  function formsCategories() {
    var status = S.q('status'); if (status === null) status = '1';
    var category = S.q('category_id') || '';
    // Users with an active Digital Forms role, joined on category_groups.
    var rows = [], seen = {};
    db.users.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }).forEach(function (u) {
      if (status !== '' && String(u.status_id) !== status) return;
      var groups = db.category_groups.filter(function (c) { return c.user_id === u.id && (!category || String(c.category_id) === category); });
      if (!groups.length) return;
      db.access.forEach(function (a) {
        var r = IAM.find('roles', a.role_id);
        if (a.user_id !== u.id || a.status_id !== 1 || !r || r.portal_id !== 7 || r.status_id !== 1) return;
        seen[u.id] = { u: u, access: a, role: r };
      });
    });
    Object.keys(seen).map(function (k) { return seen[k]; }).sort(function (a, b) { return a.u.name < b.u.name ? -1 : 1; }).forEach(function (x) {
      var cats = db.category_groups.filter(function (c) { return c.user_id === x.u.id; });
      rows.push('<tr><td>' + esc(x.u.name) + '</td><td>' + esc(x.role.name) + '</td><td>' +
        (cats.length ? cats.map(function (c) { return '<span class="badge bg-info category-badge">' + esc(db.categories[c.category_id]) + '</span>'; }).join(' ')
          : '<span class="text-muted">No categories assigned</span>') +
        '</td><td><a href="edit-access.html?id=' + x.access.id + '" class="' + S.T.actionButton + '" title="Edit Categories"><i class="fas fa-edit"></i></a></td></tr>');
    });

    var cats = Object.keys(db.categories).map(function (k) { return [k, db.categories[k]]; });
    var filters = '<div class="filter-section mb-3 mt-3"><form action="" method="GET" id="filterForm" class="row g-3">' + S.statusFilter(status) +
      '<div class="col-md-3"><label for="category_id" class="form-control-label">Filter by Category</label><select class="form-select" id="category_id" name="category_id">' +
      S.options(cats, category, 'All Categories') + '</select></div>' +
      '<div class="text-end d-flex justify-content-end gap-3 flex-wrap align-items-stretch">' +
      '<button type="button" class="btn btn-success d-flex align-items-center gap-2 px-4 shadow-sm rounded-3" id="exportExcel"><i class="fas fa-download fs-5 mb-1"></i><span class="fw-semibold">Export Excel</span></button>' +
      '<label for="excelUpload" class="btn btn-success d-flex align-items-center gap-2 px-4 shadow-sm rounded-3" style="cursor: pointer;"><i class="fas fa-file-excel fs-5"></i><span class="fw-semibold">Upload Excel</span></label>' +
      '<input type="file" accept=".xlsx,.xls,.csv" id="excelUpload" hidden>' +
      '<a href="#" data-unbuilt="The category template download" class="btn btn-outline-success d-flex align-items-center gap-2 px-4 shadow-sm rounded-3"><i class="fas fa-download fs-5 mb-1"></i><span class="fw-semibold">Template</span></a>' +
      '</div></form></div>';
    var table = '<table id="users_forms_list" class="table table-hover data-table" cellspacing="0" style="width:100%"><thead class="thead-light"><tr>' +
      '<th>Name</th><th>Role</th><th>Categories</th><th class="col-md-1">Action</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';

    S.render({
      footer: 'after',
      body: '<div class="card"><h3 class="card-header text-center font-weight-bolder text-uppercase py-4">Forms Categories</h3>' +
        '<div class="card-body px-3 pb-30 table-responsive">' + S.flash() + filters + table + '</div><div class="card-footer text-center pt-0"></div></div>',
      init: function ($) {
        $('#users_forms_list').DataTable({ pageLength: 25, order: [[1, 'asc']], columnDefs: [{ orderable: false, targets: 2 }] });
        $('#category_id, #status').on('change', function () { S.filterSubmit(['status', 'category_id']); });
        $('label[for="excelUpload"]').on('click', function (e) {
          e.preventDefault();
          S.toast('Uploading a categories sheet is wired to the live system, not to this walkthrough.');
        });
        $('#exportExcel').on('click', function () {
          S.toast('Export Excel is wired to the live system, not to this walkthrough.');
        });
      }
    });
  }

  if (S.PAGE === 'access-list') accessList();
  if (S.PAGE === 'whitelist-forms-categories-list') formsCategories();
  if (S.PAGE === 'assign-access') {
    S.render({ footer: 'after', body: S.formCard('Assign Access', accessForm(null)), init: function ($) { wireAccessForm($, null); } });
  }
  if (S.PAGE === 'edit-access') {
    var access = IAM.find('access', S.q('id')) || db.access.filter(function (a) { return a.status_id === 1; })[0];
    S.render({ footer: 'after', body: S.formCard('Edit Access', accessForm(access)), init: function ($) { wireAccessForm($, access); } });
  }
})();
