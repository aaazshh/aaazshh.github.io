// In-browser copy of the IAM database. Departments, portals, roles and
// department_mapping are the rows from migrate.sql. Users, outlets, access,
// category_groups and bm_mapping are generated in the same shapes, with every
// person as guestN. The portals are the five systems in this portfolio, each
// with the roles its own database maps IAM roles onto. The database lives in
// localStorage, so an account made here can sign in to the other demos through
// iam-sso.js, the way the real portals ask IAM.
var IAM = (function () {
  'use strict';

  var KEY = 'iam-demo-db-v2';

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function stamp(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  var DEPARTMENTS = [
    [1, 'PMT'], [2, 'ACC'], [3, 'ITD'], [4, 'OPS'], [5, 'ANP'], [6, 'MDHQ'], [7, 'HR'],
    [8, 'PGI'], [9, 'MF'], [10, 'POL'], [11, 'BUYER'], [12, 'PAC'], [13, 'ADMIN'],
    [14, 'PROJ'], [15, 'MK'], [16, 'MGMT'], [17, 'CRM'], [18, 'IT'], [19, 'P96 Ops']
  ];

  var PORTALS = [
    [6, 'http://localhost/iam', 'IAM', '2025-09-26 01:32:46'],
    [24, 'http://localhost/fishfarm', 'Fish Farm', '2026-06-26 00:00:00'],
    [25, 'http://localhost/logistics', 'Logistics', '2026-06-30 00:00:00'],
    [26, 'http://localhost/hq-web', 'HQ', '2026-04-15 00:00:00'],
    [27, 'http://localhost/analytic', 'Analytic', '2025-09-26 01:32:46']
  ];

  // id, name, description, portal_id. Each portal matches the IAM role name
  // against its own roles table: Fish Farm and HQ by name (HQ falls back to
  // Staff), Logistics by the lower-cased name, Analytic by name.
  var ROLES = [
    [68, 'Admin', 'Admin Access', 6], [69, 'Super Admin', 'Full Access', 6],
    [125, 'Super Admin', 'Full Access', 24], [126, 'Admin', 'Admin Access', 24],
    [130, 'Super_Admin', 'Full access to every company', 25], [131, 'PSM_Admin', 'PSM Logistics dispatch and fleet', 25],
    [132, 'PSM_Driver', 'PSM Logistics driver app', 25], [133, 'POL_Admin', 'Prime Online dispatch and fleet', 25],
    [134, 'POL_Driver', 'Prime Online driver app', 25],
    [140, 'Super Admin', 'Full Access', 26], [141, 'Admin', 'Can create and edit forms', 26], [142, 'Staff', 'Staff Access', 26],
    [150, 'Super Admin', 'Full Access', 27], [151, 'PSM Admin', 'PGI Admin Access', 27], [152, 'Outlet', 'Outlet Access', 27],
    [153, 'Buyer', 'PGI Admin Access', 27]
  ];

  // id, department_id, department, entra
  var DEPARTMENT_MAPPING = [
    [1, 2, 'ACC', 'Accounts Department'], [2, null, '', 'Combine SG'], [3, 13, 'ADMIN', 'HR & Admin Department'],
    [4, 3, 'ITD', 'IT Department'], [5, 15, 'MK', 'Mahota Marketing'], [6, 16, 'MGMT', 'Management'],
    [7, 5, 'ANP', 'Marketing'], [8, 6, 'MDHQ', 'Merchandising Department'], [9, 9, 'MF', 'MF - Mahota Marketing'],
    [10, 9, 'MF', 'MF - MF Ops'], [11, 15, 'MK', 'MF Ops'], [12, 2, 'ACC', 'MK - Account Dept'],
    [13, 3, 'ITD', 'MK - IT Dept'], [14, 16, 'MGMT', 'MK - Management Dept'], [15, 15, 'MK', 'MK - MHT Marketing'],
    [16, 15, 'MK', 'MK - MK Dept (DK)'], [17, 4, 'OPS', 'MK - MK Ops'], [18, 15, 'MK', 'MK Ops'],
    [19, 5, 'ANP', 'P96 - A&P Dept'], [20, 2, 'ACC', 'P96 - Account Dept'], [21, 13, 'ADMIN', 'P96 - Admin Dept'],
    [22, 6, 'MDHQ', 'P96 - MDHQ Dept'], [23, null, 'P96', 'P96 - Ops Dept'], [24, null, 'P96', 'P96 - PGI Buyer'],
    [25, null, 'P96', 'P96 - PGI Buyer Dept'], [26, null, 'P96', 'P96 - PGI Buyer Dept '], [27, null, 'P96', 'P96 - PGI Dept'],
    [28, null, 'P96', 'P96 - PGI WH Dept'], [29, null, '', 'P96-JK Distribution Centre'], [30, 2, 'ACC', 'PAC - Account Dept'],
    [31, 12, 'PAC', 'PAC - Aqua Lab'], [32, 15, 'MK', 'PAC - MK Dept (DK)'], [33, 12, 'PAC', 'PAC - PAC Dept'],
    [34, 16, 'MGMT', 'PAC -PMT Dept (Management)'], [35, null, '', 'PFB - PMT Dept'], [36, null, '', 'PFB - Prime Court'],
    [37, 8, 'PGI', 'PGI - PGI Dept'], [38, 8, 'PGI', 'PGI Operators'], [39, null, '', 'PGI Warehouse'],
    [40, 16, 'MGMT', 'PMI - MK Dept (Management)'], [41, 1, 'PMT', 'PMT  - PMT Dept'], [42, 2, 'ACC', 'PMT - Account Dept'],
    [43, 5, 'ANP', 'PMT - CRM Dept'], [44, 16, 'MGMT', 'PMT - Management'], [45, 1, 'PMT', 'PMT - PMT Dept'],
    [46, 1, 'PMT', 'PMT - PMT MSU Dept'], [47, 1, 'PMT', 'PMT- PMT Dept'], [48, 10, 'POL', 'POL - POL Dept'],
    [49, null, '', 'PRE - Mahota Education'], [50, 12, 'PAC', 'Prime Aquaculture'], [51, 1, 'PMT', 'PRIME MART TRADING'],
    [52, 10, 'POL', 'Prime Online Pte Ltd - POL Dept'], [53, 5, 'ANP', 'PSM - A&P Dept'], [54, 2, 'ACC', 'PSM - Account Dept'],
    [55, 13, 'ADMIN', 'PSM - Admin Dept'], [56, 13, 'ADMIN', 'PSM - Admin Dept (Facility )'],
    [57, 13, 'ADMIN', 'PSM - Buildings, Real Estate & Maintenance'], [58, null, 'P96', 'PSM - C Suit '],
    [59, null, 'P96', 'PSM - CPU Dept '], [60, 5, 'ANP', 'PSM - CRM Dept'], [61, null, 'CEO', 'PSM - Group CEO Office'],
    [62, 7, 'HR', 'PSM - HR Dept'], [63, 3, 'ITD', 'PSM - IT Dept'], [64, 16, 'MGMT', 'PSM - Management'],
    [65, 6, 'MDHQ', 'PSM - MDHQ Dept'], [66, null, 'P96', 'PSM - Ops Dept'], [67, 8, 'PGI', 'PSM - PGI Buyer Dept'],
    [68, 8, 'PGI', 'PSM - PGI Dept'], [69, 1, 'PMT', 'PSM - PMT Dept'], [70, 14, 'PROJ', 'PSM - Projects Dept'],
    [71, 3, 'ITD', 'PSM-ITD']
  ];

  // Digital Forms serves its categories through public-api.php?action=get-all-categories.
  var CATEGORIES = {
    1: 'HR', 2: 'IT', 3: 'Finance', 4: 'Operations', 5: 'Facilities', 6: 'Safety', 7: 'Purchasing', 8: 'Marketing'
  };

  // Towns used for the generated outlet list.
  var TOWNS = ['Ang Mo Kio', 'Bedok', 'Bishan', 'Bukit Batok', 'Bukit Panjang', 'Choa Chu Kang', 'Clementi',
    'Geylang', 'Hougang', 'Jurong East', 'Jurong West', 'Kallang', 'Marine Parade', 'Pasir Ris', 'Punggol',
    'Queenstown', 'Sembawang', 'Sengkang', 'Serangoon', 'Tampines', 'Toa Payoh', 'Woodlands', 'Yishun',
    'Boon Lay', 'Bukit Merah', 'Chinatown', 'Kembangan', 'Tiong Bahru', 'Holland Village', 'Joo Chiat'];

  function seed() {
    var r = rng(20250926);
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var now = new Date();
    var db = {
      departments: [], portals: [], roles: [], users: [], outlets: [], access: [],
      category_groups: [], department_mapping: [], bm_mapping: [], categories: CATEGORIES
    };

    // add-user.php looks the outlet department up by the name 'Branch Ops Management',
    // which is what the P96 Ops row is called outside the local seed.
    DEPARTMENTS.forEach(function (d) {
      var name = d[0] === 19 ? 'Branch Ops Management' : d[1];
      db.departments.push({ id: d[0], code: d[1], name: name, status_id: 1, created_at: '2025-09-25 01:15:27', deleted_by: null });
    });

    PORTALS.forEach(function (p) {
      var key = '';
      for (var i = 0; i < 32; i++) key += '0123456789abcdef'.charAt(Math.floor(r() * 16));
      db.portals.push({ id: p[0], url: p[1], encrypt_key: key, name: p[2], is_mobile: 0, status_id: 1, created_at: p[3], deleted_by: null });
    });

    ROLES.forEach(function (x) {
      db.roles.push({
        id: x[0], name: x[1], description: x[2], portal_id: x[3],
        portal_access_id: x[4] || null, department_access_id: x[5] || null,
        status_id: 1, created_at: '2025-07-16 10:33:30', deleted_by: null
      });
    });

    DEPARTMENT_MAPPING.forEach(function (m) {
      db.department_mapping.push({ id: m[0], department_id: m[1], department: m[2], entra: m[3], status_id: 1, created_at: '2025-10-14 07:38:10', deleted_by: null });
    });

    for (var o = 1; o <= TOWNS.length; o++) {
      db.outlets.push({
        id: o, code: 'S' + pad(o, 3), name: TOWNS[o - 1].toUpperCase(),
        address: 'Blk ' + (100 + Math.floor(r() * 800)) + ' ' + TOWNS[o - 1] + ' Street ' + (1 + Math.floor(r() * 30)) + ' #01-' + pad(Math.floor(r() * 300), 2),
        post_code: String(100000 + Math.floor(r() * 700000)),
        contact: 'guest' + (60 + o),
        phone_no: '6000 ' + pad(o, 4),
        country: 'Singapore', company_name: 'Prime Supermarket Ltd', entity: 'PSM',
        active: o % 11 === 0 ? 0 : 1
      });
    }

    // Maram Aashna is the signed-in Super Admin, the rest are guestN.
    db.users.push({
      id: 1, role_id: 69, username: 'maram.aashna', email: 'maram.aashna@mail.com', name: 'Maram Aashna',
      password: 'hashed', outlet_id: null, department_id: 3, is_microsoft: 1, last_login: stamp(now),
      status_id: 1, reset_password: 0, is_hod: 0, employee_id: 'P100001', created_at: '2025-06-10 04:26:27', deleted_by: null,
      portal_fields: {}
    });
    var deptWeights = [1, 1, 2, 3, 4, 4, 5, 6, 7, 8, 8, 12, 13, 15, 16, 17, 19, 19, 19, 19, 19, 19];
    for (var u = 1; u <= 96; u++) {
      var dept = pick(deptWeights);
      var ms = r() < 0.72 ? 1 : 0;
      var login = r() < 0.8 ? new Date(now.getTime() - Math.floor(r() * 60 * 24 * 3600 * 1000)) : null;
      var user = {
        id: u + 1, role_id: 0, username: 'guest' + u, email: 'guest' + u + '@mail.com', name: 'guest' + u,
        password: 'hashed', outlet_id: null, department_id: dept, is_microsoft: ms,
        last_login: login ? stamp(login) : null, status_id: r() < 0.9 ? 1 : 0, reset_password: ms ? 0 : (r() < 0.3 ? 1 : 0),
        is_hod: 0, employee_id: r() < 0.65 ? 'P' + (100002 + u * 37) : null,
        created_at: '2025-06-10 04:26:27', deleted_by: null, portal_fields: {}
      };
      if (dept === 19) user.outlet_id = 1 + Math.floor(r() * TOWNS.length);
      db.users.push(user);
    }

    // Role assignments, shaped like the access table.
    var byPortal = {};
    db.roles.forEach(function (x) { (byPortal[x.portal_id] = byPortal[x.portal_id] || []).push(x.id); });
    // Which systems each department works in: HQ for everyone, Logistics for
    // operations, Fish Farm for PAC, Analytic for buying and management.
    var deptPortals = {
      1: [26, 27], 2: [26, 27], 3: [6, 26], 4: [25, 26], 5: [26, 27], 6: [26], 7: [6, 26],
      8: [26, 27], 9: [26], 10: [25, 26], 11: [26, 27], 12: [24, 26], 13: [26], 14: [26], 15: [26, 27],
      16: [24, 26, 27], 17: [26, 27], 18: [6, 26], 19: [25, 26, 27]
    };
    // Admin and super admin roles are rare; most people get the everyday one.
    var everyday = { 6: [68], 24: [126], 25: [132, 132, 132, 134, 131], 26: [142, 142, 142, 142, 141], 27: [152, 152, 153, 151] };
    var accessId = 0;
    function grant(userId, roleId, status) {
      var role = db.roles.filter(function (x) { return x.id === roleId; })[0];
      db.access.push({
        id: ++accessId, user_id: userId, role_id: roleId,
        platform_id: null,
        status_id: status, created_at: stamp(new Date(now.getTime() - Math.floor(r() * 200) * 86400000)), deleted_by: null
      });
    }
    // Maram Aashna runs all five.
    grant(1, 69, 1); grant(1, 125, 1); grant(1, 130, 1); grant(1, 140, 1); grant(1, 150, 1);
    db.users.slice(1).forEach(function (usr) {
      var portals = deptPortals[usr.department_id] || [26];
      var n = 1 + Math.floor(r() * 3);
      var used = {};
      for (var i = 0; i < n; i++) {
        var pid = pick(portals);
        if (used[pid]) continue;
        used[pid] = 1;
        var candidates = everyday[pid] || byPortal[pid];
        grant(usr.id, pick(candidates), usr.status_id === 1 && r() < 0.94 ? 1 : 0);
        if (pid === 7) {
          var cats = Object.keys(CATEGORIES);
          var k = 1 + Math.floor(r() * 3), seen = {};
          for (var c = 0; c < k; c++) {
            var cat = Number(pick(cats));
            if (seen[cat]) continue;
            seen[cat] = 1;
            db.category_groups.push({ id: db.category_groups.length + 1, user_id: usr.id, category_id: cat });
          }
        }
      }
    });

    // Branch managers: P96 Ops users mapped to outlets.
    var bms = db.users.filter(function (x) { return x.department_id === 19 && x.status_id === 1; });
    var bmId = 0;
    db.outlets.forEach(function (out) {
      if (!out.active || r() < 0.3 || !bms.length) return;
      var bm = pick(bms);
      db.bm_mapping.push({
        id: ++bmId, outlet_id: out.id, outlet_code: out.code, outlet_name: out.name, user_id: bm.id,
        status_id: r() < 0.9 ? 1 : 0, created_at: stamp(new Date(now.getTime() - Math.floor(r() * 120) * 86400000)), deleted_by: null
      });
    });

    return db;
  }

  var db = null;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
  if (!db || !db.users) { db = seed(); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }

  function all(table) { return db[table]; }
  function find(table, id) {
    id = Number(id);
    for (var i = 0; i < db[table].length; i++) if (db[table][i].id === id) return db[table][i];
    return null;
  }
  function insert(table, row) {
    var max = 0;
    db[table].forEach(function (x) { if (x.id > max) max = x.id; });
    row.id = max + 1;
    if (!row.created_at) row.created_at = stamp(new Date());
    if (row.deleted_by === undefined) row.deleted_by = null;
    db[table].push(row);
    save();
    return row;
  }
  function update(table, id, patch) {
    var row = find(table, id);
    if (!row) return null;
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) row[k] = patch[k];
    row.updated_at = stamp(new Date());
    save();
    return row;
  }
  function remove(table, id) {
    db[table] = db[table].filter(function (x) { return x.id !== Number(id); });
    save();
  }

  return { db: db, all: all, find: find, insert: insert, update: update, remove: remove, save: save, stamp: stamp, pad: pad, USER_ID: 1 };
})();
