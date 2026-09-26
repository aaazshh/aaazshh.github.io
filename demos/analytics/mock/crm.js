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
