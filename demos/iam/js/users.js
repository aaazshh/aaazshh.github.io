// users-list.php, add-user.php and edit-user.php.
(function () {
  'use strict';
  var S = Shell, F = S.F, esc = S.esc, db = IAM.db;

  function deptName(id) { var d = IAM.find('departments', id); return d ? d.name : 'None'; }
  function outletCode(id) { var o = IAM.find('outlets', id); return o ? o.code : '-'; }
  var BRANCH_OPS = (db.departments.filter(function (d) { return d.name === 'Branch Ops Management'; })[0] || {}).id;

  // $IpsOrderFormFields, $PmtFreshFormFields and $PmtSeafoodFormFields from config.php.
  var IPS_FIELDS = [
    ['Auto Replenishment', { type: 'checkbox', label: 'Auto Replenishment', value: 'ai_enable' }],
    ['Immediate Processing', { type: 'checkbox', label: 'Immediate Processing', value: 'immediate_active' }],
    ['Instant Submission', { type: 'checkbox', label: 'Instant Submission', value: 'is_urgent' }],
    ['Outlet Code', { type: 'dropdown', label: 'Outlet Code', value: 'outlet_code', options: 'outlets' }]
  ];
  var PLATFORMS = [[1, 'Fruits'], [2, 'Vegetables'], [3, 'Seafood (NOT USED)'], [4, 'Eggs'], [5, 'Packing Materials'], [6, 'Frozen'], [7, 'Non-trade (NOT USED)']];
  var FRESH_FIELDS = [
    ['address', { type: 'text', label: 'Address', placeholder: 'Input Address' }],
    ['sage_cust_no', { type: 'text', label: 'Sage Customer No', placeholder: 'Input Sage Customer No' }],
    ['sage_name', { type: 'text', label: 'Sage Name', placeholder: 'Input Sage Name' }],
    ['outlet_name', { type: 'text', label: 'Outlet Name', placeholder: 'Input Outlet Name' }],
    ['signature_name', { type: 'text', label: 'Signature Name', placeholder: 'Input Signature Name' }],
    ['platforms', { type: 'dropdown', label: 'Platforms', multiple: true, options: PLATFORMS }],
    ['preview_mode', { type: 'checkbox', label: 'Preview Mode' }],
    ['do_send_to_nav', { type: 'checkbox', label: 'DO Send To NAV' }],
    ['standing_order_amendable', { type: 'checkbox', label: 'Standing Order Amendable' }]
  ];
  var SEAFOOD_FIELDS = [
    ['addressSea', { type: 'text', label: 'Address', placeholder: 'Input Address' }],
    ['sage_cust_noSea', { type: 'text', label: 'Sage Customer No', placeholder: 'Input Sage Customer No' }],
    ['sage_nameSea', { type: 'text', label: 'Sage Name', placeholder: 'Input Sage Name' }]
  ];
  var PORTAL_BLOCKS = [[3, 'IPS Order', 'IPS FIELD(S)', IPS_FIELDS], [1, 'PMT Fresh', 'PMT FRESH FIELD(S)', FRESH_FIELDS],
    [2, 'PMT Seafood', 'PMT SEAFOOD FIELD(S)', SEAFOOD_FIELDS]];

  // generateFormFields() from config.php.
  function field(name, cfg, values) {
    var key = cfg.value || name;
    var val = values[key];
    var id = name.replace(/_/g, '-');
    var out = '<div class="' + F.sectionDiv + '" id="' + id + '-section" style=""><div class="' + F.labelDiv + '">' +
      '<label for="' + name + '" class="' + F.label + '" id="' + id + '-label">' + cfg.label + '</label></div><div class="' + F.inputDiv + '">';
    if (cfg.type === 'text') {
      out += '<input type="text" class="' + F.input + ' " id="' + name + '" name="' + name + '" placeholder="' + cfg.placeholder + '" value="' + esc(val || '') + '">';
    } else if (cfg.type === 'checkbox') {
      out += '<input type="hidden" name="' + name + '" value="0"><input type="checkbox" class="' + F.checkBox + '" id="' + name + '" name="' + name + '" value="1"' +
        (val ? ' checked' : '') + '><label class="form-check-label" for="' + name + '"> Enabled </label>';
    } else {
      var opts = cfg.options === 'outlets'
        ? [['', '-- SELECT OUTLET CODE --']].concat(db.outlets.filter(function (o) { return o.active; })
          .sort(function (a, b) { return a.code < b.code ? -1 : 1; }).map(function (o) { return [o.code, o.code]; }))
        : cfg.options;
      out += '<select class="' + F.input + (cfg.multiple ? ' select2-multiple' : '') + ' " id="' + name + '" name="' + name + (cfg.multiple ? '[]" multiple' : '"') + '>' +
        S.options(opts, cfg.multiple ? (val || []) : (val || '')) + '</select>';
    }
    return out + '<span class="' + F.errorMessage + '"></span></div></div>';
  }

  function row(label, forId, control) {
    return '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="' + forId + '" class="' + F.label + '">' + label + '</label></div>' +
      '<div class="' + F.inputDiv + '">' + control + '</div></div>';
  }

  function input(type, id, placeholder, value, disabled) {
    return '<input type="' + type + '" class="' + F.input + ' " id="' + id + '" name="' + id + '" placeholder="' + placeholder + '" value="' + esc(value || '') + '"' +
      (disabled ? ' disabled' : '') + '><span class="' + F.errorMessage + '"></span>';
  }

  // add-user.php and edit-user.php share their markup.
  function userForm(user) {
    var edit = !!user;
    user = user || { status_id: 1, reset_password: 1, portal_fields: {} };
    var ms = edit && user.is_microsoft;
    var depts = db.departments.filter(function (d) { return edit ? !d.deleted_by : d.status_id === 1; })
      .sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    var deptOptions = '<option value="">Select Department</option>' + depts.map(function (d) {
      return '<option value="' + d.id + '"' + (edit ? ' data-status="' + d.status_id + '"' : '') + (d.id === user.department_id ? ' selected' : '') + '>' +
        esc(d.name) + (edit && d.status_id === 0 ? ' (Inactive)' : '') + '</option>';
    }).join('');
    var outlets = db.outlets.filter(function (o) { return o.active; }).sort(function (a, b) { return a.code < b.code ? -1 : 1; })
      .map(function (o) { return [o.id, o.code]; });
    var portals = db.portals.filter(function (p) { return p.status_id === 1 && !p.deleted_by; });
    var selectedPortals = edit && user.portal_fields[3] ? [3] : [];

    var values = {};
    [3, 1, 2].forEach(function (pid) {
      var f = user.portal_fields[pid] || {};
      for (var k in f) if (Object.prototype.hasOwnProperty.call(f, k)) values[k] = f[k];
    });

    var html = '<form action="#" method="post" id="' + (edit ? 'editUserForm' : 'addUserForm') + '" novalidate>' +
      row('Username*', 'username', input('text', 'username', 'Input Username', user.username, ms)) +
      row('Password*', 'password', input('password', 'password', 'Input Password', edit ? user.password : '', ms)) +
      row('Email*', 'email', input('email', 'email', 'Input Email', user.email, ms)) +
      row('Name*', 'name', input('text', 'name', 'Input Name', user.name, ms)) +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="department_id" class="' + F.label + '">' + (edit ? 'Department' : 'Department*') + '</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="department_id" name="department_id">' + deptOptions + '</select>' +
      '<span class="' + F.errorMessage + '"></span>' +
      (edit ? '<small class="form-text text-danger" id="department-inactive-warning" style="display: none;">The selected department is inactive. This user will be automatically set to inactive.</small>' : '') +
      '</div></div>' +
      '<div class="' + F.sectionDiv + '" id="outlet-section" style="display: ' + (user.department_id && user.department_id === BRANCH_OPS ? 'flex' : 'none') + ';">' +
      '<div class="' + F.labelDiv + '"><label for="outlet_id" class="' + F.label + '">Outlet*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="outlet_id" name="outlet_id">' + S.options(outlets, user.outlet_id || '', 'Select Outlet') + '</select>' +
      '<span class="' + F.errorMessage + '"></span></div></div>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="status_id" class="' + F.label + '">Status*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + '" id="status_id" name="status_id">' +
      '<option value="1"' + (user.status_id === 1 ? ' selected' : '') + '>Active</option><option value="0"' + (user.status_id === 0 ? ' selected' : '') + '>Inactive</option>' +
      '</select></div></div>' +
      row('Employee ID', 'employee_id', input('text', 'employee_id', 'Input Employee ID', user.employee_id)) +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="resetPasswordCheckbox" class="' + F.label + '"> Reset Password </label></div>' +
      '<div class="' + F.inputDiv + '"><input type="checkbox" class="' + F.checkBox + '" id="resetPasswordCheckbox" name="resetPassword"' + (user.reset_password ? ' checked' : '') + '></div></div>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="portals" class="' + F.label + '">Portal(s)</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="portals" name="portals[]" multiple="multiple">' +
      S.options(portals.map(function (p) { return [p.id, p.name]; }), selectedPortals) + '</select></div></div>';
    PORTAL_BLOCKS.forEach(function (b) {
      html += '<div id="' + b[1] + '" style="display: none;"><br><h4 class="text-center text-uppercase">' + b[2] + '</h4><hr>' +
        b[3].map(function (f) { return field(f[0], f[1], values); }).join('') + '</div>';
    });
    html += S.submitButton(edit) + '</form>';
    return html;
  }

  function wireUserForm($, user) {
    var edit = !!user;
    $('#portals').select2({ placeholder: 'Select Portal(s)', allowClear: true, width: '100%', closeOnSelect: false });
    var departmentSelect = document.getElementById('department_id');
    var outletSection = document.getElementById('outlet-section');
    var statusSelect = document.getElementById('status_id');
    var links = {};
    db.roles.forEach(function (r) {
      if (r.department_access_id && r.portal_access_id) links[r.department_access_id] = r.portal_access_id.split(',');
    });

    function updatePortalFields() {
      PORTAL_BLOCKS.forEach(function (b) { document.getElementById(b[1]).style.display = 'none'; });
      ($('#portals').val() || []).forEach(function (v) {
        var name = $('#portals > option[value="' + v + '"]').text().trim();
        var block = document.getElementById(name);
        if (block) block.style.display = 'block';
      });
      $('#platforms').select2({ placeholder: 'Nothing Selected', allowClear: true, width: '100%', closeOnSelect: false });
    }
    $('#portals').on('change', updatePortalFields);
    updatePortalFields();

    function checkDepartmentStatus() {
      var opt = departmentSelect.options[departmentSelect.selectedIndex];
      var warning = document.getElementById('department-inactive-warning');
      if (opt && opt.getAttribute('data-status') === '0') {
        statusSelect.value = '0';
        statusSelect.disabled = true;
        warning.style.display = 'block';
      } else {
        statusSelect.disabled = false;
        if (warning) warning.style.display = 'none';
      }
    }

    function toggleSections(initial) {
      var dept = departmentSelect.value;
      outletSection.style.display = dept && Number(dept) === BRANCH_OPS ? 'flex' : 'none';
      if (edit && initial) return;
      var link = links[dept];
      $('#portals').val(link || null).trigger('change');
    }
    if (!edit) toggleSections(true);
    departmentSelect.addEventListener('change', function () {
      toggleSections(false);
      if (edit) checkDepartmentStatus();
    });
    if (edit) checkDepartmentStatus();

    // check-username, check-email: api.php answers after a short delay.
    var timer;
    var usernameField = document.getElementById('username');
    var emailField = document.getElementById('email');
    function taken(field, value, message) {
      var hit = db.users.some(function (u) { return u[field] === value && u.status_id === 1 && (!user || u.id !== user.id); });
      return hit ? message : '';
    }
    if (!edit) {
      usernameField.addEventListener('input', function () {
        var v = this.value;
        if (v.trim() === '') return;
        clearTimeout(timer);
        timer = setTimeout(function () { S.setError(usernameField, taken('username', v, 'This username is taken.')); }, 500);
      });
      emailField.addEventListener('blur', function () {
        if (this.value.trim() === '') return;
        var hit = db.users.some(function (u) { return u.email === emailField.value; });
        S.setError(emailField, hit ? 'This email is taken.' : '');
      });
    }

    document.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var username = usernameField.value.trim(), email = emailField.value.trim();
      var password = document.getElementById('password').value, name = document.getElementById('name').value.trim();
      var dept = departmentSelect.value, outlet = document.getElementById('outlet_id').value;
      var ms = edit && user.is_microsoft;
      var errs = {};
      if (!ms) {
        if (!username) errs.username = 'Please enter a username.';
        else if (username.indexOf('|') !== -1) errs.username = "Username cannot contain '|' character";
        else if (!edit && taken('username', username, 'x')) errs.username = 'This username is already taken.';
        if (!password.trim()) errs.password = 'Please enter a password.';
        if (!email) errs.email = 'Please enter an email.';
        else if (email.indexOf('|') !== -1) errs.email = "Email cannot contain '|' character";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "The email address '" + email + "' is invalid.";
        else if (taken('email', email, 'x')) errs.email = 'This email is already taken.';
        if (!name) errs.name = 'Please enter a name.';
        else if (name.indexOf('|') !== -1) errs.name = "Name cannot contain '|' character";
      }
      if (!edit && !dept) errs.department_id = 'Please select a department.';
      if (dept && Number(dept) === BRANCH_OPS && !outlet) errs.outlet_id = 'Please select an Outlet.';
      ['username', 'password', 'email', 'name', 'department_id', 'outlet_id'].forEach(function (id) {
        S.setError(document.getElementById(id), errs[id]);
      });
      if (Object.keys(errs).length) return;

      var portalFields = edit ? user.portal_fields : {};
      ($('#portals').val() || []).forEach(function (pid) {
        var block = PORTAL_BLOCKS.filter(function (b) { return String(b[0]) === String(pid); })[0];
        if (!block) return;
        var vals = {};
        block[3].forEach(function (f) {
          var el = document.getElementById(f[0]);
          var key = f[1].value || f[0];
          if (f[1].type === 'checkbox') vals[key] = el.checked ? 1 : 0;
          else if (f[1].multiple) vals[key] = $(el).val() || [];
          else vals[key] = el.value;
        });
        portalFields[pid] = vals;
      });

      var status = Number(statusSelect.value);
      var opt = departmentSelect.options[departmentSelect.selectedIndex];
      if (opt && opt.getAttribute('data-status') === '0') status = 0;
      var patch = {
        department_id: dept ? Number(dept) : null,
        outlet_id: dept && Number(dept) === BRANCH_OPS && outlet ? Number(outlet) : null,
        status_id: status, employee_id: document.getElementById('employee_id').value.trim() || null,
        reset_password: document.getElementById('resetPasswordCheckbox').checked ? 1 : 0, portal_fields: portalFields
      };
      if (!ms) { patch.username = username; patch.email = email; patch.name = name; patch.password = 'hashed'; }
      if (edit) {
        IAM.update('users', user.id, patch);
        S.go('users-list', 1, 'edit', 'Successfully edited user: ' + (ms ? user.username : username) + '.');
      } else {
        patch.role_id = 0; patch.is_microsoft = 0; patch.last_login = null; patch.is_hod = 0;
        IAM.insert('users', patch);
        S.go('users-list', 1, 'add', 'Successfully added user: ' + username + '.');
      }
    });
  }

  function usersList() {
    var status = S.q('status'); if (status === null) status = '1';
    var dept = S.q('department') || '', ms = S.q('is_microsoft') || '', portal = Number(S.q('portal') || 0);
    var depts = db.departments.filter(function (d) { return d.status_id === 1; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    var list = db.users.filter(function (u) {
      if (status !== '' && String(u.status_id) !== status) return false;
      if (dept && String(u.department_id) !== dept) return false;
      if (ms !== '' && String(u.is_microsoft) !== ms) return false;
      return true;
    });
    // The portal filter joins access, so a user appears once per matching role.
    if (portal) {
      var expanded = [];
      list.forEach(function (u) {
        db.access.forEach(function (a) {
          var r = IAM.find('roles', a.role_id);
          if (a.user_id === u.id && r && r.portal_id === portal) expanded.push(u);
        });
      });
      list = expanded;
    }
    var seen = {};
    list = list.filter(function (u) { if (seen[u.id]) return false; seen[u.id] = 1; return true; });

    var rows = list.map(function (u) {
      return '<tr><td><input type="text" class="' + F.input + ' employeeId" value="' + esc(u.employee_id || '') + '" id="employeeId' + u.id + '" data-user-id="' + u.id + '"></td>' +
        '<td>' + esc(u.username) + '</td><td>' + esc(u.name) + '</td><td>' + esc(u.email || 'None') + '</td>' +
        '<td>' + esc(deptName(u.department_id)) + '</td><td>' + esc(outletCode(u.outlet_id)) + '</td>' +
        '<td>' + (u.is_microsoft ? 'Microsoft' : 'Non-Microsoft') + '</td><td>' + S.badge(u.status_id > 0) + '</td>' +
        '<td><a href="edit-user.html?id=' + u.id + '" class="' + S.T.actionButton + '"><i class="fas fa-edit"></i></a> | ' +
        '<a href="#" class="' + S.T.actionButton + ' delete-user" data-id="' + u.id + '"><i class="fas fa-trash-alt"></i></a></td></tr>';
    }).join('');

    var filters = '<div class="filter-section mb-3 mt-3"><form action="" method="GET" id="filterForm" class="row g-3">' +
      S.statusFilter(status) +
      '<div class="col-md-3"><label for="status" class="form-control-label">Filter by Departments</label><select class="form-select" id="department" name="department">' +
      S.options(depts.map(function (d) { return [d.id, d.name]; }), dept, 'All Departments') + '</select></div>' +
      '<div class="col-md-3"><label for="status" class="form-control-label">Filter by Account Type</label><select class="form-select" id="is_microsoft" name="is_microsoft">' +
      '<option value="">All Types</option><option value="1"' + (ms === '1' ? ' selected' : '') + '>Microsoft</option><option value="0"' + (ms === '0' ? ' selected' : '') + '>Non-Microsoft</option></select></div>' +
      '<div class="col-md-3"><label for="status" class="form-control-label">Filter by Portal</label><select class="form-select" id="portal" name="portal">' +
      '<option value="0"' + (portal === 0 ? ' selected' : '') + '>All Users</option><option value="7"' + (portal === 7 ? ' selected' : '') + '>Digital Forms Users</option></select></div>' +
      '<div class="text-end d-flex justify-content-end gap-3 flex-wrap align-items-stretch"></div>' +
      '</form></div>';

    var table = '<table id="users_list" class="table table-hover data-table" cellspacing="0" style="width:100%"><thead class="thead-light"><tr>' +
      '<th>Employee ID</th><th>Username</th><th>Name</th><th>Email</th><th>Department</th><th>Outlet</th><th>Account Type</th><th>Status</th><th class="col-md-1">Action</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    S.render({
      before: '<div class="toast-container" id="toastContainer"></div>',
      body: S.listCard('Users List', S.flash() + filters + table, 'overflow: hidden;'),
      after: S.deleteModal('deleteUserModal', 'Are you sure you want to delete this user?'),
      init: function ($) {
        function showToast(title, message, type, duration) {
          var container = document.getElementById('toastContainer');
          var toast = document.createElement('div');
          var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
          toast.className = 'toast ' + type;
          toast.innerHTML = '<div class="toast-icon">' + icons[type] + '</div><div class="toast-content"><div class="toast-title">' + title +
            '</div><div class="toast-message">' + esc(message) + '</div></div><button class="toast-close">x</button>';
          container.appendChild(toast);
          toast.querySelector('.toast-close').addEventListener('click', function () { closeToast(toast); });
          setTimeout(function () { closeToast(toast); }, duration || 2000);
        }
        function closeToast(toast) {
          toast.classList.add('hiding');
          setTimeout(function () { toast.remove(); }, 300);
        }

        // update-employee-id in api.php, including its messages.
        function saveEmployeeId(userId) {
          var field = $('#employeeId' + userId);
          var oldValue = field.data('original-value');
          var newValue = field.val();
          if (oldValue === newValue || (!oldValue && !newValue)) return;
          var u = IAM.find('users', userId);
          if ((u.employee_id || '') === newValue) {
            field.data('original-value', newValue);
            showToast('Success', 'No changes made to ' + u.username, 'success');
            return;
          }
          if (newValue) {
            var other = db.users.filter(function (x) { return x.employee_id === newValue; })[0];
            if (other) {
              field.val(oldValue);
              field.focus();
              showToast('Error', 'Failed to update for ' + u.username + ' Employee ID: ' + newValue + ' has been taken by ' + other.username, 'error', 10000);
              return;
            }
          }
          IAM.update('users', userId, { employee_id: newValue || null });
          field.data('original-value', newValue);
          showToast('Success', newValue ? 'Employee ID (' + newValue + ') updated successfully for' + u.username : 'Removed Employee ID successfully for' + u.username, 'success');
        }

        $.fn.dataTable.ext.order['dom-input'] = function (settings, col) {
          return this.api().column(col, { order: 'index' }).nodes().map(function (td) { return $('input', td).val(); });
        };
        function bindInputs() {
          document.querySelectorAll('.employeeId').forEach(function (inp) {
            if (inp.dataset.bound) return;
            inp.dataset.bound = '1';
            var id = inp.dataset.userId;
            inp.addEventListener('blur', function () { saveEmployeeId(id); });
            inp.addEventListener('keyup', function (e) { if (e.keyCode === 13) saveEmployeeId(id); });
          });
        }
        var table = S.table($, '#users_list', {
          columnDefs: [{ className: 'align-middle', targets: '_all' }, { targets: 0, orderDataType: 'dom-input' }],
          initComplete: bindInputs
        });
        table.on('draw', bindInputs);
        $('#users_list_wrapper > .row.mt-2.justify-content-md-center').css('overflow-x', 'auto').css('overflow-y', 'hidden');

        $('#users_list').on('click', '.delete-user', function (e) {
          e.preventDefault();
          var id = $(this).data('id');
          var u = IAM.find('users', id);
          var modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
          document.getElementById('deleteUserModalBody').innerHTML = 'Are you sure you want to delete user: ' + esc(u.username) + '?';
          var btn = document.getElementById('confirmDeleteBtn');
          btn.onclick = function (ev) {
            ev.preventDefault();
            IAM.update('users', id, { status_id: 0, deleted_by: IAM.USER_ID, deleted_at: IAM.stamp(new Date()) });
            db.access.forEach(function (a) { if (a.user_id === u.id) a.status_id = 0; });
            IAM.save();
            S.go('users-list', 1, 'remove', 'Successfully deleted user: ' + u.username + '.');
          };
          modal.show();
        });
        $('#status, #department, #is_microsoft, #portal').on('change', function () {
          S.filterSubmit(['status', 'department', 'is_microsoft', 'portal']);
        });
      }
    });
  }

  if (S.PAGE === 'users-list') usersList();
  if (S.PAGE === 'add-user') {
    S.render({ footer: 'after', body: S.formCard('Add User', userForm(null)), init: function ($) { wireUserForm($, null); } });
  }
  if (S.PAGE === 'edit-user') {
    var user = IAM.find('users', S.q('id'));
    if (!user) user = db.users[1];
    S.render({ footer: 'after', body: S.formCard('Edit User', userForm(user)), init: function ($) { wireUserForm($, user); } });
  }
})();
