// The CRM side: members of the loyalty app (CRM members table) and the member
// transaction and stamp indices, derived from the same POS receipts.
var Crm = (function () {
  'use strict';
  var W = World;
  var AGE = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  var MEMBERS = [], BY_ID = {};
  (function build() {
    var r = W.rng(4242);
    for (var i = 1; i <= W.MEMBERS; i++) {
      var id = 'M' + W.pad(i, 6);
      var x = r();
      var m = { member_id: id, id: i, name: 'guest' + (100 + i), email: 'guest' + (100 + i) + '@mail.com',
        age_group: x < 0.04 ? 'NA' : AGE[Math.min(5, Math.floor(Math.pow(r(), 0.9) * 6))],
        gender: r() < 0.54 ? 'Female' : (r() < 0.95 ? 'Male' : 'Unknown'), is_ios: r() < 0.58 ? 1 : 0, status_id: 1,
        joined: W.ymd(W.addDays(new Date(), -30 - Math.floor(r() * 900))), home_store: W.STORES[Math.floor(r() * W.STORES.length)].code };
      MEMBERS.push(m); BY_ID[id] = m;
    }
  })();

  // prod-crm-transactions-with-age-group: one doc per member line, amounts in cents.
  function txDocs(from, to) {
    var out = [];
    W.lines(from, to).forEach(function (l) {
      if (!l.member_id) return;
      var m = BY_ID[l.member_id];
      out.push({ transaction_date: l.datetime, store_code: l.store_no, location_code: l.store_no, age_group: m.age_group, gender: m.gender,
        category_name: W.CATEGORY_NAMES[l.item_category_code], sku: l.item_no, product_name: l.name, total_amount: Math.round(l.net_amount * 100),
        quantity: l.quantity, member_id: l.member_id, transaction_code: l.receipt_no });
    });
    return out;
  }

  // prod-crm-stamp-transactions: one stamp doc per member receipt, a stamp per $10.
  function stampDocs(from, to) {
    var receipts = {}, order = [];
    W.lines(from, to).forEach(function (l) {
      if (!l.member_id) return;
      var t = receipts[l.receipt_no];
      if (!t) {
        t = receipts[l.receipt_no] = { transaction_date: l.datetime, transaction_type: 'stamp', location_code: l.store_no,
          age_group: BY_ID[l.member_id].age_group, member_id: l.member_id, member_transaction_id: l.receipt_no, amount: 0 };
        order.push(l.receipt_no);
      }
      t.amount += l.net_amount;
    });
    return order.map(function (k) { var t = receipts[k]; t.transaction_stamps = Math.floor(t.amount / 10); return t; });
  }

  return { MEMBERS: MEMBERS, BY_ID: BY_ID, AGE: AGE, txDocs: txDocs, stampDocs: stampDocs };
})();

