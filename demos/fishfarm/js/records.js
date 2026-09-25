/* incident-list/form.php, announcement-list/form.php,
   environment-survey-list/form.php, import-environment-survey.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';
  var back = location.pathname.split('/').pop() + location.search;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
    'November', 'December'];
  // PHP date('M d, Y H:i') and date('F d, Y H:i')
  function mdy(s, long) {
    return (long ? MONTH : MON)[+s.slice(5, 7) - 1] + ' ' + s.slice(8, 10) + ', ' + s.slice(0, 4) + ' ' + s.slice(11, 16);
  }
  function dtl(s) { return s ? s.slice(0, 16).replace(' ', 'T') : ''; }
  function deleteForm(id, text) {
    return '<form class="d-inline" data-post="delete" data-id="' + id + '" data-confirm="' + text + '">' +
      '<button type="submit" class="btn btn-link p-0 text-danger text-sm mb-0">Delete</button></form>';
  }
  function exportModal(label, what) {
    return '<div class="modal fade" id="exportModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered">' +
      '<form method="get" class="modal-content" data-export="' + what + '">' +
      '<div class="modal-header"><h6 class="modal-title">Confirmation</h6>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><label class="form-label">' + label + '</label><div class="row g-2">' +
      '<div class="col-md-6"><input type="date" name="start" class="form-control" required></div>' +
      '<div class="col-md-6"><input type="date" name="end" class="form-control" required></div></div></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary mb-0" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary mb-0">Confirm</button></div></form></div></div>';
  }
  function table(heads, body, pager) {
    return '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0"><thead><tr>' +
      heads.map(function (h, i) {
        return h === 'Actions' ? '<th class="text-secondary opacity-7">Actions</th>' : '<th class="' + TH + (i === 0 ? ' ps-4' : '') + '">' + h + '</th>';
      }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' + (pager || '') + '</div>';
  }

  var INCIDENT_TYPES = ['Broken Planks', 'Broken Anchor Lines', 'Broken Bird Nets', 'Equipment Spoilt', 'Accidents', 'Others'];

  /* ---- incidents ------------------------------------------------------- */
  if (page === 'incident-list') {
    Shell.on('delete', function (f) { FF.remove('incident_reports', f.dataset.id); Shell.go(back); });
    var f = { type: UI.q('incident_type'), from: UI.q('record_from'), to: UI.q('record_to') };
    var rows = FF.all('incident_reports').filter(function (r) {
      var day = r.record_time.slice(0, 10);
      return (!f.type || r.incident_type === f.type) && (!f.from || day >= f.from) && (!f.to || day <= f.to);
    }).sort(UI.desc('record_time'));
    var pg = UI.pager(rows.length, 25);
    var body = rows.length ? rows.slice(pg.offset, pg.offset + 25).map(function (r) {
      var st = r.status || '';
      return '<tr><td class="ps-4 text-sm">' + mdy(r.record_time) + '</td>' +
        '<td class="text-sm">' + esc(r.incident_type) + '</td>' +
        '<td class="text-sm" title="' + esc(r.remarks || '') + '">' + esc(UI.strim(r.remarks, 60, '...')) + '</td>' +
        '<td class="text-sm">' + (st ? '<span class="badge bg-gradient-' + (st === 'Rectified' ? 'success' : 'warning') + '">' + esc(st) + '</span>' : '—') + '</td>' +
        '<td class="text-sm">' + esc(r.staff || '') + '</td>' +
        '<td class="text-sm"><a href="edit-incident.html?id=' + r.id + '" class="text-primary me-2">Edit</a>' +
        deleteForm(r.id, 'Delete this incident report?') + '</td></tr>';
    }).join('') : '<tr><td colspan="6" class="text-center text-sm py-4 text-secondary">No incident reports match the filters.</td></tr>';
    Shell.render({
      crumbs: [['Incidents Manager', 'incident-list.html'], ['Incidents', null], ['List']], title: 'Incidents',
      body: UI.flashFrom({ added: 'Incident report added.', updated: 'Incident report updated.', deleted: 'Incident report deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex gap-2 mb-3">' +
        '<a href="add-incident.html" class="btn btn-primary btn-sm mb-0">Add</a>' +
        '<button type="button" class="btn btn-outline-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#exportModal">Export</button></div>' +
        '<form method="get" action="incident-list.html" class="row g-2 align-items-center mb-3">' +
        '<div class="col-md-3"><select name="incident_type" class="form-control form-control-sm"><option value="">Incident Type</option>' +
        INCIDENT_TYPES.map(function (t) { return '<option value="' + t + '"' + (f.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="col-md-2"><input type="date" name="record_from" class="form-control form-control-sm" value="' + esc(f.from) + '" title="Record date from"></div>' +
        '<div class="col-md-2"><input type="date" name="record_to" class="form-control form-control-sm" value="' + esc(f.to) + '" title="Record date to"></div>' +
        '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="incident-list.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
        table(['Date', 'Incident Type', 'Remarks', 'Status', 'Staff', 'Actions'], body, pg.html) + '</div>',
      after: exportModal('Record Date', 'The incident export')
    });
    return;
  }

  if (page === 'add-incident' || page === 'edit-incident') {
    var isEdit = page === 'edit-incident';
    var rec = isEdit ? FF.find('incident_reports', UI.qi('id')) : null;
    if (isEdit && !rec) { Shell.go('incident-list.html'); return; }
    Shell.render({ crumbs: [['Incidents', 'incident-list.html'], [isEdit ? 'Edit' : 'Add']],
      title: (isEdit ? 'Edit' : 'Add') + ' Incident Report', body: '<div id="formHost"></div>' });
    Form.mount(document.getElementById('formHost'), rec ? {
      incident_type: rec.incident_type, record_time: dtl(rec.record_time), location: rec.location || '',
      status: rec.status || '', staff: rec.staff || '', remarks: rec.remarks || ''
    } : {}, function (v, e) {
      return '<div class="card"><div class="card-body"><form method="post">' +
        Form.row([
          { kind: 'select', name: 'incident_type', label: 'Incident Type', req: true, col: 'col-md-3', blank: '-- Select --', options: INCIDENT_TYPES },
          { name: 'record_time', label: 'Record Date/Time', req: true, type: 'datetime-local', col: 'col-md-3' },
          { name: 'location', label: 'Location', col: 'col-md-3', err: false },
          { kind: 'select', name: 'status', label: 'Status', col: 'col-md-3', err: false, blank: '-- Select --', options: ['Pending', 'Rectified'] }], v, e) +
        Form.row([
          { name: 'staff', label: 'Staff', col: 'col-md-3', err: false },
          { kind: 'textarea', name: 'remarks', label: 'Remarks', col: 'col-md-9', rows: 3 }], v, e) +
        Form.buttons('incident-list.html') + '</form></div></div>';
    }, function (v) {
      var e = {};
      if (!v.incident_type) e.incident_type = 'Incident type is required.';
      if (!v.record_time) e.record_time = 'Record date/time is required.';
      return e;
    }, function (v) {
      var r = { incident_type: v.incident_type, record_time: v.record_time.replace('T', ' ') + ':00', location: v.location || null,
        status: v.status || null, staff: v.staff || null, remarks: v.remarks || null };
      if (isEdit) FF.update('incident_reports', rec.id, r); else FF.insert('incident_reports', r);
      Shell.go('incident-list.html?flash=' + (isEdit ? 'updated' : 'added'));
    });
    return;
  }

  /* ---- announcements --------------------------------------------------- */
  if (page === 'announcement-list') {
    Shell.on('delete', function (f) { FF.remove('announcements', f.dataset.id); Shell.go(back); });
    Shell.on('toggle_published', function (f) {
      var a = FF.find('announcements', f.dataset.id);
      FF.update('announcements', a.id, { published: a.published == 1 ? 0 : 1 });
      Shell.go(back);
    });
    var af = { from: UI.q('announcement_from'), to: UI.q('announcement_to') };
    var arows = FF.all('announcements').filter(function (a) {
      var day = a.created_at.slice(0, 10);
      return (!af.from || day >= af.from) && (!af.to || day <= af.to);
    }).sort(UI.desc('created_at'));
    var apg = UI.pager(arows.length, 25);
    var abody = arows.length ? arows.slice(apg.offset, apg.offset + 25).map(function (a) {
      return '<tr><td class="ps-4 text-sm">' + a.id + '</td>' +
        '<td class="text-sm" style="max-width: 560px;" title="' + esc(a.content) + '">' + esc(UI.strim(a.content, 180, '...')).replace(/\n/g, '<br>\n') + '</td>' +
        '<td class="text-sm">' + mdy(a.created_at, true) + '</td>' +
        '<td class="text-sm"><form class="d-inline" data-post="toggle_published" data-id="' + a.id + '">' +
        '<button type="submit" class="btn btn-link p-0 text-primary text-sm mb-0 me-2">' + (a.published == 1 ? 'Unpublish' : 'Publish') + '</button></form>' +
        '<a href="edit-announcement.html?id=' + a.id + '" class="text-primary me-2">Edit</a>' +
        deleteForm(a.id, 'Delete this announcement?') + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="text-center text-sm py-4 text-secondary">No announcements match the filters.</td></tr>';
    Shell.render({
      crumbs: [['Announcements Manager', 'announcement-list.html'], ['Announcements', null], ['List']], title: 'Announcements',
      body: UI.flashFrom({ added: 'Announcement added.', updated: 'Announcement updated.', deleted: 'Announcement deleted.',
        published: 'Announcement publish status updated.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex gap-2 mb-3">' +
        '<a href="add-announcement.html" class="btn btn-primary btn-sm mb-0">Add</a>' +
        '<button type="button" class="btn btn-outline-primary btn-sm mb-0" data-bs-toggle="modal" data-bs-target="#exportModal">Export</button></div>' +
        '<form method="get" action="announcement-list.html" class="row g-2 align-items-center mb-3">' +
        '<div class="col-md-3"><input type="date" name="announcement_from" class="form-control form-control-sm" value="' + esc(af.from) + '" title="Announcement date from"></div>' +
        '<div class="col-md-3"><input type="date" name="announcement_to" class="form-control form-control-sm" value="' + esc(af.to) + '" title="Announcement date to"></div>' +
        '<div class="col-12 d-flex justify-content-end gap-2"><button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="announcement-list.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></form></div>' +
        table(['ID', 'Content', 'Created At', 'Actions'], abody, apg.html) + '</div>',
      after: exportModal('Announcement Date', 'The announcement export')
    });
    return;
  }

  if (page === 'add-announcement' || page === 'edit-announcement') {
    var isAEdit = page === 'edit-announcement';
    var arec = isAEdit ? FF.find('announcements', UI.qi('id')) : null;
    if (isAEdit && !arec) { Shell.go('announcement-list.html'); return; }
    Shell.render({ crumbs: [['Announcements', 'announcement-list.html'], [isAEdit ? 'Edit' : 'Add']],
      title: (isAEdit ? 'Edit' : 'Add') + ' Announcement', body: '<div id="formHost"></div>' });
    Form.mount(document.getElementById('formHost'), { content: arec ? arec.content : '' }, function (v, e) {
      return '<div class="card"><div class="card-body"><form method="post">' +
        '<div class="mb-3"><label class="form-label">Announcement Content <span class="text-danger">*</span></label>' +
        '<textarea name="content" rows="8" class="form-control' + (e.content ? ' is-invalid' : '') + '" placeholder="Please Input">' + esc(v.content) + '</textarea>' +
        '<div class="text-danger text-xs">' + (e.content || '') + '</div></div>' +
        Form.buttons('announcement-list.html') + '</form></div></div>';
    }, function (v) {
      return v.content ? {} : { content: 'Announcement content is required.' };
    }, function (v) {
      if (isAEdit) FF.update('announcements', arec.id, { content: v.content });
      else FF.insert('announcements', { content: v.content, published: 0 });
      Shell.go('announcement-list.html?flash=' + (isAEdit ? 'updated' : 'added'));
    });
    return;
  }

  /* ---- environment surveys --------------------------------------------- */
  function envDisplay(v) { return v === null || v === '' || v === undefined ? '--' : UI.nf(v, 2); }

  if (page === 'environment-survey-list') {
    Shell.on('delete', function (f) { FF.remove('environment_surveys', f.dataset.id); Shell.go(back); });
    var erows = FF.all('environment_surveys').sort(UI.desc('date'));
    var epg = UI.pager(erows.length, 25);
    var ebody = erows.length ? erows.slice(epg.offset, epg.offset + 25).map(function (r) {
      return '<tr><td class="ps-4 text-sm">' + r.id + '</td><td class="text-sm">' + r.date + '</td>' +
        '<td class="text-sm">' + envDisplay(r.salinity_level) + '</td><td class="text-sm">' + envDisplay(r.temperature) + '</td>' +
        '<td class="text-sm">' + envDisplay(r.water_temperature) + '</td><td class="text-sm">' + envDisplay(r.pressure) + '</td>' +
        '<td class="text-sm">' + envDisplay(r.transparency_level) + '</td>' +
        '<td class="text-sm">' + esc(r.tide === null ? '--' : r.tide) + '</td>' +
        '<td class="text-sm">' + esc(r.lunar_calendar === null ? '--' : r.lunar_calendar) + '</td>' +
        '<td class="text-sm">' + r.created_at.slice(0, 10) + '</td>' +
        '<td class="text-sm"><a href="edit-environment-survey.html?id=' + r.id + '" class="text-primary me-2">Edit</a>' +
        deleteForm(r.id, 'Delete this environmental survey?') + '</td></tr>';
    }).join('') : '<tr><td colspan="11" class="text-center text-sm py-4 text-secondary">No environmental surveys found.</td></tr>';
    Shell.render({
      crumbs: [['Environmental Survey Manager', 'environment-survey-list.html'], ['Environmental Survey', null], ['List']],
      title: 'Environmental Survey',
      body: UI.flashFrom({ added: 'Environmental survey added.', updated: 'Environmental survey updated.', deleted: 'Environmental survey deleted.' }) +
        '<div class="card"><div class="card-header pb-0"><div class="d-flex gap-2 mb-3">' +
        '<a href="add-environment-survey.html" class="btn btn-primary btn-sm mb-0">Add</a>' +
        '<a href="import-environment-survey.html" class="btn btn-outline-primary btn-sm mb-0">Import</a></div></div>' +
        table(['ID', 'Date', 'Salinity (‰)', 'Temperature (°C)', 'Water Temperature (°C)', 'Pressure (hPa)',
          'Transparency Level (cm)', 'Tide', 'Lunar Calendar', 'Created At', 'Actions'], ebody, epg.html) + '</div>'
    });
    return;
  }

  if (page === 'add-environment-survey' || page === 'edit-environment-survey') {
    var isEEdit = page === 'edit-environment-survey';
    var erec = isEEdit ? FF.find('environment_surveys', UI.qi('id')) : null;
    if (isEEdit && !erec) { Shell.go('environment-survey-list.html'); return; }
    var keys = ['date', 'salinity_level', 'temperature', 'water_temperature', 'pressure', 'transparency_level', 'tide',
      'tide_cn', 'tide_short', 'tide_short_cn', 'lunar_calendar'];
    var ev = {};
    keys.forEach(function (k) { ev[k] = erec && erec[k] !== null ? String(erec[k]) : ''; });
    var N = ['salinity_level', 'temperature', 'water_temperature', 'pressure', 'transparency_level'];
    Shell.render({ crumbs: [['Environmental Survey', 'environment-survey-list.html'], [isEEdit ? 'Edit' : 'Add']],
      title: (isEEdit ? 'Edit' : 'Add') + ' Environmental Survey', body: '<div id="formHost"></div>' });
    function numField(name, label) {
      return { name: name, label: label, type: 'number', step: '0.01', col: 'col-md-3', placeholder: 'Please Input' };
    }
    function txt(name, label, col) { return { name: name, label: label, col: col || 'col-md-3', placeholder: 'Please Input', err: false }; }
    Form.mount(document.getElementById('formHost'), ev, function (v, e) {
      return '<div class="card"><div class="card-header pb-0"><h6>General Information</h6></div><div class="card-body"><form method="post">' +
        Form.row([{ name: 'date', label: 'Date', req: true, type: 'date', col: 'col-md-3' },
          numField('salinity_level', 'Salinity (‰)'), numField('temperature', 'Temp (°C)'), numField('water_temperature', 'Water Temp (°C)')], v, e) +
        Form.row([numField('transparency_level', 'Transparency (cm)'), numField('pressure', 'Pressure (hPa)'),
          txt('tide', 'Tide'), txt('tide_cn', 'Tide CN')], v, e) +
        Form.row([txt('tide_short', 'Tide Short'), txt('tide_short_cn', 'Tide Short CN'), txt('lunar_calendar', 'Lunar Calendar', 'col-md-6')], v, e) +
        Form.buttons('environment-survey-list.html') + '</form></div></div>';
    }, function (v) {
      var e = {};
      if (!v.date) e.date = 'Date is required.';
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) e.date = 'Date must use YYYY-MM-DD format.';
      N.forEach(function (k) { if (v[k] !== '' && !Form.isNum(v[k])) e[k] = 'Must be a number.'; });
      return e;
    }, function (v) {
      var r = {};
      keys.forEach(function (k) { r[k] = v[k] === '' ? null : (N.indexOf(k) !== -1 ? +v[k] : v[k]); });
      if (isEEdit) FF.update('environment_surveys', erec.id, r); else FF.insert('environment_surveys', r);
      Shell.go('environment-survey-list.html?flash=' + (isEEdit ? 'updated' : 'added'));
    });
    return;
  }

  // import-environment-survey
  var COLS = ['Date', 'Salinity (‰)', 'Temperature (°C)', 'Water Temperature (°C)', 'Pressure (hPa)', 'Transparency Level (cm)',
    'Tide', 'Tide CN', 'Tide Short', 'Tide Short CN', 'Lunar Calendar'];
  Shell.render({
    crumbs: [['Environmental Survey', 'environment-survey-list.html'], ['Import']], title: 'Import Environmental Survey',
    body: '<div class="card"><div class="card-header pb-0"><h6 class="mb-0">Upload File</h6>' +
      '<p class="text-sm text-secondary mb-0">Accepts the CMS Environmental Survey export — CSV or XLSX. Rows are matched to existing records by <strong>Date</strong> and updated; new dates are inserted.</p></div>' +
      '<div class="card-body"><form method="post" data-export="Importing a survey file"><div class="row"><div class="col-md-6">' +
      '<label class="form-label">File <span class="text-danger">*</span></label>' +
      '<input type="file" name="file" accept=".csv,.xlsx,.txt" class="form-control" required>' +
      '<div class="text-xs text-secondary mt-1">Max size depends on your PHP <code>upload_max_filesize</code>.</div></div></div>' +
      '<div class="d-flex gap-2 mt-4"><a href="environment-survey-list.html" class="btn btn-outline-secondary mb-0">Back to list</a>' +
      '<button type="submit" class="btn btn-primary mb-0">Import</button></div></form>' +
      '<hr class="horizontal dark my-4"><h6 class="text-sm">Expected columns</h6>' +
      '<p class="text-sm text-secondary">The header row is matched by name (units like <code>(‰)</code>, <code>(°C)</code> are ignored). Only <strong>Date</strong> is required; blanks are stored as empty.</p>' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' + COLS.map(function (c) { return '<span class="badge bg-gradient-secondary">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<form method="post" class="d-inline" data-export="The CSV template"><button type="submit" class="btn btn-outline-primary btn-sm mb-0">' +
      '<i class="fas fa-download me-1"></i>Download CSV template</button></form></div></div>'
  });
}());
