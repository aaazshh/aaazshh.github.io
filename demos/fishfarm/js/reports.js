/* map-report.php, comparison-report.php, cage-map-editor.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file, today = FF.today;
  var FARM_SIZE = { '1': [1090, 850], '2': [1440, 1250], '3': [1400, 1320] };
  function style(css) {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }
  function farmIdByName(name) {
    var f = FF.all('fish_farms').filter(function (x) { return x.name === name; })[0];
    return f ? f.id : 0;
  }
  function raw(name) { return name.replace(/^\s*\d+\s*-\s*/, ''); }
  function tabs(active) {
    return '<ul class="nav nav-pills mb-4">' + [['index', 'Daily Report'], ['map-report', 'Map Report'], ['comparison-report', 'Comparison Report']]
      .map(function (t) {
        return '<li class="nav-item"><a class="nav-link text-sm' + (t[0] === active ? ' active' : '') + '" href="' + t[0] + '.html">' + t[1] + '</a></li>';
      }).join('') + '</ul>';
  }

  /* ---- Map Report ------------------------------------------------------- */
  if (page === 'map-report') {
    style('.map-wrap { position: relative; width: 100%; padding-bottom: 10px; border-radius: 20px; overflow-x: auto; }' +
      '.map { position: relative; background-color: rgb(235, 240, 248); border-radius: 20px; padding: 10px; }' +
      '.map .item { position: absolute; padding: 10px 0; text-align: center; border-radius: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }' +
      '.map .item.cage { box-shadow: 0 1px 4px rgba(0,0,0,.12); }' +
      '.map .item.cage.occupied { cursor: pointer; transition: box-shadow .15s, transform .15s; }' +
      '.map .item.cage.occupied:hover { box-shadow: 0 0 0 2px #5e72e4, 0 4px 10px rgba(0,0,0,.18); transform: translateY(-1px); }' +
      '.map .item .p-box { display: flex; align-items: center; justify-content: center; overflow: hidden; word-break: break-word; }' +
      '.map .item p { margin: 0; line-height: 1.15; }' +
      '.map .empty { font-size: 24px; font-weight: 500; color: #cccccc; line-height: 10; text-align: center; }' +
      '.map-legend span { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; font-size: 12px; }' +
      '.map-legend i { width: 14px; height: 14px; border-radius: 3px; display: inline-block; border: 1px solid #d2d6da; }');

    var fSpecies = UI.qi('fish_type_id'), fNet = UI.qi('net_type_id'), fFrom = UI.q('date_from'), fTo = UI.q('date_to');
    var hideMed = UI.params.has('cage_with_medication');
    var dataType = UI.q('data_type') || 'current_stock_quantity';
    var sel = UI.q('farm') || '1';
    if (!FARM_SIZE[sel]) sel = '1';
    var farmId = farmIdByName(sel);

    var medToday = {}, feedToday = {}, lastDead = {};
    FF.all('treatment_records').forEach(function (t) { if (t.record_time.slice(0, 10) === today) medToday[t.production_id] = true; });
    FF.all('feed').forEach(function (f) { if (f.record_date === today) feedToday[f.production_id] = (feedToday[f.production_id] || 0) + f.quantity_kg; });
    FF.all('dead_fish_records').forEach(function (d) {
      var cur = lastDead[d.production_id];
      if (!cur || d.record_time > cur.record_time || (d.record_time === cur.record_time && d.id > cur.id)) lastDead[d.production_id] = d;
    });
    var byCage = {};
    FF.all('fish_production').filter(function (p) {
      var c = UI.cage(p.cage_id);
      if (p.status_id != 1 || !c || c.fish_farm_id !== farmId) return false;
      if (fSpecies && p.species_id !== fSpecies) return false;
      if (fFrom && p.stocking_date < fFrom) return false;
      if (fTo && p.stocking_date > fTo) return false;
      return true;
    }).sort(function (a, b) { return b.id - a.id; }).forEach(function (p) { if (!byCage[p.cage_id]) byCage[p.cage_id] = p; });

    var items = [], cageCount = 0;
    FF.all('cages').filter(function (c) { return c.fish_farm_id === farmId && c.map_x !== null; }).forEach(function (c) {
      var p = byCage[c.id] || null;
      var med = p && medToday[p.id];
      if (hideMed && med) return;
      var val = null;
      if (p) {
        if (dataType === 'dead_fish') val = lastDead[p.id] && lastDead[p.id].real_quantity !== null ? lastDead[p.id].real_quantity : '-';
        else if (dataType === 'feed_amount') val = (Math.round((feedToday[p.id] || 0) * 100) / 100) + ' kg';
        else if (dataType === 'stock_in_date') val = p.stocking_date;
        else val = p.stocking_quantity;
      }
      cageCount++;
      items.push({ x: c.map_x, y: c.map_y, w: c.map_width, h: c.map_height, type: 'cage', bg: med ? '#f6c7c9' : '#FFFFFF',
        pid: p ? p.id : null, details: [['cage', raw(c.name), '#000000'], ['production_serial_number', p ? p.production_serial_number : '', '#5a5b5c'],
          ['data', val, '#5a5b5c'], ['fish_type', p ? UI.sp(p.species_id).name : '', '#4c77c0']] });
    });
    FF.all('map_items').filter(function (m) { return m.fish_farm_id === farmId; }).forEach(function (m) {
      items.push({ x: m.map_x, y: m.map_y, w: m.map_width, h: m.map_height, type: m.item_type, bg: m.bg_color, pid: null,
        details: [['name', m.label, m.text_color]] });
    });
    var size = FARM_SIZE[sel], rate = Math.round(size[1] / size[0] * 100) / 100;
    function f2(n) { return n.toFixed(2); }
    function itemStyle(it) {
      var s = it.w < 100
        ? 'width:' + f2(it.w * rate * 2) + 'px;height:' + f2(it.h * rate * 2) + 'px;left:' + f2(it.x * rate - it.w * rate / 2) + 'px;top:' +
          f2(it.y * rate - it.h * rate / 2) + 'px;background-color:' + it.bg + ';padding:5px 3px;transform:scale(.5);'
        : 'width:' + f2(it.w * rate) + 'px;height:' + f2(it.h * rate) + 'px;left:' + f2(it.x * rate) + 'px;top:' + f2(it.y * rate) +
          'px;background-color:' + it.bg + ';';
      if (it.type === 'block') s += 'display:flex;justify-content:center;align-items:center;';
      return s;
    }
    function detailStyle(d, it) {
      var s = 'font-size:12px;font-weight:500;color:' + d[2] + ';';
      if (d[0] !== 'name') s += 'transform:scale(.8);';
      if (it.type === 'cage') {
        if (d[0] === 'cage') s += 'font-size:16px;';
        if (it.w < 100) s += 'transform:scale(1);font-size:12px;';
      }
      if (it.type === 'block') s = 'font-size:12px;color:' + d[2] + ';';
      if (it.type === 'text') s = 'font-size:14px;color:' + d[2] + ';';
      if (it.type === 'title') s = 'font-size:30px;font-weight:500;color:' + d[2] + ';';
      return s;
    }
    var mapHtml = items.length ? '<div class="map" style="width:' + f2(size[0] * rate) + 'px;height:' + f2(size[1] * rate) + 'px;">' +
      items.map(function (it) {
        var occ = it.type === 'cage' && it.pid;
        return '<div class="item ' + it.type + (occ ? ' occupied' : '') + '" style="' + itemStyle(it) + '"' + (occ ? ' data-pid="' + it.pid + '"' : '') + '>' +
          it.details.filter(function (d) { return d[1] !== null && d[1] !== ''; }).map(function (d) {
            return '<div class="p-box"><p style="' + detailStyle(d, it) + '">' + esc(d[1]) + '</p></div>';
          }).join('') + '</div>';
      }).join('') + '</div>' : '<p class="empty">No Data...</p>';
    var DT = [['dead_fish', 'Dead Fish'], ['feed_amount', 'Feed Amount'], ['current_stock_quantity', 'Current Stock Quantity'], ['stock_in_date', 'Stock In Date']];

    Shell.render({
      crumbs: [['Dashboard', 'index.html'], ['Map Report']], title: 'Map Report',
      body: tabs('map-report') + '<div class="card"><div class="card-header pb-0">' +
        '<form method="get" action="map-report.html" class="row g-2 align-items-end mb-3">' +
        '<div class="col-md-2"><label class="form-label text-xs mb-1">Farm No.</label><select name="farm" class="form-control form-control-sm" onchange="this.form.submit()">' +
        ['1', '2', '3'].map(function (n) { return '<option value="' + n + '"' + (sel === n ? ' selected' : '') + '>Farm ' + n + '</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-2"><label class="form-label text-xs mb-1">Fish Species</label><select name="fish_type_id" class="form-control form-control-sm"><option value="">All</option>' +
        UI.options(FF.all('fish_species').sort(UI.byName), fSpecies, function (s) { return s.name; }) + '</select></div>' +
        '<div class="col-md-2"><label class="form-label text-xs mb-1">Net Type</label><select name="net_type_id" class="form-control form-control-sm"><option value="">All</option>' +
        UI.options(FF.all('net_types'), fNet, function (n) { return n.name; }) + '</select></div>' +
        '<div class="col-md-2"><label class="form-label text-xs mb-1">Data Type</label><select name="data_type" class="form-control form-control-sm">' +
        DT.map(function (d) { return '<option value="' + d[0] + '"' + (dataType === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-1"><label class="form-label text-xs mb-1">Date from</label><input type="date" name="date_from" class="form-control form-control-sm" value="' + esc(fFrom) + '"></div>' +
        '<div class="col-md-1"><label class="form-label text-xs mb-1">Date to</label><input type="date" name="date_to" class="form-control form-control-sm" value="' + esc(fTo) + '"></div>' +
        '<div class="col-md-2 d-flex align-items-center gap-2 pt-3"><div class="form-check form-switch mb-0">' +
        '<input class="form-check-input" type="checkbox" name="cage_with_medication" id="medSwitch"' + (hideMed ? ' checked' : '') + '>' +
        '<label class="form-check-label text-xs" for="medSwitch">Hide medicated</label></div></div>' +
        '<div class="col-12 d-flex justify-content-between align-items-center"><div class="map-legend">' +
        '<span><i style="background:#FFFFFF"></i> Cage</span><span><i style="background:#f6c7c9"></i> Medicated today</span>' +
        '<span><i style="background:#FFFFFF;border-color:#5e72e4"></i> Occupied (click to open)</span></div><div class="d-flex gap-2">' +
        '<a href="cage-map-editor.html?farm=' + sel + '" class="btn btn-outline-info btn-sm mb-0">Edit Layout</a>' +
        '<button type="submit" class="btn btn-dark btn-sm mb-0">Filter</button>' +
        '<a href="map-report.html" class="btn btn-outline-secondary btn-sm mb-0">Clear Filters</a></div></div></form></div>' +
        '<div class="card-body pt-2"><div class="map-wrap">' + mapHtml + '</div>' +
        '<p class="text-xs text-secondary mt-2 mb-0">Farm ' + sel + ' &middot; ' + cageCount + ' cage(s) on plan &middot; click an outlined (occupied) cage to open its production.</p></div></div>'
    });
    document.querySelectorAll('.item.cage.occupied').forEach(function (el) {
      el.addEventListener('click', function () { window.open('fish-production-detail.html?id=' + el.getAttribute('data-pid'), '_blank'); });
    });
    return;
  }

  /* ---- Comparison Report ------------------------------------------------ */
  if (page === 'comparison-report') {
    style('.cmp-filterbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }' +
      '.cmp-filterbar .lbl { font-size: 12px; color: #8392ab; margin-right: 4px; }' +
      '.cmp-metric-btn { border: 1px solid #d2d6da; background: #fff; color: #344767; border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }' +
      '.cmp-metric-btn.active { background: #11cdef; border-color: #11cdef; color: #fff; }' +
      '.cmp-metric-btn .dash { display:inline-block; width:14px; border-top:2px dashed currentColor; vertical-align: middle; margin-right:5px; }');
    var end = UI.q('end_date') || today, start = UI.q('start_date') || FF.dadd(end, -6);
    if (start > end) { var t = start; start = end; end = t; }
    var dates = [], idx = {};
    for (var d = start, g = 0; d <= end && g < 400; d = FF.dadd(d, 1), g++) { idx[d] = dates.length; dates.push(d); }
    var N = dates.length, cageData = {};
    FF.all('dead_fish_records').forEach(function (r) {
      var dd = r.record_time.slice(0, 10);
      if (!(dd in idx)) return;
      var c = UI.cage(UI.byId('fish_production', r.production_id).cage_id);
      if (!c) return;
      if (!cageData[c.name]) { cageData[c.name] = []; for (var i = 0; i < N; i++) cageData[c.name].push(null); }
      cageData[c.name][idx[dd]] = (cageData[c.name][idx[dd]] || 0) + r.quantity;
    });
    var METRICS = [
      { key: 'salinity', col: 'salinity_level', name: 'Salinity', unit: '‰', min: 0, max: null },
      { key: 'temperature', col: 'temperature', name: 'Temperature', unit: '℃', min: 20, max: 40 },
      { key: 'water_temp', col: 'water_temperature', name: 'Water Temperature', unit: '℃', min: 20, max: 40 },
      { key: 'pressure', col: 'pressure', name: 'Pressure', unit: 'hPa', min: 900, max: 1100 },
      { key: 'transparency', col: 'transparency_level', name: 'Transparency', unit: 'cm', min: 0, max: null }];
    var envData = {};
    METRICS.forEach(function (m) { envData[m.key] = dates.map(function () { return null; }); });
    FF.all('environment_surveys').forEach(function (e) {
      if (!(e.date in idx)) return;
      METRICS.forEach(function (m) { if (e[m.col] !== null) envData[m.key][idx[e.date]] = Math.round(e[m.col] * 100) / 100; });
    });
    var palette = ['#5e72e4', '#2dce89', '#fb6340', '#11cdef', '#f5365c', '#ffd600', '#8965e0', '#5603ad', '#f3a4b5', '#344767', '#2bffc6', '#e14eca'];
    var series = Object.keys(cageData).sort().map(function (name, i) { return { name: name, data: cageData[name], color: palette[i % palette.length] }; });
    var hasData = series.length > 0 || METRICS.some(function (m) { return envData[m.key].some(function (v) { return v !== null; }); });

    Shell.render({
      crumbs: [['Dashboard', 'index.html'], ['Comparison Report']], title: 'Comparison Report',
      body: tabs('comparison-report') + '<div class="card"><div class="card-header pb-2">' +
        '<form method="get" action="comparison-report.html" class="d-flex align-items-end gap-2 flex-wrap">' +
        '<div><label class="form-label text-xs mb-1">Start date</label><input type="date" name="start_date" class="form-control form-control-sm" value="' + start + '"></div>' +
        '<div class="text-sm pb-2">to</div>' +
        '<div><label class="form-label text-xs mb-1">End date</label><input type="date" name="end_date" class="form-control form-control-sm" value="' + end + '"></div>' +
        '<button type="submit" class="btn btn-primary btn-sm mb-0">Load Graph</button></form></div><div class="card-body pt-2">' +
        (hasData ? '<div style="position:relative;height:60vh;min-height:460px;"><canvas id="cmpChart"></canvas></div>' +
          '<div class="cmp-filterbar mt-3 justify-content-center"><span class="lbl">Environmental metric (right axis):</span>' +
          METRICS.map(function (m, i) {
            return '<button type="button" class="cmp-metric-btn' + (i === 0 ? ' active' : '') + '" data-key="' + m.key + '"><span class="dash"></span>' +
              esc(m.name) + ' (' + esc(m.unit) + ')</button>';
          }).join('') + '</div>'
          : '<p class="text-sm text-secondary py-5 text-center mb-0">No dead-fish or environmental data in ' + start + ' → ' + end + '. Widen the range or add records.</p>') +
        '</div></div>'
    });
    document.addEventListener('DOMContentLoaded', function () {
      if (!hasData || typeof Chart === 'undefined') return;
      function metric(k) { return METRICS.filter(function (m) { return m.key === k; })[0]; }
      function label(k) { var m = metric(k); return m.name + ' (' + m.unit + ')'; }
      function bounds(k) { var m = metric(k), o = {}; if (m.min !== null) o.min = m.min; if (m.max !== null) o.max = m.max; return o; }
      var cur = METRICS[0].key;
      var sets = series.map(function (s) {
        return { label: s.name, data: s.data, borderColor: s.color, backgroundColor: s.color, yAxisID: 'y', borderWidth: 2, pointRadius: 2, tension: .3, spanGaps: true };
      });
      var envDs = { label: label(cur), data: envData[cur], yAxisID: 'y1', borderColor: '#11cdef', backgroundColor: '#11cdef',
        borderDash: [6, 4], borderWidth: 2, pointRadius: 2, tension: .3, spanGaps: true };
      sets.push(envDs);
      var y1 = { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: label(cur) } };
      var b = bounds(cur); Object.keys(b).forEach(function (k) { y1[k] = b[k]; });
      var chart = new Chart(document.getElementById('cmpChart').getContext('2d'), {
        type: 'line', data: { labels: dates, datasets: sets },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } },
          scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 14, font: { size: 10 } } },
            y: { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'Number of Dead Fish' } }, y1: y1 } }
      });
      document.querySelectorAll('.cmp-metric-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.cmp-metric-btn').forEach(function (x) { x.classList.remove('active'); });
          btn.classList.add('active');
          cur = btn.dataset.key;
          envDs.label = label(cur); envDs.data = envData[cur];
          chart.options.scales.y1.title.text = label(cur);
          var bb = bounds(cur);
          chart.options.scales.y1.min = bb.min; chart.options.scales.y1.max = bb.max;
          chart.update();
        });
      });
    });
    return;
  }

  /* ---- Cage Map Editor --------------------------------------------------- */
  style('.editor-wrap { position: relative; width: 100%; overflow: auto; padding-bottom: 10px; }' +
    '.editor-canvas { position: relative; background-color: rgb(235, 240, 248); border-radius: 16px; background-image: linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.04) 1px, transparent 1px); background-size: 20px 20px; }' +
    '.cagebox { position: absolute; box-sizing: border-box; border: 1px solid #aac4e0; border-radius: 8px; background: #fff; cursor: grab; user-select: none; box-shadow: 0 1px 3px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #344767; }' +
    '.cagebox.occupied { border-color: #5e72e4; box-shadow: 0 0 0 2px rgba(94,114,228,.35); }' +
    '.cagebox.dragging { cursor: grabbing; opacity: .85; z-index: 50; }' +
    '.cagebox .rm { position: absolute; top: -8px; right: -8px; width: 16px; height: 16px; border-radius: 50%; background: #f5365c; color: #fff; font-size: 10px; line-height: 16px; text-align: center; cursor: pointer; }' +
    '.cagebox .resize { position: absolute; right: -4px; bottom: -4px; width: 12px; height: 12px; border-radius: 3px; background: #5e72e4; cursor: nwse-resize; }' +
    '.cagebox.decor { border-style: dashed; border-color: #9aa6b2; color: #009bde; font-weight: 600; }' +
    '.cagebox.decor.block { background: #fff; }' +
    '.cagebox.decor.text, .cagebox.decor.title { background: rgba(255,255,255,.35); }' +
    '.cagebox.decor.title { font-size: 18px; }' +
    '.cagebox .lbl { pointer-events: none; padding: 0 2px; text-align: center; }' +
    '.tray-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; margin: 0 6px 6px 0; border: 1px dashed #adb5bd; border-radius: 8px; font-size: 12px; background: #fff; }');

  var ef = UI.q('farm') || '1';
  if (!FARM_SIZE[ef]) ef = '1';
  var efId = farmIdByName(ef), self = 'cage-map-editor.html?farm=' + ef;
  var esize = FARM_SIZE[ef], erate = Math.round(esize[1] / esize[0] * 100) / 100;
  Shell.on('add_cage', function (f) {
    var name = f.querySelector('[name=name]').value.trim();
    if (name) {
      if (!new RegExp('^\\s*' + ef + '\\s*-').test(name)) name = ef + ' - ' + name;
      FF.insert('cages', { fish_farm_id: efId, name: name, internal_name: null, map_x: null, map_y: null, map_width: null, map_height: null });
    }
    Shell.go(self + '&flash=added');
  });
  Shell.on('add_item', function (f) {
    var type = f.querySelector('[name=item_type]').value, label = f.querySelector('[name=label]').value.trim();
    if (!label) label = type.charAt(0).toUpperCase() + type.slice(1);
    FF.insert('map_items', { fish_farm_id: efId, item_type: type, label: label, map_x: 40, map_y: 40,
      map_width: type === 'block' ? 150 : type === 'title' ? 140 : 40, map_height: type === 'block' ? 80 : type === 'title' ? 50 : 20,
      text_color: '#009bde', bg_color: type === 'block' ? '#FFFFFF' : 'transparent' });
    Shell.go(self + '&flash=item_added');
  });
  Shell.on('delete_cage', function (f) { FF.remove('cages', f.dataset.id); Shell.go(self + '&flash=deleted'); });

  var occupied = {};
  FF.all('fish_production').forEach(function (p) { if (p.status_id == 1) occupied[p.cage_id] = true; });
  var cages = FF.all('cages').filter(function (c) { return c.fish_farm_id === efId; }).sort(UI.byName);
  var placed = cages.filter(function (c) { return c.map_x !== null && c.map_y !== null; });
  var tray = cages.filter(function (c) { return c.map_x === null || c.map_y === null; });
  var decor = FF.all('map_items').filter(function (m) { return m.fish_farm_id === efId; }).sort(function (a, b) { return a.id - b.id; });
  function px(n) { return (n * erate).toFixed(2) + 'px'; }
  Shell.render({
    crumbs: [['Map Report', 'map-report.html'], ['Edit Layout']], title: 'Cage Map Editor',
    body: UI.flashFrom({ saved: 'Layout saved.', added: 'Cage added — drag it onto the map.', unplaced: 'Cage removed from the map.',
      deleted: 'Cage deleted.', item_added: 'Item added — drag it into place, then Save.', item_deleted: 'Item deleted.' }) +
      '<div class="card"><div class="card-header pb-0"><div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">' +
      '<div class="d-flex align-items-end gap-2"><div><label class="form-label text-xs mb-1">Farm No.</label>' +
      '<select class="form-control form-control-sm" style="width:120px" onchange="location.href=\'cage-map-editor.html?farm=\'+this.value">' +
      ['1', '2', '3'].map(function (n) { return '<option value="' + n + '"' + (ef === n ? ' selected' : '') + '>Farm ' + n + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-check form-switch mb-1 ms-2"><input class="form-check-input" type="checkbox" id="snapToggle" checked>' +
      '<label class="form-check-label text-xs" for="snapToggle">Snap to 10px grid</label></div></div>' +
      '<div class="d-flex gap-2"><a href="map-report.html?farm=' + ef + '" class="btn btn-outline-secondary btn-sm mb-0">Back to Map</a>' +
      '<button type="button" id="saveBtn" class="btn btn-primary btn-sm mb-0">Save Layout</button></div></div>' +
      '<div class="row g-2 align-items-start mb-3"><div class="col-md-4">' +
      '<form method="post" class="d-flex gap-2 mb-2" data-post="add_cage"><input type="text" name="name" class="form-control form-control-sm" placeholder="New cage name (e.g. D6)" required>' +
      '<button type="submit" class="btn btn-outline-primary btn-sm mb-0 text-nowrap">+ Add Cage</button></form>' +
      '<form method="post" class="d-flex gap-2" data-post="add_item"><select name="item_type" class="form-control form-control-sm" style="max-width:110px">' +
      '<option value="block">Block</option><option value="text">Label</option><option value="title">Title</option></select>' +
      '<input type="text" name="label" class="form-control form-control-sm" placeholder="Text (e.g. STORE)">' +
      '<button type="submit" class="btn btn-outline-info btn-sm mb-0 text-nowrap">+ Add Item</button></form></div>' +
      '<div class="col-md-8"><p class="text-xs text-secondary mb-1">Unplaced cages (' + tray.length + ') — click <strong>Place</strong> to drop one on the map:</p><div>' +
      (tray.length ? tray.map(function (t) {
        return '<span class="tray-chip">' + esc(raw(t.name)) +
          '<button type="button" class="btn btn-link btn-sm p-0 text-primary place-btn" data-id="' + t.id + '" data-raw="' + esc(raw(t.name)) +
          '" data-occupied="' + (occupied[t.id] ? 1 : 0) + '">Place</button>' +
          '<form method="post" class="d-inline" data-post="delete_cage" data-id="' + t.id + '" data-confirm="Delete cage ' + esc(raw(t.name)) + '?">' +
          '<button type="submit" class="btn btn-link btn-sm p-0 text-danger">×</button></form></span>';
      }).join('') : '<span class="text-xs text-secondary">All cages are placed.</span>') + '</div></div></div></div>' +
      '<div class="card-body pt-2"><p class="text-xs text-secondary mb-2">Drag to move · blue corner to resize · red dot removes (cages → tray, items → deleted) · double-click an item to rename. ' +
      'Coordinates are model units (Farm ' + ef + ': ' + esize[0] + '×' + esize[1] + ').</p><div class="editor-wrap">' +
      '<div class="editor-canvas" id="canvas" style="width:' + px(esize[0]) + ';height:' + px(esize[1]) + ';">' +
      placed.map(function (c) {
        return '<div class="cagebox' + (occupied[c.id] ? ' occupied' : '') + '" data-kind="cage" data-id="' + c.id + '" data-mx="' + c.map_x + '" data-my="' + c.map_y +
          '" data-mw="' + c.map_width + '" data-mh="' + c.map_height + '" style="left:' + px(c.map_x) + ';top:' + px(c.map_y) + ';width:' + px(c.map_width) +
          ';height:' + px(c.map_height) + ';"><span class="rm" title="Remove from map" data-id="' + c.id + '">×</span><span class="lbl">' + esc(raw(c.name)) +
          '</span><span class="resize"></span></div>';
      }).join('') +
      decor.map(function (m) {
        return '<div class="cagebox decor ' + m.item_type + '" data-kind="item" data-id="' + m.id + '" data-mx="' + m.map_x + '" data-my="' + m.map_y +
          '" data-mw="' + m.map_width + '" data-mh="' + m.map_height + '" data-label="' + esc(m.label) + '" style="left:' + px(m.map_x) + ';top:' + px(m.map_y) +
          ';width:' + px(m.map_width) + ';height:' + px(m.map_height) + ';color:' + m.text_color + ';"><span class="rm" title="Delete item" data-id="' + m.id +
          '" data-item="1">×</span><span class="lbl">' + esc(m.label) + '</span><span class="resize"></span></div>';
      }).join('') + '</div></div></div></div>'
  });

  var canvas = document.getElementById('canvas'), snap = document.getElementById('snapToggle');
  function toModel(v) { return v / erate; }
  function snapVal(v) { return snap.checked ? Math.round(v / 10) * 10 : Math.round(v); }
  var drag = null;
  function down(e, el, mode) {
    e.preventDefault();
    var r = el.getBoundingClientRect();
    drag = { el: el, mode: mode, sx: e.clientX, sy: e.clientY, ox: parseFloat(el.style.left), oy: parseFloat(el.style.top), ow: r.width, oh: r.height };
    el.classList.add('dragging');
  }
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (drag.mode === 'move') {
      drag.el.style.left = Math.min(Math.max(0, drag.ox + dx), canvas.clientWidth - drag.el.offsetWidth) + 'px';
      drag.el.style.top = Math.min(Math.max(0, drag.oy + dy), canvas.clientHeight - drag.el.offsetHeight) + 'px';
    } else {
      drag.el.style.width = Math.max(14, drag.ow + dx) + 'px';
      drag.el.style.height = Math.max(14, drag.oh + dy) + 'px';
    }
  });
  document.addEventListener('mouseup', function () {
    if (!drag) return;
    var el = drag.el;
    var mx = snapVal(toModel(parseFloat(el.style.left))), my = snapVal(toModel(parseFloat(el.style.top)));
    var mw = snapVal(toModel(parseFloat(el.style.width))), mh = snapVal(toModel(parseFloat(el.style.height)));
    el.dataset.mx = mx; el.dataset.my = my; el.dataset.mw = mw; el.dataset.mh = mh;
    el.style.left = mx * erate + 'px'; el.style.top = my * erate + 'px'; el.style.width = mw * erate + 'px'; el.style.height = mh * erate + 'px';
    el.classList.remove('dragging');
    drag = null;
  });
  function wire(el) {
    el.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('resize')) return down(e, el, 'resize');
      if (e.target.classList.contains('rm')) return;
      down(e, el, 'move');
    });
    var rm = el.querySelector('.rm');
    rm.addEventListener('click', function () {
      if (rm.dataset.item === '1') {
        if (!confirm('Delete this item?')) return;
        FF.remove('map_items', rm.dataset.id);
        Shell.go(self + '&flash=item_deleted');
      } else {
        FF.update('cages', rm.dataset.id, { map_x: null, map_y: null, map_width: null, map_height: null });
        Shell.go(self + '&flash=unplaced');
      }
    });
    if (el.dataset.kind === 'item') el.addEventListener('dblclick', function () {
      var next = prompt('Item text:', el.dataset.label || '');
      if (next !== null) { el.dataset.label = next; el.querySelector('.lbl').textContent = next; }
    });
  }
  canvas.querySelectorAll('.cagebox').forEach(wire);
  document.querySelectorAll('.place-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.createElement('div');
      el.className = 'cagebox' + (btn.dataset.occupied === '1' ? ' occupied' : '');
      el.dataset.id = btn.dataset.id; el.dataset.kind = 'cage';
      el.dataset.mx = 20; el.dataset.my = 20; el.dataset.mw = 100; el.dataset.mh = 120;
      el.style.left = px(20); el.style.top = px(20); el.style.width = px(100); el.style.height = px(120);
      el.innerHTML = '<span class="rm" title="Remove from map" data-id="' + btn.dataset.id + '">×</span><span class="lbl">' + esc(btn.dataset.raw) +
        '</span><span class="resize"></span>';
      canvas.appendChild(el);
      wire(el);
      btn.closest('.tray-chip').remove();
    });
  });
  document.getElementById('saveBtn').addEventListener('click', function () {
    canvas.querySelectorAll('.cagebox').forEach(function (el) {
      var r = { map_x: +el.dataset.mx, map_y: +el.dataset.my, map_width: Math.max(10, +el.dataset.mw), map_height: Math.max(10, +el.dataset.mh) };
      if (el.dataset.kind === 'item') { r.label = el.dataset.label || ''; FF.update('map_items', el.dataset.id, r); }
      else FF.update('cages', el.dataset.id, r);
    });
    Shell.go(self + '&flash=saved');
  });
}());
