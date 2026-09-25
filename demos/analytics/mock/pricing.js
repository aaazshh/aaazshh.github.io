// pricing-summary, promo-sku-performance and pricing-top-performers.
(function () {
  'use strict';
  var W = World;

  function epoch(d) { var x = W.parse(d); return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) - 8 * 3600000; }

  Api.route('api:pricing-summary', function (p) {
    var rows = Q.gpLines(p);
    var promo = rows.filter(function (r) { return r.discount_amount > 0; });
    var total = W.sum(rows, 'net_amount'), promoRev = W.sum(promo, 'net_amount'), promoDisc = W.sum(promo, 'discount_amount');
    var g = W.groupBy(rows, 'date');
    var dates = g.keys.slice().sort();
    var daily = [];
    if (dates.length) {
      W.days(dates[0], dates[dates.length - 1]).forEach(function (d) {
        var b = g.map[d] || [], pb = b.filter(function (r) { return r.discount_amount > 0; });
        daily.push({ key_as_string: d + 'T00:00:00.000+08:00', key: epoch(d), doc_count: b.length,
          daily_revenue: { value: W.round(W.sum(b, 'net_amount')) },
          daily_promo: { doc_count: pb.length, promo_rev: { value: W.round(W.sum(pb, 'net_amount')) } } });
      });
    }
    return { status: 1, data: { total_revenue: W.round(total), promo_revenue: W.round(promoRev),
      promo_percent: total > 0 ? promoRev / total : 0,
      avg_discount_percent: promoRev + promoDisc > 0 ? promoDisc / (promoRev + promoDisc) : 0, daily: daily } };
  });

  Api.route('api:promo-sku-performance', function (p) {
    var g = W.groupBy(Q.gpLines(p), 'item_no'), out = [];
    var keys = g.keys.slice().sort(function (a, b) {
      var pa = W.sum(g.map[a].filter(function (r) { return r.discount_amount > 0; }), 'net_amount');
      var pb = W.sum(g.map[b].filter(function (r) { return r.discount_amount > 0; }), 'net_amount');
      return pb - pa;
    }).slice(0, 100);
    keys.forEach(function (k) {
      var b = g.map[k];
      var promo = b.filter(function (r) { return r.discount_amount > 0; });
      var normal = b.filter(function (r) { return r.discount_amount === 0; });
      var total = W.sum(b, 'net_amount'), units = W.sum(b, 'quantity'), gp = W.sum(b, 'gross_profit');
      var promoRev = W.sum(promo, 'net_amount'), promoQty = W.sum(promo, 'quantity'), promoDisc = W.sum(promo, 'discount_amount');
      if (promoRev <= 0 && promoQty <= 0) return;
      var promoDays = W.groupBy(promo, 'date').keys.length, normalDays = W.groupBy(normal, 'date').keys.length;
      var avgPromo = promoDays ? promoQty / promoDays : 0, avgNormal = normalDays ? W.sum(normal, 'quantity') / normalDays : 0;
      var lift = avgNormal > 0 ? (avgPromo - avgNormal) / avgNormal : 0;
      var disc = promoRev + promoDisc > 0 ? promoDisc / (promoRev + promoDisc) : 0;
      var elasticity = disc > 0 ? lift / disc : 0;
      var verdict = 'Neutral';
      if (disc > 0.2 && lift < 0.1) verdict = 'Fake Promo';
      else if (elasticity > 1) verdict = 'Strong Promo';
      else if (elasticity < 0.5 && disc > 0) verdict = 'Weak Response';
      out.push({ sku: k, product_name: b[0].name, total_revenue: W.round(total), promo_revenue: W.round(promoRev), units_sold: W.round(units, 3),
        gross_profit: W.round(gp), net_margin: total > 0 ? gp / total : 0, discount_percent: disc, volume_lift_percent: lift,
        elasticity: elasticity, verdict: verdict });
    });
    out.sort(function (a, b) { return b.net_margin - a.net_margin; });
    return Api.json(out);
  });

  Api.route('api:pricing-top-performers', function (p) {
    var byOutlet = Q.str(p.group_by) === 'outlet';
    var g = W.groupBy(Q.gpLines(p), byOutlet ? 'store_no' : 'product_group_code');
    var out = g.keys.map(function (code) {
      var b = g.map[code], rev = W.sum(b, 'net_amount'), gp = W.sum(b, 'gross_profit');
      var promo = W.sum(b.filter(function (r) { return r.discount_amount > 0; }), 'net_amount');
      var items = W.groupBy(b, 'item_no'), top = '', topRev = -1;
      items.keys.forEach(function (k) { var s = W.sum(items.map[k], 'net_amount'); if (s > topRev) { topRev = s; top = k; } });
      return { group_code: code, group_label: byOutlet ? code : (W.GROUP_NAMES[code] || code), revenue: W.round(rev), promo_revenue: W.round(promo),
        promo_percent: rev > 0 ? promo / rev : 0, units_sold: W.round(W.sum(b, 'quantity'), 3), net_margin: rev > 0 ? gp / rev : 0,
        top_sku: top, top_sku_name: top ? items.map[top][0].name : '' };
    });
    out.sort(function (a, b) { return b.revenue - a.revenue; });
    return Api.json(out);
  });
})();
