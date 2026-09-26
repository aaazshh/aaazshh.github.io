/* index.php (Daily Report), dead-fish-monthly-report.php, search.php, activity-log.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file, today = FF.today;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';

  var prods = FF.all('fish_production');
  var active = prods.filter(function (p) { return p.status_id == 1; });
  var dead = FF.all('dead_fish_records');
  function prodOf(d) { return UI.byId('fish_production', d.production_id); }
  function day(s) { return s.slice(0, 10); }
  var monthStart = today.slice(0, 8) + '01';

  /* ---- Daily Report ---------------------------------------------------- */
  if (page === 'index') {
    var feed = FF.all('feed');
    var deadToday = dead.filter(function (d) { return day(d.record_time) === today; });
    var todayDeadTotal = deadToday.reduce(function (n, d) { return n + d.quantity; }, 0);
    var todayFeedKg = feed.filter(function (f) { return f.record_date === today; }).reduce(function (n, f) { return n + f.quantity_kg; }, 0);
    var activeSpecies = FF.all('fish_species').filter(function (s) { return s.status_id == 1; }).length;

    // getDashboardAlerts()
    var alerts = [];
    var avgFrom = FF.dadd(today, -7), avgTo = FF.dadd(today, -1);
    var todayBy = {}, weekBy = {};
    dead.forEach(function (d) {
      var dd = day(d.record_time);
      if (dd === today) todayBy[d.production_id] = (todayBy[d.production_id] || 0) + d.quantity;
      if (dd >= avgFrom && dd <= avgTo) weekBy[d.production_id] = (weekBy[d.production_id] || 0) + d.quantity;
    });
    active.map(function (p) {
      var t = todayBy[p.id] || 0, avg = (weekBy[p.id] || 0) / 7;
      return { p: p, t: t, avg: avg };
    }).filter(function (x) { return x.avg > 0 && x.t > 5 && x.t >= 3 * x.avg; })
      .sort(function (a, b) { return b.t / b.avg - a.t / a.avg; }).slice(0, 10).forEach(function (x) {
        var c = UI.cage(x.p.cage_id);
        alerts.push({ level: 'danger', icon: 'fa-skull-crossbones', title: 'Mortality spike — ' + (c ? c.name : x.p.production_serial_number),
          detail: UI.nf(x.t) + ' dead today vs ' + UI.nf(x.avg, 1) + '/day avg (' + (Math.round(x.t / x.avg * 10) / 10) + '×).',
          link: 'dead-fish-list.html' });
      });
    var fedToday = {};
    feed.forEach(function (f) { if (f.record_date === today) fedToday[f.production_id] = true; });
    var unfed = active.filter(function (p) { return !fedToday[p.id]; }).length;
    if (unfed > 0) alerts.push({ level: 'warning', icon: 'fa-wheat-awn', title: 'Feed not logged',
      detail: unfed + ' active ' + (unfed === 1 ? 'cage has' : 'cages have') + ' no feed record for today.', link: 'feed-list.html' });
    var pending = FF.all('incident_reports').filter(function (i) { return i.status === 'Pending'; }).length;
    if (pending > 0) alerts.push({ level: 'info', icon: 'fa-triangle-exclamation', title: 'Open incidents',
      detail: pending + ' incident ' + (pending === 1 ? 'report is' : 'reports are') + ' still pending rectification.', link: 'incident-list.html' });

    // Daily Report, grouped by farm + species.
    var groups = {};
    deadToday.forEach(function (d) {
      var p = prodOf(d), c = UI.cage(p.cage_id), k = (c ? c.fish_farm_id : '') + ':' + p.species_id;
      if (!groups[k]) groups[k] = { farm: c ? c.fish_farm_id : null, sp: UI.sp(p.species_id), qty: 0, records: 0 };
      groups[k].qty += d.quantity; groups[k].records++;
    });
    var daily = Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return a.farm - b.farm || b.qty - a.qty; });

    // Dead Fish by Species
    var bySpecies = FF.all('fish_species').filter(function (s) { return s.status_id == 1; }).map(function (s) {
      var r = { s: s, cages: active.filter(function (p) { return p.species_id === s.id; }).length, today: 0, surface: 0, bottom: 0, month: 0 };
      dead.forEach(function (d) {
        var p = prodOf(d);
        if (p.species_id !== s.id) return;
        var dd = day(d.record_time);
        if (dd === today) { r.today += d.quantity; r.surface += d.real_quantity || 0; r.bottom += d.estimated_quantity || 0; }
        if (dd >= monthStart) r.month += d.quantity;
      });
      return r;
    }).filter(function (r) { return r.cages > 0 || r.today > 0 || r.month > 0; })
      .sort(function (a, b) { return b.today - a.today || b.month - a.month || a.s.name.localeCompare(b.s.name); });

    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var trendDates = [], trendValues = [], feedValues = [];
    for (var i = 6; i >= 0; i--) {
      var d = FF.dadd(today, -i);
      trendDates.push(DOW[new Date(d + 'T00:00:00Z').getUTCDay()]);
      trendValues.push(dead.filter(function (x) { return day(x.record_time) === d; }).reduce(function (n, x) { return n + x.quantity; }, 0));
      feedValues.push(Math.round(feed.filter(function (x) { return x.record_date === d; }).reduce(function (n, x) { return n + x.quantity_kg; }, 0) * 100) / 100);
    }
    var donut = {};
    dead.forEach(function (x) {
      if (day(x.record_time) < monthStart) return;
      var s = UI.sp(prodOf(x).species_id);
      donut[s.name] = (donut[s.name] || 0) + x.quantity;
    });
    var donutRows = Object.keys(donut).filter(function (k) { return donut[k] > 0; })
      .sort(function (a, b) { return donut[b] - donut[a]; }).slice(0, 8);

    var recent = dead.slice().sort(UI.desc('record_time')).slice(0, 8);

    function kpi(label, value, sub, grad, ico, last) {
      return '<div class="col-xl-3 col-sm-6' + (last ? '' : ' mb-xl-0 mb-4') + '"><div class="card"><div class="card-body p-3"><div class="row">' +
        '<div class="col-8"><p class="text-sm mb-0 text-uppercase font-weight-bold">' + label + '</p>' +
        '<h5 class="font-weight-bolder mb-0">' + value + '</h5><span class="text-xs text-secondary">' + sub + '</span></div>' +
        '<div class="col-4 text-end"><div class="icon icon-shape bg-gradient-' + grad + ' shadow-' + grad + ' text-center rounded-circle">' +
        '<i class="fa ' + ico + ' text-lg opacity-10" aria-hidden="true"></i></div></div></div></div></div></div>';
    }

    Shell.render({
      crumbs: [['Dashboard', 'index.html'], ['Daily Report']], title: 'Daily Report — ' + today, user: true,
      body: '<ul class="nav nav-pills mb-4"><li class="nav-item"><a class="nav-link text-sm active" href="index.html">Daily Report</a></li>' +
        '<li class="nav-item"><a class="nav-link text-sm" href="map-report.html">Map Report</a></li>' +
        '<li class="nav-item"><a class="nav-link text-sm" href="comparison-report.html">Comparison Report</a></li></ul>' +
        '<div class="d-flex flex-wrap align-items-center gap-2 mb-4"><span class="text-xs text-secondary text-uppercase font-weight-bold me-1">Insights</span>' +
        '<a href="production-performance.html" class="btn btn-sm btn-outline-primary mb-0"><i class="fa fa-scale-balanced me-1"></i> Production Performance</a>' +
        '<a href="cost-margin.html" class="btn btn-sm btn-outline-success mb-0"><i class="fa fa-sack-dollar me-1"></i> Cost &amp; Margin</a>' +
        '<a href="environment-impact.html" class="btn btn-sm btn-outline-info mb-0"><i class="fa fa-magnifying-glass-chart me-1"></i> Environment Impact</a></div>' +
        (alerts.length ? '<div class="row mb-2"><div class="col-12"><div class="card border-0" style="background:transparent; box-shadow:none;">' +
          '<div class="d-flex align-items-center mb-2"><i class="fas fa-bell text-warning me-2"></i><h6 class="mb-0">Alerts <span class="badge bg-gradient-warning ms-1">' + alerts.length + '</span></h6></div>' +
          '<div class="row">' + alerts.map(function (a) {
            return '<div class="col-lg-4 col-md-6 mb-3"><a href="' + a.link + '" class="text-decoration-none"><div class="card h-100"><div class="card-body p-3 d-flex align-items-start">' +
              '<div class="icon icon-shape icon-sm bg-gradient-' + a.level + ' text-white rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0"><i class="fas ' + a.icon + '"></i></div>' +
              '<div><p class="text-sm font-weight-bold mb-1 text-dark">' + esc(a.title) + '</p><p class="text-xs text-secondary mb-0">' + esc(a.detail) + '</p></div></div></div></a></div>';
          }).join('') + '</div></div></div></div>'
          : '<div class="alert alert-dismissible fade show mb-4" role="alert" style="background:#d4edda;color:#155724;border:none;">' +
          '<i class="fas fa-check-circle me-2"></i>All clear — no mortality spikes, feed gaps, or open incidents right now.' +
          '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>') +
        '<div class="row">' +
        kpi('Active Productions', UI.nf(active.length), 'ongoing stocking batches', 'primary', 'fa-water') +
        kpi('Dead Fish Today', UI.nf(todayDeadTotal), 'pieces reported today', 'danger', 'fa-skull') +
        kpi('Feed Today', UI.nf(todayFeedKg, 2) + ' kg', 'total feed dispensed', 'success', 'fa-wheat-awn') +
        kpi('Active Species', UI.nf(activeSpecies), 'distinct fish species', 'info', 'fa-fish', true) + '</div>' +
        '<div class="row mt-4"><div class="col-lg-8 mb-lg-0 mb-4"><div class="card"><div class="card-header pb-0"><div class="d-flex justify-content-between">' +
        '<h6 class="mb-0">Daily Report — Dead Fish by Farm &amp; Species</h6><div class="d-flex gap-2">' +
        '<a href="dead-fish-monthly-report.html" class="btn btn-sm btn-outline-dark mb-0">Monthly Report</a>' +
        '<a href="dead-fish-list.html?record_from=' + today + '&amp;record_to=' + today + '" class="btn btn-sm btn-outline-primary mb-0">View all</a></div></div>' +
        '<p class="text-xs text-secondary mt-1 mb-0">Reported today (' + today + ') — grouped by farm</p></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Farm</th><th class="' + TH + '">Species</th><th class="' + TH + ' text-end pe-4">Quantity</th><th class="' + TH + ' text-end pe-4">Records</th></tr></thead><tbody>' +
        (daily.length ? daily.map(function (r) {
          return '<tr><td class="ps-4 text-sm">Farm ' + (r.farm === null ? '-' : r.farm) + '</td><td class="text-sm">' + UI.speciesCell(r.sp) + '</td>' +
            '<td class="text-sm text-end pe-4"><strong>' + UI.nf(r.qty) + '</strong></td><td class="text-sm text-end pe-4">' + r.records + '</td></tr>';
        }).join('') : '<tr><td colspan="4" class="text-center text-sm py-4 text-secondary">No dead fish reported today.</td></tr>') +
        '</tbody></table></div></div></div></div>' +
        '<div class="col-lg-4"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">7-day Dead Fish Trend</h6>' +
        '<p class="text-xs text-secondary mt-1 mb-0">Daily total quantity</p></div><div class="card-body"><div style="height: 180px;"><canvas id="deadTrendChart"></canvas></div></div></div></div></div>' +
        '<div class="row mt-4"><div class="col-12"><div class="card"><div class="card-header pb-0"><h6 class="mb-0">Dead Fish by Species</h6>' +
        '<p class="text-xs text-secondary mt-1 mb-0">Today (' + today + ') plus this month\'s running total</p></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Species</th><th class="' + TH + ' text-end">Total No. of Cages</th><th class="' + TH + ' text-end">Dead Today</th>' +
        '<th class="' + TH + ' text-end">Surface</th><th class="' + TH + ' text-end">Bottom</th><th class="' + TH + ' text-end pe-4">Dead this Month</th></tr></thead><tbody>' +
        (bySpecies.length ? bySpecies.map(function (r) {
          return '<tr><td class="ps-4 text-sm">' + UI.speciesCell(r.s) + '</td><td class="text-sm text-end">' + UI.nf(r.cages) + '</td>' +
            '<td class="text-sm text-end">' + UI.nf(r.today) + '</td><td class="text-sm text-end">' + UI.nf(r.surface) + '</td>' +
            '<td class="text-sm text-end">' + UI.nf(r.bottom) + '</td><td class="text-sm text-end pe-4"><strong>' + UI.nf(r.month) + '</strong></td></tr>';
        }).join('') : '<tr><td colspan="6" class="text-center text-sm py-4 text-secondary">No active species with productions.</td></tr>') +
        '</tbody></table></div></div></div></div></div>' +
        '<div class="row mt-4"><div class="col-lg-5 mb-lg-0 mb-4"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">Mortality by Species</h6>' +
        '<p class="text-xs text-secondary mt-1 mb-0">This month, by quantity</p></div><div class="card-body">' +
        (donutRows.length ? '<div style="height: 260px;"><canvas id="speciesDonut"></canvas></div>' : '<p class="text-center text-secondary text-sm py-5 mb-0">No dead fish recorded this month.</p>') +
        '</div></div></div><div class="col-lg-7"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">Feed — 7-day Trend</h6>' +
        '<p class="text-xs text-secondary mt-1 mb-0">Total kg dispensed per day</p></div><div class="card-body"><div style="height: 260px;"><canvas id="feedTrendChart"></canvas></div></div></div></div></div>' +
        '<div class="row mt-4"><div class="col-lg-8 mb-lg-0 mb-4"><div class="card"><div class="card-header pb-0"><div class="d-flex justify-content-between">' +
        '<h6 class="mb-0">Recent Dead Fish Activity</h6><a href="dead-fish-list.html" class="btn btn-sm btn-outline-primary mb-0">View all</a></div></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">When</th><th class="' + TH + '">Cage</th><th class="' + TH + '">Species</th><th class="' + TH + ' text-end">Qty</th>' +
        '<th class="' + TH + '">Session</th><th class="' + TH + '">Clinical Sign</th><th class="' + TH + '">Staff</th></tr></thead><tbody>' +
        (recent.length ? recent.map(function (d) {
          var p = prodOf(d), c = UI.cage(p.cage_id);
          return '<tr><td class="ps-4 text-sm">' + d.record_time + '</td><td class="text-sm">' + esc(c ? c.name : '-') + '</td>' +
            '<td class="text-sm">' + UI.speciesCell(UI.sp(p.species_id)) + '</td><td class="text-sm text-end">' + d.quantity + '</td>' +
            '<td class="text-sm">' + esc(d.session) + '</td><td class="text-sm">' + esc(UI.named('clinical_signs', d.clinical_sign_id) || '-') + '</td>' +
            '<td class="text-sm">' + esc(d.staff || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="7" class="text-center text-sm py-4 text-secondary">No dead fish records yet.</td></tr>') +
        '</tbody></table></div></div></div></div>' +
        '<div class="col-lg-4"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">Quick Actions</h6></div><div class="card-body"><div class="d-grid gap-2">' +
        '<a href="add-dead-fish.html" class="btn btn-danger btn-sm mb-0"><i class="fa fa-plus me-1"></i> Log Dead Fish</a>' +
        '<a href="add-fish-production.html" class="btn btn-primary btn-sm mb-0"><i class="fa fa-plus me-1"></i> Add Production</a>' +
        '<a href="feed-list.html" class="btn btn-success btn-sm mb-0"><i class="fa fa-wheat-awn me-1"></i> View Feed</a>' +
        '<a href="fish-species-list.html" class="btn btn-info btn-sm mb-0"><i class="fa fa-fish me-1"></i> Manage Species</a></div>' +
        '<hr class="horizontal dark my-3"><p class="text-xs text-secondary mb-0">Welcome, <strong>' + UI.esc(UI.me().name) + '</strong>. This Daily Report ' +
        'mirrors the dashboard on the legacy CMS, with operational KPIs added.</p></div></div></div></div>'
    });

    document.addEventListener('DOMContentLoaded', function () {
      if (typeof Chart === 'undefined') return;
      var teal = '#11a8b5', red = '#f5365c';
      var palette = ['#11a8b5', '#0b6e8f', '#f5365c', '#fb6340', '#ffd600', '#2dce89', '#8965e0', '#5e72e4'];
      new Chart(document.getElementById('deadTrendChart'), {
        type: 'line',
        data: { labels: trendDates, datasets: [{ label: 'Dead fish', data: trendValues, borderColor: red,
          backgroundColor: 'rgba(245,54,92,0.1)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
      var sd = document.getElementById('speciesDonut');
      if (sd) new Chart(sd, {
        type: 'doughnut',
        data: { labels: donutRows, datasets: [{ data: donutRows.map(function (k) { return donut[k]; }), backgroundColor: palette, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }
      });
      new Chart(document.getElementById('feedTrendChart'), {
        type: 'line',
        data: { labels: trendDates, datasets: [{ label: 'Feed (kg)', data: feedValues, borderColor: teal,
          backgroundColor: 'rgba(17,168,181,0.12)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } } }
      });
    });
    return;
  }

  /* ---- Monthly Report -------------------------------------------------- */
  if (page === 'dead-fish-monthly-report') {
    var month = UI.q('month');
    if (!/^\d{4}-\d{2}$/.test(month)) month = today.slice(0, 7);
    var start = month + '-01';
    var end = FF.dadd(FF.dadd(start, 32).slice(0, 8) + '01', -1);
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var label = MONTHS[+month.slice(5, 7) - 1] + ' ' + month.slice(0, 4);
    var inMonth = dead.filter(function (d) { var dd = day(d.record_time); return dd >= start && dd <= end; });
    var sp = {}, farms = {}, tot = 0;
    inMonth.forEach(function (d) {
      var p = prodOf(d), c = UI.cage(p.cage_id), s = UI.sp(p.species_id);
      if (!sp[s.id]) sp[s.id] = { s: s, dead: 0, surface: 0, bottom: 0, records: 0 };
      sp[s.id].dead += d.quantity; sp[s.id].surface += d.real_quantity || 0; sp[s.id].bottom += d.estimated_quantity || 0; sp[s.id].records++;
      var fk = c ? c.fish_farm_id : 'x';
      if (!farms[fk]) farms[fk] = { farm: c ? c.fish_farm_id : null, qty: 0, records: 0 };
      farms[fk].qty += d.quantity; farms[fk].records++;
      tot += d.quantity;
    });
    var spRows = Object.keys(sp).map(function (k) { return sp[k]; }).sort(function (a, b) { return b.dead - a.dead || a.s.name.localeCompare(b.s.name); });
    var farmRows = Object.keys(farms).map(function (k) { return farms[k]; }).sort(function (a, b) { return b.qty - a.qty; });
    function cagesFor(id) { return active.filter(function (p) { return p.species_id === id; }).length; }
    Shell.render({
      crumbs: [['Dashboard', 'index.html'], ['Monthly Report']], title: 'Dead Fish — Monthly Report',
      body: '<div class="card mb-4"><div class="card-header pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2"><div>' +
        '<h6 class="mb-0">' + label + '</h6><p class="text-xs text-secondary mt-1 mb-0">Total dead fish this month: <strong>' + UI.nf(tot) +
        '</strong> across ' + UI.nf(inMonth.length) + ' records</p></div>' +
        '<form method="get" action="dead-fish-monthly-report.html" class="d-flex align-items-center gap-2">' +
        '<input type="month" name="month" class="form-control form-control-sm" value="' + month + '" style="width:auto;">' +
        '<button type="submit" class="btn btn-dark btn-sm mb-0">Go</button></form></div></div>' +
        '<div class="row"><div class="col-lg-8 mb-lg-0 mb-4"><div class="card"><div class="card-header pb-0"><h6 class="mb-0">By Species</h6></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Species</th><th class="' + TH + ' text-end">Total No. of Cages</th><th class="' + TH + ' text-end">Surface</th>' +
        '<th class="' + TH + ' text-end">Bottom</th><th class="' + TH + ' text-end">Records</th><th class="' + TH + ' text-end pe-4">Dead this Month</th></tr></thead><tbody>' +
        (spRows.length ? spRows.map(function (r) {
          return '<tr><td class="ps-4 text-sm">' + UI.speciesCell(r.s) + '</td><td class="text-sm text-end">' + UI.nf(cagesFor(r.s.id)) + '</td>' +
            '<td class="text-sm text-end">' + UI.nf(r.surface) + '</td><td class="text-sm text-end">' + UI.nf(r.bottom) + '</td>' +
            '<td class="text-sm text-end">' + UI.nf(r.records) + '</td><td class="text-sm text-end pe-4"><strong>' + UI.nf(r.dead) + '</strong></td></tr>';
        }).join('') : '<tr><td colspan="6" class="text-center text-sm py-4 text-secondary">No dead fish records in ' + label + '.</td></tr>') +
        '</tbody></table></div></div></div></div>' +
        '<div class="col-lg-4"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">By Farm</h6></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Farm</th><th class="' + TH + ' text-end">Records</th><th class="' + TH + ' text-end pe-4">Dead this Month</th></tr></thead><tbody>' +
        (farmRows.length ? farmRows.map(function (f) {
          return '<tr><td class="ps-4 text-sm">' + (f.farm !== null ? 'Farm ' + f.farm : '—') + '</td><td class="text-sm text-end">' + UI.nf(f.records) + '</td>' +
            '<td class="text-sm text-end pe-4"><strong>' + UI.nf(f.qty) + '</strong></td></tr>';
        }).join('') : '<tr><td colspan="3" class="text-center text-sm py-4 text-secondary">No data.</td></tr>') +
        '</tbody></table></div></div></div></div></div>'
    });
    return;
  }

  /* ---- Search ---------------------------------------------------------- */
  if (page === 'search') {
    var q = UI.q('q'), ql = q.toLowerCase();
    var found = { p: [], c: [], s: [] };
    if (q) {
      found.p = prods.filter(function (p) { return p.production_serial_number.toLowerCase().indexOf(ql) !== -1; })
        .sort(UI.desc('stocking_date')).slice(0, 25);
      found.c = FF.all('cages').filter(function (c) {
        return c.name.toLowerCase().indexOf(ql) !== -1 || (c.internal_name || '').toLowerCase().indexOf(ql) !== -1;
      }).sort(UI.byName).slice(0, 25);
      found.s = FF.all('fish_species').filter(function (s) {
        return s.name.toLowerCase().indexOf(ql) !== -1 || s.chinese_name.indexOf(q) !== -1;
      }).sort(UI.byName).slice(0, 25);
    }
    var total = found.p.length + found.c.length + found.s.length;
    function block(title, n, heads, rows) {
      return '<div class="card mb-4"><div class="card-header pb-0"><h6 class="mb-0">' + title + ' <span class="badge bg-secondary ms-1">' + n + '</span></h6></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' + heads +
        '</tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
    }
    var results;
    if (!q) results = '<div class="card"><div class="card-body text-center text-secondary py-5">Type a cage name, production serial number, or fish species to search.</div></div>';
    else if (!total) results = '<div class="card"><div class="card-body text-center text-secondary py-5">No matches. Try a shorter or different term.</div></div>';
    else {
      results = (found.p.length ? block('Productions', found.p.length,
        '<th class="' + TH + ' ps-4">Serial</th><th class="' + TH + '">Cage</th><th class="' + TH + '">Species</th><th class="' + TH + '">Stocked</th><th class="' + TH + ' text-end pe-4">Status</th>',
        found.p.map(function (p) {
          var c = UI.cage(p.cage_id), s = UI.sp(p.species_id);
          return '<tr><td class="ps-4 text-sm"><a href="fish-production-detail.html?id=' + p.id + '">' + esc(p.production_serial_number) + '</a></td>' +
            '<td class="text-sm">' + esc(c ? c.name : '-') + '</td><td class="text-sm">' + esc(s ? s.name : '-') +
            ' <span class="text-xs text-secondary">' + esc(s ? s.chinese_name : '') + '</span></td><td class="text-sm">' + p.stocking_date + '</td>' +
            '<td class="text-sm text-end pe-4"><span class="badge bg-gradient-' + (p.status_id == 1 ? 'success' : 'secondary') + '">' + (p.status_id == 1 ? 'Active' : 'Closed') + '</span></td></tr>';
        }).join('')) : '') +
        (found.c.length ? block('Cages', found.c.length,
          '<th class="' + TH + ' ps-4">Cage</th><th class="' + TH + '">Internal Name</th><th class="' + TH + '">Farm</th>',
          found.c.map(function (c) {
            return '<tr><td class="ps-4 text-sm"><a href="settings-list.html?entity=cages">' + esc(c.name) + '</a></td>' +
              '<td class="text-sm">' + esc(c.internal_name || '-') + '</td><td class="text-sm">' + esc(UI.named('fish_farms', c.fish_farm_id) || '-') + '</td></tr>';
          }).join('')) : '') +
        (found.s.length ? block('Fish Species', found.s.length,
          '<th class="' + TH + ' ps-4">Name</th><th class="' + TH + '">Chinese Name</th>',
          found.s.map(function (s) {
            return '<tr><td class="ps-4 text-sm"><a href="edit-fish-species.html?id=' + s.id + '">' + esc(s.name) + '</a></td>' +
              '<td class="text-sm">' + esc(s.chinese_name || '-') + '</td></tr>';
          }).join('')) : '');
    }
    Shell.render({
      crumbs: [['Dashboard', 'index.html'], ['Search']], title: 'Search Results',
      body: '<div class="card mb-4"><div class="card-body"><form action="search.html" method="get" role="search"><div class="input-group">' +
        '<span class="input-group-text"><i class="fas fa-search"></i></span>' +
        '<input type="search" name="q" class="form-control" autofocus placeholder="Search cage, production serial, species…" value="' + esc(q) + '">' +
        '<button class="btn btn-primary mb-0" type="submit">Search</button></div></form>' +
        (q ? '<p class="text-sm text-secondary mt-3 mb-0">' + total + ' result' + (total === 1 ? '' : 's') + ' for &ldquo;<strong>' + esc(q) + '</strong>&rdquo;</p>' : '') +
        '</div></div>' + results
    });
    return;
  }

  /* ---- Activity Log ---------------------------------------------------- */
  var f = { action: UI.q('action'), user: UI.q('user'), from: UI.q('from'), to: UI.q('to'), q: UI.q('q') };
  var re = /^\d{4}-\d{2}-\d{2}$/;
  var all = FF.all('activity_log');
  var rows = all.filter(function (r) {
    var d = r.created_at.slice(0, 10);
    if (f.action && r.action !== f.action) return false;
    if (f.user && (r.username || '').toLowerCase().indexOf(f.user.toLowerCase()) === -1) return false;
    if (re.test(f.from) && d < f.from) return false;
    if (re.test(f.to) && d > f.to) return false;
    if (f.q && ((r.description || '') + ' ' + (r.entity || '')).toLowerCase().indexOf(f.q.toLowerCase()) === -1) return false;
    return true;
  }).sort(function (a, b) { return b.id - a.id; });
  var perPage = 30, pages = Math.max(1, Math.ceil(rows.length / perPage)), pageNo = Math.max(1, UI.qi('page') || 1);
  var slice = rows.slice((pageNo - 1) * perPage, pageNo * perPage);
  var actions = all.map(function (r) { return r.action; }).filter(function (a, i, arr) { return arr.indexOf(a) === i; }).sort();
  var BADGE = { create: 'success', update: 'info', 'delete': 'danger', login: 'primary', logout: 'secondary', 'export': 'warning' };
  var qs = new URLSearchParams(location.search); qs.delete('page');
  var baseQs = qs.toString();
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  Shell.render({
    crumbs: [['Dashboard', 'index.html'], ['Activity Log']], title: 'Activity Log',
    body: '<div class="card mb-4"><div class="card-body"><form method="get" action="activity-log.html" class="row g-2 align-items-end">' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">Action</label><select name="action" class="form-control form-control-sm"><option value="">All</option>' +
      actions.map(function (a) { return '<option value="' + esc(a) + '"' + (f.action === a ? ' selected' : '') + '>' + esc(cap(a)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">User</label><input type="text" name="user" class="form-control form-control-sm" value="' + esc(f.user) + '"></div>' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">From</label><input type="date" name="from" class="form-control form-control-sm" value="' + esc(f.from) + '"></div>' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">To</label><input type="date" name="to" class="form-control form-control-sm" value="' + esc(f.to) + '"></div>' +
      '<div class="col-md-2"><label class="form-label text-xs mb-1">Search</label><input type="text" name="q" class="form-control form-control-sm" placeholder="description / entity" value="' + esc(f.q) + '"></div>' +
      '<div class="col-md-2 d-flex gap-2"><button type="submit" class="btn btn-sm btn-primary mb-0">Filter</button>' +
      '<a href="activity-log.html" class="btn btn-sm btn-outline-secondary mb-0">Clear</a></div></form></div></div>' +
      '<div class="card"><div class="card-header pb-0 d-flex justify-content-between align-items-center"><h6 class="mb-0">Audit Trail</h6>' +
      '<span class="text-xs text-secondary">' + UI.nf(rows.length) + ' event' + (rows.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
      '<th class="' + TH + ' ps-4">When</th><th class="' + TH + '">User</th><th class="' + TH + '">Action</th><th class="' + TH + '">Entity</th>' +
      '<th class="' + TH + '">Description</th><th class="' + TH + '">IP</th></tr></thead><tbody>' +
      (slice.length ? slice.map(function (r) {
        return '<tr><td class="ps-4 text-sm">' + r.created_at + '</td><td class="text-sm">' + esc(r.username || '—') + '</td>' +
          '<td class="text-sm"><span class="badge bg-gradient-' + (BADGE[r.action] || 'secondary') + '">' + esc(cap(r.action)) + '</span></td>' +
          '<td class="text-sm">' + esc(r.entity || '—') + (r.entity_id ? ' <span class="text-xs text-secondary">#' + esc(r.entity_id) + '</span>' : '') + '</td>' +
          '<td class="text-sm">' + esc(r.description || '') + '</td><td class="text-xs text-secondary">' + esc(r.ip_address || '') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="text-center text-sm py-4 text-secondary">No activity recorded yet.</td></tr>') +
      '</tbody></table></div></div></div>' +
      (pages > 1 ? '<nav class="mt-3"><ul class="pagination pagination-sm justify-content-center">' +
        '<li class="page-item ' + (pageNo <= 1 ? 'disabled' : '') + '"><a class="page-link" href="?' + baseQs + '&amp;page=' + (pageNo - 1) + '">Prev</a></li>' +
        '<li class="page-item disabled"><span class="page-link">Page ' + pageNo + ' of ' + pages + '</span></li>' +
        '<li class="page-item ' + (pageNo >= pages ? 'disabled' : '') + '"><a class="page-link" href="?' + baseQs + '&amp;page=' + (pageNo + 1) + '">Next</a></li>' +
        '</ul></nav>' : '')
  });
}());
