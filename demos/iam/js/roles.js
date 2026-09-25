// roles-list.php, add-role.php and edit-role.php.
(function () {
  'use strict';
  var S = Shell, F = S.F, esc = S.esc, db = IAM.db;
  var IAM_PORTAL_ID = 6;

  function byName(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; }

  function rolesList() {
    var status = S.q('status'); if (status === null) status = '1';
    var portal = S.q('portal_id') || '';
    var portals = {};
    db.portals.forEach(function (p) { portals[p.id] = p.name; });
    var list = db.roles.filter(function (r) {
      if (r.deleted_by) return false;
      if (status !== '' && String(r.status_id) !== status) return false;
      if (portal && String(r.portal_id) !== portal) return false;
      return true;
    }).sort(function (a, b) { return b.id - a.id; });

    var rows = list.map(function (r) {
      return '<tr><td>' + (portals[r.portal_id] ? esc(portals[r.portal_id]) : '-') + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.description) + '</td>' +
        '<td>' + S.badge(r.status_id > 0) + '</td><td>' + S.actions('edit-role.html?id=' + r.id, 'delete-role', r.id) + '</td></tr>';
    }).join('');

    var filters = '<div class="filter-section mb-3 mt-3"><form action="" method="GET" id="filterForm" class="row g-3">' + S.statusFilter(status) +
      '<div class="col-md-3"><label for="portal_id" class="form-control-label">Filter by Portal</label><select class="form-select" id="portal_id" name="portal_id">' +
      S.options(db.portals.map(function (p) { return [p.id, p.name]; }), portal, 'All Portals') + '</select></div>' +
      '<div class="text-end"><a href="add-role.html" class="btn btn-dark"><i class="fas fa-plus me-2"></i>Add Role</a></div></form></div>';

    var table = '<table id="roles_list" class="table table-hover data-table" cellspacing="0" style="width:100%"><thead class="thead-light"><tr>' +
      '<th>Portal</th><th>Name</th><th>Description</th><th>Status</th><th class="col-md-1">Action</th></tr></thead><tbody>' + rows + '</tbody></table>';

    S.render({
      body: S.listCard('Roles List', S.flash() + filters + table),
      after: S.deleteModal('deleteRoleModal', 'Are you sure you want to delete this role?'),
      init: function ($) {
        S.table($, '#roles_list');
        $('#roles_list').on('click', '.delete-role', function (e) {
          e.preventDefault();
          var r = IAM.find('roles', $(this).data('id'));
          var modal = new bootstrap.Modal(document.getElementById('deleteRoleModal'));
          document.getElementById('deleteRoleModalBody').innerHTML = 'Are you sure you want to delete role: ' + esc(r.name) + ' (' + esc(portals[r.portal_id] || '') + ')?';
          document.getElementById('confirmDeleteBtn').onclick = function (ev) {
            ev.preventDefault();
            IAM.update('roles', r.id, { status_id: 0, deleted_by: IAM.USER_ID, deleted_at: IAM.stamp(new Date()) });
            db.access.forEach(function (a) { if (a.role_id === r.id) { a.status_id = 0; a.deleted_by = IAM.USER_ID; } });
            IAM.save();
            S.go('roles-list', 1, 'remove', 'Successfully deleted role: ' + r.name + '.');
          };
          modal.show();
        });
        $('#status, #portal_id').on('change', function () { S.filterSubmit(['status', 'portal_id']); });
      }
    });
  }

  function checks(name, prefix, items, selected) {
    return items.map(function (it) {
      return '<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" name="' + name + '[]" id="' + prefix + it[0] +
        '" value="' + it[0] + '"' + (selected.indexOf(String(it[0])) !== -1 ? ' checked' : '') + '>' +
        '<label class="form-check-label fs-6" for="' + prefix + it[0] + '">' + esc(it[1]) + '</label></div>';
    }).join('');
  }

  function roleForm(role) {
    var edit = !!role;
    role = role || { portal_id: '', name: '', description: '', status_id: 1 };
    var portals = db.portals.filter(function (p) { return !p.deleted_by && p.is_mobile === 0 && (edit || p.status_id === 1); }).sort(byName);
    var portalOptions = '<option value="">Select Portal</option>' + portals.map(function (p) {
      return '<option value="' + p.id + '"' + (edit ? ' data-status="' + p.status_id + '"' : '') + (p.id === role.portal_id ? ' selected' : '') + '>' +
        esc(p.name) + (edit && p.status_id === 0 ? ' (Inactive)' : '') + '</option>';
    }).join('');
    var depts = db.departments.filter(function (d) { return d.status_id === 1; }).sort(byName).map(function (d) { return [d.id, d.name]; });
    var iamPortals = db.portals.filter(function (p) { return p.status_id === 1 && p.id !== IAM_PORTAL_ID && p.is_mobile === 0; }).sort(byName)
      .map(function (p) { return [p.id, p.name]; });
    var selDept = role.department_access_id ? String(role.department_access_id).split(',') : [];
    var selPortal = role.portal_access_id ? String(role.portal_access_id).split(',') : [];

    return '<form action="#" method="post" novalidate>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="portal_id" class="' + F.label + '">Portal*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="portal_id" name="portal_id">' + portalOptions + '</select><span class="' + F.errorMessage + '"></span></div></div>' +
      (edit ? '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="status_id" class="' + F.label + '">Status*</label></div>' +
        '<div class="' + F.selectDiv + '"><select class="' + F.select + '" id="status_id" name="status_id">' +
        '<option value="1"' + (role.status_id === 1 ? ' selected' : '') + '>Active</option><option value="0"' + (role.status_id === 0 ? ' selected' : '') + '>Inactive</option></select>' +
        '<small class="form-text text-danger" id="portal-inactive-warning" style="display: none;"><i class="fas fa-exclamation-triangle"></i> The selected portal is inactive. This role will be automatically set to inactive.</small>' +
        '</div></div>' : '') +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="name" class="' + F.label + '">Role Name*</label></div>' +
      '<div class="' + F.inputDiv + '"><input type="text" class="' + F.input + ' " id="name" name="name" placeholder="Input Role Name" value="' + esc(role.name) + '"><span class="' + F.errorMessage + '"></span></div></div>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="description" class="' + F.label + '">Description*</label></div>' +
      '<div class="' + F.inputDiv + '"><textarea class="' + F.input + ' " rows="3" id="description" name="description" placeholder="Input Description">' + esc(role.description) + '</textarea><span class="' + F.errorMessage + '"></span></div></div>' +
      '<div id="iam-config-section" style="display: ' + (role.portal_id === IAM_PORTAL_ID ? 'block' : 'none') + ';"><hr>' +
      '<h6 class="text-muted fw-bold text-uppercase mb-3 mt-2">IAM Access Configuration</h6>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label class="' + F.label + '">Department Access</label>' +
      '<small class="text-muted d-block">Departments whose users this IAM admin can manage</small></div>' +
      '<div class="' + F.checkBoxListDiv + '">' + checks('dept_access', 'dept_', depts, selDept) + '</div></div>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label class="' + F.label + '">Portal Access</label>' +
      '<small class="text-muted d-block">Portals this IAM admin can assign roles for</small></div>' +
      '<div class="' + F.checkBoxListDiv + '">' + checks('portal_access', 'portal_', iamPortals, selPortal) + '</div></div>' +
      '</div>' + S.submitButton(edit) + '</form>';
  }

  function wireRoleForm(role) {
    var edit = !!role;
    var portalSelect = document.getElementById('portal_id');
    var statusSelect = document.getElementById('status_id');
    var iamSection = document.getElementById('iam-config-section');
    function checkPortalStatus() {
      if (!edit) return;
      var opt = portalSelect.options[portalSelect.selectedIndex];
      var warning = document.getElementById('portal-inactive-warning');
      if (opt.getAttribute('data-status') === '0') { statusSelect.value = '0'; statusSelect.disabled = true; warning.style.display = 'block'; }
      else { statusSelect.disabled = false; warning.style.display = 'none'; }
    }
    checkPortalStatus();
    portalSelect.addEventListener('change', function () {
      checkPortalStatus();
      iamSection.style.display = portalSelect.value === String(IAM_PORTAL_ID) ? 'block' : 'none';
    });

    document.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('name').value.trim();
      var description = document.getElementById('description').value.trim();
      var portalId = Number(portalSelect.value);
      var errs = {};
      if (!name) errs.name = 'Please enter a role name.';
      else if (name.indexOf('|') !== -1) errs.name = "Role name cannot contain '|' character";
      else if (db.roles.some(function (r) { return r.name === name && r.portal_id === portalId && r.status_id === 1 && (!edit || r.id !== role.id); })) {
        errs.name = 'This role name already exists for the selected portal.';
      }
      if (!description) errs.description = 'Please enter a description.';
      if (!portalId) errs.portal_id = 'Please select a Portal.';
      ['name', 'description', 'portal_id'].forEach(function (id) { S.setError(document.getElementById(id), errs[id]); });
      if (Object.keys(errs).length) return;

      var dept = [], portals = [];
      document.querySelectorAll('input[name="dept_access[]"]:checked').forEach(function (c) { dept.push(c.value); });
      document.querySelectorAll('input[name="portal_access[]"]:checked').forEach(function (c) { portals.push(c.value); });
      var row = {
        name: name, description: description, portal_id: portalId,
        department_access_id: portalId === IAM_PORTAL_ID && dept.length ? dept.join(',') : null,
        portal_access_id: portalId === IAM_PORTAL_ID && portals.length ? portals.join(',') : null
      };
      if (edit) {
        var opt = portalSelect.options[portalSelect.selectedIndex];
        row.status_id = opt.getAttribute('data-status') === '0' ? 0 : Number(statusSelect.value);
        IAM.update('roles', role.id, row);
        S.go('roles-list', 1, 'edit', 'Successfully edited role: ' + name + '.');
      } else {
        row.status_id = 1;
        IAM.insert('roles', row);
        S.go('roles-list', 1, 'add', 'Successfully added role: ' + name + '.');
      }
    });
  }

  if (S.PAGE === 'roles-list') rolesList();
  if (S.PAGE === 'add-role') {
    S.render({ footer: 'after', body: S.formCard('Add Role', roleForm(null)), init: function () { wireRoleForm(null); } });
  }
  if (S.PAGE === 'edit-role') {
    var role = IAM.find('roles', S.q('id')) || IAM.find('roles', 76);
    S.render({ footer: 'after', body: S.formCard('Edit Role', roleForm(role)), init: function () { wireRoleForm(role); } });
  }
})();
