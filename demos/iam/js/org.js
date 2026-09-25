// department-list.php, add/edit-department.php, portal-list.php,
// add/edit-portal.php and outlet-list.php.
(function () {
  'use strict';
  var S = Shell, F = S.F, esc = S.esc, db = IAM.db;

  function textRow(label, id, placeholder, value) {
    return '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="' + id + '" class="' + F.label + '">' + label + '</label></div>' +
      '<div class="' + F.inputDiv + '"><input type="text" class="' + F.input + ' " id="' + id + '" name="' + id + '" placeholder="' + placeholder + '" value="' + esc(value || '') + '">' +
      '<span class="' + F.errorMessage + '"></span></div></div>';
  }
  function statusRow(value) {
    return '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="status_id" class="' + F.label + '">Status*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + '" id="status_id" name="status_id">' +
      '<option value="1"' + (value === 1 ? ' selected' : '') + '>Active</option><option value="0"' + (value === 0 ? ' selected' : '') + '>Inactive</option></select></div></div>';
  }
  function val(id) { return document.getElementById(id).value.trim(); }

  function simpleList(o) {
    var status = S.q('status'); if (status === null) status = '1';
    var rows = o.rows(status).join('');
    var filters = '<div class="filter-section mb-3 mt-3"><form action="" method="GET" id="filterForm" class="row g-3">' + S.statusFilter(status) +
      (o.button || '') + '</form></div>';
    var table = '<table id="' + o.tableId + '" class="table table-hover data-table" cellspacing="0" style="width:100%"><thead class="thead-light"><tr>' +
      o.head + '</tr></thead><tbody>' + rows + '</tbody></table>';
    S.render({
      body: S.listCard(o.title, S.flash() + filters + table),
      after: o.modal ? S.deleteModal(o.modal[0], o.modal[1]) : '',
      init: function ($) {
        S.table($, '#' + o.tableId);
        if (o.scroll) $('#' + o.tableId + '_wrapper > .row.mt-2.justify-content-md-center').css('overflow-x', 'auto').css('overflow-y', 'hidden');
        if (o.onDelete) {
          $('#' + o.tableId).on('click', '.' + o.deleteClass, function (e) {
            e.preventDefault();
            o.onDelete(Number($(this).data('id')));
          });
        }
        $('#status').on('change', function () { S.filterSubmit(['status']); });
      }
    });
  }

  function confirmDelete(modalId, text, run) {
    var modal = new bootstrap.Modal(document.getElementById(modalId));
    document.getElementById(modalId + 'Body').innerHTML = text;
    document.getElementById('confirmDeleteBtn').onclick = function (ev) { ev.preventDefault(); run(); };
    modal.show();
  }

  // Departments
  function departmentList() {
    simpleList({
      title: 'Department List', tableId: 'departments_list', deleteClass: 'delete-department',
      head: '<th>Code</th><th>Name</th><th>Status</th><th class="col-md-1">Action</th>',
      button: '<div class="text-end"><a href="add-department.html" class="' + S.B.blackButton + '"><i class="fas fa-plus me-2"></i>Add Department</a></div>',
      modal: ['deleteDepartmentModal', 'Are you sure you want to delete this department?'],
      rows: function (status) {
        return db.departments.filter(function (d) {
          return !d.deleted_by && (status === '' ? true : String(d.status_id) === status);
        }).sort(function (a, b) { return a.code < b.code ? -1 : 1; }).map(function (d) {
          return '<tr><td>' + esc(d.code) + '</td><td>' + esc(d.name) + '</td><td>' + S.badge(d.status_id > 0) + '</td><td>' +
            S.actions('edit-department.html?id=' + d.id, 'delete-department', d.id) + '</td></tr>';
        });
      },
      onDelete: function (id) {
        var d = IAM.find('departments', id);
        confirmDelete('deleteDepartmentModal', 'Are you sure you want to delete department: ' + esc(d.name) + '?', function () {
          var stamp = IAM.stamp(new Date());
          IAM.update('departments', id, { status_id: 0, deleted_by: IAM.USER_ID, deleted_at: stamp });
          db.users.forEach(function (u) {
            if (u.department_id === id && !u.deleted_by) { u.status_id = 0; u.deleted_by = IAM.USER_ID; u.deleted_at = stamp; }
          });
          db.access.forEach(function (a) {
            var u = IAM.find('users', a.user_id);
            if (u && u.department_id === id && !a.deleted_by) { a.status_id = 0; a.deleted_by = IAM.USER_ID; a.deleted_at = stamp; }
          });
          IAM.save();
          S.go('department-list', 1, 'remove', 'Successfully deleted department: ' + d.code + '.');
        });
      }
    });
  }

  function departmentForm(d) {
    var edit = !!d;
    d = d || {};
    S.render({
      footer: 'after',
      body: S.formCard(edit ? 'Edit Department' : 'Add Department',
        '<form action="#" method="post"' + (edit ? '' : ' id="addDepartmentForm"') + ' novalidate>' +
        textRow('Department Name*', 'name', 'Input Department Name', d.name) +
        textRow('Department Code*', 'code', 'Input Department Code', d.code) +
        (edit ? statusRow(d.status_id) : '') + S.submitButton(edit) + '</form>'),
      init: function () {
        document.querySelector('form').addEventListener('submit', function (e) {
          e.preventDefault();
          var code = val('code'), name = val('name'), errs = {};
          var clash = function (field, v) {
            return db.departments.some(function (x) { return !x.deleted_by && x[field] === v && (!edit || x.id !== d.id); });
          };
          if (!code) errs.code = 'Please enter a Department Code.';
          else if (code.indexOf('|') !== -1) errs.code = "Department code cannot contain '|' character";
          else if (clash('code', code)) errs.code = 'This Department Code is already taken.';
          if (!name) errs.name = 'Please enter a Department Name.';
          else if (name.indexOf('|') !== -1) errs.name = "Department name cannot contain '|' character";
          else if (clash('name', name)) errs.name = 'This Department Name is already taken.';
          ['code', 'name'].forEach(function (id) { S.setError(document.getElementById(id), errs[id]); });
          if (Object.keys(errs).length) return;
          if (edit) {
            IAM.update('departments', d.id, { code: code, name: name, status_id: Number(val('status_id')) });
            S.go('department-list', 1, 'edit', 'Successfully edited department: ' + code + '.');
          } else {
            IAM.insert('departments', { code: code, name: name, status_id: 1 });
            S.go('department-list', 1, 'add', 'Successfully added Department: ' + code + '.');
          }
        });
      }
    });
  }

  // Portals
  function portalList() {
    simpleList({
      title: 'Portal List', tableId: 'portals_list', deleteClass: 'delete-portal', scroll: true,
      head: '<th>Name</th><th>URL</th><th>Status</th><th class="col-md-1">Action</th>',
      button: '<div class="text-end"><a href="add-portal.html" class="' + S.B.blackButton + '"><i class="fas fa-plus me-2"></i>Add Portal</a></div>',
      modal: ['deletePortalModal', 'Are you sure you want to delete this portal?'],
      rows: function (status) {
        return db.portals.filter(function (p) {
          return !p.deleted_by && p.is_mobile === 0 && (status === '' ? true : String(p.status_id) === status);
        }).sort(function (a, b) { return a.id - b.id; }).map(function (p) {
          return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.url) + '</td><td>' + S.badge(p.status_id > 0) + '</td><td>' +
            S.actions('edit-portal.html?id=' + p.id, 'delete-portal', p.id) + '</td></tr>';
        });
      },
      onDelete: function (id) {
        var p = IAM.find('portals', id);
        confirmDelete('deletePortalModal', 'Are you sure you want to delete portal: ' + esc(p.name) + '?', function () {
          var stamp = IAM.stamp(new Date());
          IAM.update('portals', id, { status_id: 0, deleted_by: IAM.USER_ID, deleted_at: stamp });
          db.roles.forEach(function (r) { if (r.portal_id === id && !r.deleted_by) { r.status_id = 0; r.deleted_by = IAM.USER_ID; } });
          db.access.forEach(function (a) {
            var r = IAM.find('roles', a.role_id);
            if (r && r.portal_id === id && !a.deleted_by) { a.status_id = 0; a.deleted_by = IAM.USER_ID; a.deleted_at = stamp; }
          });
          IAM.save();
          S.go('portal-list', 1, 'remove', 'Successfully deleted portal: ' + p.name + '.');
        });
      }
    });
  }

  function portalForm(p) {
    var edit = !!p;
    p = p || {};
    S.render({
      footer: 'after',
      body: S.formCard(edit ? 'Edit Portal' : 'Add Portal',
        '<form action="#" method="post"' + (edit ? '' : ' id="addPortalForm"') + ' novalidate>' +
        textRow('Portal Name*', 'name', 'Input Portal Name', p.name) +
        textRow('Portal URL*', 'url', 'Input Portal URL', p.url) +
        textRow('Encryption Key*', 'encrypt_key', 'Input Encryption Key of Portal', p.encrypt_key) +
        (edit ? statusRow(p.status_id) : '') + S.submitButton(edit) + '</form>'),
      init: function () {
        document.querySelector('form').addEventListener('submit', function (e) {
          e.preventDefault();
          var name = val('name'), url = val('url'), errs = {};
          var host = '';
          try { host = new URL(url).hostname; } catch (err) { host = null; }
          var clean = url.replace(/\/$/, '');
          if (!url) errs.url = 'Please enter URL of the Portal.';
          else if (host === null) errs.url = 'Invalid URL format.';
          else if (!edit && !/\.com\/?$/i.test(host)) errs.url = 'URL must end with .com domain.';
          else if (db.portals.some(function (x) { return !x.deleted_by && x.url === clean && (!edit || x.id !== p.id); })) errs.url = 'This URL is already taken by another portal.';
          if (!name) errs.name = 'Please enter a Portal Name.';
          else if (db.portals.some(function (x) { return !x.deleted_by && x.name === name && (!edit || x.id !== p.id); })) errs.name = 'This Portal Name is already taken.';
          ['url', 'name'].forEach(function (id) { S.setError(document.getElementById(id), errs[id]); });
          if (Object.keys(errs).length) return;
          var row = { name: name, url: clean, encrypt_key: val('encrypt_key') };
          if (edit) {
            row.status_id = Number(val('status_id'));
            IAM.update('portals', p.id, row);
            S.go('portal-list', 1, 'edit', 'Successfully edited portal: ' + name + '.');
          } else {
            row.status_id = 1; row.is_mobile = 0;
            IAM.insert('portals', row);
            S.go('portal-list', 1, 'add', 'Successfully added Portal: ' + name + '.');
          }
        });
      }
    });
  }

  // Outlets
  function outletList() {
    simpleList({
      title: 'Outlet List', tableId: 'outlet_list', scroll: true,
      head: '<th>Code</th><th>Name</th><th>Address</th><th>Post Code</th><th>Contact</th><th>Phone Number</th><th>Country</th><th>Company Name</th><th>Entity</th><th>Status</th>',
      button: '<div class="text-end"><a href="#" data-unbuilt="Sync Outlets" class="' + S.B.blackButton + '"><span><img src="assets/img/sync.png" class="img-fluid" style="width: 18px; margin-right: 2px;" alt=""></span> Sync Outlets</a></div>',
      rows: function (status) {
        return db.outlets.filter(function (o) { return status === '' ? true : String(o.active) === status; })
          .sort(function (a, b) { return b.id - a.id; }).map(function (o) {
            return '<tr><td>' + esc(o.code) + '</td><td>' + esc(o.name) + '</td><td>' + esc(o.address) + '</td><td>' + esc(o.post_code) + '</td>' +
              '<td>' + esc(o.contact) + '</td><td>' + esc(o.phone_no) + '</td><td>' + esc(o.country) + '</td><td>' + esc(o.company_name) + '</td>' +
              '<td>' + esc(o.entity) + '</td><td>' + S.badge(o.active > 0, o.active === 1 ? 'Active' : 'Inactive') + '</td></tr>';
          });
      }
    });
  }

  switch (S.PAGE) {
    case 'department-list': departmentList(); break;
    case 'add-department': departmentForm(null); break;
    case 'edit-department': departmentForm(IAM.find('departments', S.q('id')) || IAM.find('departments', 1)); break;
    case 'portal-list': portalList(); break;
    case 'add-portal': portalForm(null); break;
    case 'edit-portal': portalForm(IAM.find('portals', S.q('id')) || IAM.find('portals', 1)); break;
    case 'outlet-list': outletList(); break;
  }
})();
