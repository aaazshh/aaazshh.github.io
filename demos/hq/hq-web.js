/**
 * hq-web, the Laravel API the HQ app talks to (routes/api.php, prefix /api/v1),
 * ported to the browser. Each handler follows its controller and service:
 * AuthController, UserController, MicrosoftGraphController (+ the Graph
 * service's response shapes), MeetingRoomController, TeamsWorkController,
 * KitchenController, MemoController and BulletinService. The systems hq-web
 * forwards to (IAM, Microsoft Graph, TeamsWork, the kitchen service and the
 * intranet) are stood in for by sample data kept in sessionStorage, so what
 * a visitor books, orders or posts lasts for the visit.
 */
var HqWeb = (function () {
  'use strict';

  var KEY = 'hq-demo-db-v2';
  var DELAY = 260;

  /* ==== small helpers ==================================================== */
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function stamp(d) { return ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function sql(d) { return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  // Carbon::parse on the app's local ISO strings (no zone, optional fraction).
  function parse(s) {
    if (s instanceof Date) return new Date(s.getTime());
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(s || ''));
    if (!m) return new Date(NaN);
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function addMin(d, n) { return new Date(d.getTime() + n * 60000); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function iso8601(d) {
    // Carbon::toIso8601String() in Asia/Singapore
    return stamp(d) + '+08:00';
  }
  function uuid(r) {
    var h = '0123456789abcdef', s = '';
    for (var i = 0; i < 32; i++) s += h[Math.floor((r ? r() : Math.random()) * 16)];
    return s.slice(0, 8) + '-' + s.slice(8, 12) + '-4' + s.slice(13, 16) + '-a' + s.slice(17, 20) + '-' + s.slice(20);
  }
  function monday(d) { var x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

  /* ==== the sample world ================================================= */
  // departments, as seeded by 2026_04_15_062158_seed_departments_table.php
  var DEPARTMENTS = [
    [1, 'OPS_RTL', 'Retail Operations'], [2, 'OPS_RTL_TF', 'Retail Operations (Taskforce)'], [3, 'ACCT', 'Accounts'],
    [4, 'ADM', 'Administration'], [5, 'AP', 'Advertising & Promotion'], [6, 'BOD', 'Board of Directors'],
    [7, 'OPS_BM', 'Branch Ops Management'], [8, 'PFB_CLN', 'MK Cleaning'], [9, 'CRM', 'Customer Relationship Management'],
    [10, 'PMI', 'PMI'], [11, 'PFB_BEV', 'MK Drink Stall'], [12, 'OPS_FNB', 'MK FnB Operations'], [13, 'GCEOO', 'Group CEO Office'],
    [14, 'HK', 'Housekeeping'], [15, 'HR', 'Human Resource'], [16, 'IT', 'IT'], [17, 'JKDC', 'Joo Koon Distribution Centre'],
    [18, 'MAINT', 'Maintenance'], [19, 'MKTG', 'Marketing'], [20, 'MERCH', 'Merchandising'], [21, 'MERCH_HQ', 'Merchandising HQ'],
    [22, 'MK_MKTG', 'MK Marketing'], [23, 'OPS_HUB', 'Operations Hub'], [24, 'OPS_SUPT', 'Operations Support'], [25, 'PGI', 'PGI'],
    [26, 'PMT', 'PMT'], [27, 'PRES_OFF', 'President Office'], [28, 'POL', 'Prime Online'], [29, 'PROJ', 'Project'],
    [30, 'PAC_SF', 'PAC Sea Farm'], [31, 'SF_LAB', 'Sea Farm Laboratory']
  ].map(function (d) { return { id: d[0], code: d[1], name: d[2], status_id: 1 }; });

  var ME = { id: 1, username: 'Maram Aashna', name: 'Maram Aashna', email: 'maram.aashna@mail.com', role_id: 1, department_id: 16 };
  var HQ_DEPTS = [16, 20, 21, 3, 15, 19, 9, 24, 4, 28, 23, 5];

  function buildWorld() {
    var r = rng(4417), now = new Date(), today = startOfDay(now);
    var db = { v: 1, seq: {}, session: null };
    function next(t) { db.seq[t] = (db.seq[t] || 100) + 1; return db.seq[t]; }
    db.departments = DEPARTMENTS;

    // hq-web users (the people who have signed in to the app at least once)
    db.users = [clone(ME)];
    for (var i = 1; i <= 36; i++) {
      db.users.push({ id: i + 1, username: 'guest' + i, name: 'guest' + i, email: 'guest' + i + '@mail.com',
        role_id: 3, department_id: HQ_DEPTS[Math.floor(r() * HQ_DEPTS.length)] });
    }
    // Graph /me/people: the directory the attendee search runs on
    db.people = [];
    for (var p = 1; p <= 64; p++) {
      db.people.push({ name: 'guest' + p, email: 'guest' + p + '@mail.com', relevanceScore: Math.round((1 - p / 80) * 100) / 10 });
    }

    // Meeting rooms: the Exchange room list, plus the local overlay rows
    db.meeting_room_locations = [{ id: 1, name: 'Defu', sort_order: 1 }, { id: 2, name: 'Changi', sort_order: 2 }];
    db.graphRooms = [
      { name: 'Meeting Room 1', email: 'meetingroom1@mail.com' },
      { name: 'Meeting Room 2', email: 'meetingroom2@mail.com' },
      { name: 'Boardroom', email: 'boardroom@mail.com' },
      { name: 'Training Room', email: 'trainingroom@mail.com' },
      { name: 'Discussion Room', email: 'discussionroom@mail.com' }
    ];
    db.meeting_room_images = [
      { room_email: 'meetingroom1@mail.com', room_name: 'meetingroom1@mail.com', name_override: null, location_id: 1, image_path: null },
      { room_email: 'meetingroom2@mail.com', room_name: 'meetingroom2@mail.com', name_override: null, location_id: 1, image_path: null },
      { room_email: 'boardroom@mail.com', room_name: 'boardroom@mail.com', name_override: null, location_id: 1, image_path: null },
      { room_email: 'trainingroom@mail.com', room_name: 'trainingroom@mail.com', name_override: null, location_id: 2, image_path: null }
    ];

    // Exchange calendars
    var SUBJECTS = ['Weekly merchandising review', 'Promo calendar planning', 'Vendor meeting', 'IT weekly sync', 'Store ops check-in',
      'Budget review', 'Interview', 'POS rollout update', 'Category review: chilled', 'HR briefing', 'Loyalty campaign kickoff',
      'Supplier onboarding', 'Monthly sales review', 'Online orders standup', 'Planogram walkthrough', 'Training: new POS screens'];
    var BODIES = ['Please bring the latest figures.', 'Agenda to follow.', 'Dial in on Teams if you are at an outlet.',
      'We will go through last week’s numbers first.', 'Short sync, 30 minutes max.', ''];
    db.events = [];
    db.room_bookings = [];
    db.graphRooms.forEach(function (room, ri) {
      for (var day = -1; day <= 45; day++) {
        var d = addDays(today, day);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        var slots = Math.floor(r() * 3.2), taken = [];
        for (var s = 0; s < slots; s++) {
          var startH = 9 + Math.floor(r() * 8), half = r() < 0.4 ? 30 : 0, len = [30, 60, 60, 90, 120][Math.floor(r() * 5)];
          var st = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startH, half), en = addMin(st, len);
          if (en.getHours() > 18 || (en.getHours() === 18 && en.getMinutes() > 0)) continue;
          if (taken.some(function (t) { return st < t[1] && en > t[0]; })) continue;
          taken.push([st, en]);
          var org = db.people[Math.floor(r() * 40)], att = [];
          var n = 1 + Math.floor(r() * 4);
          for (var a = 0; a < n; a++) {
            var pp = db.people[Math.floor(r() * 50)];
            if (pp.email === org.email || att.some(function (x) { return x.email === pp.email; })) continue;
            att.push({ name: pp.name, email: pp.email, type: r() < 0.8 ? 'required' : 'optional',
              status: ['accepted', 'accepted', 'tentativelyAccepted', 'none', 'declined'][Math.floor(r() * 5)] });
          }
          var mine = r() < 0.12 && day >= 0 && day < 12;
          if (mine) att.push({ name: ME.name, email: ME.email, type: 'required', status: 'accepted' });
          var subj = SUBJECTS[Math.floor(r() * SUBJECTS.length)];
          db.events.push({
            id: 'AAMkAGI2' + pad(ri) + uuid(r).replace(/-/g, '').slice(0, 22),
            room: room.email, roomName: room.name, subject: subj, body: BODIES[Math.floor(r() * BODIES.length)],
            start: stamp(st), end: stamp(en), organizer: { name: org.name, email: org.email },
            attendees: att.concat([{ name: room.name, email: room.email, type: 'resource', status: 'accepted' }]),
            isAllDay: false, type: 'singleInstance', online: r() < 0.5, mine: mine
          });
        }
      }
    });
    // a couple of Teams calls on my own calendar that use no room
    [[1, 11, 0, 30, 'Analytics dashboard walkthrough'], [3, 15, 30, 60, 'IAM access review']].forEach(function (x, k) {
      var d = addDays(today, x[0]);
      while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
      var st = new Date(d.getFullYear(), d.getMonth(), d.getDate(), x[1], x[2]);
      db.events.push({ id: 'AAMkAGI2tm' + k + uuid(r).replace(/-/g, '').slice(0, 22), room: null, roomName: 'Microsoft Teams Meeting',
        subject: x[4], body: 'Join on Teams.', start: stamp(st), end: stamp(addMin(st, x[3])),
        organizer: { name: 'guest' + (7 + k), email: 'guest' + (7 + k) + '@mail.com' },
        attendees: [{ name: ME.name, email: ME.email, type: 'required', status: 'accepted' },
          { name: 'guest' + (12 + k), email: 'guest' + (12 + k) + '@mail.com', type: 'required', status: 'none' }],
        isAllDay: false, type: 'singleInstance', online: true, mine: true });
    });

    // TeamsWork tickets
    var TT = [['Printer on L3 not picking up jobs', 'Urgent', 'Open'], ['Cannot log in to BIPO on new phone', 'Normal', 'In progress'],
      ['Request: second monitor for merchandising desk', 'Low', 'Open'], ['POS terminal 4 at outlet freezing on card payment', 'Urgent', 'In progress'],
      ['Shared drive access for new hire', 'Medium', 'Resolved'], ['Outlook keeps asking for password', 'Important', 'In progress'],
      ['Wi-Fi drops in Meeting Room 2', 'Medium', 'Open'], ['Excel macro for price file stopped working', 'Normal', 'Closed'],
      ['Laptop battery swelling', 'Urgent', 'Resolved'], ['Teams camera not detected', 'Low', 'In progress'],
      ['Add vendor portal to allowed sites', 'Normal', 'Open'], ['Scanner gun not pairing at receiving bay', 'Important', 'Resolved']];
    db.tickets = TT.map(function (t, k) {
      var created = addMin(now, -(k * 530 + 90));
      var req = k % 4 === 0 ? { name: ME.name, email: ME.email } : { name: 'guest' + (3 + k * 2), email: 'guest' + (3 + k * 2) + '@mail.com' };
      var asg = k % 3 === 1 ? { name: ME.name, email: ME.email } : { name: 'guest' + (20 + k), email: 'guest' + (20 + k) + '@mail.com' };
      return { id: uuid(r), ticketNo: 1240 + (TT.length - k), title: t[0], description: 'Reported through the HQ app. ' + t[0] + '.',
        createdOn: stamp(created), status: t[2], priority: t[1], requestor: req, assignee: asg,
        tags: k % 2 ? ['hardware'] : [], createdBy: req, attachments: k === 3 ? [{ src: 'pos-terminal-4.jpg', caption: 'pos-terminal-4.jpg' }] : [] };
    });
    function opts(list) { return list.map(function (t) { return { key: uuid(r), text: t }; }); }
    db.ticketInstance = {
      id: uuid(r), name: 'IT Helpdesk',
      customFields: [
        { id: uuid(r), title: 'Department', type: '5_list', options: opts(['Accounts', 'Administration', 'Customer Relationship Management', 'Human Resource', 'IT', 'Marketing', 'Merchandising', 'Operations Support', 'Prime Online']) },
        { id: uuid(r), title: 'Location', type: '5_list', options: opts(['HQ Defu', 'HQ Changi', 'Joo Koon Distribution Centre', 'Outlet']) },
        { id: uuid(r), title: 'Category', type: '5_list', options: opts(['Hardware', 'Software', 'Network', 'Account & Access', 'Printer', 'Email / Teams', 'POS']) }
      ]
    };

    // Kitchen: menu, orders, likes, departments
    var MEALS = [['Stir-fried Chicken with Preserved Olives', 'meal_stir_fried_chicken.png'], ['Five-spice Fried Pork', 'meal_five_spice_pork.png'],
      ['Korean Fried Chicken Wings', 'meal_korean_chicken.png'], ['Fried Pork Chop with BBQ Sauce', 'meal_pork_chop.png'],
      ['Taiwanese 3-cup Chicken', 'meal_taiwanese_chicken.png'], ['Mala Stir-fried Chicken', 'meal_mala_chicken.png'],
      ['Steamed Minced Pork with Preserved Vegetables', 'meal_steamed_pork.png'], ['Stir-fried Pork Slices with Black Bean Sauce', 'meal_pork_slices.png'],
      ['Nasi Lemak', 'meal_nasi_lemak.png']];
    db.foodItems = MEALS.map(function (m, k) {
      return { id: 30 + k, name: m[0], image: 'assets/' + m[1], likes: 3 + Math.floor(r() * 26), liked: k === 8 || k === 2 };
    });
    db.menus = {};
    var mon = monday(now);
    for (var wk = -2; wk <= 1; wk++) {
      for (var di = 0; di < 5; di++) {
        var md = addDays(mon, wk * 7 + di);
        if (wk === 0 && di === 2) continue;
        var item = db.foodItems[(wk * 5 + di + 20) % db.foodItems.length];
        db.menus[ymd(md)] = { food_item_id: item.id, brown_rice_enabled: (di % 3) ? 1 : 0 };
      }
    }
    db.kitchenDepartments = [[1, 'Accounts'], [2, 'Administration'], [3, 'CRM'], [4, 'HR'], [5, 'IT'], [6, 'Marketing'],
      [7, 'Merchandising'], [8, 'Operations'], [9, 'Prime Online']].map(function (d) { return { id: d[0], name: d[1] }; });
    db.kitchenUserDept = null;
    db.orders = [];
    [[-1, 0, 'White Normal', 1], [-1, 3, 'Brown Less NO PORK', 1], [0, 1, 'White Normal NO VEG', 2]].forEach(function (o) {
      var od = ymd(addDays(mon, o[0] * 7 + o[1]));
      if (db.menus[od]) db.orders.push({ id: next('order'), order_date: od, meal_preference: o[2], order_quantity: o[3] });
    });

    // Intranet memos
    var MEMO = ['Price change: fresh milk and yoghurt', 'Promotion listing for week 40', 'Delisting notice: seasonal biscuits',
      'New supplier terms: frozen seafood', 'Mid-autumn festival mooncake display guide', 'Planogram update: chilled beverages',
      'Stock take schedule for Q4', 'Recall notice: batch 2408 canned corn', 'Updated order cut-off times for DC deliveries',
      'Shelf talker template (Oct)', 'Vendor rebate claim form', 'Deepavali promotion mechanics', 'Weekly top 50 SKUs',
      'Store transfer procedure (revised)', 'Egg supply update', 'Christmas hamper range', 'Loyalty points double-up weekend',
      'Rice price adjustment', 'Hari Raya Haji outlet hours', 'Fresh produce grading guide', 'Year-end stock clearance list',
      'New barcode labels for bakery', 'Supplier visit protocol', 'Markdown guidelines (perishables)'];
    var TYPES = [['application/pdf', '.pdf'], ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'], ['application/vnd.ms-excel', '.xls'], ['image/jpeg', '.jpg']];
    var attId = 9000;
    db.memos = MEMO.map(function (t, k) {
      var created = addMin(now, -(k * 1900 + 45 + Math.floor(r() * 300)));
      var n = 1 + Math.floor(r() * 3), atts = [];
      for (var a = 0; a < n; a++) {
        var ty = TYPES[Math.floor(r() * (a === 0 ? 3 : TYPES.length))];
        atts.push({ id: ++attId, filename: t.replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '') + (a ? '_' + (a + 1) : '') + ty[1],
          file_type: ty[0], file_size: 20000 + Math.floor(r() * 2400000) });
      }
      return { id: 5200 - k, title: t, created_at: sql(created), created_by: 'guest' + (1 + (k * 7) % 15), attachments: atts };
    });

    // Bulletin board
    db.bulletin_posts = [];
    db.bulletin_comments = [];
    db.bulletin_interactions = [];
    function post(o) {
      var p = { id: next('post'), user_id: o.user_id, category: o.category, title: o.title, description: o.description,
        status: o.status || 'open', visibility: o.visibility || 'everyone', audience_department_ids: o.depts || null,
        audience_user_ids: o.users || null, metadata: o.metadata || null, image_path: o.image || null,
        is_pinned: !!o.pinned, expires_at: o.expires ? stamp(o.expires) : null, created_at: stamp(o.created), deleted_at: null };
      db.bulletin_posts.push(p);
      (o.comments || []).forEach(function (c, i) {
        db.bulletin_comments.push({ id: next('comment'), post_id: p.id, user_id: c[0], content: c[1],
          created_at: stamp(addMin(o.created, 25 + i * 70)), deleted_at: null });
      });
      (o.joins || []).forEach(function (u) {
        db.bulletin_interactions.push({ id: next('inter'), post_id: p.id, user_id: u, action_type: o.action, metadata: null });
      });
      return p;
    }
    post({ user_id: 4, category: 'reminder', pinned: true, created: addMin(now, -60 * 26),
      title: 'Fire drill this Thursday, 3pm', description: 'Everyone at Defu HQ please assemble at the car park when the alarm sounds. Lifts will be locked for 20 minutes.',
      metadata: { expiry_dt: null }, comments: [[9, 'Does this include the L1 warehouse team?'], [4, 'Yes, the whole building.']],
      joins: [2, 5, 9, 11], action: 'acknowledged' });
    post({ user_id: 12, category: 'group_buy', created: addMin(now, -95),
      title: 'Bubble tea run for the 3pm slump', description: 'Ordering from the shop downstairs, add yourself on the Grab group order before 2:30pm.',
      metadata: { closing_time: stamp(addMin(now, 200)), collection_point: 'Pantry L3', contact: 'guest12 on Teams', order_link: 'https://food.grab.com/sg/en/' },
      expires: addMin(now, 200), comments: [[6, 'Less sugar for me please'], [21, 'In!']] });
    post({ user_id: 7, category: 'lost_found', created: addMin(now, -60 * 5),
      title: 'Black umbrella left in Meeting Room 1', description: 'Found after the 10am vendor meeting. It is at the reception counter now.',
      metadata: { is_lost: true, location: 'Meeting Room 1', contact_method: 'Teams' } });
    post({ user_id: 18, category: 'lost_found', status: 'resolved', created: addMin(now, -60 * 50),
      title: 'Staff pass found near the lift lobby', description: 'Blue lanyard, handed over to HR.',
      metadata: { is_lost: true, location: 'L2 lift lobby', contact_method: 'Email' }, joins: [15], action: 'claimed' });
    post({ user_id: 3, category: 'reminder', created: addMin(now, -60 * 30), visibility: 'departments', depts: [20, 21],
      title: 'Price file submissions due Friday noon', description: 'Merchandising, please upload next week’s price changes to the shared drive by Friday 12pm so the POS update can go out on Monday.',
      metadata: { expiry_dt: null }, comments: [[14, 'Noted, thanks']] });
    post({ user_id: 1, category: 'reminder', created: addMin(now, -60 * 72), visibility: 'users', users: [5, 9, 16],
      title: 'Laptop returns for the POS pilot', description: 'The three of you from the pilot, please return the test laptops to IT by next Wednesday.',
      metadata: { expiry_dt: null } });
    post({ user_id: 26, category: 'group_buy', created: addMin(now, -60 * 80),
      title: 'Durian group order (Mao Shan Wang)', description: 'Weekend delivery to Defu HQ, minimum 10 boxes. Comment your box count below.',
      metadata: { closing_time: null, collection_point: 'Loading bay', contact: 'guest25', order_link: '' },
      comments: [[3, '2 boxes'], [8, '1 box please'], [30, '1']] });
    var poll = post({ user_id: 9, category: 'poll', created: addMin(now, -60 * 120),
      title: 'Which day for the team lunch?', description: 'Pick one, we will book the restaurant for the most votes.',
      metadata: { options: ['Tuesday', 'Wednesday', 'Friday'], allow_multiple: false, show_results_immediately: true, closing_time: null } });
    post({ user_id: 22, category: 'quick_help', created: addMin(now, -60 * 3),
      title: 'Need two people to move display shelves', description: 'Moving the old gondola shelves from the L2 storeroom to the loading bay. About 20 minutes.',
      metadata: { urgency: 'normal', location: 'L2 storeroom', needed_by: null, people_needed: 2 } });
    db.bulletin_interactions.push({ id: next('inter'), post_id: poll.id, user_id: 5, action_type: 'voted', metadata: { option_index: 2 } });
    db.bulletin_interactions.push({ id: next('inter'), post_id: poll.id, user_id: 9, action_type: 'voted', metadata: { option_index: 2 } });
    db.bulletin_interactions.push({ id: next('inter'), post_id: poll.id, user_id: 11, action_type: 'voted', metadata: { option_index: 0 } });
    return db;
  }

  var db;
  function load() {
    if (db) return db;
    try { db = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || db.v !== 1) { db = buildWorld(); save(); }
    return db;
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function next(t) { db.seq[t] = (db.seq[t] || 100) + 1; return db.seq[t]; }
  function me() { return db.users.filter(function (u) { return u.id === db.session.user_id; })[0]; }
  function dept(id) { return db.departments.filter(function (d) { return d.id === id; })[0] || null; }
  function userById(id) { return db.users.filter(function (u) { return u.id === id; })[0] || null; }
  function isAdmin(u) { return [1, 2].indexOf(u.role_id) !== -1; }

  /* ==== responses ======================================================== */
  function json(status, body) { return { status: status, body: body }; }
  function notFound(path) { return json(404, { message: 'The route api/v1' + path + ' could not be found.' }); }
  function validation(field, msg) {
    return json(422, { message: msg, errors: (function () { var e = {}; e[field] = [msg]; return e; })() });
  }

  /* ==== Microsoft Graph shapes ========================================== */
  function formatDuration(s, e) {
    var minutes = Math.round((parse(e) - parse(s)) / 60000), h = Math.floor(minutes / 60), m = minutes % 60;
    if (h > 0 && m > 0) return h + 'h ' + m + 'm';
    if (h > 0) return h + 'h';
    return m + 'm';
  }
  function hm(s) { var d = parse(s); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function webLink(ev) { return 'https://outlook.office365.com/owa/?itemid=' + encodeURIComponent(ev.id) + '&exvsurl=1&path=/calendar/item'; }
  function joinUrl(ev) { return ev.online ? 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_' + ev.id.slice(-24) + '%40thread.v2/0' : null; }
  function graphAttendees(ev) {
    return ev.attendees.map(function (a) { return { name: a.name, email: a.email, type: a.type, status: a.status || 'none' }; });
  }
  // MicrosoftGraphService::getCalendar()
  function calendarItem(ev) {
    var att = graphAttendees(ev);
    return { id: ev.id, title: ev.subject, body: ev.body.replace(/<[^>]+>/g, '').slice(0, 255),
      start_time: ev.start + '.0000000', end_time: ev.end + '.0000000', location: ev.roomName,
      organizer_name: ev.organizer.name, organizer_email: ev.organizer.email,
      attendees: att, attendee_emails: att.map(function (a) { return a.email; }).filter(Boolean),
      online_meeting_url: null, web_link: webLink(ev), time: hm(ev.start), duration: formatDuration(ev.start, ev.end) };
  }
  function cleanHtml(html) { return '<div>' + String(html || '').replace(/\n/g, '<br>') + '</div>'; }
  // MicrosoftGraphService::showMeetingsByRoom()
  function roomItem(ev) {
    var att = graphAttendees(ev);
    return { id: ev.id, title: ev.subject, body: cleanHtml(ev.body), start_time: ev.start + '.0000000', end_time: ev.end + '.0000000',
      location: ev.roomName, organizer_name: ev.organizer.name, organizer_email: ev.organizer.email,
      attendees: att, attendee_emails: att.map(function (a) { return a.email; }).filter(Boolean),
      online_meeting_url: joinUrl(ev), web_link: webLink(ev), is_all_day: !!ev.isAllDay,
      is_recurring: ev.type !== 'singleInstance', time: hm(ev.start), duration: formatDuration(ev.start, ev.end) };
  }
  function buildEventBody(desc, agenda) {
    var body = String(desc || ''), a = String(agenda || '').trim();
    if (a !== '') {
      var esc = a.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      body += '<div data-hq="agenda"><br><hr><strong>Agenda</strong><br>' + esc.replace(/\n/g, '<br />\n') + '</div>';
    }
    return body;
  }
  function roomEvents(email) { return db.events.filter(function (e) { return e.room && e.room.toLowerCase() === email.toLowerCase(); }); }

  // MicrosoftGraphController::findRoomConflict()
  function findRoomConflict(email, start, end, exclude) {
    var hit = db.room_bookings.filter(function (b) {
      return b.room_email === email.toLowerCase() && parse(b.start_time) < end && parse(b.end_time) > start && (!exclude || b.id !== exclude.id);
    })[0];
    if (hit) return { organizer_name: hit.organizer_name, start_time: hit.start_time, end_time: hit.end_time };
    var ev = roomEvents(email).filter(function (m) {
      if (exclude && exclude.graph_event_id && (m.id === exclude.graph_event_id || m.seriesId === exclude.graph_event_id)) return false;
      return parse(m.start) < end && parse(m.end) > start;
    })[0];
    return ev ? { organizer_name: ev.organizer.name, start_time: ev.start, end_time: ev.end } : null;
  }
  function fmt12(d) { var h = d.getHours() % 12 || 12; return h + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM'); }
  function conflictMessage(c) {
    var who = String(c.organizer_name || '').trim() || 'someone', s = parse(c.start_time), e = parse(c.end_time);
    var sameDay = ymd(s) === ymd(new Date());
    var D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var range = sameDay ? fmt12(s) + ' – ' + fmt12(e) : D[s.getDay()] + ' ' + s.getDate() + ' ' + M[s.getMonth()] + ', ' + fmt12(s) + ' – ' + fmt12(e);
    return 'This room is already booked by ' + who + ' from ' + range + '.';
  }

  /* ==== routes =========================================================== */
  var routes = [];
  function on(method, pattern, fn, open) { routes.push({ method: method, re: new RegExp('^' + pattern + '$'), fn: fn, open: !!open }); }

  // ---- auth
  on('POST', '/auth/login', function (req) {
    var b = req.body || {};
    if (!b.username) return validation('username', 'The username field is required.');
    if (!b.password) return validation('password', 'The password field is required.');
    // IAM public-api.php?action=login accepts the demo account for any password.
    return signIn(false);
  }, true);
  on('POST', '/auth/microsoft/login', function () { return signIn(true); }, true);
  function signIn(isMicrosoft) {
    var u = db.users[0];
    u.is_microsoft = isMicrosoft;
    db.session = { user_id: u.id, token: 'hq.' + Math.random().toString(36).slice(2), refresh: Math.random().toString(36).slice(2), is_microsoft: isMicrosoft };
    save();
    return json(200, { success: true, access_token: db.session.token, refresh_token: db.session.refresh });
  }
  on('POST', '/auth/refresh', function () { return json(401, { success: false, message: 'Invalid token provided.' }); }, true);
  on('POST', '/auth/logout', function () { db.session = null; save(); return json(200, { success: true, message: 'Successful logout.' }); }, true);

  // ---- user
  on('GET', '/me', function () {
    var u = me(), d = dept(u.department_id);
    return json(200, { success: true, data: { id: u.id, username: u.username, email: u.email, role_id: u.role_id,
      department_code: d ? d.code : '', is_microsoft: !!db.session.is_microsoft, profile_picture: null } });
  });
  // ---- FCM
  on('POST', '/fcm', function () { return json(200, { success: true }); });
  on('DELETE', '/fcm', function () { return json(200, { success: true }); });

  // ---- Microsoft Graph
  function needsGraph() { return !db.session.is_microsoft; }
  on('GET', '/microsoft/meeting-rooms', function () {
    if (needsGraph()) return json(500, { success: false, message: 'Could not fetch meeting rooms' });
    var local = {};
    db.meeting_room_images.forEach(function (r) { local[r.room_email] = r; });
    var merged = db.graphRooms.map(function (r) {
      var l = local[r.email];
      return { name: (l && l.name_override) || r.name, email: r.email, image_url: l && l.image_path ? l.image_path : null, location_id: l ? l.location_id : null };
    });
    var graphEmails = db.graphRooms.map(function (r) { return r.email; });
    db.meeting_room_images.forEach(function (l) {
      if (graphEmails.indexOf(l.room_email) !== -1) return;
      merged.push({ name: l.name_override || l.room_name, email: l.room_email, image_url: l.image_path || null, location_id: l.location_id });
    });
    return json(200, { success: true, data: merged });
  });
  on('GET', '/microsoft/me/calendar', function () {
    if (needsGraph()) return json(500, { success: false, message: 'Could not fetch calendar' });
    var from = startOfDay(new Date()), to = addDays(from, 183), u = me();
    var list = db.events.filter(function (e) {
      var s = parse(e.start);
      if (s < from || s > to) return false;
      return e.organizer.email === u.email || e.attendees.some(function (a) { return a.email === u.email; });
    }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    return json(200, { success: true, data: list.map(calendarItem) });
  });
  on('GET', '/microsoft/me/event/([^/?]+)', function (req, m) {
    var ev = db.events.filter(function (e) { return e.id === decodeURIComponent(m[1]); })[0];
    if (!ev) return json(500, { success: false, message: 'Could not fetch meeting details' });
    var att = graphAttendees(ev);
    return json(200, { success: true, data: { id: ev.id, title: ev.subject, body: cleanHtml(ev.body),
      start_time: ev.start + '.0000000', end_time: ev.end + '.0000000', location: ev.roomName,
      organizer_name: ev.organizer.name, organizer_email: ev.organizer.email, attendees: att,
      attendee_emails: att.map(function (a) { return a.email; }), is_online_meeting: ev.online,
      online_meeting_url: null, web_link: webLink(ev), is_all_day: !!ev.isAllDay, is_cancelled: false,
      sensitivity: 'normal', status: 'busy', created_at: null, last_modified_at: null } });
  });
  on('GET', '/microsoft/me/people', function (req) {
    var q = String(req.query.search || '').trim().toLowerCase(), cursor = req.query.cursor || '';
    var list = db.people.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) !== -1 || p.email.indexOf(q) !== -1; });
    if (q) return json(200, { data: list.slice(0, 50), cursor: null });
    var off = cursor ? 50 : 0;
    return json(200, { data: list.slice(off, off + 50), cursor: !cursor && list.length > 50 ? uuid() : null });
  });
  on('POST', '/microsoft/me/findMeetingTimes', function (req) {
    var b = req.body || {};
    if (!b.attendees || !b.startTime || !b.endTime) return validation('attendees', 'The attendees field is required.');
    var s = parse(b.startTime), e = parse(b.endTime), len = Math.max(30, Math.round((e - s) / 60000));
    if (len <= 0) len = 60;
    var day = startOfDay(s), rooms = b.attendees.map(function (a) { return a.address; });
    var busy = db.events.filter(function (ev) {
      return ymd(parse(ev.start)) === ymd(day) && (rooms.indexOf(ev.room) !== -1 ||
        ev.attendees.some(function (a) { return rooms.indexOf(a.email) !== -1 && a.type !== 'resource'; }));
    });
    var out = [], t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 30), endDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18, 0);
    if (ymd(day) === ymd(new Date())) { var n = new Date(); while (t < n) t = addMin(t, 30); }
    for (; addMin(t, len) <= endDay && out.length < 5; t = addMin(t, 30)) {
      var te = addMin(t, len);
      if (busy.some(function (ev) { return parse(ev.start) < te && parse(ev.end) > t; })) continue;
      out.push({ start: sql(t), end: sql(te) });
    }
    return json(200, { success: true, data: out });
  });
  on('POST', '/microsoft/me/events', function (req) {
    var b = req.body || {}, u = me();
    var required = ['title', 'description', 'meetingRoomName', 'attendees', 'startTime', 'endTime'];
    for (var i = 0; i < required.length; i++) {
      var v = b[required[i]];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) {
        var f = required[i].replace(/([A-Z])/g, ' $1').toLowerCase();
        return validation(required[i], 'The ' + f + ' field is required.');
      }
    }
    var start = parse(b.startTime), end = parse(b.endTime), room = b.meetingRoomEmail;
    if (room) {
      var c = findRoomConflict(room, start, end);
      if (c) return json(409, { success: false, message: conflictMessage(c) });
    }
    var atts = b.attendees.map(function (a) { return { name: a.name || '', email: a.address || '', type: a.type === 'optional' ? 'optional' : 'required', status: 'none' }; });
    atts.push({ name: b.meetingRoomName, email: room, type: 'resource', status: 'accepted' });
    var body = buildEventBody(b.description, b.agenda).replace(/<div data-hq="agenda">[\s\S]*<\/div>$/, '');
    var seriesId = 'AAMkAGI2hq' + uuid().replace(/-/g, '').slice(0, 22);
    var starts = [start];
    if (b.isAllDay) { start = startOfDay(start); end = addDays(startOfDay(end), 1); starts = [start]; }
    if (b.isRecurring) {
      starts = [];
      var unit = b.recurringUnit || 'week', every = +b.recurringInterval || 1, until = addDays(startOfDay(parse(b.recurringUntil)), 1);
      var days = (b.recurringDays || []).map(Number), cur = new Date(start.getTime());
      if (unit === 'week') {
        var wkStart = addDays(startOfDay(start), -((start.getDay() + 6) % 7));
        for (var w = 0; w < 200 && starts.length < 100; w++) {
          for (var k = 1; k <= 7; k++) {
            if (days.indexOf(k) === -1) continue;
            var cand = addDays(wkStart, w * 7 * every + k - 1);
            cand.setHours(start.getHours(), start.getMinutes(), 0, 0);
            if (cand < start || cand >= until) continue;
            starts.push(cand);
          }
          if (addDays(wkStart, w * 7 * every) >= until) break;
        }
      } else {
        while (cur < until && starts.length < 100) {
          starts.push(new Date(cur.getTime()));
          if (unit === 'day') cur = addDays(cur, every); else { cur = new Date(cur.getTime()); cur.setMonth(cur.getMonth() + every); }
        }
      }
    }
    var len = end - start;
    starts.forEach(function (s, k) {
      db.events.push({ id: k === 0 && !b.isRecurring ? seriesId : seriesId + '_' + k, seriesId: b.isRecurring ? seriesId : null,
        room: room || null, roomName: b.meetingRoomName, subject: b.title, body: body, start: stamp(s), end: stamp(new Date(s.getTime() + len)),
        organizer: { name: u.name, email: u.email }, attendees: clone(atts), isAllDay: !!b.isAllDay,
        type: b.isRecurring ? 'occurrence' : 'singleInstance', online: !!b.isTeamsMeeting, mine: true });
    });
    var link = b.isTeamsMeeting ? 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_' + seriesId.slice(-24) + '%40thread.v2/0' : null;
    if (room) {
      db.room_bookings.push({ id: next('booking'), room_email: room.toLowerCase(), room_name: b.meetingRoomName, subject: b.title,
        body: b.description, agenda: b.agenda || null, organizer_name: u.name, organizer_email: u.email,
        start_time: stamp(parse(b.startTime)), end_time: stamp(parse(b.endTime)), attendees: b.attendees, teams_link: link,
        graph_event_id: seriesId, is_all_day: !!b.isAllDay, is_recurring: !!b.isRecurring, created_by: u.id });
    }
    save();
    return json(200, { success: true, link: link });
  });
  function bookingEvents(bk) {
    return db.events.filter(function (e) { return e.id === bk.graph_event_id || e.seriesId === bk.graph_event_id; });
  }
  on('PATCH', '/microsoft/me/events/(\\d+)', function (req, m) {
    var b = req.body || {}, u = me(), bk = db.room_bookings.filter(function (x) { return x.id === +m[1]; })[0];
    if (!bk) return json(404, { success: false, message: 'Booking not found' });
    if (bk.created_by !== u.id) return json(403, { success: false, message: 'You can only edit meetings you booked' });
    if ('title' in b && !String(b.title || '').trim()) return validation('title', 'The title field is required.');
    var changingTime = 'startTime' in b || 'endTime' in b || 'isAllDay' in b, isAllDay = !!b.isAllDay;
    var ns = parse(b.startTime || bk.start_time), ne = parse(b.endTime || bk.end_time);
    if (changingTime && bk.is_recurring) {
      var dur = (ne - ns) / 60000, anchor = parse(bk.start_time);
      anchor.setHours(ns.getHours(), ns.getMinutes(), 0, 0);
      ns = anchor; ne = addMin(anchor, dur);
    }
    if (changingTime && !bk.is_recurring && bk.room_email) {
      var c = findRoomConflict(bk.room_email, isAllDay ? startOfDay(ns) : ns, isAllDay ? addDays(startOfDay(ne), 1) : ne, bk);
      if (c) return json(409, { success: false, message: conflictMessage(c) });
    }
    var evs = bookingEvents(bk);
    evs.forEach(function (e) {
      if ('title' in b) e.subject = b.title;
      if ('description' in b || 'agenda' in b) e.body = String('description' in b ? (b.description || '') : (bk.body || ''));
      if ('attendees' in b) {
        e.attendees = b.attendees.map(function (a) { return { name: a.name || '', email: a.address || '', type: a.type === 'optional' ? 'optional' : 'required', status: 'none' }; })
          .concat([{ name: bk.room_name, email: bk.room_email, type: 'resource', status: 'accepted' }]);
      }
      if (changingTime) {
        var s0 = parse(e.start), len = ne - ns;
        if (bk.is_recurring) { s0.setHours(ns.getHours(), ns.getMinutes(), 0, 0); }
        else s0 = isAllDay ? startOfDay(ns) : ns;
        e.start = stamp(s0);
        e.end = stamp(isAllDay && !bk.is_recurring ? addDays(startOfDay(ne), 1) : new Date(s0.getTime() + len));
        e.isAllDay = isAllDay;
      }
    });
    if ('agenda' in b) bk.agenda = b.agenda;
    if ('title' in b) bk.subject = b.title;
    if ('description' in b) bk.body = b.description || '';
    if ('attendees' in b) bk.attendees = b.attendees;
    if (changingTime) { bk.start_time = stamp(ns); bk.end_time = stamp(ne); bk.is_all_day = isAllDay; }
    save();
    return json(200, { success: true });
  });
  on('DELETE', '/microsoft/me/events/(\\d+)', function (req, m) {
    var u = me(), bk = db.room_bookings.filter(function (x) { return x.id === +m[1]; })[0];
    if (!bk) return json(404, { success: false, message: 'Booking not found' });
    if (bk.created_by !== u.id) return json(403, { success: false, message: 'You can only cancel meetings you booked' });
    var ids = bookingEvents(bk).map(function (e) { return e.id; });
    db.events = db.events.filter(function (e) { return ids.indexOf(e.id) === -1; });
    db.room_bookings = db.room_bookings.filter(function (x) { return x !== bk; });
    save();
    return json(200, { success: true, scope: 'series' });
  });
  on('GET', '/microsoft/rooms/([^/?]+)/calendar', function (req, m) {
    var email = decodeURIComponent(m[1]), s = parse(req.query.startDate), e = parse(req.query.endDate);
    if (!req.query.startDate) return validation('startDate', 'The start date field is required.');
    var ex = roomEvents(email).filter(function (ev) { return parse(ev.end) > s && parse(ev.start) < e; }).map(roomItem);
    ex.sort(function (a, b) { return a.start_time < b.start_time ? -1 : 1; });
    var u = me(), own = db.room_bookings.filter(function (b) { return b.room_email === email.toLowerCase() && b.created_by === u.id && b.graph_event_id; });
    return json(200, { success: true, data: ex.map(function (item) {
      var subject = String(item.title || '').toLowerCase(), key = item.start_time.slice(0, 16) + '|' + subject;
      var bk = own.filter(function (b) { return b.start_time.slice(0, 16) + '|' + String(b.subject || '').toLowerCase() === key; })[0] ||
        (item.is_recurring ? own.filter(function (b) { return b.is_recurring && String(b.subject || '').toLowerCase() === subject; })[0] : null);
      item.can_edit = !!bk;
      item.booking_id = bk ? bk.id : null;
      item.agenda = bk ? bk.agenda : (item.agenda || null);
      return item;
    }) });
  });

  // ---- meeting rooms (MeetingRoomController)
  function requireAdmin() { return isAdmin(me()) ? null : json(403, { success: false, message: 'Unauthorized' }); }
  function roomRow(email) { return db.meeting_room_images.filter(function (r) { return r.room_email === email; })[0]; }
  on('GET', '/meeting-rooms/locations', function () {
    return json(200, { success: true, data: db.meeting_room_locations.slice().sort(function (a, b) { return a.sort_order - b.sort_order || (a.name < b.name ? -1 : 1); })
      .map(function (l) { return { id: l.id, name: l.name }; }) });
  });
  on('POST', '/meeting-rooms', function (req) {
    var err = requireAdmin(); if (err) return err;
    var b = req.body || {};
    if (!b.name) return validation('name', 'The name field is required.');
    if (!b.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return validation('email', 'The email field must be a valid email address.');
    if (roomRow(b.email)) return validation('email', 'The email has already been taken.');
    db.meeting_room_images.push({ room_email: b.email, room_name: b.name, name_override: null, location_id: b.location_id || null, image_path: b.image || null });
    save();
    return json(201, { success: true, data: { name: b.name, email: b.email, image_url: b.image || null } });
  });
  on('PATCH', '/meeting-rooms/(.+)/image', function (req, m) {
    var err = requireAdmin(); if (err) return err;
    var email = decodeURIComponent(m[1]), r = roomRow(email), img = (req.body || {}).image;
    if (!img) return validation('image', 'The image field is required.');
    if (r) r.image_path = img; else db.meeting_room_images.push({ room_email: email, room_name: email, name_override: null, location_id: null, image_path: img });
    save();
    return json(200, { success: true, image_url: img });
  });
  on('PATCH', '/meeting-rooms/(.+)/name', function (req, m) {
    var err = requireAdmin(); if (err) return err;
    var email = decodeURIComponent(m[1]), r = roomRow(email), name = String((req.body || {}).name || '').trim();
    if (!name) return validation('name', 'The name field is required.');
    if (r) r.name_override = name; else db.meeting_room_images.push({ room_email: email, room_name: email, name_override: name, location_id: null, image_path: null });
    save();
    return json(200, { success: true, name: name });
  });
  on('PATCH', '/meeting-rooms/(.+)/location', function (req, m) {
    var err = requireAdmin(); if (err) return err;
    var email = decodeURIComponent(m[1]), r = roomRow(email), loc = (req.body || {}).location_id;
    if (r) r.location_id = loc; else db.meeting_room_images.push({ room_email: email, room_name: email, name_override: null, location_id: loc, image_path: null });
    save();
    return json(200, { success: true, location_id: loc });
  });
  on('DELETE', '/meeting-rooms/(.+)', function (req, m) {
    var err = requireAdmin(); if (err) return err;
    var email = decodeURIComponent(m[1]), r = roomRow(email);
    if (!r) return json(404, { success: false, message: 'Room not found' });
    db.meeting_room_images = db.meeting_room_images.filter(function (x) { return x !== r; });
    save();
    return json(200, { success: true });
  });

  // ---- TeamsWork (TeamsWorkController maps the raw items)
  function ticketOut(t, withDesc) {
    var o = { id: 'SER-' + t.ticketNo, teamsworkId: t.id, title: t.title };
    if (withDesc) o.description = t.description;
    o.createdAt = t.createdOn; o.status = t.status; o.isResolved = ['Resolved', 'Closed'].indexOf(t.status) !== -1; o.isNew = false;
    o.requestor = t.requestor.name; o.requestorEmail = t.requestor.email; o.assignee = t.assignee.name; o.assigneeEmail = t.assignee.email;
    o.priority = t.priority || 'Normal'; o.tag = (t.tags || []).join(', '); o.createdBy = t.createdBy.name;
    return o;
  }
  function ticket(id) { return db.tickets.filter(function (t) { return t.id === id; })[0]; }
  on('GET', '/teamswork/instance', function () { return json(200, { success: true, instance: db.ticketInstance }); });
  on('GET', '/teamswork/tickets', function () { return json(200, { success: true, tickets: db.tickets.map(function (t) { return ticketOut(t); }) }); });
  on('GET', '/teamswork/tickets/([^/]+)', function (req, m) {
    var t = ticket(m[1]);
    return t ? json(200, { success: true, ticket: ticketOut(t, true) }) : json(404, { success: false, error: 'Ticket not found' });
  });
  on('GET', '/teamswork/tickets/([^/]+)/attachments', function (req, m) {
    var t = ticket(m[1]);
    return json(200, { success: true, attachments: t ? t.attachments : [] });
  });
  on('PATCH', '/teamswork/tickets/([^/]+)/resolve', function (req, m) {
    var t = ticket(m[1]);
    if (!t) return json(404, { success: false, error: 'Ticket not found' });
    t.status = 'Resolved'; save();
    return json(200, { success: true });
  });
  on('POST', '/teamswork/tickets', function (req) {
    var b = req.body || {};
    if (!b.title) return json(400, { success: false, error: 'Title is required' });
    var no = db.tickets.reduce(function (a, t) { return Math.max(a, t.ticketNo); }, 0) + 1;
    var t = { id: uuid(), ticketNo: no, title: b.title, description: b.description || '', createdOn: stamp(new Date()), status: 'Open',
      priority: b.priority || '', requestor: b.requestor, assignee: b.assignee, tags: b.tags || [], createdBy: b.requestor, attachments: [] };
    db.tickets.unshift(t); save();
    var out = ticketOut(t); out.isNew = true; out.isResolved = false; out.status = 'Open';
    return json(200, { success: true, ticket: out });
  });

  // ---- kitchen (KitchenController proxies the kitchen service)
  function food(id) { return db.foodItems.filter(function (f) { return f.id === id; })[0]; }
  on('POST', '/kitchen/sync-user', function () { return json(200, { success: true }); });
  on('GET', '/kitchen/departments', function () { return json(200, { success: true, data: db.kitchenDepartments }); });
  on('GET', '/kitchen/department', function () {
    var d = db.kitchenUserDept;
    return json(200, { success: true, data: d ? { department_id: d, department_name: db.kitchenDepartments.filter(function (x) { return x.id === d; })[0].name } : null });
  });
  on('POST', '/kitchen/department', function (req) {
    var id = +(req.body || {}).department_id;
    if (!id) return validation('department_id', 'The department id field is required.');
    db.kitchenUserDept = id; save();
    return json(200, { success: true });
  });
  on('GET', '/kitchen/menu/weekly', function (req) {
    var off = parseInt(req.query.week_offset || '0', 10) || 0, mon = addDays(monday(new Date()), off * 7), menu = [];
    for (var i = 0; i < 5; i++) {
      var d = ymd(addDays(mon, i)), m = db.menus[d];
      if (!m) continue;
      var f = food(m.food_item_id);
      menu.push({ order_date: d, food_item_id: f.id, name: f.name, image_base64: f.image, brown_rice_enabled: m.brown_rice_enabled });
    }
    return json(200, { success: true, data: { menu: menu, cutoff: { time: '10:00', display: '10:00 AM' } } });
  });
  on('GET', '/kitchen/orders', function () {
    return json(200, { success: true, data: db.orders.map(function (o) {
      var m = db.menus[o.order_date], f = m ? food(m.food_item_id) : null;
      return { id: o.id, order_date: o.order_date, meal_name: f ? f.name : '', image_base64: f ? f.image : '',
        meal_preference: o.meal_preference, order_quantity: o.order_quantity };
    }) });
  });
  function pastCutoff(date) {
    var n = new Date(), d = parse(date);
    if (startOfDay(d) < startOfDay(n)) return true;
    return ymd(d) === ymd(n) && n.getHours() >= 10;
  }
  on('POST', '/kitchen/orders', function (req) {
    var b = req.body || {};
    if (!db.menus[b.date]) return json(400, { success: false, error: 'No menu for this date' });
    if (pastCutoff(b.date)) return json(400, { success: false, error: 'Ordering for this date is closed (past the cut-off).' });
    var o = { id: next('order'), order_date: b.date, meal_preference: b.meal_preference, order_quantity: +b.quantity || 1 };
    db.orders.push(o); save();
    return json(200, { success: true, data: { id: o.id } });
  });
  on('PATCH', '/kitchen/orders/(\\d+)', function (req, m) {
    var o = db.orders.filter(function (x) { return x.id === +m[1]; })[0], b = req.body || {};
    if (!o) return json(404, { success: false, error: 'Order not found' });
    if (pastCutoff(o.order_date)) return json(400, { success: false, error: 'Ordering for this date is closed (past the cut-off).' });
    o.meal_preference = b.meal_preference; o.order_quantity = +b.quantity || o.order_quantity; save();
    return json(200, { success: true });
  });
  on('DELETE', '/kitchen/orders/(\\d+)', function (req, m) {
    var o = db.orders.filter(function (x) { return x.id === +m[1]; })[0];
    if (!o) return json(404, { success: false, error: 'Order not found' });
    if (pastCutoff(o.order_date)) return json(400, { success: false, error: 'Ordering for this date is closed (past the cut-off).' });
    db.orders = db.orders.filter(function (x) { return x !== o; }); save();
    return json(200, { success: true });
  });
  on('GET', '/kitchen/food-items/likes', function () {
    return json(200, { success: true, data: db.foodItems.map(function (f) {
      return { food_item_id: f.id, food_item_name: f.name, image: f.image, total_likes: f.likes, is_liked: f.liked };
    }) });
  });
  on('POST', '/kitchen/food-items/(\\d+)/likes', function (req, m) {
    var f = food(+m[1]); if (!f) return json(404, { success: false, error: 'Food item not found' });
    if (!f.liked) { f.liked = true; f.likes++; save(); }
    return json(200, { success: true, message: 'Liked' });
  });
  on('DELETE', '/kitchen/food-items/(\\d+)/likes', function (req, m) {
    var f = food(+m[1]); if (!f) return json(404, { success: false, error: 'Food item not found' });
    if (f.liked) { f.liked = false; f.likes--; save(); }
    return json(200, { success: true, message: 'Like removed' });
  });

  // ---- intranet memos (MemoController + MemoService::getMemos, paginate(10))
  on('GET', '/intranet/memos', function (req) {
    var q = String(req.query.search || '').toLowerCase(), page = Math.max(1, parseInt(req.query.page || '1', 10) || 1), per = 10;
    var list = db.memos.filter(function (m) { return !q || m.title.toLowerCase().indexOf(q) !== -1; })
      .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    var last = Math.max(1, Math.ceil(list.length / per)), data = list.slice((page - 1) * per, page * per);
    var path = '/api/v1/intranet/memos';
    return json(200, { success: true, current_page: page, data: clone(data), first_page_url: path + '?page=1',
      from: data.length ? (page - 1) * per + 1 : null, last_page: last, last_page_url: path + '?page=' + last, links: [],
      next_page_url: page < last ? path + '?page=' + (page + 1) : null, path: path, per_page: per,
      prev_page_url: page > 1 ? path + '?page=' + (page - 1) : null, to: data.length ? (page - 1) * per + data.length : null, total: list.length });
  });

  // ---- bulletin board (BulletinController + BulletinService)
  var CATEGORY_ACTIONS = { group_buy: 'joined', lost_found: 'claimed', quick_help: 'helped', poll: 'voted', reminder: 'acknowledged' };
  function visiblePosts(u) {
    return db.bulletin_posts.filter(function (p) {
      if (p.deleted_at) return false;
      if (isAdmin(u)) return true;
      if (p.visibility === 'everyone' || p.user_id === u.id) return true;
      if (p.visibility === 'departments') return (p.audience_department_ids || []).indexOf(u.department_id) !== -1;
      if (p.visibility === 'users') return (p.audience_user_ids || []).indexOf(u.id) !== -1;
      return false;
    });
  }
  function formatPost(p, u) {
    var d = (p.audience_department_ids || []).map(Number), us = (p.audience_user_ids || []).map(Number);
    return { id: p.id, category: p.category, title: p.title, description: p.description, status: p.status,
      visibility: p.visibility || 'everyone', audience_department_ids: d, audience_user_ids: us,
      audience_department_names: p.visibility === 'departments' ? d.map(function (id) { var x = dept(id); return x && x.name; }).filter(Boolean) : [],
      audience_user_names: p.visibility === 'users' ? us.map(function (id) { var x = userById(id); return x && x.name; }).filter(Boolean).sort() : [],
      metadata: p.metadata, image_url: p.image_path || null, is_pinned: !!p.is_pinned,
      expires_at: p.expires_at ? iso8601(parse(p.expires_at)) : null, created_at: iso8601(parse(p.created_at)),
      author_id: p.user_id, author_name: (userById(p.user_id) || {}).name || '',
      comment_count: db.bulletin_comments.filter(function (c) { return c.post_id === p.id && !c.deleted_at; }).length,
      is_owner: p.user_id === u.id, is_admin: isAdmin(u) };
  }
  function postById(id) { return db.bulletin_posts.filter(function (p) { return p.id === id && !p.deleted_at; })[0]; }
  function commentOut(c) {
    var u = userById(c.user_id);
    return { id: c.id, post_id: c.post_id, user_id: c.user_id, content: c.content, created_at: iso8601(parse(c.created_at)),
      updated_at: iso8601(parse(c.created_at)), deleted_at: null, user: u ? { id: u.id, name: u.name } : null };
  }
  function checkPost(b, partial) {
    if (!partial && ['group_buy', 'lost_found', 'quick_help', 'reminder', 'poll'].indexOf(b.category) === -1) return validation('category', 'The selected category is invalid.');
    if ((!partial || 'title' in b) && !String(b.title || '').trim()) return validation('title', 'The title field is required.');
    if ((!partial || 'description' in b) && !String(b.description || '').trim()) return validation('description', 'The description field is required.');
    return null;
  }
  function audience(vis, b) {
    if (vis === 'departments') { var d = (b.audience_department_ids || []).map(Number); return [d.length ? d : null, null]; }
    if (vis === 'users') { var u = (b.audience_user_ids || []).map(Number); return [null, u.length ? u : null]; }
    return [null, null];
  }
  on('GET', '/bulletin/posts', function (req) {
    var u = me(), now = new Date(), cat = req.query.category || '', page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    var list = visiblePosts(u).filter(function (p) { return (!p.expires_at || parse(p.expires_at) > now) && (!cat || p.category === cat); })
      .sort(function (a, b) { return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || (a.created_at < b.created_at ? 1 : -1); });
    var last = Math.max(1, Math.ceil(list.length / 15));
    return json(200, { success: true, data: { posts: list.slice((page - 1) * 15, page * 15).map(function (p) { return formatPost(p, u); }),
      current_page: page, last_page: last, total: list.length } });
  });
  on('POST', '/bulletin/posts', function (req) {
    var b = req.body || {}, u = me(), err = checkPost(b);
    if (err) return err;
    var meta = b.metadata || null;
    if (b.category === 'group_buy' && meta) delete meta.price_estimate;
    var vis = b.visibility || 'everyone', aud = audience(vis, b);
    var p = { id: next('post'), user_id: u.id, category: b.category, title: b.title, description: b.description, status: 'open',
      visibility: vis, audience_department_ids: aud[0], audience_user_ids: aud[1], metadata: meta, image_path: b.image_base64 || null,
      is_pinned: false, expires_at: b.expires_at || null, created_at: stamp(new Date()), deleted_at: null };
    db.bulletin_posts.push(p); save();
    return json(201, { success: true, data: formatPost(p, u) });
  });
  on('GET', '/bulletin/posts/(\\d+)', function (req, m) {
    var u = me(), p = postById(+m[1]);
    if (!p || visiblePosts(u).indexOf(p) === -1) return json(404, { success: false, message: 'Post not found' });
    var counts = {}, poll = null, mine = null;
    db.bulletin_interactions.filter(function (i) { return i.post_id === p.id; }).forEach(function (i) {
      counts[i.action_type] = (counts[i.action_type] || 0) + 1;
      if (i.user_id === u.id && !mine) mine = i;
    });
    if (p.category === 'poll') {
      poll = {};
      db.bulletin_interactions.filter(function (i) { return i.post_id === p.id && i.action_type === 'voted'; }).forEach(function (i) {
        var k = i.metadata && i.metadata.option_index; if (k === undefined || k === null) return;
        poll[String(k)] = (poll[String(k)] || 0) + 1;
      });
    }
    var comments = db.bulletin_comments.filter(function (c) { return c.post_id === p.id && !c.deleted_at; })
      .sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    return json(200, { success: true, data: { post: formatPost(p, u), comments: comments.slice(0, 20).map(commentOut),
      comments_page: 1, comments_last_page: Math.max(1, Math.ceil(comments.length / 20)),
      interaction_counts: Object.keys(counts).length ? counts : [], poll_vote_counts: poll, user_interaction: mine ? clone(mine) : null } });
  });
  on('PATCH', '/bulletin/posts/(\\d+)', function (req, m) {
    var u = me(), p = postById(+m[1]), b = req.body || {};
    if (!p) return json(500, { success: false, message: 'Could not update post' });
    if (p.user_id !== u.id && !isAdmin(u)) return json(403, { success: false, message: 'Unauthorized' });
    var err = checkPost(b, true); if (err) return err;
    ['title', 'description', 'metadata', 'expires_at'].forEach(function (k) { if (k in b) p[k] = b[k]; });
    if ('visibility' in b) { var aud = audience(b.visibility, b); p.visibility = b.visibility; p.audience_department_ids = aud[0]; p.audience_user_ids = aud[1]; }
    if (b.image_base64) p.image_path = b.image_base64;
    save();
    return json(200, { success: true, data: formatPost(p, u) });
  });
  on('DELETE', '/bulletin/posts/(\\d+)', function (req, m) {
    var u = me(), p = postById(+m[1]);
    if (!p) return json(500, { success: false, message: 'Could not delete post' });
    if (p.user_id !== u.id && !isAdmin(u)) return json(403, { success: false, message: 'Unauthorized' });
    p.deleted_at = stamp(new Date()); save();
    return json(200, { success: true });
  });
  on('POST', '/bulletin/posts/(\\d+)/comments', function (req, m) {
    var u = me(), p = postById(+m[1]), content = String((req.body || {}).content || '');
    if (!content) return validation('content', 'The content field is required.');
    if (content.length > 1000) return validation('content', 'The content field must not be greater than 1000 characters.');
    if (!p) return json(500, { success: false, message: 'Could not add comment' });
    var c = { id: next('comment'), post_id: p.id, user_id: u.id, content: content, created_at: stamp(new Date()), deleted_at: null };
    db.bulletin_comments.push(c); save();
    return json(201, { success: true, data: commentOut(c) });
  });
  on('DELETE', '/bulletin/posts/(\\d+)/comments/(\\d+)', function (req, m) {
    var u = me(), c = db.bulletin_comments.filter(function (x) { return x.id === +m[2] && !x.deleted_at; })[0];
    if (!c) return json(500, { success: false, message: 'Could not delete comment' });
    if (c.user_id !== u.id && !isAdmin(u)) return json(403, { success: false, message: 'Unauthorized' });
    c.deleted_at = stamp(new Date()); save();
    return json(200, { success: true });
  });
  on('POST', '/bulletin/posts/(\\d+)/interact', function (req, m) {
    var u = me(), p = postById(+m[1]), b = req.body || {};
    if (['joined', 'claimed', 'helped', 'voted', 'acknowledged'].indexOf(b.action_type) === -1) return validation('action_type', 'The selected action type is invalid.');
    if (!p) return json(500, { success: false, message: 'Could not record interaction' });
    if (CATEGORY_ACTIONS[p.category] !== b.action_type) return json(422, { success: false, message: "Action '" + b.action_type + "' is not valid for category '" + p.category + "'" });
    if (b.action_type === 'voted' && !(p.metadata || {}).allow_multiple) {
      if (db.bulletin_interactions.some(function (i) { return i.post_id === p.id && i.user_id === u.id && i.action_type === 'voted'; })) {
        return json(422, { success: false, message: 'Already voted on this poll' });
      }
    }
    var ex = db.bulletin_interactions.filter(function (i) { return i.post_id === p.id && i.user_id === u.id && i.action_type === b.action_type; })[0];
    var meta = b.metadata && Object.keys(b.metadata).length ? b.metadata : null;
    if (ex) ex.metadata = meta;
    else { ex = { id: next('inter'), post_id: p.id, user_id: u.id, action_type: b.action_type, metadata: meta }; db.bulletin_interactions.push(ex); }
    if (b.action_type === 'claimed') p.status = 'resolved';
    save();
    return json(200, { success: true, data: clone(ex) });
  });
  on('PATCH', '/bulletin/posts/(\\d+)/pin', function (req, m) {
    var u = me(), p = postById(+m[1]), pin = !!(req.body || {}).pinned;
    if (!isAdmin(u)) return json(403, { success: false, message: 'Unauthorized' });
    if (!p) return json(500, { success: false, message: 'Could not pin post' });
    if (pin) db.bulletin_posts.forEach(function (x) { if (x !== p) x.is_pinned = false; });
    p.is_pinned = pin; save();
    return json(200, { success: true, data: formatPost(p, u) });
  });
  on('PATCH', '/bulletin/posts/(\\d+)/status', function (req, m) {
    var u = me(), p = postById(+m[1]), s = (req.body || {}).status;
    if (['open', 'closing_soon', 'resolved', 'expired'].indexOf(s) === -1) return validation('status', 'The selected status is invalid.');
    if (!p) return json(500, { success: false, message: 'Could not update status' });
    if (p.user_id !== u.id && !isAdmin(u)) return json(403, { success: false, message: 'Unauthorized' });
    p.status = s; save();
    return json(200, { success: true, data: formatPost(p, u) });
  });
  on('GET', '/bulletin/my-posts', function () {
    var u = me();
    return json(200, { success: true, data: {
      created: db.bulletin_posts.filter(function (p) { return !p.deleted_at && p.user_id === u.id; }).map(function (p) { return formatPost(p, u); }),
      interacted: visiblePosts(u).filter(function (p) { return db.bulletin_interactions.some(function (i) { return i.post_id === p.id && i.user_id === u.id; }); })
        .map(function (p) { return formatPost(p, u); }) } });
  });
  on('GET', '/bulletin/audience/departments', function () {
    return json(200, { success: true, data: db.departments.filter(function (d) { return d.status_id > 0; })
      .map(function (d) { return { id: d.id, name: d.name }; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }) });
  });
  on('GET', '/bulletin/audience/users', function () {
    return json(200, { success: true, data: db.users.slice().sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; })
      .map(function (u) { return { id: u.id, name: u.name, email: u.email, department_id: u.department_id }; }) });
  });

  /* ==== dispatch ========================================================= */
  function handle(method, url, body, token) {
    load();
    var q = url.indexOf('?'), path = q === -1 ? url : url.slice(0, q), query = {};
    if (q !== -1) url.slice(q + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('='), k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)), v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      query[k] = v;
    });
    var match = null, route = null;
    for (var i = 0; i < routes.length; i++) {
      if (routes[i].method !== method) continue;
      var m = routes[i].re.exec(path);
      if (m) { match = m; route = routes[i]; break; }
    }
    var res;
    if (!route) res = notFound(path.replace(/^\//, ''));
    else if (!route.open && (!db.session || token !== db.session.token)) {
      res = json(401, token ? { success: false, message: 'Access token is invalid or expired.', error: 'TOKEN_EXPIRED' }
        : { success: false, message: 'No token provided.', error: 'UNAUTHENTICATED' });
    } else {
      try { res = route.fn({ body: clone(body), query: query }, match); }
      catch (e) { if (window.console) console.error(e); res = json(500, { message: 'Server Error' }); }
    }
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ status: res.status, body: clone(res.body) }); }, DELAY + Math.random() * 180);
    });
  }

  return { handle: handle, load: load, reset: function () { db = null; try { sessionStorage.removeItem(KEY); } catch (e) {} } };
})();
