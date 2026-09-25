/* production-performance.php, cost-margin.php, environment-impact.php, all on
   the maths in analytics-common.php */
'use strict';

(function () {
  var esc = UI.esc, page = UI.file, today = FF.today;
  var TH = 'text-uppercase text-secondary text-xxs font-weight-bolder';

  // blendedFeedPricePerKg()
  function feedPrice() {
    var spend = 0, kg = 0;
    FF.all('inventory_records').forEach(function (r) {
      if (r.inventory_product_type !== 'FeedBrand') return;
      spend += (r.weight || 0) * (r.unit_price || 0) + (r.transportation_cost || 0) + (r.custom_fees || 0);
      kg += r.weight || 0;
    });
    return kg > 0 ? Math.round(spend / kg * 10000) / 10000 : 0;
  }

  // productionMetrics()
  function metrics(filters) {
    var price = feedPrice();
    var dead = {}, feedKg = {}, harvestKg = {}, last = {}, revenue = {}, treat = {};
    FF.all('dead_fish_records').forEach(function (d) { dead[d.production_id] = (dead[d.production_id] || 0) + d.quantity; });
    FF.all('feed').forEach(function (f) { feedKg[f.production_id] = (feedKg[f.production_id] || 0) + f.quantity_kg; });
    var hr = {};
    FF.all('harvest_records').forEach(function (h) {
      hr[h.id] = h;
      harvestKg[h.production_id] = (harvestKg[h.production_id] || 0) + h.normal_weight + h.promo_weight + h.other_weight;
      var d = h.record_time.slice(0, 10);
      if (!last[h.production_id] || d > last[h.production_id]) last[h.production_id] = d;
    });
    FF.all('sales_records').forEach(function (s) {
      var h = hr[s.harvest_record_id];
      if (h) revenue[h.production_id] = (revenue[h.production_id] || 0) + (s.sales_amount || 0);
    });
    var avg = {}, cnt = {};
    FF.all('inventory_records').forEach(function (r) {
      var k = r.inventory_product_type + ':' + r.inventory_product_id;
      avg[k] = (avg[k] || 0) + (r.unit_price || 0); cnt[k] = (cnt[k] || 0) + 1;
    });
    var tr = {};
    FF.all('treatment_records').forEach(function (t) { tr[t.id] = t; });
    FF.all('treatment_items').forEach(function (i) {
      var t = tr[i.treatment_record_id];
      if (!t) return;
      var k = i.treatable_type + ':' + i.treatable_id;
      treat[t.production_id] = (treat[t.production_id] || 0) + (i.dosage || 0) * (cnt[k] ? avg[k] / cnt[k] : 0);
    });

    var out = FF.all('fish_production').filter(function (p) {
      var c = UI.cage(p.cage_id);
      if (filters.farm && (!c || c.fish_farm_id !== filters.farm)) return false;
      if (filters.species && p.species_id !== filters.species) return false;
      if (filters.status === 'ongoing' && p.status_id != 1) return false;
      if (filters.status === 'closed' && p.status_id == 1) return false;
      return true;
    }).map(function (p) {
      var c = UI.cage(p.cage_id), s = UI.sp(p.species_id);
      var ongoing = p.status_id == 1;
      var endDate = ongoing ? today : (last[p.id] || today);
      var stocked = p.stocking_quantity, d = dead[p.id] || 0, fk = feedKg[p.id] || 0, hk = harvestKg[p.id] || 0;
      var rev = revenue[p.id] || 0, tc = treat[p.id] || 0;
      var stockCost = stocked * (p.cost_per_pc || 0), feedCost = fk * price, total = stockCost + feedCost + tc;
      return {
        id: p.id, serial: p.production_serial_number, stocking_date: p.stocking_date, cage: c ? c.name : null,
        farm: c ? c.fish_farm_id : null, species: s ? s.name : null, species_cn: s ? s.chinese_name : null,
        doc: Math.max(0, FF.ddiff(p.stocking_date, endDate)), stocked: stocked, dead: d,
        survivors: Math.max(0, stocked - d), survival: stocked > 0 ? Math.max(0, stocked - d) / stocked * 100 : null,
        feed_kg: fk, harvest_kg: hk, fcr: hk > 0 ? fk / hk : null, ongoing: ongoing,
        stock_cost: stockCost, feed_cost: feedCost, treat_cost: tc, total_cost: total, revenue: rev, margin: rev - total,
        margin_pct: rev > 0 ? (rev - total) / rev * 100 : null, cost_per_kg: hk > 0 ? total / hk : null,
        price_per_kg: hk > 0 ? rev / hk : null
      };
    }).sort(function (a, b) { return (a.farm - b.farm) || String(a.cage).localeCompare(String(b.cage)); });
    if (filters.harvested_only) out = out.filter(function (r) { return r.harvest_kg > 0; });
    return out;
  }

  function filterOptions(kind, cur) {
    var t = kind === 'farm' ? 'fish_farms' : 'fish_species';
    return FF.all(t).sort(UI.byName).map(function (r) {
      return '<option value="' + r.id + '"' + (cur === r.id ? ' selected' : '') + '>' + (kind === 'farm' ? 'Farm ' : '') + esc(r.name) + '</option>';
    }).join('');
  }
  function sum(rows, k) { return rows.reduce(function (n, r) { return n + r[k]; }, 0); }
  function kpi(label, value, sub, grad, ico, last, valueClass) {
    return '<div class="col-xl-3 col-sm-6' + (last ? '' : ' mb-xl-0 mb-4') + '"><div class="card"><div class="card-body p-3"><div class="row">' +
      '<div class="col-8"><p class="text-sm mb-0 text-uppercase font-weight-bold">' + label + '</p>' +
      '<h5 class="font-weight-bolder mb-0' + (valueClass ? ' ' + valueClass : '') + '">' + value + '</h5><span class="text-xs text-secondary">' + sub + '</span></div>' +
      '<div class="col-4 text-end"><div class="icon icon-shape bg-gradient-' + grad + ' shadow-' + grad + ' text-center rounded-circle">' +
      '<i class="fa ' + ico + ' text-lg opacity-10"></i></div></div></div></div></div></div>';
  }
  function tabs(active) {
    return '<ul class="nav nav-pills mb-4">' + [['production-performance', 'Production Performance'], ['cost-margin', 'Cost &amp; Margin'],
      ['environment-impact', 'Environment Impact']].map(function (t) {
      return '<li class="nav-item"><a class="nav-link text-sm' + (t[0] === active ? ' active' : '') + '" href="' + t[0] + '.html">' + t[1] + '</a></li>';
    }).join('') + '</ul>';
  }
  function onCharts(fn) {
    document.addEventListener('DOMContentLoaded', function () { if (typeof Chart !== 'undefined') fn(); });
  }

  /* ---- Production Performance ------------------------------------------ */
  if (page === 'production-performance') {
    var fFarm = UI.qi('farm'), fSpecies = UI.qi('species');
    var fStatus = ['ongoing', 'closed', 'all'].indexOf(UI.q('status')) !== -1 ? UI.q('status') : 'ongoing';
    var sort = ['fcr', 'survival', 'doc', 'feed', 'harvest', 'cage'].indexOf(UI.q('sort')) !== -1 ? UI.q('sort') : 'fcr';
    var rows = metrics({ farm: fFarm, species: fSpecies, status: fStatus });
    var price = feedPrice();
    rows.sort(function (a, b) {
      switch (sort) {
        case 'survival': return (b.survival === null ? -1 : b.survival) - (a.survival === null ? -1 : a.survival);
        case 'doc': return b.doc - a.doc;
        case 'feed': return b.feed_kg - a.feed_kg;
        case 'harvest': return b.harvest_kg - a.harvest_kg;
        case 'cage': return String(a.cage).localeCompare(String(b.cage));
        default: return (a.fcr === null ? Infinity : a.fcr) - (b.fcr === null ? Infinity : b.fcr);
      }
    });
    var totalStocked = sum(rows, 'stocked'), totalDead = sum(rows, 'dead'), totalFeed = sum(rows, 'feed_kg'), totalHarvest = sum(rows, 'harvest_kg');
    var fleetSurv = totalStocked > 0 ? (totalStocked - totalDead) / totalStocked * 100 : null;
    var withFcr = rows.filter(function (r) { return r.fcr !== null; });
    var basis = withFcr.filter(function (r) { return !r.ongoing; }), basisLabel = 'closed cycles';
    if (!basis.length) { basis = withFcr; basisLabel = 'harvested cages'; }
    var fh = sum(basis, 'harvest_kg'), fleetFcr = fh > 0 ? sum(basis, 'feed_kg') / fh : null;
    var chartRows = withFcr.slice(0, 12);

    Shell.render({
      crumbs: [['Insights', 'index.html'], ['Production Performance']], title: 'Production Performance', user: true,
      body: tabs('production-performance') + '<div class="row">' +
        kpi('Fleet FCR', fleetFcr === null ? '—' : UI.nf(fleetFcr, 2), 'kg feed per kg fish — ' + basis.length + ' ' + basisLabel, 'primary', 'fa-scale-balanced') +
        kpi('Survival Rate', fleetSurv === null ? '—' : UI.nf(fleetSurv, 1) + '%', UI.nf(totalDead) + ' lost of ' + UI.nf(totalStocked), 'success', 'fa-heart-pulse') +
        kpi('Feed Used', UI.nf(totalFeed, 0) + ' kg', '≈ ' + (price > 0 ? '$' + UI.nf(totalFeed * price, 0) : 'no price data'), 'info', 'fa-wheat-awn') +
        kpi('Harvested', UI.nf(totalHarvest, 0) + ' kg', withFcr.length + ' of ' + rows.length + ' cages have harvested', 'warning', 'fa-fish', true) + '</div>' +
        '<div class="card mt-4"><div class="card-body py-3"><form method="get" class="row g-2 align-items-end">' +
        '<div class="col-md-3"><label class="form-label text-xs mb-1">Fish Farm</label><select name="farm" class="form-control form-control-sm"><option value="">All farms</option>' + filterOptions('farm', fFarm) + '</select></div>' +
        '<div class="col-md-3"><label class="form-label text-xs mb-1">Fish Species</label><select name="species" class="form-control form-control-sm"><option value="">All species</option>' + filterOptions('species', fSpecies) + '</select></div>' +
        '<div class="col-md-2"><label class="form-label text-xs mb-1">Cycle</label><select name="status" class="form-control form-control-sm">' +
        [['ongoing', 'Ongoing'], ['closed', 'Closed'], ['all', 'All']].map(function (o) { return '<option value="' + o[0] + '"' + (fStatus === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-2"><label class="form-label text-xs mb-1">Sort by</label><select name="sort" class="form-control form-control-sm">' +
        [['fcr', 'Best FCR'], ['survival', 'Survival %'], ['doc', 'Days of culture'], ['feed', 'Feed used'], ['harvest', 'Harvested kg'], ['cage', 'Cage name']]
          .map(function (o) { return '<option value="' + o[0] + '"' + (sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-2 d-flex gap-2"><button type="submit" class="btn btn-sm btn-primary mb-0 w-100">Filter</button>' +
        '<a href="production-performance.html" class="btn btn-sm btn-outline-secondary mb-0">Clear</a></div></form></div></div>' +
        (chartRows.length ? '<div class="card mt-4"><div class="card-header pb-0"><h6 class="mb-0">FCR vs Survival — best performing cages</h6>' +
          '<p class="text-xs text-secondary mt-1 mb-0">Lower FCR bars are better (less feed per kg of fish). The line is survival %.</p></div>' +
          '<div class="card-body"><div style="height: 300px;"><canvas id="fcrChart"></canvas></div></div></div>' : '') +
        '<div class="card mt-4"><div class="card-header pb-0"><div class="d-flex justify-content-between align-items-center"><div>' +
        '<h6 class="mb-0">Per-cage Scorecard</h6><p class="text-xs text-secondary mt-1 mb-0">' + rows.length + ' production' + (rows.length === 1 ? '' : 's') +
        ' — every figure derived live from stocking, feed, dead fish and harvest records.</p></div>' +
        '<a href="#" data-unbuilt="The .xlsx export" class="btn btn-sm btn-outline-success mb-0"><i class="fa fa-file-excel me-1"></i> Export .xlsx</a></div></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Cage</th><th class="' + TH + '">Serial / Species</th><th class="' + TH + ' text-end">DOC</th>' +
        '<th class="' + TH + ' text-end">Stocked</th><th class="' + TH + ' text-end">Dead</th><th class="' + TH + ' text-end">Survival</th>' +
        '<th class="' + TH + ' text-end">Stock Left</th><th class="' + TH + ' text-end">Feed (kg)</th><th class="' + TH + ' text-end">Harvested (kg)</th>' +
        '<th class="' + TH + ' text-end pe-4">FCR</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r) {
          var sv = r.survival;
          var svc = sv === null ? 'secondary' : sv >= 90 ? 'success' : sv >= 75 ? 'warning' : 'danger';
          var fc = r.fcr === null ? 'secondary' : r.fcr <= 1.8 ? 'success' : r.fcr <= 2.5 ? 'warning' : 'danger';
          return '<tr><td class="ps-4 text-sm"><strong>' + esc(r.cage || '-') + '</strong><span class="text-xs text-secondary d-block">Farm ' + (r.farm === null ? '-' : r.farm) +
            (r.ongoing ? '' : ' · closed') + '</span></td>' +
            '<td class="text-sm">' + esc(r.serial) + '<span class="text-xs text-secondary d-block">' + esc(r.species || '-') + ' ' + esc(r.species_cn || '') + '</span></td>' +
            '<td class="text-sm text-end">' + UI.nf(r.doc) + '</td><td class="text-sm text-end">' + UI.nf(r.stocked) + '</td>' +
            '<td class="text-sm text-end">' + UI.nf(r.dead) + '</td>' +
            '<td class="text-sm text-end"><span class="badge bg-gradient-' + svc + '">' + (sv === null ? '—' : UI.nf(sv, 1) + '%') + '</span></td>' +
            '<td class="text-sm text-end">' + UI.nf(r.survivors) + '</td><td class="text-sm text-end">' + UI.nf(r.feed_kg, 1) + '</td>' +
            '<td class="text-sm text-end">' + (r.harvest_kg > 0 ? UI.nf(r.harvest_kg, 1) : '<span class="text-secondary">—</span>') + '</td>' +
            '<td class="text-sm text-end pe-4"><span class="badge bg-gradient-' + fc + '">' + (r.fcr === null ? '—' : UI.nf(r.fcr, 2)) + '</span></td></tr>';
        }).join('') : '<tr><td colspan="10" class="text-center text-sm py-4 text-secondary">No productions match these filters.</td></tr>') +
        '</tbody></table></div><div class="px-4 pt-3"><p class="text-xs text-secondary mb-0"><strong>How to read this:</strong> <strong>DOC</strong> = days since stocking (frozen at the last harvest for closed cycles). ' +
        '<strong>Survival</strong> = stocked minus cumulative dead fish. <strong>FCR</strong> = feed used ÷ fish harvested; ' +
        'lower is better and anything under about 2.0 is healthy. Cages with no harvest yet show “—” for FCR.</p></div></div></div>'
    });
    onCharts(function () {
      var el = document.getElementById('fcrChart');
      if (!el) return;
      new Chart(el, {
        data: { labels: chartRows.map(function (r) { return r.cage || r.serial; }), datasets: [
          { type: 'bar', label: 'FCR', data: chartRows.map(function (r) { return Math.round(r.fcr * 100) / 100; }),
            backgroundColor: 'rgba(17,168,181,0.75)', borderRadius: 4, yAxisID: 'y' },
          { type: 'line', label: 'Survival %', data: chartRows.map(function (r) { return Math.round((r.survival || 0) * 10) / 10; }),
            borderColor: '#2dce89', backgroundColor: 'transparent', tension: 0.35, pointRadius: 3, borderWidth: 2, yAxisID: 'y1' }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, position: 'left', title: { display: true, text: 'FCR (kg feed / kg fish)' } },
            y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Survival %' } } } }
      });
    });
    return;
  }

  /* ---- Cost & Margin ---------------------------------------------------- */
  if (page === 'cost-margin') {
    var cFarm = UI.qi('farm'), cSpecies = UI.qi('species');
    var cStatus = ['ongoing', 'closed', 'all'].indexOf(UI.q('status')) !== -1 ? UI.q('status') : 'all';
    var soldOnly = !UI.params.has('filtered') || UI.params.has('sold_only');
    var cr = metrics({ farm: cFarm, species: cSpecies, status: cStatus, harvested_only: soldOnly })
      .sort(function (a, b) { return b.margin - a.margin; });
    var cprice = feedPrice();
    var totRev = sum(cr, 'revenue'), totStock = sum(cr, 'stock_cost'), totFeed = sum(cr, 'feed_cost'), totTreat = sum(cr, 'treat_cost');
    var totCost = totStock + totFeed + totTreat, totMargin = totRev - totCost;
    var marginPct = totRev > 0 ? totMargin / totRev * 100 : null;
    var profitable = cr.filter(function (r) { return r.margin > 0; }).length;
    var chart = cr.slice(0, 8).concat(cr.slice().reverse().slice(0, 4).reverse());
    var seen = {};
    chart = chart.filter(function (r) { if (seen[r.id]) return false; seen[r.id] = true; return true; });
    function money(v) { return (v < 0 ? '-$' : '$') + UI.nf(Math.abs(v), 2); }
    var parts = [['Fingerlings', totStock, 'bg-gradient-primary'], ['Feed', totFeed, 'bg-gradient-info'], ['Treatment', totTreat, 'bg-gradient-warning']];

    Shell.render({
      crumbs: [['Insights', 'index.html'], ['Cost &amp; Margin']], title: 'Cost &amp; Margin per Cage', user: true,
      body: tabs('cost-margin') + '<div class="row">' +
        kpi('Revenue', money(totRev), 'from recorded sales', 'success', 'fa-sack-dollar') +
        kpi('Total Cost', money(totCost), 'fingerlings + feed + treatment', 'danger', 'fa-receipt') +
        kpi('Gross Margin', money(totMargin), marginPct === null ? '—' : UI.nf(marginPct, 1) + '% of revenue', 'primary', 'fa-chart-line', false, totMargin < 0 ? 'text-danger' : '') +
        kpi('Profitable Cages', profitable + ' / ' + cr.length, 'margin above zero', 'info', 'fa-thumbs-up', true) + '</div>' +
        '<div class="card mt-4"><div class="card-body py-3"><p class="text-xs text-secondary mb-2">Where the money went (all cages in view)</p>' +
        '<div class="progress" style="height: 22px;">' + parts.map(function (p) {
          var pct = totCost > 0 ? p[1] / totCost * 100 : 0;
          return '<div class="progress-bar ' + p[2] + '" role="progressbar" style="width: ' + pct + '%" title="' + esc(p[0] + ' ' + money(p[1])) + '">' +
            (pct >= 8 ? esc(p[0] + ' ' + UI.nf(pct, 0) + '%') : '') + '</div>';
        }).join('') + '</div><div class="d-flex flex-wrap gap-3 mt-2">' + parts.map(function (p) {
          return '<span class="text-xs text-secondary"><span class="badge ' + p[2] + ' me-1">&nbsp;</span>' + p[0] + ': <strong>' + money(p[1]) + '</strong></span>';
        }).join('') + '<span class="text-xs text-secondary ms-auto">Feed priced at the blended purchase cost of <strong>' +
        (cprice > 0 ? '$' + UI.nf(cprice, 2) + '/kg' : 'n/a') + '</strong> from Inventory.</span></div></div></div>' +
        '<div class="card mt-4"><div class="card-body py-3"><form method="get" class="row g-2 align-items-end"><input type="hidden" name="filtered" value="1">' +
        '<div class="col-md-3"><label class="form-label text-xs mb-1">Fish Farm</label><select name="farm" class="form-control form-control-sm"><option value="">All farms</option>' + filterOptions('farm', cFarm) + '</select></div>' +
        '<div class="col-md-3"><label class="form-label text-xs mb-1">Fish Species</label><select name="species" class="form-control form-control-sm"><option value="">All species</option>' + filterOptions('species', cSpecies) + '</select></div>' +
        '<div class="col-md-2"><label class="form-label text-xs mb-1">Cycle</label><select name="status" class="form-control form-control-sm">' +
        [['all', 'All'], ['ongoing', 'Ongoing'], ['closed', 'Closed']].map(function (o) { return '<option value="' + o[0] + '"' + (cStatus === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-2"><div class="form-check form-switch mt-4"><input class="form-check-input" type="checkbox" name="sold_only" id="soldOnly" value="1"' + (soldOnly ? ' checked' : '') + '>' +
        '<label class="form-check-label text-xs" for="soldOnly">Harvested cages only</label></div></div>' +
        '<div class="col-md-2 d-flex gap-2"><button type="submit" class="btn btn-sm btn-primary mb-0 w-100">Filter</button>' +
        '<a href="cost-margin.html" class="btn btn-sm btn-outline-secondary mb-0">Clear</a></div></form></div></div>' +
        (chart.length ? '<div class="card mt-4"><div class="card-header pb-0"><h6 class="mb-0">Gross Margin by Cage</h6>' +
          '<p class="text-xs text-secondary mt-1 mb-0">Best and worst performers side by side — green earns, red loses.</p></div>' +
          '<div class="card-body"><div style="height: 300px;"><canvas id="marginChart"></canvas></div></div></div>' : '') +
        '<div class="card mt-4"><div class="card-header pb-0"><div class="d-flex justify-content-between align-items-center"><div>' +
        '<h6 class="mb-0">Margin Ranking</h6><p class="text-xs text-secondary mt-1 mb-0">' + cr.length + ' cage' + (cr.length === 1 ? '' : 's') + ', most profitable first.</p></div>' +
        '<a href="#" data-unbuilt="The .xlsx export" class="btn btn-sm btn-outline-success mb-0"><i class="fa fa-file-excel me-1"></i> Export .xlsx</a></div></div>' +
        '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
        '<th class="' + TH + ' ps-4">Cage</th><th class="' + TH + '">Serial / Species</th><th class="' + TH + ' text-end">Harvested</th>' +
        '<th class="' + TH + ' text-end">Fingerlings</th><th class="' + TH + ' text-end">Feed</th><th class="' + TH + ' text-end">Treatment</th>' +
        '<th class="' + TH + ' text-end">Total Cost</th><th class="' + TH + ' text-end">Revenue</th><th class="' + TH + ' text-end">Margin</th>' +
        '<th class="' + TH + ' text-end pe-4">$/kg cost → sale</th></tr></thead><tbody>' +
        (cr.length ? cr.map(function (r) {
          return '<tr><td class="ps-4 text-sm"><strong>' + esc(r.cage || '-') + '</strong><span class="text-xs text-secondary d-block">Farm ' + (r.farm === null ? '-' : r.farm) + '</span></td>' +
            '<td class="text-sm">' + esc(r.serial) + '<span class="text-xs text-secondary d-block">' + esc(r.species || '-') + '</span></td>' +
            '<td class="text-sm text-end">' + (r.harvest_kg > 0 ? UI.nf(r.harvest_kg, 1) + ' kg' : '<span class="text-secondary">—</span>') + '</td>' +
            '<td class="text-sm text-end">' + money(r.stock_cost) + '</td><td class="text-sm text-end">' + money(r.feed_cost) + '</td>' +
            '<td class="text-sm text-end">' + money(r.treat_cost) + '</td><td class="text-sm text-end"><strong>' + money(r.total_cost) + '</strong></td>' +
            '<td class="text-sm text-end">' + money(r.revenue) + '</td>' +
            '<td class="text-sm text-end"><span class="badge bg-gradient-' + (r.margin >= 0 ? 'success' : 'danger') + '">' + money(r.margin) + '</span>' +
            '<span class="text-xs text-secondary d-block">' + (r.margin_pct === null ? '' : UI.nf(r.margin_pct, 1) + '%') + '</span></td>' +
            '<td class="text-sm text-end pe-4">' + (r.cost_per_kg === null ? '<span class="text-secondary">—</span>' : UI.nf(r.cost_per_kg, 2) + ' → ' + UI.nf(r.price_per_kg, 2)) + '</td></tr>';
        }).join('') : '<tr><td colspan="10" class="text-center text-sm py-4 text-secondary">No cages match these filters.</td></tr>') +
        '</tbody></table></div><div class="px-4 pt-3"><p class="text-xs text-secondary mb-0">' +
        '<strong>How the numbers are built:</strong> <strong>Fingerlings</strong> = stocked quantity × cost per piece from the production record. ' +
        '<strong>Feed</strong> = kg fed × the blended purchase price from Inventory (unit price plus freight and customs across all feed lots). ' +
        '<strong>Treatment</strong> = each dose given × that product\'s average purchase price. <strong>Revenue</strong> = sales amounts recorded ' +
        'against the cage\'s harvests. Labour, fuel and depreciation are not tracked yet, so this is a gross margin, not net profit.</p></div></div></div>'
    });
    onCharts(function () {
      var el = document.getElementById('marginChart');
      if (!el) return;
      new Chart(el, {
        type: 'bar',
        data: { labels: chart.map(function (r) { return r.cage || r.serial; }), datasets: [{ label: 'Gross margin',
          data: chart.map(function (r) { return Math.round(r.margin * 100) / 100; }),
          backgroundColor: chart.map(function (r) { return r.margin >= 0 ? 'rgba(45,206,137,0.8)' : 'rgba(245,54,92,0.8)'; }), borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { y: { title: { display: true, text: 'Gross margin ($)' } } } }
      });
    });
    return;
  }

  /* ---- Environment Impact ------------------------------------------------ */
  var METRICS = {
    water_temperature: { label: 'Water temperature', unit: '℃', color: '#5e72e4' },
    temperature: { label: 'Air temperature', unit: '℃', color: '#8965e0' },
    salinity_level: { label: 'Salinity', unit: '‰', color: '#11a8b5' },
    pressure: { label: 'Pressure', unit: 'hPa', color: '#344767' },
    transparency_level: { label: 'Transparency', unit: 'cm', color: '#2dce89' }
  };
  var metric = METRICS[UI.q('metric')] ? UI.q('metric') : 'water_temperature';
  var to = UI.q('to') || today, from = UI.q('from') || FF.dadd(to, -89);
  if (from > to) { var tmp = from; from = to; to = tmp; }
  var deaths = {};
  FF.all('dead_fish_records').forEach(function (d) {
    var k = d.record_time.slice(0, 10);
    if (k >= from && k <= to) deaths[k] = (deaths[k] || 0) + d.quantity;
  });
  var env = FF.all('environment_surveys').filter(function (e) { return e.date >= from && e.date <= to; })
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var labels = [], deathSeries = [], metricSeries = [], pairs = {};
  Object.keys(METRICS).forEach(function (k) { pairs[k] = { x: [], y: [] }; });
  env.forEach(function (e) {
    var dd = deaths[e.date] || 0;
    labels.push(e.date); deathSeries.push(dd); metricSeries.push(e[metric] === null ? null : e[metric]);
    Object.keys(METRICS).forEach(function (k) { if (e[k] !== null) { pairs[k].x.push(e[k]); pairs[k].y.push(dd); } });
  });
  function pearson(x, y) {
    var n = Math.min(x.length, y.length);
    if (n < 3) return null;
    var sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (var i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; sxy += x[i] * y[i]; }
    var den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    return den === 0 ? null : (n * sxy - sx * sy) / den;
  }
  function wording(r, lbl) {
    if (r === null) return { level: 'secondary', strength: 'Not enough data', text: 'Not enough overlapping days to judge a relationship yet.' };
    var a = Math.abs(r), level, strength;
    if (a < 0.2) { level = 'secondary'; strength = 'No real link'; }
    else if (a < 0.4) { level = 'info'; strength = 'Weak link'; }
    else if (a < 0.6) { level = 'warning'; strength = 'Moderate link'; }
    else { level = 'danger'; strength = 'Strong link'; }
    var dir = r > 0 ? 'when ' + lbl + ' goes UP, deaths tend to go UP' : 'when ' + lbl + ' goes UP, deaths tend to go DOWN';
    return { level: level, strength: strength, text: a < 0.2 ? 'Deaths move independently of ' + lbl + ' over this period.' : strength + ': ' + dir + '.' };
  }
  var corr = Object.keys(METRICS).map(function (k) {
    var r = pearson(pairs[k].x, pairs[k].y), w = wording(r, METRICS[k].label.toLowerCase());
    return { key: k, r: r, meta: METRICS[k], n: pairs[k].x.length, level: w.level, strength: w.strength, text: w.text };
  }).sort(function (a, b) { return Math.abs(b.r || 0) - Math.abs(a.r || 0); });
  var head = corr.filter(function (c) { return c.key === metric; })[0];
  var tides = {}, tideOrder = [];
  env.forEach(function (e) {
    var t = e.tide || 'Unknown';
    if (!tides[t]) { tides[t] = { days: 0, deaths: 0, cn: e.tide_cn }; tideOrder.push(t); }
    tides[t].days++; tides[t].deaths += deaths[e.date] || 0;
  });
  tideOrder.forEach(function (t) { tides[t].avg = tides[t].days ? tides[t].deaths / tides[t].days : 0; });
  tideOrder.sort(function (a, b) { return tides[b].avg - tides[a].avg; });
  var headLabel = head.meta.label + ' (' + head.meta.unit + ')';

  Shell.render({
    crumbs: [['Insights', 'index.html'], ['Environment Impact']], title: 'Environment vs Mortality', user: true,
    body: tabs('environment-impact') +
      '<div class="card"><div class="card-body py-3"><form method="get" class="row g-2 align-items-end">' +
      '<div class="col-md-4"><label class="form-label text-xs mb-1">Environment factor</label><select name="metric" class="form-control form-control-sm">' +
      Object.keys(METRICS).map(function (k) { return '<option value="' + k + '"' + (metric === k ? ' selected' : '') + '>' + esc(METRICS[k].label + ' (' + METRICS[k].unit + ')') + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="col-md-3"><label class="form-label text-xs mb-1">From</label><input type="date" name="from" value="' + from + '" class="form-control form-control-sm"></div>' +
      '<div class="col-md-3"><label class="form-label text-xs mb-1">To</label><input type="date" name="to" value="' + to + '" class="form-control form-control-sm"></div>' +
      '<div class="col-md-2 d-flex gap-2"><button type="submit" class="btn btn-sm btn-primary mb-0 w-100">Load</button>' +
      '<a href="environment-impact.html" class="btn btn-sm btn-outline-secondary mb-0">Reset</a></div></form></div></div>' +
      '<div class="card mt-4"><div class="card-body"><div class="d-flex align-items-center flex-wrap gap-3">' +
      '<div class="icon icon-shape icon-lg bg-gradient-' + head.level + ' text-white rounded-circle d-flex align-items-center justify-content-center">' +
      '<i class="fa fa-magnifying-glass-chart text-lg opacity-10"></i></div><div>' +
      '<p class="text-xs text-uppercase text-secondary mb-1">Finding — ' + esc(head.meta.label) + ' vs daily deaths</p>' +
      '<h5 class="font-weight-bolder mb-1">' + esc(head.strength) + ' <span class="text-secondary font-weight-normal text-sm">(r = ' +
      (head.r === null ? 'n/a' : UI.nf(head.r, 2)) + ', ' + head.n + ' days)</span></h5><p class="text-sm mb-0">' + esc(head.text) + '</p></div></div></div></div>' +
      '<div class="card mt-4"><div class="card-header pb-0"><h6 class="mb-0">Daily deaths vs ' + esc(head.meta.label.toLowerCase()) + '</h6>' +
      '<p class="text-xs text-secondary mt-1 mb-0">' + from + ' to ' + to + ' — red bars are fish deaths (left axis), the line is ' + esc(head.meta.label.toLowerCase()) + ' (right axis).</p></div>' +
      '<div class="card-body">' + (labels.length ? '<div style="height: 340px;"><canvas id="envChart"></canvas></div>' : '<p class="text-center text-secondary text-sm py-5 mb-0">No environment surveys in this date range.</p>') + '</div></div>' +
      '<div class="row mt-4"><div class="col-lg-7 mb-lg-0 mb-4"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">Which factor tracks mortality most?</h6>' +
      '<p class="text-xs text-secondary mt-1 mb-0">Every survey field scored over the same period, strongest link first.</p></div>' +
      '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
      '<th class="' + TH + ' ps-4">Factor</th><th class="' + TH + ' text-end">r</th><th class="' + TH + '">Reading</th><th class="' + TH + ' text-end pe-4">Days</th></tr></thead><tbody>' +
      corr.map(function (c) {
        return '<tr><td class="ps-4 text-sm"><a href="?metric=' + c.key + '&amp;from=' + encodeURIComponent(from) + '&amp;to=' + encodeURIComponent(to) + '" class="text-dark font-weight-bold">' +
          esc(c.meta.label) + '</a><span class="text-xs text-secondary d-block">' + esc(c.meta.unit) + '</span></td>' +
          '<td class="text-sm text-end">' + (c.r === null ? '—' : UI.nf(c.r, 2)) + '</td>' +
          '<td class="text-sm"><span class="badge bg-gradient-' + c.level + '">' + esc(c.strength) + '</span><span class="text-xs text-secondary d-block">' + esc(c.text) + '</span></td>' +
          '<td class="text-sm text-end pe-4">' + c.n + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="px-4 pt-3"><p class="text-xs text-secondary mb-0">' +
      '<strong>r</strong> runs from -1 to +1. Near 0 means the two move independently; near +1 means they rise together; ' +
      'near -1 means one rises as the other falls. A link is a signal worth investigating, not proof of cause.</p></div></div></div></div>' +
      '<div class="col-lg-5"><div class="card h-100"><div class="card-header pb-0"><h6 class="mb-0">Deaths by tide</h6>' +
      '<p class="text-xs text-secondary mt-1 mb-0">Average fish lost per day under each tide condition.</p></div>' +
      '<div class="card-body px-0 pb-2"><div class="table-responsive"><table class="table align-items-center mb-0"><thead><tr>' +
      '<th class="' + TH + ' ps-4">Tide</th><th class="' + TH + ' text-end">Days</th><th class="' + TH + ' text-end">Total Deaths</th><th class="' + TH + ' text-end pe-4">Avg / day</th></tr></thead><tbody>' +
      (tideOrder.length ? tideOrder.map(function (t) {
        var s = tides[t];
        return '<tr><td class="ps-4 text-sm">' + esc(t) + '<span class="text-xs text-secondary d-block">' + esc(s.cn || '') + '</span></td>' +
          '<td class="text-sm text-end">' + s.days + '</td><td class="text-sm text-end">' + UI.nf(s.deaths) + '</td>' +
          '<td class="text-sm text-end pe-4"><strong>' + UI.nf(s.avg, 1) + '</strong></td></tr>';
      }).join('') : '<tr><td colspan="4" class="text-center text-sm py-4 text-secondary">No tide data in range.</td></tr>') +
      '</tbody></table></div></div></div></div></div>'
  });
  onCharts(function () {
    var el = document.getElementById('envChart');
    if (!el) return;
    new Chart(el, {
      data: { labels: labels, datasets: [
        { type: 'bar', label: 'Dead fish', data: deathSeries, backgroundColor: 'rgba(245,54,92,0.55)', borderRadius: 2, yAxisID: 'y', order: 2 },
        { type: 'line', label: headLabel, data: metricSeries, borderColor: head.meta.color, backgroundColor: 'transparent',
          tension: 0.35, pointRadius: 0, borderWidth: 2, yAxisID: 'y1', spanGaps: true, order: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: { x: { ticks: { maxTicksLimit: 14, font: { size: 10 } } },
          y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Dead fish per day' } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: headLabel } } } }
    });
  });
}());
