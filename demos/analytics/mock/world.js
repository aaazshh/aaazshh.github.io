// Synthetic retail world behind the analytics walkthrough. The real portal
// reads POS line items from Elasticsearch (prod-trans-sales-entry-cost-index
// and friends) and member data from the CRM database. Here the same fields are
// generated on demand, per outlet and per day, from a seeded generator, so any
// date range returns the same numbers every time it is asked for.
var World = (function () {
  'use strict';

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function days(from, to) {
    var out = [], d = parse(from), end = parse(to);
    if (isNaN(d) || isNaN(end)) return out;
    while (d <= end && out.length < 800) { out.push(ymd(d)); d = addDays(d, 1); }
    return out;
  }
  function round(v, n) { var m = Math.pow(10, n == null ? 2 : n); return Math.round(v * m) / m; }

  var TODAY = ymd(new Date());

  // Outlets, the same town list the IAM walkthrough uses.
  var STORES = [
    ['S001', 'ANG MO KIO', 1.25], ['S002', 'BEDOK', 1.1], ['S003', 'BISHAN', 0.95], ['S004', 'BUKIT BATOK', 0.8],
    ['S005', 'BUKIT PANJANG', 0.75], ['S006', 'CHOA CHU KANG', 0.9], ['S007', 'CLEMENTI', 1.0], ['S008', 'GEYLANG', 0.7],
    ['S009', 'HOUGANG', 1.05], ['S010', 'JURONG EAST', 1.3], ['S012', 'KALLANG', 0.65], ['S013', 'MARINE PARADE', 0.85]
  ].map(function (s) { return { code: s[0], name: s[1], weight: s[2] }; });

  // Item categories (item_category_code) and product groups (product_group_code).
  var GROUPS = [
    ['10', 'FRESH PRODUCE', [['100101', 'Fruits', 0.34], ['100201', 'Vegetables', 0.3], ['100301', 'Herbs & Salad', 0.28]]],
    ['11', 'BEVERAGES', [['110101', 'Hot Beverage', 0.32], ['110201', 'Soft Drinks', 0.27], ['110301', 'Juices', 0.25], ['110401', 'Water', 0.3]]],
    ['12', 'DAIRY & CHILLED', [['120101', 'Fresh Milk', 0.16], ['120201', 'Yoghurt', 0.24], ['120301', 'Cheese & Butter', 0.22], ['120401', 'Eggs', 0.12]]],
    ['13', 'MEAT & SEAFOOD', [['130101', 'Fresh Fish', 0.21], ['130201', 'Prawns & Shellfish', 0.19], ['130301', 'Chicken', 0.14], ['130401', 'Pork & Beef', 0.17]]],
    ['14', 'RICE & DRY GOODS', [['140101', 'Rice', 0.09], ['140201', 'Noodles', 0.23], ['140301', 'Cooking Oil', 0.08], ['140401', 'Sauces & Condiments', 0.29]]],
    ['15', 'SNACKS & CONFECTIONERY', [['150101', 'Biscuits', 0.27], ['150201', 'Chips & Crackers', 0.31], ['150301', 'Chocolate & Sweets', 0.33]]],
    ['16', 'FROZEN', [['160101', 'Frozen Meat', 0.18], ['160201', 'Frozen Dumplings', 0.26], ['160301', 'Ice Cream', 0.3]]],
    ['17', 'BAKERY', [['170101', 'Bread', 0.22], ['170201', 'Cakes & Pastries', 0.35]]],
    ['18', 'HOUSEHOLD', [['180101', 'Detergent', 0.2], ['180201', 'Tissue & Paper', 0.15], ['180301', 'Cleaning Supplies', 0.28]]],
    ['19', 'PERSONAL CARE', [['190101', 'Shampoo & Body Wash', 0.3], ['190201', 'Oral Care', 0.29]]]
  ];
  // item_category_code is the 4 digit prefix of the 6 digit product group, as
  // in NAV ("0214" / "021401"); the 2 digit division sits above both.
  var DIVISION_NAMES = {}, CATEGORY_NAMES = {}, GROUP_NAMES = {}, GROUP_MARGIN = {}, GROUP_PARENT = {};
  GROUPS.forEach(function (c) {
    DIVISION_NAMES[c[0]] = c[1];
    c[2].forEach(function (g) {
      GROUP_NAMES[g[0]] = g[1]; GROUP_MARGIN[g[0]] = g[2]; GROUP_PARENT[g[0]] = g[0].slice(0, 4);
      CATEGORY_NAMES[g[0].slice(0, 4)] = g[1].toUpperCase();
    });
  });

  var NOUNS = {
    '100101': [['APPLE FUJI', 'KG', 4.2], ['BANANA CAVENDISH', 'KG', 2.6], ['ORANGE NAVEL', 'KG', 3.9], ['GRAPES RED SEEDLESS', 'PKT', 5.9], ['PAPAYA', 'EA', 3.5], ['WATERMELON', 'EA', 6.8], ['PEAR SHANDONG', 'KG', 4.5], ['MANGO', 'EA', 2.2]],
    '100201': [['KAI LAN', 'PKT', 1.9], ['CHYE SIM', 'PKT', 1.7], ['BROCCOLI', 'KG', 5.4], ['CARROT', 'KG', 1.8], ['TOMATO', 'KG', 3.2], ['CUCUMBER', 'EA', 0.9], ['POTATO', 'KG', 2.1], ['ONION RED', 'KG', 2.4]],
    '100301': [['CORIANDER', 'PKT', 0.9], ['SPRING ONION', 'PKT', 0.9], ['ROMAINE LETTUCE', 'EA', 2.5], ['BASIL', 'PKT', 1.6]],
    '110101': [['3 IN 1 COFFEE 30S', 'PKT', 8.9], ['TEA BAGS 100S', 'BOX', 5.6], ['MALT DRINK 1KG', 'TIN', 12.5], ['INSTANT COFFEE 200G', 'JAR', 9.8]],
    '110201': [['COLA 1.5L', 'BTL', 2.4], ['LEMON SODA 6X320ML', 'PKT', 4.7], ['ISOTONIC DRINK 500ML', 'BTL', 1.6], ['GINGER ALE 1.5L', 'BTL', 2.3]],
    '110301': [['ORANGE JUICE 1L', 'BTL', 3.6], ['APPLE JUICE 1L', 'BTL', 3.4], ['SOYA BEAN DRINK 1L', 'BTL', 2.1], ['CHRYSANTHEMUM TEA 1L', 'BTL', 1.9]],
    '110401': [['MINERAL WATER 1.5L', 'BTL', 1.1], ['DRINKING WATER 24X600ML', 'CTN', 7.9], ['SPARKLING WATER 500ML', 'BTL', 1.8]],
    '120101': [['FRESH MILK 1L', 'BTL', 3.3], ['FRESH MILK 2L', 'BTL', 6.2], ['LOW FAT MILK 1L', 'BTL', 3.4], ['CHOCOLATE MILK 1L', 'BTL', 3.5]],
    '120201': [['GREEK YOGHURT 500G', 'TUB', 6.4], ['YOGHURT DRINK 6S', 'PKT', 3.9], ['FRUIT YOGHURT 4S', 'PKT', 4.2]],
    '120301': [['CHEDDAR SLICES 12S', 'PKT', 5.9], ['SALTED BUTTER 250G', 'BLK', 6.8], ['MOZZARELLA 200G', 'PKT', 7.2]],
    '120401': [['FRESH EGGS 10S', 'PKT', 3.2], ['FRESH EGGS 30S', 'TRAY', 8.9], ['KAMPUNG EGGS 10S', 'PKT', 4.4]],
    '130101': [['BATANG STEAK', 'KG', 18.9], ['SALMON FILLET', 'KG', 32.5], ['SEA BASS WHOLE', 'KG', 14.6], ['GOLDEN POMFRET', 'KG', 16.8], ['TILAPIA', 'KG', 9.2]],
    '130201': [['TIGER PRAWN', 'KG', 24.9], ['WHITE PRAWN', 'KG', 18.5], ['LALA CLAMS', 'KG', 7.9], ['MUSSELS', 'KG', 9.6]],
    '130301': [['CHICKEN WHOLE', 'EA', 8.9], ['CHICKEN THIGH', 'KG', 9.4], ['CHICKEN BREAST', 'KG', 10.2], ['CHICKEN WINGS', 'KG', 8.1]],
    '130401': [['PORK COLLAR', 'KG', 16.5], ['PORK MINCE', 'KG', 12.2], ['BEEF STRIPLOIN', 'KG', 42.9], ['BEEF CUBES', 'KG', 24.6]],
    '140101': [['JASMINE RICE 5KG', 'PKT', 13.9], ['BROWN RICE 2KG', 'PKT', 7.8], ['JAPANESE RICE 2KG', 'PKT', 9.9]],
    '140201': [['INSTANT NOODLES 5S', 'PKT', 3.6], ['BEE HOON 400G', 'PKT', 2.2], ['SPAGHETTI 500G', 'PKT', 2.6], ['EGG NOODLES 500G', 'PKT', 2.4]],
    '140301': [['CANOLA OIL 2L', 'BTL', 8.9], ['PEANUT OIL 1L', 'BTL', 7.5], ['SUNFLOWER OIL 2L', 'BTL', 8.2]],
    '140401': [['LIGHT SOY SAUCE 640ML', 'BTL', 3.1], ['OYSTER SAUCE 510G', 'BTL', 3.9], ['CHILLI SAUCE 320G', 'BTL', 2.3], ['SESAME OIL 330ML', 'BTL', 5.5]],
    '150101': [['CREAM CRACKERS 428G', 'PKT', 3.2], ['CHOCOLATE COOKIES 200G', 'PKT', 3.8], ['WAFER ROLLS 300G', 'TIN', 5.9]],
    '150201': [['POTATO CHIPS 160G', 'PKT', 3.5], ['PRAWN CRACKERS 100G', 'PKT', 2.1], ['CORN SNACK 150G', 'PKT', 2.6]],
    '150301': [['MILK CHOCOLATE 150G', 'BAR', 4.6], ['GUMMY BEARS 200G', 'PKT', 3.1], ['MINT CANDY 100G', 'PKT', 2.2]],
    '160101': [['FROZEN CHICKEN NUGGETS 1KG', 'PKT', 8.9], ['FROZEN FISH FILLET 500G', 'PKT', 6.9]],
    '160201': [['PORK DUMPLINGS 20S', 'PKT', 7.5], ['PRAWN WANTONS 15S', 'PKT', 6.8], ['SPRING ROLLS 20S', 'PKT', 5.2]],
    '160301': [['VANILLA ICE CREAM 1.5L', 'TUB', 8.6], ['ICE CREAM CONES 4S', 'PKT', 6.4], ['POTONG ICE CREAM 6S', 'PKT', 5.5]],
    '170101': [['WHITE BREAD 600G', 'LOAF', 2.6], ['WHOLEMEAL BREAD 600G', 'LOAF', 2.9], ['BUNS 6S', 'PKT', 2.4]],
    '170201': [['KAYA SWISS ROLL', 'EA', 3.8], ['BUTTER CAKE', 'EA', 5.9], ['EGG TARTS 6S', 'PKT', 6.5]],
    '180101': [['LIQUID DETERGENT 3L', 'BTL', 12.9], ['DISHWASHING LIQUID 900ML', 'BTL', 3.4], ['FABRIC SOFTENER 2L', 'BTL', 8.8]],
    '180201': [['TOILET ROLLS 10S', 'PKT', 7.9], ['FACIAL TISSUE 5S', 'PKT', 5.2], ['KITCHEN TOWEL 4S', 'PKT', 4.9]],
    '180301': [['FLOOR CLEANER 2L', 'BTL', 5.6], ['GARBAGE BAGS 30S', 'PKT', 3.3], ['SPONGE SCOURER 5S', 'PKT', 2.5]],
    '190101': [['SHAMPOO 750ML', 'BTL', 9.9], ['BODY WASH 1L', 'BTL', 8.5], ['CONDITIONER 700ML', 'BTL', 9.5]],
    '190201': [['TOOTHPASTE 160G', 'TUBE', 3.9], ['TOOTHBRUSH 4S', 'PKT', 5.9], ['MOUTHWASH 750ML', 'BTL', 8.2]]
  };

  var VENDORS = [];
  for (var v = 1; v <= 24; v++) VENDORS.push({ no: 'V' + pad(v, 4), name: 'VENDOR ' + pad(v, 3) + ' PTE LTD', consignment: v % 4 === 0, rate: v % 3 === 0 ? 0 : 15 + (v * 7) % 16 });

  var ITEMS = [];
  (function buildItems() {
    var r = rng(1234);
    var n = 0;
    Object.keys(NOUNS).forEach(function (code) {
      var margin = GROUP_MARGIN[code];
      NOUNS[code].forEach(function (x, i) {
        n++;
        var itemMargin = margin + (r() - 0.5) * 0.14;
        if (n % 37 === 0) itemMargin = -0.04 - r() * 0.05;
        var vendor = VENDORS[(hash(code) + i) % VENDORS.length];
        ITEMS.push({
          item_no: code.slice(0, 4) + pad(n, 4), name: x[0], uom: x[1], price: x[2], margin: itemMargin,
          cost: round(x[2] * (1 - itemMargin), 4),
          product_group_code: code, item_category_code: GROUP_PARENT[code],
          vendor_no: vendor.no, vendor_name: vendor.name, consignment: vendor.consignment,
          barcode: '888' + pad(hash(x[0]) % 1000000000, 10),
          weight: Math.pow(1 / (1 + (hash(x[0]) % 40)), 0.6) * (x[1] === 'KG' ? 1.2 : 1),
          weighted: x[1] === 'KG', created: '2024-0' + (1 + (n % 9)) + '-1' + (n % 9)
        });
      });
    });
  })();
  var ITEM_BY_NO = {};
  ITEMS.forEach(function (it) { ITEM_BY_NO[it.item_no] = it; });
  var CUM = [], totalW = 0;
  ITEMS.forEach(function (it) { totalW += it.weight; CUM.push(totalW); });
  function pickItem(r) {
    var x = r() * totalW, lo = 0, hi = CUM.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (CUM[mid] < x) lo = mid + 1; else hi = mid; }
    return ITEMS[lo];
  }

  // Member pool for the CRM side.
  var MEMBERS = 4200;
  var HOURS = [0, 0, 0, 0, 0, 0, 0.1, 0.35, 0.8, 1, 1.05, 1.15, 1.3, 1.1, 0.95, 0.95, 1.05, 1.3, 1.45, 1.35, 1.05, 0.7, 0.35, 0.05];
  var HOUR_CUM = [], hw = 0;
  HOURS.forEach(function (h) { hw += h; HOUR_CUM.push(hw); });

  var cache = {};

  // POS line items for one outlet on one day, shaped like
  // prod-trans-sales-entry-cost-index documents.
  // Walks one outlet's day of receipts. emit() gets each line; the same seed
  // always produces the same receipts, whether they are kept or only summed.
  function generate(store, date, emit) {
    var key = store.code + date;
    var d = parse(date);
    var r = rng(hash(key));
    var dow = d.getDay();
    var weekFactor = [1.25, 0.9, 0.85, 0.9, 0.95, 1.1, 1.35][dow];
    var season = 1 + 0.08 * Math.sin((d.getMonth() + d.getDate() / 30) / 12 * Math.PI * 2);
    var trend = 1 + (d.getFullYear() - 2025) * 0.06;
    var receipts = Math.round(58 * store.weight * weekFactor * season * trend * (0.85 + r() * 0.3));
    if (date > TODAY) receipts = 0;
    for (var i = 0; i < receipts; i++) {
      var x = r() * hw, hour = 0;
      while (HOUR_CUM[hour] < x) hour++;
      var minute = Math.floor(r() * 60), second = Math.floor(r() * 60);
      var member = r() < 0.46 ? 'M' + pad(1 + Math.floor(Math.pow(r(), 1.6) * MEMBERS), 6) : '';
      var terminal = 'POS' + (1 + Math.floor(r() * 3));
      var staff = 'guest' + (1 + (hash(store.code) % 40) + Math.floor(r() * 4));
      var n = 1 + Math.floor(Math.pow(r(), 1.7) * 9);
      for (var j = 0; j < n; j++) {
        var it = pickItem(r);
        var qty = it.weighted ? round(0.3 + r() * 1.6, 3) : (r() < 0.78 ? 1 : 2 + Math.floor(r() * 3));
        var promo = r() < 0.12;
        var disc = promo ? round(it.price * qty * (0.1 + r() * 0.2), 2) : 0;
        var gross = round(it.price * qty, 2);
        var net = round(gross - disc, 2);
        var cost = round(it.cost * qty, 2);
        emit(i, hour, minute, second, member, terminal, staff, it, qty, promo, disc, gross, net, cost);
      }
    }
  }

  // POS line items for one outlet on one day, shaped like
  // prod-trans-sales-entry-cost-index documents.
  function dayLines(store, date) {
    var key = store.code + date;
    if (cache[key]) return cache[key];
    var lines = [];
    var stamp = date.replace(/-/g, '');
    generate(store, date, function (i, hour, minute, second, member, terminal, staff, it, qty, promo, disc, gross, net, cost) {
      var receipt = store.code + stamp + pad(i + 1, 4);
      lines.push({
        store_no: store.code, datetime: date + 'T' + pad(hour) + ':' + pad(minute) + ':' + pad(second), date: date, hour: hour,
        receipt_no: receipt, transaction_no: receipt,
        item_no: it.item_no, name: it.name, uom: it.uom, product_group_code: it.product_group_code,
        item_category_code: it.item_category_code, vendor_no: it.vendor_no, barcode_no: it.barcode,
        unit_of_measure: it.uom, batch_no: 'STMT' + stamp.slice(2, 6) + store.code.slice(1),
        quantity: qty, price: it.price, gross_amount: gross, discount_amount: disc, net_amount: net,
        cost_amount: cost, gross_profit: round(net - cost, 2), gst_amount: round(net * 9 / 109, 2),
        member_id: member, pos_terminal_no: terminal, staff_id: staff, promo: promo
      });
    });
    cache[key] = lines;
    return lines;
  }

  // Per item totals for one outlet on one day, without keeping the lines.
  // Used by the year long reports.
  var sumCache = {};
  function daySummary(store, date) {
    var key = store.code + date;
    if (sumCache[key]) return sumCache[key];
    if (cache[key]) {
      var fromLines = {};
      cache[key].forEach(function (l) {
        var t = fromLines[l.item_no] || (fromLines[l.item_no] = { qty: 0, net: 0, cost: 0, disc: 0, lines: 0 });
        t.qty += l.quantity; t.net += l.net_amount; t.cost += l.cost_amount; t.disc += l.discount_amount; t.lines++;
      });
      return (sumCache[key] = fromLines);
    }
    var totals = {};
    generate(store, date, function (i, hour, minute, second, member, terminal, staff, it, qty, promo, disc, gross, net, cost) {
      var t = totals[it.item_no] || (totals[it.item_no] = { qty: 0, net: 0, cost: 0, disc: 0, lines: 0 });
      t.qty += qty; t.net += net; t.cost += cost; t.disc += disc; t.lines++;
    });
    return (sumCache[key] = totals);
  }

  function storeList(storeNo) {
    if (!storeNo) return STORES;
    var list = [].concat(storeNo);
    return STORES.filter(function (s) { return list.indexOf(s.code) !== -1; });
  }

  // All lines for a period, optionally for some outlets.
  function lines(from, to, storeNo) {
    var out = [];
    var stores = storeList(storeNo);
    days(from, to).forEach(function (d) {
      stores.forEach(function (s) { var l = dayLines(s, d); for (var i = 0; i < l.length; i++) out.push(l[i]); });
    });
    return out;
  }

  function groupBy(rows, keyFn) {
    var map = {}, order = [];
    rows.forEach(function (r) {
      var k = typeof keyFn === 'function' ? keyFn(r) : r[keyFn];
      if (!(k in map)) { map[k] = []; order.push(k); }
      map[k].push(r);
    });
    return { map: map, keys: order };
  }
  function sum(rows, f) { var s = 0; for (var i = 0; i < rows.length; i++) s += +rows[i][f] || 0; return s; }
  function distinct(rows, f) { var s = {}, n = 0; rows.forEach(function (r) { if (r[f] && !s[r[f]]) { s[r[f]] = 1; n++; } }); return n; }

  function storeName(code) {
    for (var i = 0; i < STORES.length; i++) if (STORES[i].code === code) return STORES[i].name;
    return code;
  }

  // Category filter values are product group codes or prefixes, comma separated.
  function inCategory(row, category) {
    if (!category) return true;
    var codes = String(category).split(',').map(function (c) { return c.trim(); }).filter(Boolean);
    return codes.some(function (c) { return String(row.product_group_code).indexOf(c) === 0; });
  }

  return {
    hash: hash, rng: rng, pad: pad, ymd: ymd, parse: parse, addDays: addDays, days: days, round: round, TODAY: TODAY,
    STORES: STORES, GROUPS: GROUPS, DIVISION_NAMES: DIVISION_NAMES, CATEGORY_NAMES: CATEGORY_NAMES, GROUP_NAMES: GROUP_NAMES, ITEMS: ITEMS,
    ITEM_BY_NO: ITEM_BY_NO, VENDORS: VENDORS, MEMBERS: MEMBERS,
    dayLines: dayLines, daySummary: daySummary, lines: lines, groupBy: groupBy, sum: sum, distinct: distinct, storeName: storeName,
    storeList: storeList, inCategory: inCategory
  };
})();
