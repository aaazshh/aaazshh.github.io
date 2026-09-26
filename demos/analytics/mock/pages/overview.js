// overview.php: product counts per category and supermarket from the scraped
// products index, average prices from the pricing history, and the listings
// scraped per day over the last 30 days.
(function () {
  'use strict';
  var W = World;
  var sm = PM.get('supermarket', ''), cat = PM.get('category', ''), from = PM.get('date_from', ''), to = PM.get('date_to', '');
  // Each listing carries the date it was last scraped; most were seen today.
  function lastSeen(p) {
    var r = W.rng(W.hash('seen' + p.id));
    return r() < 0.85 ? W.TODAY : W.ymd(W.addDays(new Date(), -1 - Math.floor(r() * 29)));
  }
  var all = Cat.PRODUCTS.map(function (p) { return { p: p, date: lastSeen(p) }; });
  function match(x, withDate) {
    if (sm && x.p.supermarket_name !== sm) return false;
    if (cat && x.p.category !== cat) return false;
    if (withDate && from && x.date < from) return false;
    if (withDate && to && x.date > to) return false;
    return true;
  }
  var list = all.filter(function (x) { return match(x, true); });
  PM.supermarkets = Cat.SUPERMARKETS.map(function (s) { return s.name; }).filter(function (s) { return s !== 'RedMart'; }).sort();
  var cats = {}; Cat.PRODUCTS.forEach(function (p) { cats[p.category] = 1; });
  PM.categories = Object.keys(cats).sort();
  PM.sm = sm; PM.cat = cat; PM.dateFrom = from; PM.dateTo = to;

  function countBy(key) {
    var c = {};
    list.forEach(function (x) { c[x.p[key]] = (c[x.p[key]] || 0) + 1; });
    return Object.keys(c).map(function (k) { return { key: k, count: c[k] }; }).sort(function (a, b) { return b.count - a.count || (a.key < b.key ? -1 : 1); });
  }
  PM.byCategory = countBy('category');
  PM.bySupermarket = countBy('supermarket_name').filter(function (x) { return x.key !== 'RedMart'; });

  // Average price per category over the pricing history in range (last 30 days by default).
  var pf = from || W.ymd(W.addDays(new Date(), -30)), pt = to || W.TODAY, avg = {};
  var sample = W.days(pf, pt).filter(function (d, i, a) { return i % Math.max(1, Math.floor(a.length / 10)) === 0; });
  Cat.PRODUCTS.forEach(function (p) {
    if (sm && p.supermarket_name !== sm) return;
    if (cat && p.category !== cat) return;
    var a = avg[p.category] || (avg[p.category] = { sum: 0, n: 0 });
    sample.forEach(function (d) { a.sum += Cat.price(p, d) * 100; a.n++; });
  });
  PM.avgPrice = Object.keys(avg).map(function (k) { return { category: k, avg_price: avg[k].n ? avg[k].sum / avg[k].n : 0 }; })
    .sort(function (a, b) { return b.avg_price - a.avg_price; });

  var over = {};
  all.filter(function (x) { return match(x, false); }).forEach(function (x) { over[x.date] = (over[x.date] || 0) + 1; });
  PM.overTime = W.days(W.ymd(W.addDays(new Date(), -30)), W.TODAY).map(function (d) { return { date: d, count: over[d] || 0 }; });

  PM.options = function (values, selected) {
    return values.map(function (v) { return '<option value="' + PM.esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + PM.esc(v) + '</option>'; }).join('');
  };
  PM.categoryRows = function () {
    var map = {}; PM.avgPrice.forEach(function (x) { map[x.category] = x.avg_price; });
    return PM.byCategory.map(function (x) {
      return '<tr><td><div class="d-flex px-3 py-1"><div class="d-flex flex-column justify-content-center"><h6 class="mb-0 text-sm">' + PM.esc(x.key) +
        '</h6></div></div></td><td><p class="text-sm font-weight-bold mb-0">' + PM.nf(x.count) + '</p></td><td><p class="text-sm font-weight-bold mb-0">$' +
        PM.nf(map[x.key] || 0, 2) + '</p></td></tr>';
    }).join('');
  };
})();
