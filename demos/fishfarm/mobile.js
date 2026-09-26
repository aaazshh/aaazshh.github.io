/**
 * The Fish Farm crew app, rebuilt screen by screen from the Flutter sources in
 * fish-farm-mobile/lib. The app is a thin client over the portal: every read
 * and write here goes through `Api`, a port of the portal's mobile-api.php,
 * against the same session database the portal pages use (db.js). A dead fish
 * logged on the phone shows up in the portal's Dead Fish list and the other way
 * round.
 */

'use strict';

(function () {
  var app = document.getElementById('app');

  /* ==== localisation (lib/l10n/*.arb, the keys these screens use) ======= */
  var L10N = {
 "en": {
  "selectLanguage": "Select Language",
  "enterUsername": "Please enter username",
  "enterPassword": "Please enter password",
  "login": "Login",
  "noUsernameError": "Please provide your username.",
  "noPasswordError": "Please enter your password.",
  "language": "Language",
  "preferredLanguage": "Preferred Language",
  "languageInstruction": "Choose the language you want to use in Fish Farm.",
  "englishLanguageSubtitle": "Use Fish Farm in English",
  "chineseLanguageSubtitle": "Use Fish Farm in Simplified Chinese",
  "malayLanguageSubtitle": "Use Fish Farm in Malay",
  "tamilLanguageSubtitle": "Use Fish Farm in Tamil",
  "myAccount": "My Account",
  "accountDetails": "Account Details",
  "username": "Username*",
  "email": "Email",
  "role": "Role",
  "updateAccountDetails": "Update Account Details",
  "deleteAccount": "Delete Account",
  "deleteAccountConfirmation": "Are you sure you want to delete your account? This will disable your account.",
  "cancel": "Cancel",
  "delete": "Delete",
  "notAvailable": "Not available",
  "superAdminRole": "Super Admin",
  "adminRole": "Admin",
  "staffRole": "Staff",
  "approverRole": "Approver",
  "userRole": "User",
  "more": "More",
  "changeLanguage": "Change Language",
  "logout": "Logout",
  "logoutConfirmation": "Are you sure you want to log out?",
  "microsoftLogin": "Microsoft Login",
  "back": "Back"
 },
 "ms": {
  "selectLanguage": "Pilih Bahasa",
  "enterUsername": "Sila masukkan nama pengguna",
  "enterPassword": "Sila masukkan kata laluan",
  "login": "Log Masuk",
  "noUsernameError": "Sila berikan nama pengguna anda.",
  "noPasswordError": "Sila masukkan kata laluan anda.",
  "language": "Bahasa",
  "preferredLanguage": "Bahasa Pilihan",
  "languageInstruction": "Pilih bahasa yang anda ingin gunakan dalam Fish Farm.",
  "englishLanguageSubtitle": "Guna Fish Farm dalam Bahasa Inggeris",
  "chineseLanguageSubtitle": "Guna Fish Farm dalam Bahasa Cina Ringkas",
  "malayLanguageSubtitle": "Guna Fish Farm dalam Bahasa Melayu",
  "tamilLanguageSubtitle": "Guna Fish Farm dalam Bahasa Tamil",
  "myAccount": "Akaun Saya",
  "accountDetails": "Butiran Akaun",
  "username": "Nama Pengguna*",
  "email": "E-mel",
  "role": "Peranan",
  "updateAccountDetails": "Kemas Kini Butiran Akaun",
  "deleteAccount": "Padam Akaun",
  "deleteAccountConfirmation": "Adakah anda pasti ingin memadamkan akaun anda? Ini akan melumpuhkan akaun anda.",
  "cancel": "Batal",
  "delete": "Padam",
  "notAvailable": "Tidak tersedia",
  "superAdminRole": "Super Admin",
  "adminRole": "Admin",
  "staffRole": "Kakitangan",
  "approverRole": "Pelulus",
  "userRole": "Pengguna",
  "more": "Lagi",
  "changeLanguage": "Tukar Bahasa",
  "logout": "Log Keluar",
  "logoutConfirmation": "Adakah anda pasti ingin log keluar?",
  "microsoftLogin": "Log Masuk Microsoft",
  "back": "Kembali"
 },
 "ta": {
  "selectLanguage": "மொழி தேர்ந்தெடு",
  "enterUsername": "பயனர்பெயர் உள்ளிடவும்",
  "enterPassword": "கடவுச்சொல் உள்ளிடவும்",
  "login": "உள்நுழை",
  "noUsernameError": "பயனர்பெயரை வழங்கவும்.",
  "noPasswordError": "கடவுச்சொல்லை உள்ளிடவும்.",
  "language": "மொழி",
  "preferredLanguage": "விருப்பமான மொழி",
  "languageInstruction": "Fish Farm-ல் பயன்படுத்த விரும்பும் மொழியை தேர்ந்தெடுக்கவும்.",
  "englishLanguageSubtitle": "Fish Farm-ஐ ஆங்கிலத்தில் பயன்படுத்தவும்",
  "chineseLanguageSubtitle": "Fish Farm-ஐ எளிமைப்படுத்தப்பட்ட சீனத்தில் பயன்படுத்தவும்",
  "malayLanguageSubtitle": "Fish Farm-ஐ மலாய் மொழியில் பயன்படுத்தவும்",
  "tamilLanguageSubtitle": "Fish Farm-ஐ தமிழில் பயன்படுத்தவும்",
  "myAccount": "என் கணக்கு",
  "accountDetails": "கணக்கு விவரங்கள்",
  "username": "பயனர்பெயர்*",
  "email": "மின்னஞ்சல்",
  "role": "பங்கு",
  "updateAccountDetails": "கணக்கு விவரங்களை புதுப்பி",
  "deleteAccount": "கணக்கை நீக்கு",
  "deleteAccountConfirmation": "உங்கள் கணக்கை நீக்க விரும்புகிறீர்களா? இது உங்கள் கணக்கை முடக்கும்.",
  "cancel": "ரத்து செய்",
  "delete": "நீக்கு",
  "notAvailable": "கிடைக்கவில்லை",
  "superAdminRole": "சூப்பர் அட்மின்",
  "adminRole": "அட்மின்",
  "staffRole": "பணியாளர்",
  "approverRole": "அனுமதியாளர்",
  "userRole": "பயனர்",
  "more": "மேலும்",
  "changeLanguage": "மொழி மாற்று",
  "logout": "வெளியேறு",
  "logoutConfirmation": "நீங்கள் வெளியேற விரும்புகிறீர்களா?",
  "microsoftLogin": "Microsoft உள்நுழைவு",
  "back": "பின்செல்"
 },
 "zh": {
  "selectLanguage": "选择语言",
  "enterUsername": "请输入用户名",
  "enterPassword": "请输入密码",
  "login": "登录",
  "noUsernameError": "请提供您的用户名。",
  "noPasswordError": "请输入您的密码。",
  "language": "语言",
  "preferredLanguage": "首选语言",
  "languageInstruction": "请选择您要在 Fish Farm 中使用的语言。",
  "englishLanguageSubtitle": "使用英文浏览 Fish Farm",
  "chineseLanguageSubtitle": "使用简体中文浏览 Fish Farm",
  "malayLanguageSubtitle": "使用马来文浏览 Fish Farm",
  "tamilLanguageSubtitle": "使用泰米尔文浏览 Fish Farm",
  "myAccount": "个人信息",
  "accountDetails": "账户详情",
  "username": "用户名*",
  "email": "邮箱",
  "role": "角色",
  "updateAccountDetails": "更新账户详情",
  "deleteAccount": "删除账户",
  "deleteAccountConfirmation": "您确定要删除您的账户吗？这将禁用您的账户。",
  "cancel": "取消",
  "delete": "删除",
  "notAvailable": "不可用",
  "superAdminRole": "超级管理员",
  "adminRole": "管理员",
  "staffRole": "员工",
  "approverRole": "审批人",
  "userRole": "用户",
  "more": "更多",
  "changeLanguage": "更改语言",
  "logout": "退出",
  "logoutConfirmation": "您确定要退出吗？",
  "microsoftLogin": "Microsoft 登录",
  "back": "后退"
 }
};
  var lang = 'en';
  try { lang = localStorage.getItem('ff-app-lang') || 'en'; } catch (e) {}
  function t(k) { return (L10N[lang] && L10N[lang][k]) || L10N.en[k] || k; }

  /* ==== helpers ========================================================== */
  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(name, cls) { return '<span class="mi' + (cls ? ' ' + cls : '') + '">' + name + '</span>'; }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nowHM() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  // PHP rtrim(rtrim((string) $v, '0'), '.') on a DECIMAL column
  function trimNum(v, places) {
    if (v === null || v === undefined) return null;
    var s = (+v).toFixed(places);
    return s.indexOf('.') === -1 ? s : s.replace(/0+$/, '').replace(/\.$/, '');
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fmtDate(iso, long) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
    var d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
    var s = pad(d.getUTCDate()) + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    return long ? DAYS[d.getUTCDay()] + ', ' + s : s;
  }

  /* ==== Api: mobile-api.php over the session database ==================== */
  var USERS = { 1: 'Super Admin', 2: 'Maram Aashna' };
  var me = { id: 2, username: 'Maram Aashna', email: 'maram.aashna@mail.com', role_id: 1 };
  try {
    var saved = JSON.parse(sessionStorage.getItem('ff-app-user') || 'null');
    if (saved) me = saved;
  } catch (e) {}

  var Api = {
    farms: function () {
      var withCages = {};
      FF.all('cages').forEach(function (c) { withCages[c.fish_farm_id] = true; });
      return FF.all('fish_farms').filter(function (f) { return withCages[f.id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
    },
    lookups: function () {
      function simple(t, col) {
        return FF.all(t).sort(function (a, b) { return a.id - b.id; }).map(function (r) { return { id: r.id, name: String(r[col || 'name']) }; });
      }
      return {
        sessions: ['Morning', 'Noon', 'Evening', 'Others'], canvas_sizes: ['Large', 'Small'],
        harvest_types: ['Live', 'Ice Chilled', 'Emergency'], cage_statuses: ['Washed', 'Empty', 'Blank', 'Prepare'],
        fish_species: simple('fish_species'), supplement_types: simple('supplement_types'), supplements: simple('supplements'),
        medicines: simple('medicines'), vaccines: simple('vaccines'), clinical_signs: simple('clinical_signs'),
        net_types: simple('net_types'),
        feed_types: FF.all('feed_types').sort(function (a, b) { return a.id - b.id; }).map(function (f) {
          var b = UIX.byId('feed_brands', f.feed_brand_id), p = UIX.byId('feed_pellet_sizes', f.feed_pellet_size_id);
          return { id: f.id, name: f.name, brand_name: b ? b.name : null, pellet_size: p ? p.size : null };
        })
      };
    },
    payload: function (p) {
      var dead = FF.all('dead_fish_records').reduce(function (n, d) { return d.production_id === p.id ? n + d.quantity : n; }, 0);
      var current = p.stocking_quantity - dead;
      var med = 'No Medicine 0g/kg', latest = null;
      var recs = {};
      FF.all('treatment_records').forEach(function (r) { if (r.production_id === p.id) recs[r.id] = r; });
      FF.all('treatment_items').forEach(function (i) {
        var r = recs[i.treatment_record_id];
        if (!r) return;
        if (!latest || r.record_time > latest.r.record_time || (r.record_time === latest.r.record_time && i.id > latest.i.id)) latest = { r: r, i: i };
      });
      if (latest) {
        var tbl = { Medicine: 'medicines', Supplement: 'supplements', Vaccine: 'vaccines' }[latest.i.treatable_type];
        var nm = UIX.byId(tbl, latest.i.treatable_id);
        if (nm) med = nm.name + ' ' + (latest.i.dosage !== null ? trimNum(latest.i.dosage, 3) : '0') + 'g/kg';
      }
      var c = UIX.byId('cages', p.cage_id), s = UIX.byId('fish_species', p.species_id);
      return {
        production_id: p.id, serial_number: p.production_serial_number, cage_id: p.cage_id, cage_ref: c ? c.name : null,
        species_id: p.species_id, species_name: s ? s.name : null, species_cn: s ? s.chinese_name : null, medication: med,
        stocking_date: p.stocking_date, stocking_quantity: p.stocking_quantity, current_stock: current,
        survival: p.stocking_quantity > 0 ? Math.round(current / p.stocking_quantity * 10000) / 100 : 0,
        doc: FF.ddiff(p.stocking_date, FF.today), last_update: p.updated_at || p.created_at,
        farm_name: c ? String(c.fish_farm_id) : null
      };
    },
    production: function (id) {
      var p = FF.find('fish_production', id);
      if (!p) throw new Error('Production not found');
      return Api.payload(p);
    },
    search: function (q) {
      var s = (q.search || '').toLowerCase();
      var fed = {};
      if (q.feedTypeId) FF.all('feed').forEach(function (f) { if (f.feed_type_id === q.feedTypeId) fed[f.production_id] = true; });
      return FF.all('fish_production').filter(function (p) {
        var c = UIX.byId('cages', p.cage_id), sp = UIX.byId('fish_species', p.species_id);
        if (p.status_id != 1) return false;
        if (s && !((c && c.name.toLowerCase().indexOf(s) !== -1) || p.production_serial_number.toLowerCase().indexOf(s) !== -1 ||
          (sp && sp.name.toLowerCase().indexOf(s) !== -1))) return false;
        if (q.farm && (!c || String(c.fish_farm_id) !== q.farm)) return false;
        if (q.speciesId && p.species_id !== q.speciesId) return false;
        if (q.feedTypeId && !fed[p.id]) return false;
        return true;
      }).sort(function (a, b) {
        var ca = UIX.byId('cages', a.cage_id).name, cb = UIX.byId('cages', b.cage_id).name;
        return ca < cb ? -1 : ca > cb ? 1 : b.id - a.id;
      }).map(Api.payload);
    },
    map: function (farm) {
      var SIZE = { '1': [1090, 850], '2': [1440, 1250], '3': [1400, 1320] };
      if (!SIZE[farm]) farm = '1';
      var farmId = +farm;
      var today = FF.today, med = {};
      FF.all('treatment_records').forEach(function (r) { if (r.record_time.slice(0, 10) === today) med[r.production_id] = true; });
      var byCage = {};
      FF.all('fish_production').filter(function (p) {
        var c = UIX.byId('cages', p.cage_id);
        return p.status_id == 1 && c && c.fish_farm_id === farmId;
      }).sort(function (a, b) { return b.id - a.id; }).forEach(function (p) { if (!byCage[p.cage_id]) byCage[p.cage_id] = p; });
      var cages = FF.all('cages').filter(function (c) { return c.fish_farm_id === farmId && c.map_x !== null; }).map(function (c) {
        var p = byCage[c.id], m = p && med[p.id];
        return { cage_id: c.id, cage_code: c.name.replace(/^\s*\d+\s*-\s*/, ''), x: c.map_x, y: c.map_y, width: c.map_width,
          height: c.map_height, background_color: m ? '#f6c7c9' : '#FFFFFF', production_id: p ? p.id : null,
          serial_number: p ? p.production_serial_number : null, species_name: p ? UIX.byId('fish_species', p.species_id).name : null };
      });
      var decor = FF.all('map_items').filter(function (d) { return d.fish_farm_id === farmId; }).map(function (d) {
        return { item_type: d.item_type, label: d.label, x: d.map_x, y: d.map_y, width: d.map_width, height: d.map_height,
          text_color: d.text_color, background_color: d.bg_color };
      });
      return { farm: farm, canvas: { width: SIZE[farm][0], height: SIZE[farm][1], rate: Math.round(SIZE[farm][1] / SIZE[farm][0] * 100) / 100 },
        cages: cages, decorations: decor };
    },
    resolve: function (code) {
      code = code.trim();
      var hit = FF.all('cages').filter(function (c) {
        return c.name === code || c.internal_name === code || c.name.split('-').pop().trim() === code ||
          c.name.toLowerCase().indexOf(code.toLowerCase()) !== -1;
      }).sort(function (a, b) { return (b.name === code) - (a.name === code); })[0];
      if (!hit) throw new Error('Cage not found for "' + code + '"');
      var p = FF.all('fish_production').filter(function (x) { return x.cage_id === hit.id && x.status_id == 1; })
        .sort(function (a, b) { return a.stocking_date < b.stocking_date ? 1 : a.stocking_date > b.stocking_date ? -1 : b.id - a.id; })[0];
      if (!p) return { cage_id: hit.id, cage_ref: hit.name, production_id: null, empty: true };
      return Api.payload(p);
    },
    history: function (pid) {
      function field(label, v) {
        if (v === null || v === undefined) return null;
        v = String(v).trim();
        return v === '' ? null : { label: label, value: v };
      }
      function compact(a) { return a.filter(Boolean); }
      function by(r) { return USERS[r.created_by || 1]; }
      function photos(type, id) {
        return FF.all('images').filter(function (i) { return i.imageable_type === type && i.imageable_id === id; }).map(function (i) { return i.image; });
      }
      var ev = [];
      FF.all('feed').forEach(function (r) {
        if (r.production_id !== pid) return;
        var ft = UIX.byId('feed_types', r.feed_type_id), st = UIX.byId('supplement_types', r.supplement_type_id), q = trimNum(r.quantity_kg, 2);
        ev.push({ op: 'feeding', op_label: 'Feeding', id: r.id, record_time: r.record_date + ' 00:00:00', record_date: r.record_date,
          submitted_by: by(r), created_at: r.created_at, summary: (q + ' kg' + (ft ? ' · ' + ft.name : '')).trim(),
          fields: compact([field('Feed Type', ft && ft.name), field('Supplement Type', st && st.name), field('Quantity', q + ' kg'),
            field('Session', r.session), field('Staff', r.staff)]), photos: [] });
      });
      FF.all('dead_fish_records').forEach(function (r) {
        if (r.production_id !== pid) return;
        var cs = UIX.byId('clinical_signs', r.clinical_sign_id);
        ev.push({ op: 'dead-fish', op_label: 'Dead Fish', id: r.id, record_time: r.record_time, record_date: r.record_time.slice(0, 10),
          submitted_by: by(r), created_at: r.created_at, summary: r.quantity + ' fish' + (cs ? ' · ' + cs.name : ''),
          fields: compact([field('Total Quantity', r.quantity), field('Surface (real)', r.real_quantity), field('Below (estimated)', r.estimated_quantity),
            field('Session', r.session), field('Clinical Sign', cs && cs.name), field('Staff', r.staff), field('Remarks', r.remarks)]),
          photos: photos('DeadFishReport', r.id) });
      });
      var items = {};
      FF.all('treatment_items').forEach(function (i) { (items[i.treatment_record_id] = items[i.treatment_record_id] || []).push(i); });
      FF.all('treatment_records').forEach(function (r) {
        if (r.production_id !== pid) return;
        var its = (items[r.id] || []).sort(function (a, b) { return a.id - b.id; });
        var itemFields = its.map(function (i) {
          var nm = UIX.byId({ Medicine: 'medicines', Supplement: 'supplements', Vaccine: 'vaccines' }[i.treatable_type], i.treatable_id);
          var parts = [], dose = trimNum(i.dosage, 3), dur = trimNum(i.duration, 2);
          if (dose) parts.push(dose + ' g/kg');
          if (dur) parts.push(dur + ' min');
          if (i.batch_number) parts.push('batch ' + i.batch_number);
          return { label: i.treatable_type || 'Medicine', value: ((nm ? nm.name : '—') + (parts.length ? '  (' + parts.join(', ') + ')' : '')).trim() };
        });
        ev.push({ op: 'treatment', op_label: 'Treatment', id: r.id, record_time: r.record_time, record_date: r.record_time.slice(0, 10),
          submitted_by: by(r), created_at: r.created_at,
          summary: its.length + ' item' + (its.length === 1 ? '' : 's') + (r.tarp_size ? ' · ' + r.tarp_size + ' tarp' : ''),
          fields: compact([field('Treatment Type', r.treatment_type), field('Tarp Size', r.tarp_size), field('Lab Diagnosis', r.lab_diagnosis),
            field('Clinical Diagnosis', r.clinical_diagnosis), field('Staff', r.staff), field('Remarks', r.remarks)]).concat(itemFields),
          photos: photos('Treatment', r.id) });
      });
      var NET = { 1: ['broken-net', 'Broken Net', 'BrokenNet'], 2: ['change-net', 'Change Net', null], 3: ['wash-net', 'Wash Net', null] };
      FF.all('net_records').forEach(function (r) {
        if (r.production_id !== pid) return;
        var m = NET[r.record_type] || NET[2], nt = UIX.byId('net_types', r.net_type_id), fields, summary;
        if (m[0] === 'change-net') { fields = [field('Net Type', nt && nt.name), field('Staff', r.staff), field('Remarks', r.remarks)]; summary = (nt && nt.name) || 'Net changed'; }
        else if (m[0] === 'wash-net') {
          fields = [field('Cage Status', r.cage_status), field('Operation Staff', r.operation_staff), field('Staff', r.staff), field('Remarks', r.remarks)];
          summary = r.cage_status || 'Net washed';
        } else { fields = [field('Staff', r.staff), field('Remarks', r.remarks)]; summary = 'Broken net reported'; }
        ev.push({ op: m[0], op_label: m[1], id: r.id, record_time: r.record_time, record_date: r.record_time.slice(0, 10),
          submitted_by: by(r), created_at: r.created_at, summary: summary, fields: compact(fields), photos: m[2] ? photos(m[2], r.id) : [] });
      });
      FF.all('harvest_records').forEach(function (r) {
        if (r.production_id !== pid) return;
        var total = trimNum(r.normal_weight + r.promo_weight + r.other_weight, 3);
        function w(v) { var x = trimNum(v, 3); return x && x !== '0' ? x + ' kg' : null; }
        ev.push({ op: 'harvest', op_label: 'Harvest', id: r.id, record_time: r.record_time, record_date: r.record_time.slice(0, 10),
          submitted_by: by(r), created_at: r.created_at, summary: (total ? total + ' kg' : 'Harvest') + (r.harvest_type ? ' · ' + r.harvest_type : ''),
          fields: compact([field('Type', r.harvest_type), field('Normal Weight', w(r.normal_weight)), field('Promo Weight', w(r.promo_weight)),
            field('Other Weight', w(r.other_weight)), field('Normal / piece', w(r.normal_per_piece_weight)), field('Promo / piece', w(r.promo_per_piece_weight)),
            field('Other / piece', w(r.other_per_piece_weight)), field('Total Weight', total ? total + ' kg' : null), field('Staff', r.staff),
            field('Remarks', r.remarks)]), photos: photos('HarvestRecord', r.id) });
      });
      return ev.sort(function (a, b) {
        if (a.record_time === b.record_time) return a.created_at < b.created_at ? 1 : -1;
        return a.record_time < b.record_time ? 1 : -1;
      });
    },
    // normalizeDateTime(): a bare date takes the current time of day.
    dt: function (date, time) {
      if (!date) return null;
      if (time) return date.slice(0, 10) + ' ' + (time.length === 5 ? time + ':00' : time.slice(0, 8));
      var d = new Date();
      return date.slice(0, 10) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    },
    operation: function (op, b) {
      var pid = +b.production_id, staff = (b.staff || '').trim() || null, remarks = (b.remarks || '').trim() || null;
      if (!FF.find('fish_production', pid)) throw new Error('Production not found');
      switch (op) {
        case 'feeding':
          FF.insert('feed', { production_id: pid, feed_type_id: +b.feed_type_id, supplement_type_id: b.supplement_type_id || null,
            quantity_kg: +b.weight_kg, record_date: b.date, session: b.session || 'Morning', staff: staff });
          return;
        case 'dead-fish':
          var s = +b.surface || 0, bl = +b.below || 0;
          FF.insert('dead_fish_records', { production_id: pid, record_time: Api.dt(b.date), quantity: s + bl, real_quantity: s,
            estimated_quantity: bl, session: b.session || 'Morning', clinical_sign_id: b.clinical_sign_id || null, staff: staff, remarks: remarks });
          return;
        case 'treatment':
          var id = FF.insert('treatment_records', { production_id: pid, record_time: Api.dt(b.date), tarp_size: b.canvas_size || null,
            treatment_type: 'Medicinal Bath', lab_diagnosis: b.lab_diagnosis || null, clinical_diagnosis: b.clinical_diagnosis || null,
            remarks: remarks, staff: staff });
          (b.medicines || []).forEach(function (m) {
            FF.insert('treatment_items', { treatment_record_id: id, treatable_type: m.type, treatable_id: m.id,
              dosage: m.dosage === undefined ? null : m.dosage, duration: m.duration === undefined ? null : m.duration,
              batch_number: null, fish_size: null, treatment_time: null });
          });
          return;
        case 'change-net':
          FF.insert('net_records', { production_id: pid, record_time: Api.dt(b.date), record_type: 2, net_type_id: b.net_type_id || null,
            cage_status: null, operation_staff: null, contractor: null, staff: staff, remarks: remarks });
          return;
        case 'wash-net':
          FF.insert('net_records', { production_id: pid, record_time: Api.dt(b.date, b.time), record_type: 3, net_type_id: null,
            cage_status: b.status || null, operation_staff: (b.temporary_staff || '').trim() || null, contractor: null, staff: staff, remarks: remarks });
          return;
        case 'broken-net':
          FF.insert('net_records', { production_id: pid, record_time: Api.dt(b.date), record_type: 1, net_type_id: null, cage_status: null,
            operation_staff: null, contractor: null, staff: staff, remarks: remarks });
          return;
        case 'harvest':
          FF.insert('harvest_records', { production_id: pid, record_time: Api.dt(b.date, b.time), harvest_type: b.type || 'Live',
            normal_weight: +b.normal_weight || 0, promo_weight: +b.promo_weight || 0, other_weight: +b.other_weight || 0,
            normal_per_piece_weight: b.normal_per_piece_weight, promo_per_piece_weight: b.promo_per_piece_weight,
            other_per_piece_weight: b.other_per_piece_weight, staff: staff, remarks: remarks });
          return;
      }
    },
    incident: function (b) {
      FF.insert('incident_reports', { incident_type: b.incident_type, record_time: Api.dt(b.date, b.time),
        location: (b.location || '').trim() || null, status: 'Pending', staff: null, remarks: (b.remarks || '').trim() || null });
    }
  };
  // Indexed id lookups (a small copy of the portal helper).
  var UIX = (function () {
    var index = {};
    return { byId: function (table, id) {
      if (id === null || id === undefined) return null;
      if (!index[table] || index[table].n !== FF.T[table].length) {
        var m = {};
        FF.T[table].forEach(function (r) { m[r.id] = r; });
        index[table] = { n: FF.T[table].length, m: m };
      }
      return index[table].m[+id] || null;
    } };
  }());

  /* ==== navigation stack (CupertinoPageRoute) ============================= */
  var stack = [];
  function push(screen, opts) {
    opts = opts || {};
    var node = screen.el;
    if (opts.replaceAll) {
      stack.forEach(function (s) { if (s.leave) s.leave(); s.el.remove(); });
      stack = [];
      node.classList.add('fade');
      node.style.opacity = '0';
      app.appendChild(node);
      stack.push(screen);
      requestAnimationFrame(function () { node.style.opacity = '1'; });
      setTimeout(function () { node.style.opacity = ''; }, 350);
      if (screen.enter) screen.enter();
      return;
    }
    var prev = stack[stack.length - 1];
    node.classList.add('enter');
    app.appendChild(node);
    stack.push(screen);
    node.getBoundingClientRect();
    requestAnimationFrame(function () {
      node.classList.remove('enter');
      if (prev) prev.el.classList.add('under');
    });
    // A covered screen's ocean stops drawing once the new screen has slid in,
    // so only the top screen animates.
    if (prev) setTimeout(function () { if (prev.el._ocean && stack[stack.length - 1] !== prev) prev.el._ocean.stop(); }, 420);
    if (screen.enter) screen.enter();
  }
  function pop(result) {
    if (stack.length < 2) return;
    var top = stack.pop(), prev = stack[stack.length - 1];
    top.el.classList.add('leave');
    if (prev.el._ocean && prev.el._ocean.animated && !prev.el._ocean.running) prev.el._ocean.start();
    prev.el.classList.remove('under');
    setTimeout(function () { top.el.remove(); }, 420);
    if (top.leave) top.leave();
    if (prev.resume) prev.resume(result);
  }
  // Swipe back from the left edge, as _FfSwipeBack does.
  (function () {
    var sx = null, st = 0;
    app.addEventListener('pointerdown', function (e) {
      var r = app.getBoundingClientRect();
      if (e.clientX - r.left <= 22 && stack.length > 1) { sx = e.clientX; st = performance.now(); } else sx = null;
    });
    app.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var v = (e.clientX - sx) / Math.max(1, performance.now() - st) * 1000;
      if (v > 250) pop();
      sx = null;
    });
  }());
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (closeOverlay()) return; pop(); }
  });

  function screen(cls, inner) {
    var node = el('<section class="screen ' + (cls || '') + '">' + inner + '</section>');
    node.addEventListener('click', function (e) {
      var b = e.target.closest('[data-back]');
      if (b) pop();
    });
    return node;
  }
  function hero(title, sub, trailing, back) {
    return '<header class="hero">' + (back === false ? '' : '<button class="hero-back press" data-back aria-label="Back">' + icon('chevron_left') + '</button>') +
      '<div class="hero-text"><div class="hero-title">' + esc(title) + '</div>' + (sub ? '<div class="hero-sub">' + esc(sub) + '</div>' : '') + '</div>' +
      (trailing || '') + '</header>';
  }
  function ocean(kind) { return '<div class="ocean ' + kind + '"><canvas></canvas></div>'; }
  function mountOcean(node, opts) {
    var c = node.querySelector('.ocean canvas');
    opts.host = opts.host || node;
    node._ocean = new Art.Ocean(c, opts);
    return node._ocean;
  }

  /* ==== overlays: snackbar, toast, dialogs, sheets ======================== */
  var overlay = null;
  function closeOverlay() {
    if (!overlay) return false;
    overlay.remove();
    overlay = null;
    return true;
  }
  function snack(msg, color) {
    var s = el('<div class="snackbar" role="status" style="background:' + (color || '#323232') + '">' + esc(msg) + '</div>');
    app.appendChild(s);
    requestAnimationFrame(function () { s.classList.add('show'); });
    setTimeout(function () { s.classList.remove('show'); setTimeout(function () { s.remove(); }, 300); }, 3200);
  }
  function opSuccess(msg) { snack(msg, '#2E7D32'); }
  function opError(msg) { snack(msg, '#F5365C'); }
  function toast(msg) {
    var n = document.getElementById('demo-note');
    n.textContent = msg + ' is wired to the live system, not to this walkthrough.';
    n.classList.add('show');
    clearTimeout(n.timer);
    n.timer = setTimeout(function () { n.classList.remove('show'); }, 3400);
  }
  function dialog(html, cls, onWire) {
    closeOverlay();
    overlay = el('<div class="scrim ' + (cls || '') + '"><div class="dialog">' + html + '</div></div>');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
    app.appendChild(overlay);
    if (onWire) onWire(overlay);
    return overlay;
  }
  function errorPopup(msg) {
    dialog('<div class="err-dialog">' + icon('error_outline') + '<p>' + esc(msg) + '</p><button data-close>' + esc(t('back')) + '</button></div>', '',
      function (o) { o.querySelector('[data-close]').onclick = closeOverlay; });
  }
  function sheet(html, onWire) {
    closeOverlay();
    overlay = el('<div><div class="sheet-scrim"></div><div class="sheet">' + html + '</div></div>');
    overlay.firstChild.onclick = closeOverlay;
    app.appendChild(overlay);
    if (onWire) onWire(overlay);
  }

  /* ==== brand ============================================================ */
  function logo(tank, wordColor, fontSize) {
    return '<div class="logo-row"><span class="tank" style="width:' + tank + 'px;height:' + tank + 'px;border-radius:' + tank * 0.27 + 'px">' + Art.GLYPH + '</span>' +
      (wordColor ? '<span class="wordmark" style="color:' + wordColor + ';font-size:' + fontSize + 'px">Fish Farm</span>' : '') + '</div>';
  }

  /* ==== SplashRouter ====================================================== */
  function Splash() {
    var node = screen('', ocean('deep') + '<div class="over" style="justify-content:center;align-items:center;gap:34px">' +
      logo(88, '#fff', 44) + '<div class="splash-spin"></div></div>');
    var sc = { el: node };
    sc.enter = function () {
      mountOcean(node, { animated: true });
      // The router routes on the first frame once the token check returns.
      var signedIn = false;
      try { signedIn = sessionStorage.getItem('ff-app-token') === '1'; } catch (e) {}
      var gone = false;
      function route() {
        if (gone) return;
        gone = true;
        push(signedIn ? Home() : Login(), { replaceAll: true });
      }
      requestAnimationFrame(function () { setTimeout(route, 700); });
      setTimeout(route, 900);
    };
    return sc;
  }

  /* ==== LoginPage ========================================================= */
  function Login() {
    var node = screen('', ocean('deep') + '<div class="over"><div class="login-wrap">' +
      '<button class="lang-link press" data-lang>' + esc(t('selectLanguage')) + '</button>' +
      '<canvas class="prime-canvas"></canvas>' +
      '<div style="margin-top:8px">' + logo(56, '#fff', 34) + '</div>' +
      '<div class="glass" style="margin-top:28px"><form novalidate>' +
      '<div class="login-field">' + icon('person_outline', 'lead') + '<input name="u" autocomplete="username" value="guest1" placeholder="' + esc(t('enterUsername')) + '"></div>' +
      '<div class="login-field">' + icon('lock_outline', 'lead') + '<input name="p" type="password" autocomplete="current-password" value="guest1" placeholder="' + esc(t('enterPassword')) + '">' +
      '<button type="button" class="eye" data-eye aria-label="Show password">' + icon('visibility_off') + '</button></div>' +
      '<div style="height:6px"></div><button class="primary-btn" type="submit" data-login>' + esc(t('login')) + '</button>' +
      '<button type="button" class="ms-btn press" data-ms>' + icon('open_in_new') + 'Sign in with Microsoft</button></form></div>' +
      '<div class="version">v0.0.1</div></div></div>');
    var sc = { el: node };
    sc.enter = function () {
      mountOcean(node, { animated: true, bubblesOnTap: true });
      new Art.PrimeLoop(node.querySelector('.prime-canvas'));
    };
    sc.resume = function () { push(Login(), { replaceAll: true }); }; // language may have changed
    node.querySelector('[data-lang]').onclick = function () { push(Language()); };
    node.querySelector('[data-eye]').onclick = function () {
      var p = node.querySelector('[name=p]');
      p.type = p.type === 'password' ? 'text' : 'password';
      this.firstChild.textContent = p.type === 'password' ? 'visibility_off' : 'visibility';
    };
    node.querySelector('[data-ms]').onclick = function () { toast('Microsoft sign-in, through IAM,'); };
    node.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      var u = this.u.value, p = this.p.value, btn = node.querySelector('[data-login]');
      if (document.activeElement) document.activeElement.blur();
      if (u === '') return errorPopup(t('noUsernameError'));
      if (p === '') return errorPopup(t('noPasswordError'));
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      setTimeout(function () {
        // A guestN account signs in as that guest; any other name stays the admin.
        var g = /^guest(\d+)$/i.exec(u.trim());
        if (g) me = { id: 100 + +g[1], username: 'guest' + g[1], email: 'guest' + g[1] + '@mail.com', role_id: 3 }
        else me = { id: 2, username: 'Maram Aashna', email: 'maram.aashna@mail.com', role_id: 1 };
        try { sessionStorage.setItem('ff-app-token', '1'); sessionStorage.setItem('ff-app-user', JSON.stringify(me)); } catch (err) {}
        var logoBox = node.querySelector('.prime-canvas').getBoundingClientRect(), host = app.getBoundingClientRect();
        var start = { x: logoBox.left - host.left, y: logoBox.top - host.top, w: logoBox.width, h: logoBox.height };
        node.querySelector('.login-wrap').classList.add('gone');
        Art.morph(node, start, 200, function () { push(Home(), { replaceAll: true }); });
      }, 450);
    };
    return sc;
  }

  /* ==== HomePage ========================================================== */
  function Home() {
    var first = me.username.trim().split(/[\s.@]/)[0];
    var modules = [['Scan', 'scan', 'productions'], ['Search', 'search', 'feed'], ['Map', 'map', 'harvest'], ['Incident Report', 'incident', 'dead']];
    var node = screen('', ocean('light') + '<div class="over">' +
      '<div class="home-top"><button class="round-action press" data-lang aria-label="Language">' + icon('language') + '</button>' +
      '<button class="round-action press" data-out aria-label="Log out"><span class="png" style="--src:url(assets/img/app/logout_icon.png)"></span></button></div>' +
      '<div class="greeting"><button class="avatar press" data-more aria-label="Account"><span>' + icon('person') + '</span></button>' +
      '<div><h1>' + (first ? 'Hello, ' + esc(first) : 'Hello') + '</h1><p>Welcome to Fish Farm Mobile</p></div></div>' +
      '<div class="scroll" style="padding:12px 16px 28px"><div class="section-label">QUICK ACCESS</div><div class="module-grid">' +
      modules.map(function (m) {
        return '<button class="module press" data-go="' + m[0] + '"><span class="tile pal-' + m[2] + '"><span class="png" style="--src:url(assets/img/app/' + m[1] + '.png)"></span></span><b>' + m[0] + '</b></button>';
      }).join('') + '</div></div></div>');
    var sc = { el: node };
    sc.enter = function () { mountOcean(node, { animated: true, interactive: true }); };
    node.querySelector('[data-lang]').onclick = function () { push(Language()); };
    node.querySelector('[data-more]').onclick = function () { push(More()); };
    node.querySelector('[data-out]').onclick = function () {
      dialog('<div class="logout-dialog"><div class="bubble"><span>🐟</span></div><h3>Leaving so soon?</h3>' +
        '<p>Your little fish will miss you 🫧<br>Are you sure you want to log out?</p>' +
        '<div class="row"><button class="stay press" data-stay>Stay</button><button class="leave-btn press" data-leave>Log out</button></div></div>',
      'ocean-scrim', function (o) {
        o.querySelector('.dialog').style.padding = '0';
        o.querySelector('[data-stay]').onclick = closeOverlay;
        o.querySelector('[data-leave]').onclick = function () { closeOverlay(); logout(); };
      });
    };
    node.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () {
        var go = b.dataset.go;
        if (go === 'Scan') push(Scan());
        else if (go === 'Search') push(Search());
        else if (go === 'Map') push(MapPage());
        else push(IncidentCategories());
      };
    });
    return sc;
  }
  function logout() {
    try { sessionStorage.removeItem('ff-app-token'); } catch (e) {}
    push(Login(), { replaceAll: true });
  }

  /* ==== CommonMorePage + MyAccountPage + UpdateAccountPage ================= */
  function More() {
    var node = screen('', '<header class="hero" style="padding:18px 12px"><button class="hero-back press" data-back>' + icon('arrow_back') + '</button>' +
      '<div class="hero-text" style="text-align:center;margin-right:48px"><div class="hero-title">' + esc(t('more')) + '</div></div></header>' +
      '<div class="scroll"><div style="background:var(--primary-light);padding:16px;display:flex;align-items:center;gap:5px;color:var(--primary)">' +
      icon('person') + '<b style="font-size:18px">' + esc(me.username) + '</b></div>' +
      '<div class="more-list"><button data-acct>' + icon('account_circle') + esc(t('myAccount')) + '</button>' +
      '<button data-lang>' + icon('language') + esc(t('changeLanguage')) + '</button>' +
      '<button data-out style="color:#F44336">' + icon('logout') + esc(t('logout')) + '</button></div></div>' +
      '<div class="glass-nav"><div class="inner"><button class="nav-btn press" data-back aria-label="Home">' + icon('home') + '</button>' +
      '<button class="nav-btn on" aria-label="More">' + icon('more_horiz') + '</button></div></div>');
    var sc = { el: node };
    sc.resume = function () { pop(); push(More()); };
    node.querySelector('[data-acct]').onclick = function () { push(MyAccount()); };
    node.querySelector('[data-lang]').onclick = function () { push(Language()); };
    node.querySelector('[data-out]').onclick = function () {
      dialog('<h2>' + esc(t('logout')) + '</h2><p>' + esc(t('logoutConfirmation')) + '</p><div class="actions">' +
        '<button class="text-btn" data-c style="color:#9e9e9e">' + esc(t('cancel')) + '</button><button class="text-btn" data-o style="color:#F44336">' + esc(t('logout')) + '</button></div>', '',
      function (o) { o.querySelector('[data-c]').onclick = closeOverlay; o.querySelector('[data-o]').onclick = function () { closeOverlay(); logout(); }; });
    };
    return sc;
  }

  function MyAccount() {
    var roles = { 1: 'superAdminRole', 2: 'adminRole', 3: 'staffRole', 4: 'approverRole' };
    function paint() {
      return hero(t('myAccount')) + '<div class="scroll" style="padding:22px 18px 24px"><h2 class="acct-title">' + esc(t('accountDetails')) + '</h2>' +
        '<div class="acct-card"><div class="acct-row"><b>' + esc(t('username')) + '</b><span>' + esc(me.username || t('notAvailable')) + '</span></div><hr>' +
        '<div class="acct-row"><b>' + esc(t('email')) + '</b><span>' + esc(me.email || t('notAvailable')) + '</span></div><hr>' +
        '<div class="acct-row"><b>' + esc(t('role')) + '</b><span>' + esc(t(roles[me.role_id] || 'userRole')) + '</span></div></div>' +
        '<div style="height:32px"></div><button class="acct-btn press" data-upd style="background:var(--primary)">' + icon('edit') + esc(t('updateAccountDetails')) + '</button>' +
        '<div style="height:14px"></div><button class="acct-btn press" data-del style="background:var(--danger)">' + icon('delete_forever') + esc(t('deleteAccount')) + '</button></div>';
    }
    var node = screen('', paint());
    var sc = { el: node };
    function wire() {
      node.querySelector('[data-upd]').onclick = function () { push(UpdateAccount()); };
      node.querySelector('[data-del]').onclick = function () {
        dialog('<h2 style="font-size:18px;font-weight:700;color:#222">' + esc(t('deleteAccount')) + '</h2><p style="color:#555;font-weight:500">' +
          esc(t('deleteAccountConfirmation')) + '</p><div class="actions"><button class="text-btn" data-c style="font-weight:700">' + esc(t('cancel')) + '</button>' +
          '<button class="text-btn" data-d style="background:var(--danger);color:#fff;border-radius:8px">' + esc(t('delete')) + '</button></div>', '',
        function (o) {
          o.querySelector('.dialog').style.borderRadius = '8px';
          o.querySelector('[data-c]').onclick = closeOverlay;
          o.querySelector('[data-d]').onclick = function () { closeOverlay(); toast('Deleting an account'); };
        });
      };
    }
    wire();
    sc.resume = function () { node.innerHTML = paint(); wire(); };
    return sc;
  }

  function UpdateAccount() {
    var node = screen('', hero('Update Account') + '<div class="scroll" style="padding:20px"><form novalidate>' +
      '<p style="text-align:center;font-size:16px;color:#9e9e9e;margin:0 0 25px">Edit your account details below.</p>' +
      '<div class="outlined">' + icon('account_circle') + '<label>Username</label><input name="username" value="' + esc(me.username) + '"><div class="err"></div></div>' +
      '<div class="outlined">' + icon('email') + '<label>Email</label><input name="email" type="email" value="' + esc(me.email) + '"><div class="err"></div></div>' +
      '<div style="height:14px"></div><button class="primary-btn" type="submit">' + icon('save') + 'Save Changes</button></form></div>');
    node.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      var u = this.username.value.trim(), m = this.email.value.trim(), errs = this.querySelectorAll('.err');
      errs[0].textContent = u ? '' : 'Please enter your username';
      errs[1].textContent = !m ? 'Please enter your email' : (/^[^@]+@[^@]+\.[^@]+/.test(m) ? '' : 'Please enter a valid email address');
      if (!u || errs[1].textContent) return;
      me.username = u; me.email = m;
      try { sessionStorage.setItem('ff-app-user', JSON.stringify(me)); } catch (err) {}
      snack('Account updated successfully!', '#5E72E4');
      pop();
    };
    return { el: node };
  }

  /* ==== LanguagePage ======================================================= */
  function Language() {
    var opts = [['en', '🇬🇧', 'English', 'englishLanguageSubtitle'], ['zh', '🇨🇳', '简体中文', 'chineseLanguageSubtitle'],
      ['ms', '🇲🇾', 'Bahasa Melayu', 'malayLanguageSubtitle'], ['ta', '🇮🇳', 'தமிழ்', 'tamilLanguageSubtitle']];
    function paint() {
      return '<div class="page-header"><button class="back-btn press" data-back aria-label="Back">' + icon('chevron_left') + '</button>' +
        '<div><h1>' + esc(t('language')) + '</h1><p>' + esc(t('preferredLanguage')) + '</p></div></div>' +
        '<div class="scroll" style="padding:8px 18px 24px"><p style="margin:0 0 18px;color:rgba(103,116,142,0.95);font-size:13.5px;font-weight:500;line-height:1.4">' +
        esc(t('languageInstruction')) + '</p>' + opts.map(function (o) {
          return '<button class="lang-card press' + (lang === o[0] ? ' on' : '') + '" data-l="' + o[0] + '"><span class="flag">' + o[1] + '</span>' +
            '<span><b>' + o[2] + '</b><small>' + esc(t(o[3])) + '</small></span><span class="radio">' + (lang === o[0] ? icon('check') : '') + '</span></button>';
        }).join('') + '</div>';
    }
    var node = screen('', ocean('secondary') + '<div class="over"></div>');
    var over = node.querySelector('.over');
    function render() {
      over.innerHTML = paint();
      over.querySelectorAll('[data-l]').forEach(function (b) {
        b.onclick = function () {
          if (lang === b.dataset.l) return;
          lang = b.dataset.l;
          try { localStorage.setItem('ff-app-lang', lang); } catch (e) {}
          render();
        };
      });
    }
    render();
    return { el: node, enter: function () { mountOcean(node, { intensity: 0.5 }); } };
  }

  /* ==== ScanPage ============================================================ */
  function Scan() {
    var node = screen('scan', '<div class="scan-window"></div><div class="scan-top"><button class="back-btn press" data-back style="position:static;background:rgba(255,255,255,0.9)" aria-label="Back">' +
      icon('chevron_left') + '</button><span style="flex:1"></span><button class="icon-btn" data-torch aria-label="Torch">' + icon('flash_on') + '</button>' +
      '<button class="icon-btn" data-switch aria-label="Switch camera">' + icon('cameraswitch') + '</button></div>' +
      '<div class="scan-bottom"><p data-hint>Scan a cage QR / barcode</p><button class="manual press" data-manual>' + icon('keyboard_alt') + 'Enter manually</button></div>');
    var busy = false;
    var sc = { el: node };
    sc.enter = function () { toast('The camera scanner'); };
    sc.resume = function () { busy = false; };
    node.querySelector('[data-torch]').onclick = function () { toast('The torch'); };
    node.querySelector('[data-switch]').onclick = function () { toast('The camera'); };
    function resolve(code) {
      if (busy || !code) return;
      busy = true;
      try {
        var data = Api.resolve(code);
        if (data.production_id === null) {
          snack('Cage ' + (data.cage_ref || code) + ' has no active production', '#67748E');
          busy = false;
          return;
        }
        push(CageDetail(data));
      } catch (e) {
        snack(e.message, '#F5365C');
        busy = false;
      }
    }
    node.querySelector('[data-manual]').onclick = function () {
      dialog('<h2>Enter cage number</h2><input autofocus placeholder="e.g. A2" style="text-transform:uppercase"><div class="actions">' +
        '<button class="text-btn" data-c>Cancel</button><button class="text-btn" data-g>Go</button></div>', '', function (o) {
        var inp = o.querySelector('input');
        setTimeout(function () { inp.focus(); }, 50);
        o.querySelector('[data-c]').onclick = closeOverlay;
        function go() { var v = inp.value.trim().toUpperCase(); closeOverlay(); if (v) resolve(v); }
        o.querySelector('[data-g]').onclick = go;
        inp.onkeydown = function (e) { if (e.key === 'Enter') go(); };
      });
    };
    return sc;
  }

  /* ==== Skeletons (skeletons.dart) ============================================ */
  function skeletonCards(n) {
    var one = '<div class="card" style="padding:16px;margin-bottom:12px"><div style="display:flex;gap:10px;align-items:center">' +
      '<span class="sk" style="width:26px;height:26px;border-radius:13px"></span><span class="sk" style="width:96px;height:15px"></span>' +
      '<span style="flex:1"></span><span class="sk" style="width:58px;height:12px"></span></div>' +
      '<div class="sk" style="height:12px;margin-top:16px"></div><div class="sk" style="width:180px;height:12px;margin-top:9px"></div>' +
      '<div style="display:flex;justify-content:space-around;margin-top:16px">' +
      [0, 1, 2].map(function () { return '<span><span class="sk" style="display:block;width:54px;height:10px"></span><span class="sk" style="display:block;width:36px;height:14px;margin:8px auto 0"></span></span>'; }).join('') +
      '</div></div>';
    var out = '';
    for (var i = 0; i < n; i++) out += one;
    return '<div style="padding:6px 16px 24px">' + out + '</div>';
  }
  function loadInto(host, skeleton, build) {
    host.innerHTML = skeleton;
    setTimeout(function () { build(); }, 280);
  }

  /* ==== production card (search + cage detail) ================================ */
  function kv(k, v) { return '<div class="kv"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>'; }
  function stats(p) {
    return '<div class="stats"><div><small>Stocking Date</small><b>' + esc(p.stocking_date || '—') + '</b></div><i></i>' +
      '<div><small>Stock</small><b>' + esc(p.current_stock === undefined ? '—' : p.current_stock) + '</b></div><i></i>' +
      '<div><small>Survival</small><b>' + (p.survival === undefined || p.survival === null ? '—' : p.survival + '%') + '</b></div></div>';
  }

  /* ==== SearchPage ============================================================= */
  function Search() {
    var lk = Api.lookups(), farms = Api.farms();
    var state = { search: '', farm: '', speciesId: 0, feedTypeId: 0 };
    function chip(name, opts, value) {
      return '<span class="chip-select"><select data-f="' + name + '">' + opts.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>' + icon('expand_more') + '</span>';
    }
    var node = screen('', ocean('secondary') + '<div class="over">' +
      hero('Search', 'Fish productions by cage', '<button class="hero-round press" data-map aria-label="Map">' + icon('map') + '</button>') +
      '<div style="padding:14px 16px 8px"><div class="search-box">' + icon('search') + '<input placeholder="Search cage, serial or species…" data-q></div>' +
      '<div class="chips">' + chip('farm', [['', 'All Farms']].concat(farms.map(function (f) { return [f.name, 'Farm ' + f.name]; })), '') +
      chip('species', [[0, 'All Species']].concat(lk.fish_species.map(function (s) { return [s.id, s.name]; })), 0) +
      chip('feed', [[0, 'All Feed Types']].concat(lk.feed_types.map(function (f) { return [f.id, f.name]; })), 0) + '</div></div>' +
      '<div class="scroll" data-list></div></div>');
    var list = node.querySelector('[data-list]'), timer;
    function load() {
      loadInto(list, skeletonCards(4), function () {
        var rows = Api.search(state);
        if (!rows.length) { list.innerHTML = '<div class="empty-note">No productions found</div>'; return; }
        list.innerHTML = '<div style="padding:6px 16px 24px">' + rows.map(function (p) {
          return '<button class="card prod-card press" data-pid="' + p.production_id + '"><div class="ref-row"><span class="tag-dot">' + icon('tag') + '</span>' +
            '<span class="ref">' + esc(p.cage_ref || '—') + '</span><span class="last"><small>Last Update</small><b>' + esc(p.last_update || '—') + '</b></span></div>' +
            '<div class="divider" style="margin:10px 0"></div>' + kv('Species', p.species_name || '—') + '<div style="height:6px"></div>' +
            kv('Medication', p.medication) + stats(p) + '</button>';
        }).join('') + '</div>';
        list.querySelectorAll('[data-pid]').forEach(function (b) {
          b.onclick = function () { push(CageDetail(rows.filter(function (r) { return r.production_id === +b.dataset.pid; })[0])); };
        });
      });
    }
    node.querySelector('[data-q]').oninput = function () {
      state.search = this.value.trim();
      clearTimeout(timer);
      timer = setTimeout(load, 400);
    };
    node.querySelectorAll('[data-f]').forEach(function (s) {
      s.onchange = function () {
        if (s.dataset.f === 'farm') state.farm = s.value;
        if (s.dataset.f === 'species') state.speciesId = +s.value;
        if (s.dataset.f === 'feed') state.feedTypeId = +s.value;
        load();
      };
    });
    node.querySelector('[data-map]').onclick = function () { push(MapPage()); };
    load();
    return { el: node, enter: function () { mountOcean(node, { intensity: 0.5 }); } };
  }

  /* ==== MapPage (InteractiveViewer) ============================================== */
  function MapPage() {
    var farm = '1', farms = Api.farms();
    var node = screen('', ocean('secondary') + '<div class="over">' + hero('Map', 'Tap an occupied cage') +
      '<div class="map-bar"><span class="farm-select"><select data-farm>' +
      (farms.length ? farms : [{ name: '1' }, { name: '2' }, { name: '3' }]).map(function (f) {
        return '<option value="' + esc(f.name) + '">Farm ' + esc(f.name) + '</option>';
      }).join('') + '</select>' + icon('expand_more') + '</span><span style="flex:1"></span>' +
      '<span class="legend"><i style="background:#FFFFFF"></i>Cage</span><span class="legend"><i style="background:#F6C7C9"></i>Medicated</span></div>' +
      '<div class="viewer" data-viewer></div></div>');
    var viewer = node.querySelector('[data-viewer]');
    var view = { x: 0, y: 0, s: 1 }, plan = null;
    function apply() { if (plan) plan.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.s + ')'; }
    function clamp() {
      if (!plan) return;
      var pw = plan.offsetWidth * view.s, ph = plan.offsetHeight * view.s, vw = viewer.clientWidth, vh = viewer.clientHeight;
      view.x = Math.min(60, Math.max(vw - pw - 60, view.x));
      view.y = Math.min(60, Math.max(vh - ph - 60, view.y));
    }
    function load() {
      viewer.innerHTML = '<div style="padding:16px;display:grid;grid-template-columns:repeat(4,64px);gap:10px">' +
        new Array(16).join('<span class="sk" style="height:52px;border-radius:10px"></span>') + '</div>';
      setTimeout(function () {
        var m = Api.map(farm), rate = m.canvas.rate, w = m.canvas.width * rate, h = m.canvas.height * rate;
        viewer.innerHTML = '<div class="plan"><div class="plan-bg" style="width:' + w + 'px;height:' + h + 'px">' +
          m.decorations.map(function (d) {
            var x = d.x * rate, y = d.y * rate, dw = d.width * rate, dh = d.height * rate;
            if (d.item_type === 'title') return '<span class="decor" style="left:' + x + 'px;top:' + y + 'px;color:' + d.text_color + ';font-size:24px;font-weight:600">' + esc(d.label) + '</span>';
            if (d.item_type === 'text') return '<span class="decor" style="left:' + x + 'px;top:' + y + 'px;' + (dw < 40 ? '' : 'width:' + dw + 'px;') + 'color:' + d.text_color + ';font-size:12px;text-align:center">' + esc(d.label) + '</span>';
            return '<span class="decor block" style="left:' + x + 'px;top:' + y + 'px;width:' + dw + 'px;height:' + dh + 'px;background:' + d.background_color + ';color:' + d.text_color + '">' + esc(d.label) + '</span>';
          }).join('') +
          m.cages.map(function (c) {
            return '<div class="cage' + (c.production_id ? ' occ' : '') + '" data-pid="' + (c.production_id || '') + '" data-code="' + esc(c.cage_code) + '" style="left:' + c.x * rate + 'px;top:' + c.y * rate +
              'px;width:' + c.width * rate + 'px;height:' + c.height * rate + 'px;background:' + c.background_color + '"><b>' + esc(c.cage_code) + '</b>' +
              (c.serial_number ? '<small>' + esc(c.serial_number) + '</small>' : '') + (c.species_name ? '<small class="fish">' + esc(c.species_name) + '</small>' : '') + '</div>';
          }).join('') + '</div></div>';
        plan = viewer.firstChild;
        view = { x: 0, y: 0, s: 1 };
        apply();
      }, 280);
    }
    // Pan with drag, zoom with the wheel or a pinch (minScale 0.4, maxScale 3).
    var pointers = {}, drag = null, moved = false, pinch = null;
    viewer.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      viewer.setPointerCapture(e.pointerId);
      moved = false;
      var ids = Object.keys(pointers);
      if (ids.length === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
        drag = null;
      }
      viewer.classList.add('dragging');
    });
    viewer.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (pinch && ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d);
        moved = true;
      } else if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        view.x = drag.vx + dx; view.y = drag.vy + dy;
        clamp(); apply();
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      if (!Object.keys(pointers).length) {
        viewer.classList.remove('dragging');
        if (!moved) {
          var hit = document.elementFromPoint(e.clientX, e.clientY);
          var cage = hit && hit.closest('.cage.occ');
          if (cage) push(CageDetail({ production_id: +cage.dataset.pid, cage_ref: farm + ' - ' + cage.dataset.code }));
        }
        drag = null;
      }
    }
    viewer.addEventListener('pointerup', up);
    viewer.addEventListener('pointercancel', up);
    function zoomAt(cx, cy, s) {
      s = Math.min(3, Math.max(0.4, s));
      var r = viewer.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
      view.x = px - (px - view.x) * s / view.s;
      view.y = py - (py - view.y) * s / view.s;
      view.s = s;
      clamp(); apply();
    }
    viewer.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, view.s * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    }, { passive: false });
    node.querySelector('[data-farm]').onchange = function () { farm = this.value; load(); };
    load();
    return { el: node, enter: function () { mountOcean(node, { intensity: 0.5 }); } };
  }

  /* ==== CageDetailPage ============================================================= */
  function CageDetail(initial) {
    var p = initial;
    var node = screen('', ocean('secondary') + '<div class="over">' +
      hero('Cage Detail', p.cage_ref || p.cage_code || '', '<button class="hero-link press" data-history>History</button>') +
      '<div class="scroll" data-body></div></div>');
    var body = node.querySelector('[data-body]');
    function tile(label, ic, pal, op) {
      return '<button class="op-tile press" data-op="' + op + '"><span class="tile pal-' + pal + '">' + icon(ic) + '</span><b>' + label + '</b></button>';
    }
    function paint() {
      body.innerHTML = '<div style="padding:16px 16px 28px"><div class="card" style="padding:18px;border-radius:20px;box-shadow:0 8px 18px rgba(0,0,0,0.05)">' +
        '<div class="ref-row"><span class="tag-dot" style="width:28px;height:28px">' + icon('tag') + '</span><span class="ref" style="font-size:18px">' + esc(p.cage_ref || p.cage_code || '—') + '</span>' +
        '<span class="last"><small style="font-size:11px">Last Update</small><b style="font-size:12px">' + esc(p.last_update || '—') + '</b></span></div>' +
        '<div class="divider" style="margin:12px 0"></div>' + kv('Species', p.species_name || '—') + '<div style="height:8px"></div>' +
        kv('Medication', p.medication || 'No Medicine 0g/kg') + stats(p).replace('class="stats"', 'class="stats" style="margin-top:16px;padding:14px 0;border-radius:14px"') + '</div>' +
        '<h2 class="section-title">Daily Operations</h2><div class="op-grid">' + tile('Feeding', 'set_meal', 'feed', 'feeding') +
        tile('Dead Fish', 'warning_amber', 'dead', 'dead-fish') + tile('Treatment', 'medical_services', 'treatment', 'treatment') + '</div>' +
        '<h2 class="section-title">Other Operations</h2><div class="op-grid">' + tile('Change Net', 'grid_on', 'productions', 'change-net') +
        tile('Report\nBroken Net', 'report', 'dead', 'broken-net') + tile('Harvest', 'set_meal', 'harvest', 'harvest') + '</div>' +
        '<div class="op-grid">' + tile('Wash Net', 'water_drop', 'environment', 'wash-net') + '<span class="op-spacer"></span><span class="op-spacer"></span></div></div>';
      body.querySelectorAll('[data-op]').forEach(function (b) { b.onclick = function () { push(OpForm(b.dataset.op, p)); }; });
      node.querySelector('.hero-sub').textContent = p.cage_ref || p.cage_code || '';
    }
    function refresh() {
      body.innerHTML = '<div style="padding:16px"><div class="card" style="padding:18px"><span class="sk" style="display:block;width:140px;height:18px"></span>' +
        '<div class="sk" style="height:12px;margin-top:24px"></div><div class="sk" style="height:12px;margin-top:12px"></div><div class="sk" style="height:48px;margin-top:16px"></div></div>' +
        '<span class="sk" style="display:block;width:150px;height:16px;margin-top:24px"></span><div class="op-grid">' +
        '<span class="sk" style="flex:1;height:98px;border-radius:18px"></span><span class="sk" style="flex:1;height:98px;border-radius:18px"></span><span class="sk" style="flex:1;height:98px;border-radius:18px"></span></div></div>';
      setTimeout(function () {
        try { p = Api.production(p.production_id); } catch (e) {}
        paint();
      }, 280);
    }
    node.querySelector('[data-history]').onclick = function () { push(History(p)); };
    refresh();
    return { el: node, enter: function () { mountOcean(node, { intensity: 0.5 }); }, resume: function (ok) { if (ok === true) refresh(); } };
  }

  /* ==== Operation forms (operation_forms.dart) ======================================= */
  function sub(p) { return [p.cage_ref || p.cage_code || '', p.serial_number || ''].filter(Boolean).join('  ·  '); }
  function label(text, req) { return '<label class="field-label">' + esc(text) + (req ? '<em> *</em>' : '') + '</label>'; }
  var GAP = '<div class="gap"></div>';
  function dateField(name, value) {
    return '<label class="ff-date">' + icon('calendar_today') + '<span data-show="' + name + '">' + esc(value) + '</span><input type="date" name="' + name + '" value="' + esc(value) + '"></label>';
  }
  function timeField(name, value) {
    return '<label class="ff-date">' + icon('access_time') + '<span data-show="' + name + '">' + esc(value) + '</span><input type="time" name="' + name + '" value="' + esc(value) + '"></label>';
  }
  function pills(name, options, value) {
    return '<div class="pills" data-pills="' + name + '">' + options.map(function (o) {
      return '<button type="button" class="pill press' + (o === value ? ' on' : '') + '" data-v="' + esc(o) + '">' + esc(o) + '</button>';
    }).join('') + '</div><input type="hidden" name="' + name + '" value="' + esc(value || '') + '">';
  }
  function dropdown(name, items, hint) {
    return '<select class="ff-select placeholder" name="' + name + '"><option value="">' + esc(hint) + '</option>' + items.map(function (i) {
      return '<option value="' + i.id + '">' + esc(i.name) + '</option>';
    }).join('') + '</select>';
  }
  function text(name, hint, rows, mode) {
    return rows ? '<textarea class="ff-input" name="' + name + '" rows="' + rows + '" placeholder="' + esc(hint) + '"></textarea>'
      : '<input class="ff-input" name="' + name + '" placeholder="' + esc(hint) + '"' + (mode ? ' inputmode="' + mode + '"' : '') + '>';
  }
  function photoPicker() { return '<div style="display:flex;flex-wrap:wrap;gap:10px"><button type="button" class="photo-add press" data-photo aria-label="Add photo">' + icon('add_a_photo') + '</button></div>'; }

  var FORMS = {
    feeding: { title: 'Feeding', submit: 'Save Feeding', body: function (lk) {
      var feeds = lk.feed_types.map(function (e) {
        var lab = [e.brand_name, e.pellet_size !== null ? 'pellet ' + e.pellet_size : null].filter(function (s) { return s; }).join(' · ');
        return { id: e.id, name: lab || e.name };
      });
      return label('Date', true) + dateField('date', FF.today) + GAP + label('Session', true) + pills('session', lk.sessions, 'Morning') + GAP +
        label('Type of Feed', true) + dropdown('feed_type_id', feeds, 'Select feed') + GAP +
        label('Supplement Type') + dropdown('supplement_type_id', lk.supplement_types, 'No Medicine 0g/kg') + GAP +
        label('Weight (kg)', true) + text('weight_kg', 'e.g. 12.5', 0, 'decimal') + GAP + label('Remarks') + text('remarks', 'Optional', 3);
    }, check: function (v) {
      if (!v.feed_type_id) return 'Please select a feed type';
      if (!(+v.weight_kg > 0)) return 'Weight (kg) is required';
    }, send: function (v) {
      return { date: v.date, session: v.session, feed_type_id: +v.feed_type_id, supplement_type_id: v.supplement_type_id ? +v.supplement_type_id : null,
        weight_kg: +v.weight_kg, remarks: v.remarks };
    }, done: 'Feeding recorded' },
    'dead-fish': { title: 'Dead Fish', submit: 'Save Dead Fish', body: function (lk) {
      return label('Date', true) + dateField('date', FF.today) + GAP + label('Session', true) + pills('session', ['Morning', 'Noon', 'Evening', 'Others'], 'Morning') + GAP +
        label('Count (Surface)', true) + text('surface', '0', 0, 'numeric') + GAP + label('Count (Below)') + text('below', 'Optional', 0, 'numeric') + GAP +
        label('Clinical Signs') + dropdown('clinical_sign_id', lk.clinical_signs, 'Select clinical sign') + GAP +
        label('Remarks') + text('remarks', 'Optional', 3) + GAP + label('Photos') + photoPicker();
    }, check: function (v) { if (!/^\d+$/.test(v.surface)) return 'Count (Surface) is required'; },
    send: function (v) {
      return { date: v.date, session: v.session, surface: +v.surface, below: /^\d+$/.test(v.below) ? +v.below : 0,
        clinical_sign_id: v.clinical_sign_id ? +v.clinical_sign_id : null, remarks: v.remarks };
    }, done: 'Dead fish recorded' },
    treatment: { title: 'Treatment', submit: 'Save Treatment', body: function () {
      return label('Date', true) + dateField('date', FF.today) + GAP + label('Canvas size', true) + pills('canvas_size', ['Large', 'Small'], 'Large') + GAP +
        '<div style="display:flex;justify-content:space-between;align-items:center">' + label('Medicine') +
        '<button type="button" class="add-link press" data-addmed>' + icon('add') + 'Add</button></div><div data-meds></div>' + GAP +
        label('Clinical Diagnosis') + text('clinical_diagnosis', 'Optional', 2) + GAP + label('Lab Diagnosis') + text('lab_diagnosis', 'Optional', 2) + GAP +
        label('Remarks') + text('remarks', 'Optional', 3) + GAP + label('Photos') + photoPicker();
    }, send: function (v, form) {
      var meds = [];
      form.querySelectorAll('.med-card').forEach(function (c) {
        var id = c.querySelector('select').value;
        if (!id) return;
        var m = { type: c.dataset.type, id: +id }, d = c.querySelector('[data-dose]').value.trim(), du = c.querySelector('[data-dur]').value.trim();
        if (d) m.dosage = isNaN(+d) ? null : +d;
        if (du) m.duration = isNaN(+du) ? null : +du;
        meds.push(m);
      });
      return { date: v.date, canvas_size: v.canvas_size, medicines: meds, lab_diagnosis: v.lab_diagnosis, clinical_diagnosis: v.clinical_diagnosis, remarks: v.remarks };
    }, done: 'Treatment recorded' },
    'change-net': { title: 'Change Net', submit: 'Save Change Net', body: function (lk) {
      return label('Date', true) + dateField('date', FF.today) + GAP + label('Type of net', true) + dropdown('net_type_id', lk.net_types, 'Select net type') + GAP +
        label('Remarks') + text('remarks', 'Optional', 3);
    }, check: function (v) { if (!v.net_type_id) return 'Type of net is required'; },
    send: function (v) { return { date: v.date, net_type_id: +v.net_type_id, remarks: v.remarks }; }, done: 'Change net recorded' },
    'wash-net': { title: 'Wash Net', submit: 'Save Wash Net', body: function (lk) {
      return label('Date', true) + dateField('date', FF.today) + GAP + label('Time', true) + timeField('time', nowHM()) + GAP +
        label('Status', true) + pills('status', lk.cage_statuses, null) + GAP + label('Temporary Staff') + text('temporary_staff', 'Optional') + GAP +
        label('Staff') + text('staff', 'Optional') + GAP + label('Remarks') + text('remarks', 'Optional', 3);
    }, check: function (v) { if (!v.status) return 'Status is required'; },
    send: function (v) { return { date: v.date, time: v.time, status: v.status, temporary_staff: v.temporary_staff, staff: v.staff, remarks: v.remarks }; },
    done: 'Wash net recorded' },
    harvest: { title: 'Harvest', submit: 'Save Harvest', body: function () {
      function row(l1, n1, l2, n2) {
        return '<div style="display:flex;gap:12px"><div style="flex:1">' + label(l1) + text(n1, '0', 0, 'decimal') + '</div><div style="flex:1">' + label(l2) + text(n2, '0', 0, 'decimal') + '</div></div>';
      }
      return label('Date', true) + dateField('date', FF.today) + GAP + label('Time', true) + timeField('time', nowHM()) + GAP +
        label('Type', true) + pills('type', ['Live', 'Ice Chilled', 'Emergency'], 'Live') + GAP +
        row('Normal Weight (kg)', 'normal_weight', 'Normal Per Piece (g)', 'normal_per_piece_weight') + GAP +
        row('Promo Weight (kg)', 'promo_weight', 'Promo Per Piece (g)', 'promo_per_piece_weight') + GAP +
        row('Other Weight (kg)', 'other_weight', 'Other Per Piece (g)', 'other_per_piece_weight') + GAP +
        label('Remarks') + text('remarks', 'Optional', 3) + GAP + label('Photos') + photoPicker();
    }, send: function (v) {
      function n(k) { return +v[k] || 0; }
      return { date: v.date, time: v.time, type: v.type, normal_weight: n('normal_weight'), promo_weight: n('promo_weight'), other_weight: n('other_weight'),
        normal_per_piece_weight: n('normal_per_piece_weight'), promo_per_piece_weight: n('promo_per_piece_weight'),
        other_per_piece_weight: n('other_per_piece_weight'), remarks: v.remarks };
    }, done: 'Harvest recorded' },
    'broken-net': { title: 'Report Broken Net', submit: 'Submit Report', body: function () {
      return label('Date', true) + dateField('date', FF.today) + GAP + label('Remarks') + text('remarks', 'Optional', 3) + GAP + label('Photos') + photoPicker();
    }, send: function (v) { return { date: v.date, remarks: v.remarks }; }, done: 'Broken net reported' }
  };

  // OpScaffold: hero bar, scrolling body, sticky submit button.
  function OpScaffold(title, subtitle, submitLabel, bodyHtml, onSubmit) {
    var node = screen('', ocean('secondary') + '<div class="over">' + hero(title, subtitle) +
      '<form class="scroll" novalidate style="padding:18px 18px 24px">' + bodyHtml + '</form>' +
      '<div class="submit-bar"><button class="primary-btn" data-submit>' + esc(submitLabel) + '</button></div></div>');
    var form = node.querySelector('form');
    form.addEventListener('change', function (e) {
      if (e.target.type === 'date' || e.target.type === 'time') {
        var show = form.querySelector('[data-show="' + e.target.name + '"]');
        if (show) show.textContent = e.target.value || (e.target.type === 'date' ? 'Select date' : 'Select time');
      }
      if (e.target.classList.contains('ff-select')) e.target.classList.toggle('placeholder', !e.target.value);
    });
    form.addEventListener('click', function (e) {
      var pill = e.target.closest('.pill');
      if (pill && pill.parentNode.dataset.pills) {
        var group = pill.parentNode;
        group.querySelectorAll('.pill').forEach(function (p) { p.classList.toggle('on', p === pill); });
        form.querySelector('input[name="' + group.dataset.pills + '"]').value = pill.dataset.v;
        group.dispatchEvent(new CustomEvent('pick', { bubbles: true, detail: pill.dataset.v }));
      }
      if (e.target.closest('[data-photo]')) {
        sheet('<div class="sheet-list" style="padding:8px 0"><button data-s="camera">' + icon('photo_camera') + 'Take a photo</button>' +
          '<button data-s="gallery">' + icon('photo_library') + 'Choose from gallery</button></div>', function (o) {
          o.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { closeOverlay(); toast('Attaching photos'); }; });
        });
      }
    });
    node.querySelector('[data-submit]').onclick = function () {
      var btn = this, v = {};
      new FormData(form).forEach(function (val, k) { v[k] = String(val).trim(); });
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      setTimeout(function () {
        var ok = onSubmit(v, form);
        btn.disabled = false;
        btn.textContent = submitLabel;
        if (ok) pop(true);
      }, 350);
    };
    return { el: node, form: form, enter: function () { mountOcean(node, { intensity: 0.5 }); } };
  }

  function OpForm(op, p) {
    var f = FORMS[op], lk = Api.lookups();
    var sc = OpScaffold(f.title, sub(p), f.submit, f.body(lk), function (v, form) {
      var err = f.check && f.check(v);
      if (err) { opError(err); return false; }
      try {
        var body = f.send(v, form);
        body.production_id = p.production_id;
        Api.operation(op, body);
        opSuccess(f.done);
        return true;
      } catch (e) {
        opError(e.message);
        return false;
      }
    });
    if (op === 'treatment') {
      var host = sc.form.querySelector('[data-meds]');
      var TYPES = { Medicine: lk.medicines, Supplement: lk.supplements, Vaccine: lk.vaccines };
      function card(type) {
        var c = el('<div class="med-card" data-type="' + type + '"><div style="display:flex;align-items:flex-start"><div style="flex:1">' +
          '<div class="pills" data-medtype>' + ['Medicine', 'Supplement', 'Vaccine'].map(function (o) {
            return '<button type="button" class="pill press' + (o === type ? ' on' : '') + '" data-v="' + o + '">' + o + '</button>';
          }).join('') + '</div></div><button type="button" class="hero-round" data-rm style="background:none;color:var(--danger)" aria-label="Remove">' + icon('delete_outline') + '</button></div>' +
          '<div style="height:10px"></div><select class="ff-select placeholder"></select><div style="height:10px"></div>' +
          '<div style="display:flex;gap:10px"><input class="ff-input" data-dose placeholder="Dose (g/kg)" inputmode="decimal"><input class="ff-input" data-dur placeholder="Duration (mins)" inputmode="decimal"></div></div>');
        function fill() {
          var t2 = c.dataset.type;
          c.querySelector('select').innerHTML = '<option value="">Select ' + t2.toLowerCase() + '</option>' +
            TYPES[t2].map(function (i) { return '<option value="' + i.id + '">' + esc(i.name) + '</option>'; }).join('');
          c.querySelector('select').classList.add('placeholder');
        }
        c.querySelector('[data-medtype]').addEventListener('click', function (e) {
          var pill = e.target.closest('.pill');
          if (!pill) return;
          c.dataset.type = pill.dataset.v;
          c.querySelectorAll('[data-medtype] .pill').forEach(function (x) { x.classList.toggle('on', x === pill); });
          fill();
        });
        c.querySelector('[data-rm]').onclick = function () { c.remove(); syncRemove(); };
        fill();
        return c;
      }
      function syncRemove() {
        var cards = host.querySelectorAll('.med-card');
        cards.forEach(function (c) { c.querySelector('[data-rm]').style.display = cards.length > 1 ? '' : 'none'; });
      }
      host.appendChild(card('Medicine'));
      syncRemove();
      sc.form.querySelector('[data-addmed]').onclick = function () { host.appendChild(card('Medicine')); syncRemove(); };
    }
    return sc;
  }

  /* ==== HistoryPage ================================================================ */
  var OP_STYLE = { feeding: ['set_meal', 'feed'], 'dead-fish': ['warning_amber', 'dead'], treatment: ['medical_services', 'treatment'],
    'change-net': ['grid_on', 'productions'], 'wash-net': ['water_drop', 'environment'], 'broken-net': ['report', 'dead'], harvest: ['set_meal', 'harvest'] };
  function History(p) {
    var node = screen('', ocean('secondary') + '<div class="over">' + hero('History', p.cage_ref || p.cage_code || '') + '<div data-filters></div><div class="scroll" data-list></div></div>');
    var all = [], f = { op: '', by: '', date: '' };
    var list = node.querySelector('[data-list]'), filters = node.querySelector('[data-filters]');
    function filtered() {
      return all.filter(function (e) {
        return (!f.op || e.op === f.op) && (!f.by || e.submitted_by === f.by) && (!f.date || e.record_date === f.date);
      });
    }
    function paintFilters() {
      var ops = Object.keys(OP_STYLE).filter(function (o) { return all.some(function (e) { return e.op === o; }); });
      var people = all.map(function (e) { return e.submitted_by; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort();
      var dd = f.date ? pad(+f.date.slice(8, 10)) + ' ' + MON[+f.date.slice(5, 7) - 1] : 'Date';
      filters.innerHTML = '<div class="filter-bar"><div class="op-chips"><button class="op-chip press' + (!f.op ? ' on' : '') + '" data-op="">All</button>' +
        ops.map(function (o) {
          var lab = all.filter(function (e) { return e.op === o; })[0].op_label;
          return '<button class="op-chip press' + (f.op === o ? ' on' : '') + '" data-op="' + o + '">' + esc(lab) + '</button>';
        }).join('') + '</div><div class="filter-row"><span class="person-filter">' + icon('person_outline') + '<select data-by>' +
        '<option value="">' + (f.by ? 'Everyone' : 'Submitted by') + '</option>' +
        people.map(function (x) { return '<option' + (f.by === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' + icon('expand_more') + '</span>' +
        '<label class="date-filter press' + (f.date ? ' on' : '') + '">' + icon('calendar_today') + dd + (f.date ? '<span class="mi" data-clear style="font-size:15px;position:relative;z-index:2">close</span>' : '') +
        '<input type="date" data-date value="' + f.date + '"></label></div></div>';
      filters.querySelectorAll('[data-op]').forEach(function (b) { b.onclick = function () { f.op = b.dataset.op; paint(); }; });
      filters.querySelector('[data-by]').onchange = function () { f.by = this.value; paint(); };
      filters.querySelector('[data-date]').onchange = function () { f.date = this.value; paint(); };
      var clr = filters.querySelector('[data-clear]');
      if (clr) clr.onclick = function (e) { e.preventDefault(); f.date = ''; paint(); };
    }
    function paint() {
      if (all.length) paintFilters(); else filters.innerHTML = '';
      var items = filtered();
      if (!items.length) {
        list.innerHTML = '<div style="text-align:center;padding-top:120px;color:var(--muted)"><span class="mi" style="font-size:56px;opacity:0.5">history</span>' +
          '<div style="margin-top:12px;font-size:15px">No operations recorded yet</div>' + (all.length ? '<div style="margin-top:4px;font-size:13px">Try clearing the filters</div>' : '') + '</div>';
        return;
      }
      list.innerHTML = '<div style="padding:14px 16px 28px">' + items.map(function (e, i) {
        var s = OP_STYLE[e.op] || ['circle', 'productions'];
        return '<button class="card log-card press" data-i="' + i + '"><span class="tile pal-' + s[1] + '">' + icon(s[0], 'op') + '</span><span class="log-body">' +
          '<span class="log-head"><b>' + esc(e.op_label) + '</b><small>' + fmtDate(e.record_date) + '</small></span><span class="log-sum" style="display:block">' + esc(e.summary) + '</span>' +
          '<span class="log-by">' + icon('person_outline') + '<span class="grow">' + esc(e.submitted_by || 'Unknown') + '</span>' +
          (e.photos.length ? icon('photo') + e.photos.length + '&nbsp;&nbsp;' : '') + icon('chevron_right') + '</span></span></button>';
      }).join('') + '</div>';
      list.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { detail(items[+b.dataset.i]); }; });
    }
    function detail(e) {
      var s = OP_STYLE[e.op] || ['circle', 'productions'];
      function row(k, v) {
        return '<div style="display:flex;gap:10px;padding:10px 0"><span style="width:120px;flex:none;color:var(--muted);font-size:13.5px">' + esc(k) + '</span>' +
          '<b style="flex:1;color:var(--ink);font-size:14.5px;font-weight:600">' + esc(v) + '</b></div>';
      }
      sheet('<div style="background:var(--background);border-radius:24px 24px 0 0;display:flex;flex-direction:column;max-height:100%;min-height:62vh">' +
        '<span style="width:42px;height:5px;border-radius:3px;background:var(--line);margin:10px auto 0"></span>' +
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 18px 6px"><span class="tile pal-' + s[1] + '" style="width:52px;height:52px;border-radius:14px">' +
        icon(s[0]) + '</span><div><div style="font-size:19px;font-weight:800">' + esc(e.op_label) + '</div><div style="color:var(--muted);font-size:13px;margin-top:2px">' +
        fmtDate(e.record_date, true) + '</div></div></div><div style="overflow-y:auto;padding:10px 18px 28px"><div class="card" style="padding:6px 16px;border-radius:16px;box-shadow:none">' +
        row('Submitted by', e.submitted_by || 'Unknown') + e.fields.map(function (x) { return row(x.label, x.value); }).join('') + '</div>' +
        (e.photos.length ? '<div style="margin-top:20px;font-size:15px;font-weight:800">Photos</div><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">' +
          e.photos.map(function () {
            return '<button class="press" data-ph style="width:96px;height:96px;border:0;border-radius:12px;background:var(--line);color:var(--muted);display:grid;place-items:center">' + icon('broken_image') + '</button>';
          }).join('') + '</div>' : '') + '</div></div>', function (o) {
        o.querySelector('.sheet').style.background = 'transparent';
        o.querySelectorAll('[data-ph]').forEach(function (b) { b.onclick = function () { toast('Stored photos'); }; });
      });
    }
    list.innerHTML = skeletonCards(5);
    setTimeout(function () { all = Api.history(p.production_id); paint(); }, 280);
    return { el: node, enter: function () { mountOcean(node, { intensity: 0.5 }); } };
  }

  /* ==== Incident report ============================================================= */
  var INCIDENTS = [['Broken Planks', 'view_week', 'productions'], ['Broken Anchor Lines', 'anchor', 'feed'], ['Broken Bird Nets', 'grid_4x4', 'environment'],
    ['Equipment Spoilt', 'build', 'harvest'], ['Accidents', 'warning_amber', 'dead'], ['Others', 'more_horiz', 'treatment']];
  function IncidentCategories() {
    var node = screen('', ocean('secondary') + '<div class="over">' + hero('Incident Report', 'Select an incident type') +
      '<div class="scroll" style="padding:18px 16px 28px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
      INCIDENTS.map(function (c) {
        return '<button class="card press" data-t="' + c[0] + '" style="border-radius:20px;aspect-ratio:1.05;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 10px">' +
          '<span class="tile pal-' + c[2] + '" style="width:58px;height:58px;border-radius:15.7px">' + icon(c[1]) + '</span>' +
          '<b style="margin-top:14px;font-size:13.5px;font-weight:700;color:var(--ink);line-height:1.2">' + c[0] + '</b></button>';
      }).join('') + '</div></div></div>');
    node.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { push(IncidentForm(b.dataset.t)); }; });
    return { el: node, enter: function () { mountOcean(node, { intensity: 0.5 }); } };
  }
  function IncidentForm(type) {
    return OpScaffold(type, 'Incident Report', 'Submit Report',
      label('Date', true) + dateField('date', FF.today) + GAP + label('Time', true) + timeField('time', nowHM()) + GAP +
      label('Location') + text('location', 'Optional') + GAP + label('Remarks') + text('remarks', 'Optional', 3) + GAP + label('Photos') + photoPicker(),
      function (v) {
        Api.incident({ incident_type: type, date: v.date, time: v.time, location: v.location, remarks: v.remarks });
        opSuccess('Incident reported');
        return true;
      });
  }

  /* ==== boot ======================================================================= */
  push(Splash(), { replaceAll: true });
}());
