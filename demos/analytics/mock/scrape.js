// The competitor price scrapers (fetch-cron-*.js, run by CRON.txt every
// night). The real jobs drive Puppeteer through each supermarket's site and
// post every product to public-api.php?action=bulk. A browser can't open those
// sites for us, so a run here walks the same steps with the same log lines
// over the listings this demo already has, and what it "scrapes" becomes
// today's price everywhere Cat.price is read (Comparison, Overview, Graphs).
(function () {
  'use strict';
  var W = World;
  var KEY = 'analytic-scrape-v1';

  var JOBS = [
    { script: 'fetch-cron-ntuc.js', market: 'NTUC', cron: '0 2 * * *', style: 'api', tag: 'NTUC CRON' },
    { script: 'fetch-cron-cs.js', market: 'Cold Storage', cron: '0 3 * * *', style: 'tabs', tag: 'CS CRON' },
    { script: 'fetch-cron-ss.js', market: 'Sheng Siong', cron: '0 4 * * *', style: 'pages', tag: 'CRON' },
    { script: 'fetch-cron-redmart.js', market: 'RedMart', cron: '0 5 * * *', style: 'hover', tag: 'CRON' },
    { script: 'fetch-cron-grabmart.js', market: 'GrabMart', cron: '0 6 * * *', style: 'loadmore', tag: 'CRON' }
  ];

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.day === W.TODAY) return s;
    } catch (e) {}
    return { day: W.TODAY, prices: {}, runs: {} };
  }
  var state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  // A scraped price replaces the modelled one for today only.
  var modelled = Cat.price;
  Cat.price = function (p, date) {
    if (date === W.TODAY && state.prices[p.id] != null) return state.prices[p.id];
    return modelled(p, date);
  };
  Cat.latest = function (p) { return { date: W.TODAY, price: Cat.price(p, W.TODAY) }; };
  Cat.scrapedToday = function (id) { return state.prices[id] != null; };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() {
    var d = new Date();
    return W.TODAY + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function slug(s) { return s.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // Every line a job would print, in order, with the bulk writes in between.
  function plan(job) {
    var r = W.rng(W.hash(job.script + Date.now()));
    var mine = Cat.PRODUCTS.filter(function (p) { return p.supermarket_name === job.market; });
    var byCat = {};
    mine.forEach(function (p) { (byCat[p.category] = byCat[p.category] || []).push(p); });
    var cats = Object.keys(byCat).sort();
    var steps = [], total = 0;
    function say(text, level) { steps.push({ text: text, level: level || 'info' }); }
    function put(p) {
      var before = Cat.price(p, W.TODAY), v = W.round(before * (0.97 + r() * 0.06), 2), promo = r() < 0.1;
      if (promo) v = W.round(v * 0.85, 2);
      steps.push({ save: p, price: v, was: promo ? W.round(v / 0.85, 2) : null });
      total++;
      return { price: v, promo: promo };
    }
    var price = function (x) { return '$' + x.toFixed(2); };

    if (job.style === 'api') {
      say(job.tag + ' started');
      say('http://localhost/analytic/');
      say('STARTED (' + job.tag + ')');
      cats.forEach(function (c) {
        var list = byCat[c], per = 20;
        for (var i = 0; i < list.length; i += per) {
          say('GET layout/category/v2?page=' + (i / per + 1) + '&category=' + slug(c));
          list.slice(i, i + per).forEach(put);
          say('Bulk status: 200');
          say('Bulk response: {"success":true,"saved":' + Math.min(per, list.length - i) + '}');
        }
        say('All layouts processed');
      });
      say('STOPPED (' + job.tag + ')');
    } else if (job.style === 'tabs') {
      say(job.tag + ' started');
      say('STARTED (' + job.tag + ')');
      say('Navigating to category page...');
      say('Found ' + cats.length + ' categories: ' + cats.join(', '));
      cats.forEach(function (c, i) {
        var list = byCat[c], shown = 0;
        say('=== Category ' + (i + 1) + '/' + cats.length + ': ' + c + ' ===');
        say('Processing category: ' + c);
        while (shown < list.length) { var next = Math.min(list.length, shown + 12); say('Products loaded: ' + shown + ' → ' + next); shown = next; }
        say('No new products loaded (1/3)');
        say('Total products loaded for ' + c + ': ' + list.length);
        say('Extracted ' + list.length + ' products from ' + c);
        list.forEach(function (p) {
          var got = put(p);
          say('Product: ' + p.name + ' | UOM: ' + p.uom + ' | SKU: ' + (p.sku || 'CS' + p.id) + ' | Price: ' + price(got.price) + (got.promo ? ' (was ' + price(got.price / 0.85) + ')' : ''));
          say('✓ bulk: ' + p.name);
        });
        say('Saved ' + list.length + '/' + list.length + ' products for ' + c);
      });
      say('FINISHED (' + job.tag + ') - Total products saved: ' + total);
    } else if (job.style === 'pages') {
      say('STARTED (CRON)');
      say('Fetching categories...');
      say('Found ' + cats.length + ' categories to process');
      cats.forEach(function (c, i) {
        var list = byCat[c], h = 2400;
        say('=== Category ' + (i + 1) + '/' + cats.length + ' ===');
        say('Processing category: /category/' + slug(c));
        say('Scrolling to load all products...');
        for (var k = 0; k < Math.ceil(list.length / 10); k++) { say('Loaded more content (height: ' + h + ' → ' + (h + 1800) + ')'); h += 1800; }
        say('No new content loaded (attempt 1/3)');
        say('Scrolling complete after ' + (Math.ceil(list.length / 10) + 3) + ' attempts');
        say('Found ' + list.length + ' products in ' + c);
        list.forEach(function (p, n) {
          say('Processing product ' + (n + 1) + '/' + list.length);
          var got = put(p);
          say('Product: ' + p.name);
          say('UOM: ' + p.uom);
          say('Price: ' + price(got.price));
          if (got.promo) say('On Promo! Previous: ' + price(got.price / 0.85));
          say('SKU: ' + (p.sku || 'N/A'));
          say('✓ bulk: ' + p.name + ' (SKU: ' + (p.sku || 'N/A') + ')');
        });
        say('Completed ' + c + ': ' + list.length + '/' + list.length + ' products saved');
      });
      say('FINISHED (CRON) - Total products processed: ' + total);
    } else if (job.style === 'hover') {
      say('STARTED (CRON)');
      cats.forEach(function (c) {
        var list = byCat[c];
        say('Hovering over "' + c.split(' ')[0] + '" then clicking "' + c + '"...');
        say('Hovering... waiting for submenu to appear');
        say('✓ Successfully clicked "' + c + '"');
        say('Scrolling like a human to load all products...');
        say('Completed scrolling (' + (Math.ceil(list.length / 8) + 2) + ' scrolls)');
        list.forEach(function (p) { put(p); say('✓ bulk: ' + p.name); });
      });
      say('FINISHED (CRON) - Total products processed: ' + total);
    } else {
      say('=== STARTING GRABMART SCRAPER V8 ===');
      say('Loading GrabMart homepage...');
      say('Setting location...');
      say('Found ' + cats.length + ' categories to process');
      cats.forEach(function (c, i) {
        var list = byCat[c];
        say('=== Category ' + (i + 1) + '/' + cats.length + ' ===');
        say('=== Processing category: ' + c + ' ===');
        say('Successfully on category page!');
        say('Load iteration 1...');
        say('Scrolling to load products...');
        say('Extracted ' + list.length + ' products from page');
        say(list.length + ' new products (0 stores filtered, 0 duplicates)');
        list.forEach(function (p) { put(p); say('✓ bulk: ' + p.name); });
        say('No more "Load more" button found');
        say('Completed ' + c + ': ' + list.length + ' total products');
        say('Navigating back to homepage...');
      });
      say('=== FINISHED - Total: ' + total + ' products ===');
    }
    return { steps: steps, total: total };
  }

  // Overview's scraper card: one row per cron job and the log of the run.
  function mount(root) {
    if (!root) return;
    var esc = PM.esc, busy = false;
    root.innerHTML =
      '<div class="card-header pb-0 d-flex flex-wrap align-items-start justify-content-between gap-2">' +
        '<div><h6 class="mb-1">Price scrapers</h6>' +
        '<p class="text-sm mb-0">Nightly Puppeteer jobs from CRON.txt. Each walks one supermarket\'s categories and posts what it finds to <code>public-api.php?action=bulk</code>. Run one now to refresh today\'s prices.</p></div>' +
        '<button type="button" class="btn btn-sm btn-primary mb-0" data-run="all" style="background-color: rgb(12, 99, 38); border-color: rgb(12, 99, 38);"><i class="fas fa-play me-1"></i> Run all</button>' +
      '</div>' +
      '<div class="card-body pt-3">' +
        '<div class="table-responsive"><table class="table align-items-center mb-0 scrape-jobs"><thead><tr>' +
          '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Script</th>' +
          '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Supermarket</th>' +
          '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Schedule</th>' +
          '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Last run</th>' +
          '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Products</th><th></th></tr></thead><tbody>' +
          JOBS.map(function (j, i) {
            return '<tr data-job="' + i + '"><td class="text-sm"><code>' + esc(j.script) + '</code></td><td class="text-sm">' + esc(j.market) + '</td>' +
              '<td class="text-sm"><code>' + j.cron + '</code></td><td class="text-sm" data-last></td><td class="text-sm" data-count></td>' +
              '<td class="text-end"><button type="button" class="btn btn-link btn-sm text-success mb-0 px-2" data-run="' + i + '"><i class="fas fa-play me-1"></i>Run</button></td></tr>';
          }).join('') +
        '</tbody></table></div>' +
        '<pre class="scrape-log" aria-live="polite" hidden></pre>' +
        '<p class="scrape-done text-sm mb-0 mt-2" hidden>Today\'s prices are updated. <a href="overview.html" class="text-success font-weight-bold">Refresh the charts</a> or open <a href="comparison.html" class="text-success font-weight-bold">Comparison</a> to see them.</p>' +
      '</div>';
    var log = root.querySelector('.scrape-log'), done = root.querySelector('.scrape-done');

    function paintRows() {
      JOBS.forEach(function (j, i) {
        var row = root.querySelector('[data-job="' + i + '"]'), run = state.runs[j.script];
        row.querySelector('[data-last]').textContent = run ? run.at : 'today 0' + (2 + i) + ':00';
        row.querySelector('[data-count]').textContent = run ? run.total : Cat.PRODUCTS.filter(function (p) { return p.supermarket_name === j.market; }).length;
      });
    }
    paintRows();

    function line(text, level) {
      var el = document.createElement('span');
      el.className = 'scrape-line is-' + level;
      el.textContent = stamp() + ' [' + level.toUpperCase() + ']: ' + text.replace(/^\n/, '') + '\n';
      log.appendChild(el);
      while (log.childNodes.length > 400) log.removeChild(log.firstChild);
      log.scrollTop = log.scrollHeight;
    }

    function runJobs(list) {
      if (busy) return;
      busy = true;
      root.querySelectorAll('[data-run]').forEach(function (b) { b.disabled = true; });
      log.hidden = false; done.hidden = true;
      log.textContent = '';
      var queue = [];
      list.forEach(function (j) {
        queue.push({ start: j });
        plan(j).steps.forEach(function (s) { queue.push(s); });
        queue.push({ end: j });
      });
      var i = 0, count = 0, row = null;
      function tick() {
        // A few lines per tick keeps a full run to a handful of seconds.
        for (var n = 0; n < 4 && i < queue.length; n++, i++) {
          var s = queue[i];
          if (s.start) {
            count = 0;
            row = root.querySelector('[data-job="' + JOBS.indexOf(s.start) + '"]');
            row.classList.add('is-running');
            row.querySelector('[data-last]').textContent = 'running';
            line('node ' + s.start.script, 'info');
          } else if (s.end) {
            state.runs[s.end.script] = { at: stamp().slice(11), total: count };
            save();
            row.classList.remove('is-running');
            paintRows();
          } else if (s.save) {
            state.prices[s.save.id] = s.price;
            count++;
          } else line(s.text, s.level);
        }
        if (i < queue.length) setTimeout(tick, 16);
        else {
          busy = false;
          root.querySelectorAll('[data-run]').forEach(function (b) { b.disabled = false; });
          done.hidden = false;
        }
      }
      tick();
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-run]');
      if (!b) return;
      runJobs(b.getAttribute('data-run') === 'all' ? JOBS : [JOBS[+b.getAttribute('data-run')]]);
    });
  }

  window.Scrape = { JOBS: JOBS, mount: mount };
})();