// Loyalty points (prod-crm-point-transactions), game plays
// (prod-crm-game-utilization-transactions-index) and prize claims
// (prod-crm-game-winnings-index) for the last 120 days.
(function (C) {
  'use strict';
  var W = World;
  var DAYS = 120;
  C.TRANSACTION_TYPES = { 1: 'Purchase', 2: 'Redemption', 3: 'Winning', 4: 'Adjustment', 5: 'Expiry', 6: 'Referral' };
  C.GAMES = [[1, 'Spin The Wheel'], [2, 'Scratch And Win'], [3, 'Catch The Fish'], [4, 'Lucky Draw'], [5, 'Daily Check In'], [6, 'Match Three']];
  var PRIZE_TYPES = ['Voucher', 'Points', 'Free Item', 'Stamps'];

  function start() { return W.ymd(W.addDays(new Date(), -DAYS)); }
  function intId(mid) { return parseInt(String(mid).slice(1), 10); }

  var ledger = null;
  C.points = function () {
    if (ledger) return ledger;
    var r = W.rng(99), balance = {}, id = 0, docs = [];
    function bal(m) { if (balance[m] == null) balance[m] = Math.floor(W.rng(W.hash('bal' + m))() * 1200); return balance[m]; }
    function push(m, receipt, type, pts, date, expired) {
      var before = bal(m), after = Math.max(0, before + pts);
      balance[m] = after;
      docs.push({ id: ++id, member_id: m, receipt_id: receipt, receipt_no: receipt, transaction_type: type, before_points: before,
        transaction_points: pts, after_points: after, transaction_date: date, expired: expired || 0 });
    }
    W.days(start(), W.TODAY).forEach(function (d) {
      W.STORES.forEach(function (s) {
        var receipts = {}, order = [];
        W.dayLines(s, d).forEach(function (l) {
          if (!l.member_id) return;
          var t = receipts[l.receipt_no] || (receipts[l.receipt_no] = { m: intId(l.member_id), net: 0, dt: l.datetime });
          if (t.net === 0) order.push(l.receipt_no);
          t.net += l.net_amount;
        });
        order.forEach(function (k) {
          var t = receipts[k];
          push(t.m, k, 1, Math.floor(t.net), t.dt);
          if (balance[t.m] >= 1000 && r() < 0.18) push(t.m, k, 2, -(r() < 0.6 ? 500 : 1000), t.dt);
        });
        if (d < W.ymd(W.addDays(new Date(), -40))) W.forget(s, d);
      });
      for (var i = 0; i < 6; i++) {
        var m = 1 + Math.floor(r() * W.MEMBERS), tt = r();
        if (tt < 0.5) push(m, '', 3, 50 + Math.floor(r() * 4) * 50, d + 'T' + W.pad(10 + i) + ':15:00');
        else if (tt < 0.7) push(m, '', 6, 200, d + 'T' + W.pad(10 + i) + ':30:00');
        else if (tt < 0.85) push(m, '', 4, (r() < 0.5 ? -1 : 1) * (10 + Math.floor(r() * 90)), d + 'T' + W.pad(10 + i) + ':45:00');
        else { var e = -Math.min(bal(m), 100 + Math.floor(r() * 300)); push(m, '', 5, e, d + 'T23:59:00', -e); }
      }
    });
    return (ledger = docs);
  };

  var plays = null, wins = null;
  function games() {
    if (plays) return;
    plays = []; wins = [];
    var r = W.rng(2024), pid = 0;
    W.days(start(), W.TODAY).forEach(function (d) {
      var dow = W.parse(d).getDay(), n = 90 + Math.floor(r() * 60) + (dow === 0 || dow === 6 ? 50 : 0);
      for (var i = 0; i < n; i++) {
        var h = 8 + Math.floor(r() * 14), mm = Math.floor(r() * 60);
        if (d === W.TODAY && h * 60 + mm > new Date().getHours() * 60 + new Date().getMinutes()) continue;
        var g = C.GAMES[Math.min(5, Math.floor(Math.pow(r(), 1.4) * 6))];
        var m = 1 + Math.floor(Math.pow(r(), 2.2) * W.MEMBERS);
        var dt = d + 'T' + W.pad(h) + ':' + W.pad(mm) + ':00';
        plays.push({ id: ++pid, member_id: m, game_id: g[0], name: g[1], stamps: 1 + Math.floor(r() * 3), updated_at: dt });
        if (r() < 0.22) {
          var pool = g[0] * 10 + 1 + Math.floor(r() * 4);
          wins.push({ id: pid, member_id: m, game_id: g[0], prize_pool_id: pool, prize_type: r() < 0.06 ? null : PRIZE_TYPES[pool % 4], claim_date: dt });
        }
      }
    });
  }
  C.gamePlays = function () { games(); return plays; };
  C.winnings = function () { games(); return wins; };
})(Crm);

// prod-customer-repeat-purchases: per member, product and week or month, how
// many receipts carried the product. Built from the last 120 days of member
// receipts the first time a page asks for it.
(function (C) {
  'use strict';
  var W = World;
  var built = {};
  function weekStart(d) { var x = W.parse(d), dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return W.ymd(x); }
  function isoWeek(d) {
    var x = W.parse(d); x.setDate(x.getDate() + 3 - (x.getDay() + 6) % 7);
    var y = x.getFullYear(), jan4 = new Date(y, 0, 4);
    var wk = 1 + Math.round(((x - jan4) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7);
    return y + '-W' + W.pad(wk);
  }
  C.repeatIndex = function (type) {
    if (built[type]) return built[type];
    var map = {}, docs = [];
    W.days(W.ymd(W.addDays(new Date(), -120)), W.TODAY).forEach(function (d) {
      var ws = weekStart(d), key = type === 'weekly' ? isoWeek(d) : d.slice(0, 7);
      W.STORES.forEach(function (s) {
        var seen = {};
        W.dayLines(s, d).forEach(function (l) {
          if (!l.member_id) return;
          var k = l.member_id + '|' + l.item_no + '|' + key;
          if (seen[k + l.receipt_no]) return;
          seen[k + l.receipt_no] = 1;
          var doc = map[k];
          if (!doc) {
            var start = type === 'weekly' ? ws : d.slice(0, 7) + '-01', end;
            if (type === 'weekly') end = W.ymd(W.addDays(W.parse(ws), 6));
            else { var e = W.parse(start); e.setMonth(e.getMonth() + 1); e.setDate(0); end = W.ymd(e); }
            doc = map[k] = { member_id: parseInt(l.member_id.slice(1), 10), product_sku: l.item_no, product_name: l.name, period_type: type,
              period_key: key, period_start: start, period_end: end, month: ws.slice(0, 7), txn_count: 0, last_seen: '', category: l.item_category_code };
            if (type === 'monthly') doc.month = key;
            docs.push(doc);
          }
          doc.txn_count++;
          if (l.datetime > doc.last_seen) doc.last_seen = l.datetime;
        });
      });
    });
    return (built[type] = docs);
  };
})(Crm);
