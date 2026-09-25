// department-mapping-list.php, add/edit-department-mapping.php,
// bm-mapping-list.php and add/edit-bm-mapping.php.
(function () {
  'use strict';
  var S = Shell, F = S.F, esc = S.esc, db = IAM.db;

  function activeDepartments() {
    return db.departments.filter(function (d) { return d.status_id === 1; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }
  function noneIfEmpty(s) { return s ? s : 'None'; }
  function allEntras() {
    var seen = {};
    db.department_mapping.forEach(function (m) { if (!m.deleted_by) seen[m.entra] = 1; });
    return Object.keys(seen).sort();
  }
  function deptEntras(deptId) {
    return db.department_mapping.filter(function (m) { return m.department_id === deptId && !m.deleted_by && m.status_id === 1; });
  }
  function errorBelow(el, text) {
    var div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = text;
    el.parentNode.appendChild(div);
  }

  function departmentMappingList() {
    var status = S.q('status'); if (status === null) status = '1';
    var dept = S.q('department_id') || '';
    var list = db.department_mapping.filter(function (m) {
      if (m.deleted_by) return false;
      if (status !== '' && String(m.status_id) !== status) return false;
      if (dept && String(m.department_id) !== dept) return false;
      return true;
    }).sort(function (a, b) { return a.department < b.department ? -1 : a.department > b.department ? 1 : (a.entra < b.entra ? -1 : 1); });
    var rows = list.map(function (m) {
      return '<tr><td>' + esc(noneIfEmpty(m.department)) + '</td><td>' + esc(m.entra) + '</td><td>' + S.badge(m.status_id > 0) + '</td><td>' +
        S.actions('edit-department-mapping.html?id=' + m.id, 'delete-department-mapping', m.id) + '</td></tr>';
    }).join('');
    var filters = '<div class="filter-section mb-3 mt-3"><form action="" method="GET" id="filterForm" class="row g-3">' + S.statusFilter(status) +
      '<div class="col-md-3"><label for="department_id" class="form-control-label">Filter by Department</label><select class="form-select" id="department_id" name="department_id">' +
      S.options(activeDepartments().map(function (d) { return [d.id, d.name]; }), dept, 'All Departments') + '</select></div>' +
      '<div class="text-end"><a href="add-department-mapping.html" class="' + S.B.blackButton + '"><i class="fas fa-plus me-2"></i>Add Department Mapping</a></div></form></div>';
    var table = '<table id="departments_list" class="table table-hover data-table" cellspacing="0" style="width:100%"><thead class="thead-light"><tr>' +
      '<th>Department Name</th><th>Entra</th><th>Status</th><th class="col-md-1">Action</th></tr></thead><tbody>' + rows + '</tbody></table>';

    S.render({
      body: S.listCard('Department Mapping List', S.flash() + filters + table),
      after: S.deleteModal('deleteDepartmentMappingModal', 'Are you sure you want to delete this department mapping?'),
      init: function ($) {
        S.table($, '#departments_list');
        $('#departments_list').on('click', '.delete-department-mapping', function (e) {
          e.preventDefault();
          var m = IAM.find('department_mapping', $(this).data('id'));
          var modal = new bootstrap.Modal(document.getElementById('deleteDepartmentMappingModal'));
          document.getElementById('deleteDepartmentMappingModalBody').innerHTML = 'Are you sure you want to delete this department mapping? This action cannot be undone.';
          document.getElementById('confirmDeleteBtn').onclick = function (ev) {
            ev.preventDefault();
            var d = IAM.find('departments', m.department_id);
            IAM.update('department_mapping', m.id, { status_id: 0, deleted_by: IAM.USER_ID, deleted_at: IAM.stamp(new Date()) });
            S.go('department-mapping-list', 1, 'delete', 'Successfully deleted Department Mapping: ' + (d ? d.name : m.department) + ' - ' + m.entra + '.');
          };
          modal.show();
        });
        $('#status, #department_id').on('change', function () { S.filterSubmit(['status', 'department_id']); });
      }
    });
  }

  function departmentMappingForm(mapping) {
    var edit = !!mapping;
    var deptId = edit ? mapping.department_id : null;
    var depts = activeDepartments();
    var selected = deptId ? deptEntras(deptId).map(function (m) { return m.entra; }) : [];
    var entras = allEntras().map(function (e) { return [e, e]; });
    var html = '<form action="#" method="post"' + (edit ? '' : ' id="addDepartmentMappingForm"') + ' novalidate>';
    if (edit) {
      var d = IAM.find('departments', deptId);
      html += '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="department_display" class="' + F.label + '">Department*</label></div>' +
        '<div class="' + F.inputDiv + '"><div class="' + F.input + '" style="padding: 0.375rem 0.75rem; background-color: #e9ecef; border: 1px solid #ced4da; border-radius: 0.25rem;">' +
        '<div style="font-weight: bold;">' + esc(d ? d.name : mapping.department) + '</div></div>' +
        '<small class="form-text text-muted">Department cannot be changed when editing mapping</small>' +
        (deptId === null ? '<div class="error-message">Please add a department for ' + esc(mapping.department) + '</div>' : '') + '</div></div>' +
        '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="entras" class="' + F.label + '">Entra(s)*</label></div>';
    } else {
      html += '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="department_id" class="' + F.label + '">Department Name*</label></div>' +
        '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="department_id" name="department_id">' +
        S.options(depts.map(function (x) { return [x.id, x.name]; }), '', 'Select Department') + '</select></div></div>' +
        '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="entras" class="' + F.label + '">Department Entra(s)*</label></div>';
    }
    html += '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="entras" name="entras[]" multiple="multiple">' +
      S.options(entras, selected) + '</select></div></div>' + S.submitButton(edit) + '</form>';

    S.render({
      footer: 'after',
      body: S.formCard(edit ? 'Edit Department Mapping' : 'Add Department Mapping', html),
      init: function ($) {
        var tagOpts = {
          placeholder: 'Select or type Entra(s)', allowClear: true, width: '100%', tags: true, tokenSeparators: [','],
          createTag: function (params) {
            var term = $.trim(params.term);
            return term === '' ? null : { id: term, text: term, newTag: true };
          }
        };
        if (edit) tagOpts.closeOnSelect = false;
        if (!edit) {
          $('#department_id').select2({ placeholder: 'Select Department', allowClear: true, width: '100%' });
          $('#department_id').on('change', function () {
            var id = Number($(this).val());
            var current = id ? deptEntras(id).map(function (m) { return m.entra; }) : [];
            $('#entras').val(current.length ? current : null).trigger('change');
          });
        }
        $('#entras').select2(tagOpts);

        $('form').on('submit', function (e) {
          e.preventDefault();
          $('.error-message').remove();
          var id = edit ? deptId : Number($('#department_id').val());
          var chosen = ($('#entras').val() || []).map(function (x) { return x.trim(); });
          var valid = true;
          if (!edit && !id) { errorBelow(document.getElementById('department_id'), 'Please select a department.'); valid = false; }
          if (!chosen.length) { errorBelow(document.getElementById('entras'), 'Please select at least one Entra.'); valid = false; }
          if (edit && deptId === null) { errorBelow(document.getElementById('entras'), 'Please add a department for ' + mapping.department); valid = false; }
          if (!valid) return;

          var conflicts = [];
          db.department_mapping.forEach(function (m) {
            if (chosen.indexOf(m.entra) !== -1 && m.department_id && m.department_id !== id && !m.deleted_by && m.status_id === 1) {
              conflicts.push(m.entra + ' (assigned to ' + IAM.find('departments', m.department_id).name + ')');
            }
          });
          if (conflicts.length) {
            errorBelow(document.getElementById('entras'), 'The following Entra(s) are already assigned to other departments: ' + conflicts.join(', '));
            return;
          }

          var dep = IAM.find('departments', id);
          var current = deptEntras(id);
          var added = 0, removed = 0;
          current.forEach(function (m) {
            if (chosen.indexOf(m.entra) === -1) { m.status_id = 0; m.deleted_by = IAM.USER_ID; m.deleted_at = IAM.stamp(new Date()); removed++; }
          });
          chosen.forEach(function (entra) {
            if (current.some(function (m) { return m.entra === entra; })) return;
            var old = db.department_mapping.filter(function (m) { return m.department_id === id && m.entra === entra && m.status_id === 0; })[0];
            if (old) { old.status_id = 1; old.deleted_by = null; old.deleted_at = null; }
            else IAM.insert('department_mapping', { department_id: id, department: dep.code, entra: entra, status_id: 1 });
            added++;
          });
          IAM.save();
          var parts = [];
          if (added) parts.push('added ' + added + ' entra(s)');
          if (removed) parts.push('removed ' + removed + ' entra(s)');
          var message = parts.length ? 'Successfully ' + parts.join(' and ') + ' for ' + dep.name + '.' : 'No changes made to entras for ' + dep.name + '.';
          S.go('department-mapping-list', 1, edit ? 'edit' : 'add', message);
        });
      }
    });
  }

  function outletLabel(o) { return o.code + ' – ' + o.name; }
  function activeUsers() {
    return db.users.filter(function (u) { return u.status_id === 1; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }
  function mappedOutletIds(exceptUser) {
    return db.bm_mapping.filter(function (m) { return m.status_id === 1 && !m.deleted_by && m.user_id !== exceptUser; }).map(function (m) { return m.outlet_id; });
  }

  function bmMappingList() {
    var status = S.q('status'); if (status === null) status = '1';
    var outlet = S.q('outlet_id') || '';
    var list = db.bm_mapping.filter(function (m) {
      if (m.deleted_by) return false;
      if (status !== '' && String(m.status_id) !== status) return false;
      if (outlet && String(m.outlet_id) !== outlet) return false;
      return true;
    }).sort(function (a, b) { return a.outlet_code < b.outlet_code ? -1 : a.outlet_code > b.outlet_code ? 1 : b.id - a.id; });
    var rows = list.map(function (m) {
      var u = IAM.find('users', m.user_id);
      return '<tr><td>' + esc(m.outlet_code) + '</td><td>' + esc(m.outlet_name) + '</td><td>' + esc(noneIfEmpty(u && u.name)) + '</td><td>' + esc(noneIfEmpty(u && u.email)) + '</td>' +
        '<td>' + S.badge(m.status_id > 0) + '</td><td>' + S.actions('edit-bm-mapping.html?id=' + m.id, 'delete-bm-mapping', m.id) + '</td></tr>';
    }).join('');
    var outlets = db.outlets.filter(function (o) { return o.active === 1; }).sort(function (a, b) { return a.code < b.code ? -1 : 1; })
      .map(function (o) { return [o.id, outletLabel(o)]; });
    var filters = '<div class="filter-section mb-3 mt-3"><form action="" method="GET" id="filterForm" class="row g-3">' + S.statusFilter(status) +
      '<div class="col-md-3"><label for="outlet_id" class="form-control-label">Filter by Outlet</label><select class="form-select" id="outlet_id" name="outlet_id">' +
      S.options(outlets, outlet, 'All Outlets') + '</select></div>' +
      '<div class="text-end"><a href="add-bm-mapping.html" class="' + S.B.blackButton + '"><i class="fas fa-plus me-2"></i>Add BM Mapping</a></div></form></div>';
    var table = '<table id="bm_mapping_list" class="table table-hover data-table" cellspacing="0" style="width:100%"><thead class="thead-light"><tr>' +
      '<th>Outlet Code</th><th>Outlet Name</th><th>Branch Manager</th><th>Email</th><th>Status</th><th class="col-md-1">Action</th></tr></thead><tbody>' + rows + '</tbody></table>';

    S.render({
      body: S.listCard('BM Mapping List', S.flash() + filters + table),
      after: S.deleteModal('deleteBmMappingModal', 'Are you sure you want to delete this BM mapping? This action cannot be undone.', 'confirmDeleteBmBtn'),
      init: function ($) {
        S.table($, '#bm_mapping_list');
        $('#bm_mapping_list').on('click', '.delete-bm-mapping', function (e) {
          e.preventDefault();
          var m = IAM.find('bm_mapping', $(this).data('id'));
          var modal = new bootstrap.Modal(document.getElementById('deleteBmMappingModal'));
          document.getElementById('confirmDeleteBmBtn').onclick = function (ev) {
            ev.preventDefault();
            IAM.update('bm_mapping', m.id, { status_id: 0, deleted_by: IAM.USER_ID, deleted_at: IAM.stamp(new Date()) });
            S.go('bm-mapping-list', 1, 'delete', 'Successfully deleted BM Mapping for ' + m.outlet_code + ' – ' + m.outlet_name + '.');
          };
          modal.show();
        });
        $('#status, #outlet_id').on('change', function () { S.filterSubmit(['status', 'outlet_id']); });
      }
    });
  }

  function bmMappingForm(mapping) {
    var edit = !!mapping;
    var bmUser = edit ? mapping.user_id : '';
    var taken = mappedOutletIds(edit ? bmUser : -1);
    var current = edit ? db.bm_mapping.filter(function (m) { return m.user_id === bmUser && m.status_id === 1 && !m.deleted_by; }) : [];
    var outlets = db.outlets.filter(function (o) { return o.active === 1 && taken.indexOf(o.id) === -1; })
      .sort(function (a, b) { return a.code < b.code ? -1 : 1; });
    var html = '<form action="#" method="post"' + (edit ? '' : ' id="addBmMappingForm"') + ' novalidate>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="outlet_ids" class="' + F.label + '">Outlet(s)*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="outlet_ids" name="outlet_ids[]" multiple>' +
      S.options(outlets.map(function (o) { return [o.id, outletLabel(o)]; }), current.map(function (m) { return m.outlet_id; })) + '</select></div></div>' +
      '<div class="' + F.sectionDiv + '"><div class="' + F.labelDiv + '"><label for="bm_user_id" class="' + F.label + '">Branch Manager / BIC*</label></div>' +
      '<div class="' + F.selectDiv + '"><select class="' + F.select + ' " id="bm_user_id" name="bm_user_id">' +
      S.options(activeUsers().map(function (u) { return [u.id, u.name + ' (' + u.email + ')']; }), bmUser, 'Select Branch Manager / BIC') + '</select></div></div>' +
      S.submitButton(edit) + '</form>';

    S.render({
      footer: 'after',
      body: S.formCard(edit ? 'Edit BM Mapping' : 'Add BM Mapping', html),
      init: function ($) {
        $('#outlet_ids').select2({ placeholder: 'Select one or more outlets', allowClear: true, width: '100%' });
        $('#bm_user_id').select2({ placeholder: 'Select Branch Manager / BIC', allowClear: true, width: '100%' });
        $('form').on('submit', function (e) {
          e.preventDefault();
          $('.error-message').remove();
          var ids = ($('#outlet_ids').val() || []).map(Number);
          var userId = Number($('#bm_user_id').val());
          var valid = true;
          if (!ids.length) { errorBelow(document.getElementById('outlet_ids'), 'Please select at least one outlet.'); valid = false; }
          if (!userId) { errorBelow(document.getElementById('bm_user_id'), 'Please select a Branch Manager / BIC.'); valid = false; }
          if (!valid) return;
          var bm = IAM.find('users', userId);
          if (edit) {
            var busy = mappedOutletIds(bmUser);
            var clash = ids.filter(function (id) { return busy.indexOf(id) !== -1; })[0];
            if (clash) { errorBelow(document.getElementById('outlet_ids'), 'Outlet ' + IAM.find('outlets', clash).code + ' already has an active Branch Manager mapped.'); return; }
            current.forEach(function (m) {
              if (ids.indexOf(m.outlet_id) === -1) { m.status_id = 0; m.deleted_by = IAM.USER_ID; m.deleted_at = IAM.stamp(new Date()); }
              else m.user_id = userId;
            });
            ids.forEach(function (id) {
              if (current.some(function (m) { return m.outlet_id === id; })) return;
              var o = IAM.find('outlets', id);
              IAM.insert('bm_mapping', { outlet_id: id, outlet_code: o.code, outlet_name: o.name, user_id: userId, status_id: 1 });
            });
            IAM.save();
            S.go('bm-mapping-list', 1, 'edit', 'Successfully updated BM Mapping for ' + bm.name + '.');
          } else {
            var labels = [];
            ids.forEach(function (id) {
              if (mappedOutletIds(-1).indexOf(id) !== -1) return;
              var o = IAM.find('outlets', id);
              IAM.insert('bm_mapping', { outlet_id: id, outlet_code: o.code, outlet_name: o.name, user_id: userId, status_id: 1 });
              labels.push(outletLabel(o));
            });
            S.go('bm-mapping-list', 1, 'add', 'Successfully mapped ' + bm.name + ' to: ' + labels.join(', ') + '.');
          }
        });
      }
    });
  }

  switch (S.PAGE) {
    case 'department-mapping-list': departmentMappingList(); break;
    case 'add-department-mapping': departmentMappingForm(null); break;
    case 'edit-department-mapping': departmentMappingForm(IAM.find('department_mapping', S.q('id')) || IAM.find('department_mapping', 1)); break;
    case 'bm-mapping-list': bmMappingList(); break;
    case 'add-bm-mapping': bmMappingForm(null); break;
    case 'edit-bm-mapping': bmMappingForm(IAM.find('bm_mapping', S.q('id')) || db.bm_mapping[0]); break;
  }
})();
