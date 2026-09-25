/**
 * The portal's database, in the browser. Master tables are the real seed values
 * from migrate.sql (species, clinical signs, medicines, the full cage floor plan
 * and its map items). The transactional tables are generated the same way the
 * project's own migrations/_gen_demo_dataset.php builds its presentation data:
 * same record shapes, same rules (feed that steps up every 45 days, mortality
 * that follows water temperature, harvests sized off feed so FCR lands between
 * 1.4 and 2.4), with the window ending today instead of a fixed date.
 *
 * Staff are guestN. Adds, edits and deletes made in the demo are kept for the
 * browser session as a small change log over the generated data.
 */

'use strict';

var FF = (function () {

  /* ---- deterministic randomness ---------------------------------------- */
  var seed = 20260901;
  function rand() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function mt(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
  function pick(a) { return a[mt(0, a.length - 1)]; }
  function rndf(a, b, dp) { var p = Math.pow(10, dp === undefined ? 2 : dp); return Math.round((a + rand() * (b - a)) * p) / p; }
  function chance(pct) { return mt(1, 100) <= pct; }
  function wpick(w) {
    var keys = Object.keys(w), tot = 0, i;
    for (i = 0; i < keys.length; i++) tot += w[keys[i]];
    var r = mt(1, tot);
    for (i = 0; i < keys.length; i++) { r -= w[keys[i]]; if (r <= 0) return keys[i]; }
    return keys[0];
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = mt(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---- dates, all as YYYY-MM-DD strings on a UTC calendar ------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function parse(s) { return new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))); }
  function dadd(s, n) { var d = parse(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); }
  function ddiff(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function tm(s, h, m) { return s + ' ' + pad(h) + ':' + pad(m || 0) + ':00'; }
  var nowD = new Date();
  var TODAY = nowD.getFullYear() + '-' + pad(nowD.getMonth() + 1) + '-' + pad(nowD.getDate());
  function nowStamp() {
    var d = new Date();
    return TODAY + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  var WINDOW_END = TODAY;
  var WINDOW_START = dadd(WINDOW_END, -214);
  var SPIKE_FROM = dadd(WINDOW_END, -37);

  /* ---- master data (migrate.sql) --------------------------------------- */
  var T = {};
  function stamp(rows, created) {
    return rows.map(function (r, i) {
      r.id = r.id || i + 1;
      r.status_id = r.status_id === undefined ? 1 : r.status_id;
      r.created_at = r.created_at || created;
      r.deleted_at = null;
      return r;
    });
  }
  function names(list, created) { return stamp(list.map(function (n) { return { name: n }; }), created); }

  T.fish_farms = names(['1', '2', '3', '4', '5'], '2026-06-23 10:12:00');

  T.fish_species = stamp([
    ['Hybrid Grouper', '龍虎斑', 0], ['Red Snapper', '紅雞', 0], ['Orange-spotted grouper', '青斑', 18],
    ['Seabass', '金目鱸', 0], ['Silver Pompano', '銀鯧', 0], ['Threadfin fish', '午魚', 0],
    ['Golden Trevally', '汶浪', 10], ['Red Drum', '紅鼓魚', 8], ['Gaint Trevally', '巨人鰺', 0],
    ['Milk Fish', '牛奶魚', 6], ['Tilapia', '羅非魚', 4], ['Golden Snapper', '紅糟', 16],
    ['Bat Fish', '燕鯧', 12], ['King Snapper', '川紋笛鯛', 18], ['Red Grouper', '紅石斑', 20],
    ['Silver Grunter', '石鱸', 8]
  ].map(function (s) {
    return { name: s[0], chinese_name: s[1], market_price: s[2], dead_fish_coefficient: 1,
      normal_harvest_weight: 0, promo_harvest_weight: 0 };
  }), '2026-06-23 10:12:00');

  T.clinical_signs = names(['黑身', '爛頭(白頭)', '爛尾 Fin rot', '落鱗 scale drop', '體表潮紅 body redness',
    '無外傷', '突眼 pop eye', '旋转游泳 swirling swim', '其他'], '2026-06-24 09:30:00');
  T.medicines = names(['Amoxicillin', 'OTC', 'Enrofloxacin', 'Erythromycin', 'Levamiose', 'Florfenicol',
    'Acriflavine(Yellow Powder)', 'Formalin', 'Doxycycline'], '2026-06-24 11:05:00');
  T.vaccines = names(['PAC Vibrio', 'MSD Irido V', 'MSD Strep Si', 'PAC SDDV', 'UNVACCINTED',
    'PAC Vibrio + MSD Strep Si'], '2026-06-24 11:05:00');
  T.supplements = names(['BIOYO-Vibrout AA', 'Aquavibrio', 'AquastemV', 'Florfenicol', 'Pro-F', 'Lanchance',
    'Multi Vitamin', 'Taurine', 'VitaminC', 'Kanamycin', 'Amoxicillin', 'OTC', 'Enrofloxacin', 'Doxycycline',
    'LP20', 'Polyphenol', '甜菜鹼', '六味地黄丸', 'No Medicine'], '2026-06-24 11:05:00');
  T.supplement_types = stamp([['Florfenicol 2g/kg', '#A103F1'], ['OTC 8g/kg', '#FBAE07'],
    ['Bioyo 0.2g/kg', '#FFFB00'], ['Kemin', '#FF0000']].map(function (s) {
    return { name: s[0], color: s[1] };
  }), '2026-06-25 14:40:00');
  // Suppliers: the seed keeps company names; the ones that are people are guestN here.
  T.suppliers = names(['自家Prime', 'guest21', 'guest22', 'guest23', 'guest24', '統一', 'guest25', '晨海'],
    '2026-06-23 10:12:00');
  T.feed_brands = stamp([[6, 'Grobest Vio Winner Feed'], [7, 'CP star feed'], [8, 'Uni-president'],
    [9, '海洋Ocean'], [12, 'Yuequn'], [14, 'Sea master']].map(function (b) { return { id: b[0], name: b[1] }; }),
    '2026-06-23 10:12:00');
  T.feed_pellet_sizes = stamp([[14, '1'], [15, '2'], [16, '3'], [17, '4'], [18, '5'], [19, '6'], [20, '7'],
    [21, '8'], [101, 'C5002'], [102, 'C5003']].map(function (p) { return { id: p[0], size: p[1] }; }),
    '2026-06-23 10:12:00');
  T.feed_types = stamp([['Uni 5', 8, 18], ['Uni 6', 8, 19], ['Uni C5002', 8, 101], ['Uni C5003', 8, 102],
    ['Winner 4 Florfenicol', 6, 17], ['Winner 5 Florfenicol', 6, 18], ['Star feed 4 Florfenicol', 7, 17]]
    .map(function (f) { return { name: f[0], feed_brand_id: f[1], feed_pellet_size_id: f[2] }; }),
    '2026-06-23 10:12:00');
  T.sales_channels = names(['PMT', '活魚TPCS', '活魚BB373', '活魚TP823', '活魚SEM365', '活魚JW763',
    '销售渠道1', '销售渠道2', '销售渠道3'], '2026-06-24 16:20:00');
  T.net_types = names(['大网', '2吋', '1.5吋', '1吋', '0.6吋', '0.4吋'], '2026-06-24 17:02:00');

  // Cages: the sixteen base rows (with internal names) first, then the floor-plan
  // seed, which updates those it already has and inserts the rest.
  var MAP = {"cages":[[1,"1 - A6",20,20,100,120],[1,"1 - B6",130,20,100,120],[1,"1 - C6",240,20,100,120],[1,"1 - A5",20,150,100,120],[1,"1 - B5",130,150,100,120],[1,"1 - C5",240,150,100,120],[1,"1 - D5",350,150,100,120],[1,"1 - A4",20,280,100,120],[1,"1 - B4",130,280,100,120],[1,"1 - C4",240,280,100,120],[1,"1 - D4",350,280,100,120],[1,"1 - A3",20,440,100,120],[1,"1 - B3",130,440,100,120],[1,"1 - C3",240,440,100,120],[1,"1 - D3",350,440,100,120],[1,"1 - A2",20,570,100,120],[1,"1 - B2",130,570,100,120],[1,"1 - C2",240,570,100,120],[1,"1 - A1",20,700,100,120],[1,"1 - B1",130,700,100,120],[1,"1 - C1",240,700,100,120],[1,"1 - SK1",350,690,40,60],[1,"1 - SK2",350,630,40,60],[1,"1 - SK3",350,570,40,60],[1,"1 - SK4",400,690,40,60],[1,"1 - SK5",400,630,40,60],[1,"1 - SK6",400,570,40,60],[1,"1 - SK7",450,690,40,60],[1,"1 - SK8",450,630,40,60],[1,"1 - SK9",450,570,40,60],[1,"1 - SK10",590,630,40,60],[1,"1 - SK11",590,570,40,60],[1,"1 - SK12",640,630,40,60],[1,"1 - SK13",640,570,40,60],[1,"1 - 20",700,370,40,60],[1,"1 - 21",700,310,40,60],[1,"1 - 22",750,370,40,60],[1,"1 - 23",750,310,40,60],[1,"1 - SK14",590,430,40,60],[1,"1 - SK15",590,370,40,60],[1,"1 - SK16",590,310,40,60],[1,"1 - SK17",640,430,40,60],[1,"1 - SK18",640,370,40,60],[1,"1 - SK19",640,310,40,60],[1,"1 - SW1",840,460,40,60],[1,"1 - SW2",840,400,40,60],[1,"1 - SW3",840,340,40,60],[1,"1 - SW4",890,460,40,60],[1,"1 - SW5",890,400,40,60],[1,"1 - SW6",890,340,40,60],[1,"1 - SW7",890,280,40,60],[1,"1 - SW8",940,460,40,60],[1,"1 - SW9",940,400,40,60],[1,"1 - SW10",940,340,40,60],[1,"1 - SW11",940,280,40,60],[1,"1 - SB1",840,630,40,60],[1,"1 - SB2",840,570,40,60],[1,"1 - SB3",890,690,40,60],[1,"1 - SB4",890,630,40,60],[1,"1 - SB5",890,570,40,60],[1,"1 - SB6",940,690,40,60],[1,"1 - SB7",940,630,40,60],[1,"1 - SB8",940,570,40,60],[2,"2 - K1",30,30,100,120],[2,"2 - J1",140,30,100,120],[2,"2 - I1",250,30,100,120],[2,"2 - H1",360,30,100,120],[2,"2 - G1",470,30,100,120],[2,"2 - F1",620,30,100,120],[2,"2 - E1",730,30,100,120],[2,"2 - D1",840,30,100,120],[2,"2 - C1",950,30,100,120],[2,"2 - B1",1060,30,100,120],[2,"2 - A1",1170,30,100,120],[2,"2 - K2",30,160,100,120],[2,"2 - J2",140,160,100,120],[2,"2 - I2",250,160,100,120],[2,"2 - H2",360,160,100,120],[2,"2 - G2",470,160,100,120],[2,"2 - F2",620,160,100,120],[2,"2 - E2",730,160,100,120],[2,"2 - D2",840,160,100,120],[2,"2 - C2",950,160,100,120],[2,"2 - B2",1060,160,100,120],[2,"2 - A2",1170,160,100,120],[2,"2 - K3",30,290,100,120],[2,"2 - J3",140,290,100,120],[2,"2 - I3",250,290,100,120],[2,"2 - H3",360,290,100,120],[2,"2 - G3",470,290,100,120],[2,"2 - F3",620,290,100,120],[2,"2 - E3",730,290,100,120],[2,"2 - D3",840,290,100,120],[2,"2 - C3",950,290,100,120],[2,"2 - B3",1060,290,100,120],[2,"2 - A3",1170,290,100,120],[2,"2 - K4",30,420,100,120],[2,"2 - J4",140,420,100,120],[2,"2 - I4",250,420,100,120],[2,"2 - H4",360,420,100,120],[2,"2 - G4",470,420,100,120],[2,"2 - F4",620,420,100,120],[2,"2 - E4",730,420,100,120],[2,"2 - D4",840,420,100,120],[2,"2 - K5",30,570,100,120],[2,"2 - J5",140,570,100,120],[2,"2 - I5",250,570,100,120],[2,"2 - H5",360,570,100,120],[2,"2 - G5",470,570,100,120],[2,"2 - F5",620,570,100,120],[2,"2 - E5",730,570,100,120],[2,"2 - D5",840,570,100,120],[2,"2 - C5",950,570,100,120],[2,"2 - B5",1060,570,100,120],[2,"2 - A5",1170,570,100,120],[2,"2 - K6",30,700,100,120],[2,"2 - J6",140,700,100,120],[2,"2 - I6",250,700,100,120],[2,"2 - H6",360,700,100,120],[2,"2 - G6",470,700,100,120],[2,"2 - F6",620,700,100,120],[2,"2 - E6",730,700,100,120],[2,"2 - D6",840,700,100,120],[2,"2 - C6",950,700,100,120],[2,"2 - B6",1060,700,100,120],[2,"2 - A6",1170,700,100,120],[2,"2 - K7",30,830,100,120],[2,"2 - J7",140,830,100,120],[2,"2 - I7",250,830,100,120],[2,"2 - H7",360,830,100,120],[2,"2 - G7",470,830,100,120],[2,"2 - F7",620,830,100,120],[2,"2 - E7",730,830,100,120],[2,"2 - D7",840,830,100,120],[2,"2 - C7",950,830,100,120],[2,"2 - B7",1060,830,100,120],[2,"2 - A7",1170,830,100,120],[3,"3 - L1",30,130,100,120],[3,"3 - L2",30,260,100,120],[3,"3 - L3",30,390,100,120],[3,"3 - L4",30,520,100,120],[3,"3 - L5",30,650,100,120],[3,"3 - L6",30,780,100,120],[3,"3 - L7",30,910,100,120],[3,"3 - L8",30,1040,100,120],[3,"3 - L9",30,1170,100,120],[3,"3 - K1",140,130,100,120],[3,"3 - K2",140,260,100,120],[3,"3 - K3",140,390,100,120],[3,"3 - K4",140,520,100,120],[3,"3 - K5",140,650,100,120],[3,"3 - K6",140,780,100,120],[3,"3 - K7",140,910,100,120],[3,"3 - K8",140,1040,100,120],[3,"3 - K9",140,1170,100,120],[3,"3 - J1",250,130,100,120],[3,"3 - J2",250,260,100,120],[3,"3 - J3",250,390,100,120],[3,"3 - J4",250,520,100,120],[3,"3 - J5",250,650,100,120],[3,"3 - J6",250,780,100,120],[3,"3 - J7",250,910,100,120],[3,"3 - J8",250,1040,100,120],[3,"3 - J9",250,1170,100,120],[3,"3 - I1",360,130,100,120],[3,"3 - I2",360,260,100,120],[3,"3 - I3",360,390,100,120],[3,"3 - I4",360,520,100,120],[3,"3 - I5",360,650,100,120],[3,"3 - I7",360,910,100,120],[3,"3 - I8",360,1040,100,120],[3,"3 - I9",360,1170,100,120],[3,"3 - H1",470,130,100,120],[3,"3 - H2",470,260,100,120],[3,"3 - H3",470,390,100,120],[3,"3 - H4",470,520,100,120],[3,"3 - H5",470,650,100,120],[3,"3 - H7",470,910,100,120],[3,"3 - H8",470,1040,100,120],[3,"3 - H9",470,1170,100,120],[3,"3 - G1",610,30,100,120],[3,"3 - G2",610,160,100,120],[3,"3 - G3",610,290,100,120],[3,"3 - G4",610,420,100,120],[3,"3 - G5",610,550,100,120],[3,"3 - G6",610,780,100,120],[3,"3 - G7",610,910,100,120],[3,"3 - G8",610,1040,100,120],[3,"3 - G9",610,1170,100,120],[3,"3 - F1",720,30,100,120],[3,"3 - F2",720,160,100,120],[3,"3 - F3",720,290,100,120],[3,"3 - F4",720,420,100,120],[3,"3 - F5",720,550,100,120],[3,"3 - F6",720,780,100,120],[3,"3 - F7",720,910,100,120],[3,"3 - F8",720,1040,100,120],[3,"3 - F9",720,1170,100,120],[3,"3 - E1",830,30,100,120],[3,"3 - E2",830,160,100,120],[3,"3 - E3",830,290,100,120],[3,"3 - E4",830,420,100,120],[3,"3 - E5",830,550,100,120],[3,"3 - E6",830,780,100,120],[3,"3 - E7",830,910,100,120],[3,"3 - E8",830,1040,100,120],[3,"3 - E9",830,1170,100,120],[3,"3 - D1",940,30,100,120],[3,"3 - D2",940,160,100,120],[3,"3 - D3",940,290,100,120],[3,"3 - D4",940,420,100,120],[3,"3 - D5",940,550,100,120],[3,"3 - D6",940,780,100,120],[3,"3 - D7",940,910,100,120],[3,"3 - D8",940,1040,100,120],[3,"3 - D9",940,1170,100,120],[3,"3 - C1",1050,30,100,120],[3,"3 - C2",1050,160,100,120],[3,"3 - C3",1050,290,100,120],[3,"3 - C4",1050,420,100,120],[3,"3 - C5",1050,550,100,120],[3,"3 - C6",1050,780,100,120],[3,"3 - C7",1050,910,100,120],[3,"3 - C8",1050,1040,100,120],[3,"3 - C9",1050,1170,100,120],[3,"3 - B1",1160,30,100,120],[3,"3 - B2",1160,160,100,120],[3,"3 - B3",1160,290,100,120],[3,"3 - B4",1160,420,100,120],[3,"3 - B5",1160,550,100,120],[3,"3 - B6",1160,780,100,120],[3,"3 - B7",1160,910,100,120],[3,"3 - B8",1160,1040,100,120],[3,"3 - B9",1160,1170,100,120],[3,"3 - A1",1270,30,100,120],[3,"3 - A2",1270,160,100,120],[3,"3 - A3",1270,290,100,120],[3,"3 - A4",1270,420,100,120],[3,"3 - A5",1270,550,100,120],[3,"3 - A6",1270,780,100,120],[3,"3 - A7",1270,910,100,120],[3,"3 - A8",1270,1040,100,120],[3,"3 - A9",1270,1170,100,120]],"items":[[1,"block","CANTEEN",350,30,150,100,"#009bde","#FFFFFF"],[1,"block","KELONG",540,60,190,190,"#009bde","#FFFFFF"],[1,"block","QUARTERS & CANTEEN",350,750,190,80,"#009bde","#FFFFFF"],[1,"block","STORE",580,750,230,80,"#009bde","#FFFFFF"],[1,"block","STORE",1000,240,70,100,"#009bde","#FFFFFF"],[1,"block","STORE",1000,420,70,100,"#009bde","#FFFFFF"],[1,"block","SOLAR ROOM 1",1000,650,70,140,"#009bde","#FFFFFF"],[1,"title","1",940,20,140,50,"#009bde","transparent"],[1,"text","SK",590,520,30,20,"#009bde","transparent"],[1,"text","SW",890,530,30,20,"#009bde","transparent"],[1,"text","SB",890,760,30,20,"#009bde","transparent"],[2,"block","QUARTERS",950,420,320,120,"#009bde","#FFFFFF"],[2,"block","SOLAR ROOM",1290,550,120,150,"#009bde","#FFFFFF"],[2,"block","BIG 1",470,970,100,120,"#009bde","#FFFFFF"],[2,"block","BIG 2",470,1100,100,120,"#009bde","#FFFFFF"],[2,"title","2",1270,1170,140,50,"#009bde","transparent"],[3,"block","STORE",720,680,210,90,"#009bde","#FFFFFF"],[3,"block","QUARTERS",360,780,210,120,"#009bde","#FFFFFF"],[3,"title","3",30,30,140,50,"#009bde","transparent"]]};
  var baseCages = [[1, 'A1'], [1, 'A2'], [1, 'A3'], [1, 'B1'], [1, 'B2'], [1, 'C1'], [2, 'G1'], [2, 'H1'],
    [2, 'I1'], [2, 'J1'], [2, 'K1'], [3, 'F1'], [3, 'G1'], [3, 'H1'], [3, 'I1'], [3, 'J1']];
  T.cages = baseCages.map(function (c) {
    return { fish_farm_id: c[0], name: c[0] + ' - ' + c[1], internal_name: c[1],
      map_x: null, map_y: null, map_width: null, map_height: null };
  });
  MAP.cages.forEach(function (m) {
    var hit = T.cages.filter(function (c) { return c.name === m[1]; })[0];
    if (!hit) {
      hit = { fish_farm_id: m[0], name: m[1], internal_name: null };
      T.cages.push(hit);
    }
    hit.map_x = m[2]; hit.map_y = m[3]; hit.map_width = m[4]; hit.map_height = m[5];
  });
  stamp(T.cages, '2026-06-26 10:48:00');

  T.map_items = stamp(MAP.items.map(function (i) {
    return { fish_farm_id: i[0], item_type: i[1], label: i[2], map_x: i[3], map_y: i[4],
      map_width: i[5], map_height: i[6], text_color: i[7], bg_color: i[8] };
  }), '2026-06-26 15:10:00');

  /* ---- generated transactional data (_gen_demo_dataset.php) ------------ */
  var speciesCode = { 1: 'HG', 2: 'RS', 3: 'OG', 4: 'SB', 5: 'SP', 6: 'TF', 7: 'GT', 8: 'RD', 9: 'GV', 10: 'MF',
    11: 'TL', 12: 'GS', 13: 'BF', 14: 'KS', 15: 'RG', 16: 'SR' };
  var speciesWeight = { 1: 20, 2: 16, 4: 13, 3: 10, 12: 8, 15: 6, 5: 5, 6: 5, 7: 4, 8: 4, 14: 3, 10: 3, 13: 2,
    9: 2, 11: 2, 16: 2 };
  var STAFF = [];
  for (var s = 1; s <= 12; s++) STAFF.push('guest' + s);
  var CONTRACTORS = ['Ocean Net Services', 'Seaview Marine', 'Pulau Divers', 'KH Net Works', '自家團隊'];
  function ids(t) { return T[t].map(function (r) { return r.id; }); }

  // Environment first: mortality reacts to water temperature.
  var LUNAR_D = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三',
    '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八',
    '廿九', '三十'];
  var LUNAR_M = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  var env = {};
  var envDays = ddiff(WINDOW_START, WINDOW_END);
  for (var d = 0; d <= envDays; d++) {
    var date = dadd(WINDOW_START, d);
    var dt = parse(date);
    var doy = Math.round((dt - Date.UTC(dt.getUTCFullYear(), 0, 1)) / 86400000);
    var cyc = d % 30, tide;
    if (cyc < 3 || (cyc >= 15 && cyc < 18)) tide = ['Spring Tide', '大潮', 'ST', '大'];
    else if ((cyc >= 8 && cyc < 11) || (cyc >= 22 && cyc < 25)) tide = ['Neap Tide', '小潮', 'NT', '小'];
    else tide = ['Mid Tide', '中潮', 'MT', '中'];
    env[date] = {
      sal: Math.round((29.5 + 2.6 * Math.sin(doy / 21) + rndf(-0.6, 0.6)) * 100) / 100,
      temp: Math.round((30.5 + 2.2 * Math.sin((doy - 40) / 58) + rndf(-0.8, 0.8)) * 100) / 100,
      wtemp: Math.round((29.2 + 1.8 * Math.sin((doy - 45) / 58) + rndf(-0.5, 0.5)) * 100) / 100,
      pres: Math.round((1009.5 + 3.2 * Math.sin(doy / 11) + rndf(-1.2, 1.2)) * 100) / 100,
      trans: Math.round((115 + 32 * Math.sin(doy / 9) + rndf(-8, 8)) * 100) / 100,
      tide: tide,
      lunar: LUNAR_M[dt.getUTCMonth()] + LUNAR_D[cyc]
    };
  }

  // 1. Productions
  var byFarm = {};
  T.cages.forEach(function (c) { (byFarm[c.fish_farm_id] = byFarm[c.fish_farm_id] || []).push(c); });
  var perFarm = { 1: 24, 2: 28, 3: 26 };
  var prods = [], serialSeen = {};
  Object.keys(perFarm).forEach(function (farm) {
    var pool = shuffle(byFarm[farm].slice());
    for (var i = 0; i < perFarm[farm] && i < pool.length; i++) {
      var completed = prods.length < 20;
      var stock = completed ? dadd(WINDOW_END, -412 + mt(0, 110)) : dadd(WINDOW_END, -315 + mt(0, 265));
      var close = dadd(stock, mt(215, 320));
      if (!completed && ddiff(close, WINDOW_END) >= 0) close = dadd(WINDOW_END, mt(20, 120));
      var sp = +wpick(speciesWeight);
      var base = stock.replace(/-/g, '') + speciesCode[sp];
      var suffix = 'A';
      while (serialSeen[base + suffix]) suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
      serialSeen[base + suffix] = true;
      var vacc = chance(65) ? pick(T.vaccines).name + ' ' + vaccStamp(dadd(stock, -mt(5, 40))) : null;
      prods.push({
        id: prods.length + 1, production_serial_number: base + suffix, cage_id: pool[i].id, species_id: sp,
        stocking_date: stock, stocking_quantity: mt(15, 90) * 100, stocking_size_inch: rndf(1.5, 5.0),
        stocking_weight_g: rndf(3, 26), supplier_id: pick(ids('suppliers')), cost_per_pc: rndf(0.35, 1.9),
        vaccination: vacc, is_favorited: chance(12) ? 1 : 0, status_id: completed ? 0 : 1,
        created_at: tm(stock, 9, mt(0, 59)), deleted_at: null, _close: close, _farm: +farm
      });
    }
  });
  function vaccStamp(s) {
    var mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return s.slice(8, 10) + mon[+s.slice(5, 7) - 1] + s.slice(2, 4);
  }
  prods.forEach(function (p) {
    var from = dadd(p.stocking_date, 5);
    if (ddiff(from, WINDOW_START) > 0) from = WINDOW_START;
    var to = ddiff(p._close, WINDOW_END) > 0 ? p._close : WINDOW_END;
    p._from = from; p._to = to; p._days = Math.max(0, ddiff(from, to));
  });
  T.fish_production = prods;

  // 2. Feed
  var feed = [], feedByProd = {};
  var feedTypeIds = ids('feed_types'), supTypeIds = ids('supplement_types');
  prods.forEach(function (p) {
    if (p._days <= 0) return;
    for (var d = 0; d <= p._days; d++) {
      var date = dadd(p._from, d);
      if (chance(8)) continue;
      var doc = ddiff(p.stocking_date, date);
      var daily = (p.stocking_quantity / 1000) * (1.6 + doc / 38) * rndf(0.82, 1.18, 3);
      daily = Math.max(1.5, Math.min(95, daily));
      var sessions = chance(35) ? ['Morning', 'Afternoon'] : ['Morning'];
      var ft = feedTypeIds[(p.id + Math.floor(doc / 45)) % feedTypeIds.length];
      var w = rndf(0.42, 0.49, 3);
      var share = sessions.length === 1 ? [1] : (chance(50) ? [w, 1 - w] : [1 - w, w]);
      sessions.forEach(function (sess, k) {
        var qty = Math.round(daily * share[k] * 100) / 100;
        feedByProd[p.id] = (feedByProd[p.id] || 0) + qty;
        feed.push({ id: feed.length + 1, production_id: p.id, feed_type_id: ft,
          supplement_type_id: chance(15) ? pick(supTypeIds) : null, quantity_kg: qty, record_date: date,
          session: sess, staff: pick(STAFF), status_id: 1,
          created_at: tm(date, sess === 'Morning' ? 8 : 15, mt(0, 59)), deleted_at: null });
      });
    }
  });
  T.feed = feed;

  // 3. Dead fish
  var dead = [], signIds = ids('clinical_signs');
  var DEAD_REMARKS = ['Collected at surface.', 'Bottom net check.', 'Found near feeder.', 'After heavy rain.',
    'Post-treatment observation.'];
  prods.forEach(function (p) {
    if (p._days <= 0) return;
    for (var d = 0; d <= p._days; d++) {
      var date = dadd(p._from, d);
      if (!chance(42)) continue;
      var qty = chance(6) ? mt(25, 90) : mt(1, 14);
      var wt = env[date] ? env[date].wtemp : 29.2;
      qty = Math.max(1, Math.round(qty * Math.max(0.35, Math.min(2.4, 1 + (wt - 29.2) * 0.55))));
      var real = Math.max(1, Math.round(qty * rndf(0.45, 0.8, 2)));
      var sess = chance(70) ? 'Morning' : 'Afternoon';
      dead.push({ id: 0, production_id: p.id, record_time: tm(date, sess === 'Morning' ? 7 : 15, mt(0, 59)),
        quantity: qty, real_quantity: real, estimated_quantity: Math.max(0, qty - real), session: sess,
        clinical_sign_id: pick(signIds), staff: pick(STAFF), remarks: chance(25) ? pick(DEAD_REMARKS) : null,
        status_id: 1, created_at: tm(date, 9, mt(0, 59)), deleted_at: null });
    }
  });
  var ongoing = prods.filter(function (p) { return p.status_id === 1 && p._days > 0; });
  for (var sd = 0; sd <= ddiff(SPIKE_FROM, WINDOW_END); sd++) {
    var sdate = dadd(SPIKE_FROM, sd);
    var sp2 = ongoing[sd % ongoing.length];
    if (ddiff(sp2._to, sdate) > 0) continue;
    var sq = mt(60, 160), sr = Math.round(sq * 0.65);
    dead.push({ id: 0, production_id: sp2.id, record_time: tm(sdate, 7, 20), quantity: sq, real_quantity: sr,
      estimated_quantity: sq - sr, session: 'Morning', clinical_sign_id: pick(signIds), staff: pick(STAFF),
      remarks: 'Abnormal mortality, escalated to supervisor.', status_id: 1, created_at: tm(sdate, 8, 5),
      deleted_at: null });
  }
  dead.forEach(function (r, i) { r.id = i + 1; });
  T.dead_fish_records = dead;

  // 4. Treatment
  var TREAT_TYPES = ['Medicinal Bath', 'Oral Medication', 'Injection', 'Freshwater Bath', 'Formalin Dip'];
  var TARPS = ['3m x 3m', '4m x 4m', '5m x 5m', '6m x 6m', '8m x 8m'];
  var LAB = ['Vibrio spp. isolated', 'Streptococcus iniae positive', 'No bacterial growth',
    'Iridovirus PCR positive', 'Parasite load moderate', 'Aeromonas spp. isolated'];
  var CLIN = ['Fin rot with body redness', 'Pop eye and lethargy', 'Skin lesions on flank', 'Gill flukes suspected',
    'Loss of appetite', 'Erratic swimming'];
  var TREAT_REMARKS = ['Fish responded well.', 'Repeat in 3 days.', 'Monitor overnight.',
    'Mortality reduced next day.'];
  var tr = [], ti = [];
  var cands = prods.filter(function (p) { return p._days > 5; });
  for (var i = 0; i < 180; i++) {
    var tp = pick(cands);
    var tdate = dadd(tp._from, mt(0, tp._days));
    var rec = { id: i + 1, production_id: tp.id, record_time: tm(tdate, mt(8, 16), mt(0, 59)),
      tarp_size: pick(TARPS), treatment_type: pick(TREAT_TYPES), lab_diagnosis: chance(60) ? pick(LAB) : null,
      clinical_diagnosis: pick(CLIN), remarks: chance(40) ? pick(TREAT_REMARKS) : null, staff: pick(STAFF),
      status_id: 1, created_at: tm(tdate, 18, mt(0, 59)), deleted_at: null };
    tr.push(rec);
    var count = +wpick({ 1: 55, 2: 32, 3: 13 });
    for (var k = 0; k < count; k++) {
      var type = wpick({ Medicine: 55, Supplement: 33, Vaccine: 12 });
      ti.push({ id: ti.length + 1, treatment_record_id: rec.id, treatable_type: type,
        treatable_id: pick(ids(type === 'Medicine' ? 'medicines' : type === 'Supplement' ? 'supplements' : 'vaccines')),
        dosage: rndf(0.5, 25, 3),
        batch_number: type === 'Vaccine' ? 'LOT-' + tdate.slice(0, 4) + tdate.slice(5, 7) + '-' + mt(10, 99) : null,
        fish_size: pick(['50g', '100g', '200g', '350g', '500g', '800g']), duration: rndf(5, 60, 2),
        treatment_time: tm(tdate, mt(8, 16), mt(0, 59)), status_id: 1, created_at: tm(tdate, 18, 0),
        deleted_at: null });
    }
  }
  T.treatment_records = tr;
  T.treatment_items = ti;

  // 5. Harvest and sales
  var hr = [], sales = [];
  var HARVEST_REMARKS = ['Buyer boat on site.', 'Graded before loading.', 'Weather delayed loading.',
    'Quality grade A.'];
  prods.forEach(function (p) {
    if (p._days <= 0) return;
    var events = p.status_id === 0 ? mt(3, 5) : (ddiff(p.stocking_date, p._to) > 170 ? mt(0, 3) : 0);
    if (events < 1) return;
    var fed = feedByProd[p.id] || 0;
    if (fed <= 0) return;
    var yieldKg = fed / rndf(1.4, 2.4, 2);
    if (p.status_id !== 0) yieldKg *= rndf(0.15, 0.45, 3);
    var shares = [], sum = 0;
    for (var e = 0; e < events; e++) { shares.push(rndf(0.5, 1.5, 3)); sum += shares[e]; }
    for (e = 0; e < events; e++) {
      var date = dadd(p._to, -mt(0, Math.min(75, p._days)));
      if (ddiff(p._from, date) < 0) date = p._from;
      var kg = yieldKg * shares[e] / sum;
      var promo = chance(55) ? rndf(0.05, 0.18, 3) : 0;
      var other = chance(35) ? rndf(0.02, 0.08, 3) : 0;
      var r3 = function (v) { return Math.round(v * 1000) / 1000; };
      hr.push({ id: hr.length + 1, production_id: p.id, record_time: tm(date, mt(6, 11), mt(0, 59)),
        harvest_type: wpick({ 'Live': 70, 'Ice Chilled': 22, 'Emergency': 8 }),
        normal_weight: r3(kg * (1 - promo - other)), promo_weight: r3(kg * promo), other_weight: r3(kg * other),
        normal_per_piece_weight: rndf(0.45, 1.3, 3), promo_per_piece_weight: rndf(0.4, 1.1, 3),
        other_per_piece_weight: rndf(0.35, 1.0, 3), staff: pick(STAFF),
        remarks: chance(30) ? pick(HARVEST_REMARKS) : null, status_id: 1, created_at: tm(date, 12, mt(0, 59)),
        deleted_at: null });
    }
  });
  hr.forEach(function (h) {
    var remaining = h.normal_weight + h.promo_weight + h.other_weight;
    var splits = +wpick({ 1: 60, 2: 30, 3: 10 });
    for (var k = 0; k < splits && remaining > 1; k++) {
      var w = k === splits - 1 ? remaining : Math.round(remaining * rndf(0.35, 0.75, 3) * 1000) / 1000;
      remaining = Math.round((remaining - w) * 1000) / 1000;
      var date = dadd(h.record_time.slice(0, 10), mt(0, 2));
      if (ddiff(date, TODAY) < 0) date = TODAY;
      sales.push({ id: sales.length + 1, harvest_record_id: h.id, sales_channel_id: pick(ids('sales_channels')),
        weight_sold: Math.round(w * 1000) / 1000, sales_amount: Math.round(w * rndf(11, 24) * 100) / 100,
        record_time: tm(date, mt(7, 18), mt(0, 59)), status_id: 1, created_at: tm(date, 19, 0),
        deleted_at: null });
    }
  });
  T.harvest_records = hr;
  T.sales_records = sales;

  // 6. Nets
  var CAGE_STATUS = ['Washed', 'Empty', 'Blank', 'Prepare'];
  var NET_REMARKS = {
    1: ['Small tear on north panel.', 'Hole found during dive check.', 'Frayed rope at corner.',
      'Predator bite damage.', 'Patched on site.'],
    2: ['Changed to larger mesh as fish grew.', 'Routine net change.', 'Replaced after damage.',
      'Upsized net at DOC 120.'],
    3: ['Half wash completed.', 'Full wash by contractor.', 'Biofouling heavy, washed twice.',
      'Routine monthly wash.']
  };
  var nets = [], netCands = prods.filter(function (p) { return p._days > 3; });
  for (i = 0; i < 240; i++) {
    var np = pick(netCands);
    var ndate = dadd(np._from, mt(0, np._days));
    var nt = +wpick({ 1: 30, 2: 25, 3: 45 });
    nets.push({ id: i + 1, production_id: np.id, record_time: tm(ndate, mt(7, 17), mt(0, 59)), record_type: nt,
      net_type_id: nt === 2 ? pick(ids('net_types')) : (chance(30) ? pick(ids('net_types')) : null),
      contractor: chance(60) ? pick(CONTRACTORS) : null, cage_status: pick(CAGE_STATUS),
      operation_staff: pick(STAFF), staff: pick(STAFF), remarks: pick(NET_REMARKS[nt]), status_id: 1,
      created_at: tm(ndate, 18, mt(0, 59)), deleted_at: null });
  }
  T.net_records = nets;

  // 7. Incidents
  var INC_REMARKS = {
    'Broken Planks': ['Walkway plank cracked near cage.', 'Two planks replaced.', 'Timber rotted, scheduled for repair.'],
    'Broken Anchor Lines': ['Anchor line snapped after strong current.', 'Re-tensioned and secured.', 'Spare line fitted.'],
    'Broken Bird Nets': ['Bird net torn, herons entering.', 'Net re-stretched over cage.', 'Temporary patch applied.'],
    'Equipment Spoilt': ['Feed blower motor failed.', 'Generator overheating.', 'Water pump seal leaking.',
      'Aerator tripped overnight.'],
    'Accidents': ['Staff slipped on wet walkway, minor.', 'Boat bumped pontoon during docking.',
      'Finger cut while handling net.'],
    'Others': ['Oil sheen spotted near farm.', 'Unusual algae bloom observed.', 'Unauthorised boat near cages.']
  };
  var inc = [], incTypes = Object.keys(INC_REMARKS);
  for (i = 0; i < 80; i++) {
    var idate = dadd(WINDOW_START, mt(0, envDays));
    var itype = pick(incTypes);
    var recent = ddiff(dadd(WINDOW_END, -36), idate) >= 0;
    var ifarm = mt(1, 3);
    inc.push({ id: i + 1, incident_type: itype, record_time: tm(idate, mt(6, 18), mt(0, 59)),
      location: 'Farm ' + ifarm + ', Cage ' + pick(byFarm[ifarm]).name,
      status: recent ? (chance(60) ? 'Pending' : 'Rectified') : (chance(15) ? 'Pending' : 'Rectified'),
      staff: pick(STAFF), remarks: pick(INC_REMARKS[itype]), status_id: 1, created_at: tm(idate, 20, mt(0, 59)),
      deleted_at: null });
  }
  T.incident_reports = inc;

  // 8. Announcements
  var ANN = [
    'Monsoon advisory: secure all walkways and check anchor lines before the weekend.',
    'Feed delivery from Uni-president arrives Thursday 09:00, clear the store room.',
    'Reminder: log dead fish counts before 10:00 daily. Late entries break the daily report.',
    'Net wash schedule for Farm 2 rows A to D starts Monday. Contractor: Ocean Net Services.',
    'New vaccination batch received. Update batch numbers in the treatment form.',
    'Harvest for cage 1 - A1 confirmed with PMT for Friday morning.',
    'Water temperature has risen above 31°C, reduce afternoon feeding by 20%.',
    'Safety briefing on Saturday 08:00 at the jetty. Attendance is compulsory.',
    'Inventory audit this month: count all feed bags and medicine stock by the 25th.',
    'Fuel for the workboat is now logged in the operations book. No exceptions.',
    'Algae bloom reported nearby. Increase water clarity checks to twice daily.',
    'Please report any bird net damage immediately, losses have increased this month.',
    'Sales channel 活魚TPCS has requested larger grade fish for next collection.',
    'Generator maintenance scheduled Wednesday. Expect a two-hour power cut.',
    'New staff joining Farm 3 next week. Buddy system applies for the first month.',
    'Reduce feeding for cages under treatment until mortality stabilises.',
    'Spring tide expected, double-check mooring lines on all outer cages.',
    'Photos are now required for every incident report. Upload before closing the day.',
    'Quarterly environment survey data is due. Fill in salinity and transparency daily.',
    'Cold chain check: ice supply for chilled harvest confirmed for the month.',
    'Cage 2 - K5 scheduled for net change on the 12th. Prepare 1.5吋 net.',
    'All treatment records must include lab diagnosis where available.',
    'Boat licence renewal completed. Copies are in the office file.',
    'Reminder to log supplement usage against the correct feed session.',
    'Month-end report review meeting moves to 16:00 on the last working day.',
    'Emergency contact list updated on the notice board. Take a photo for reference.',
    'Fish grading standards updated. See the printed chart at the packing station.',
    'Please keep the walkways clear of empty feed bags. Fire hazard.',
    'Diver inspection of all Farm 1 nets completed. Two repairs pending.',
    'Portal training session for the new dashboard on Friday afternoon.'
  ];
  T.announcements = ANN.map(function (c, i) {
    var ad = dadd(WINDOW_START, Math.round(i * (envDays / ANN.length)) + mt(0, 4));
    if (ddiff(ad, TODAY) < 0) ad = TODAY;
    return { id: i + 1, content: c, published: chance(80) ? 1 : 0, status_id: 1,
      created_at: tm(ad, mt(8, 17), mt(0, 59)), deleted_at: null };
  });

  // 9. Environment surveys
  T.environment_surveys = Object.keys(env).map(function (date, i) {
    var e = env[date];
    return { id: i + 1, date: date, salinity_level: e.sal, temperature: e.temp, water_temperature: e.wtemp,
      pressure: e.pres, transparency_level: e.trans, tide: e.tide[0], tide_cn: e.tide[1], tide_short: e.tide[2],
      tide_short_cn: e.tide[3], lunar_calendar: e.lunar, status_id: 1, created_at: tm(date, 7, mt(0, 45)),
      deleted_at: null };
  });

  // 10. Inventory
  var inv = [], seq = { FeedBrand: 0, Supplement: 0, Medicine: 0, Vaccine: 0 };
  var plan = [];
  [['FeedBrand', 26], ['Supplement', 18], ['Medicine', 14], ['Vaccine', 10]].forEach(function (x) {
    for (var n = 0; n < x[1]; n++) plan.push(x[0]);
  });
  var PREFIX = { FeedBrand: 'FEED', Supplement: 'SUP', Medicine: 'MED', Vaccine: 'VAC' };
  var PIDS = { FeedBrand: ids('feed_brands'), Supplement: ids('supplements'), Medicine: ids('medicines'),
    Vaccine: ids('vaccines') };
  plan.forEach(function (type) {
    seq[type]++;
    var vdate = dadd(WINDOW_START, mt(0, envDays));
    var isFeed = type === 'FeedBrand';
    var n3 = String(seq[type]); while (n3.length < 3) n3 = '0' + n3;
    inv.push({ id: inv.length + 1, inventory_product_type: type, inventory_product_id: pick(PIDS[type]),
      feed_pellet_size_id: isFeed ? pick(ids('feed_pellet_sizes')) : null, supplier_id: pick(ids('suppliers')),
      invoice_number: 'INV-' + PREFIX[type] + '-' + n3, weight: isFeed ? rndf(200, 1500, 3) : null,
      dosage: isFeed ? null : rndf(50, 2500, 3), unit_price: isFeed ? rndf(1.8, 3.4) : rndf(0.6, 18.0),
      transportation_cost: chance(80) ? rndf(20, 140) : null, custom_fees: chance(70) ? rndf(5, 45) : null,
      batch_number: type === 'Vaccine' ? 'LOT-' + vdate.slice(0, 7) + String.fromCharCode(mt(65, 70)) : null,
      status_id: 1, created_at: tm(vdate, mt(9, 16), mt(0, 59)), deleted_at: null });
  });
  T.inventory_records = inv;

  // 11. Activity log
  var USERS = [[1, 'admin'], [2, 'Maram Aashna']];
  var ENTITIES = { dead_fish: 'Dead Fish record', fish_production: 'Fish Production', feed: 'Feed record',
    treatment: 'Treatment record', harvest: 'Harvest record', sales: 'Sales record', net_record: 'Net record',
    incident: 'Incident report', announcement: 'Announcement', inventory: 'Inventory record',
    environment_survey: 'Environment survey' };
  var log = [];
  for (i = 0; i < 600; i++) {
    var ldate = dadd(WINDOW_START, mt(Math.max(0, envDays - 120), envDays));
    var u = pick(USERS);
    var action = wpick({ create: 42, update: 22, 'delete': 8, 'export': 12, login: 10, logout: 6 });
    var entity, eid, desc;
    if (action === 'login' || action === 'logout') {
      entity = 'auth'; eid = null; desc = action.charAt(0).toUpperCase() + action.slice(1) + ': ' + u[1];
    } else {
      entity = pick(Object.keys(ENTITIES)); eid = String(mt(1, 900));
      desc = (action === 'export' ? 'Exported ' : action.charAt(0).toUpperCase() + action.slice(1) + 'd ') +
        ENTITIES[entity] + ' #' + eid;
    }
    log.push({ user_id: u[0], username: u[1], action: action, entity: entity, entity_id: eid, description: desc,
      ip_address: '127.0.0.1', created_at: tm(ldate, mt(7, 19), mt(0, 59)) });
  }
  log.sort(function (a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0; });
  log.forEach(function (r, i) { r.id = i + 1; r.deleted_at = null; });
  T.activity_log = log;

  // 12. Images, ten per category, pointed at real records.
  var IMG = [['Treatment', 'treatment_records'], ['IncidentReport', 'incident_reports'],
    ['DeadFishReport', 'dead_fish_records'], ['BrokenNet', 'net_records'], ['HarvestRecord', 'harvest_records']];
  var imgs = [];
  IMG.forEach(function (c) {
    var pool = T[c[1]].filter(function (r) { return c[0] !== 'BrokenNet' || r.record_type === 1; });
    for (var n = 0; n < 10; n++) {
      var idate = dadd(WINDOW_END, -mt(1, 90));
      var stampStr = idate.replace(/-/g, '') + pad(mt(8, 17)) + pad(mt(0, 59)) + pad(mt(0, 59));
      var hex = '';
      for (var h = 0; h < 16; h++) hex += '0123456789abcdef'.charAt(mt(0, 15));
      imgs.push({ id: imgs.length + 1, imageable_type: c[0], imageable_id: pick(pool).id,
        image: 'assets/uploads/images/' + stampStr + '-' + hex + '.jpg', image_data: null, status_id: 1,
        created_at: tm(idate, mt(8, 17), mt(0, 59)), deleted_at: null });
    }
  });
  T.images = imgs;

  /* ---- session change log --------------------------------------------- */
  var KEY = 'ff-demo-changes';
  var changes = { day: TODAY, ops: [] };
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.day === TODAY) changes = saved;
  } catch (e) {}

  function row(table, id) {
    var rows = T[table];
    for (var i = 0; i < rows.length; i++) if (rows[i].id === +id) return rows[i];
    return null;
  }
  function nextId(table) {
    var max = 0;
    T[table].forEach(function (r) { if (r.id > max) max = r.id; });
    return max + 1;
  }
  function apply(op) {
    if (op.t === 'i') { op.r.id = op.r.id || nextId(op.table); T[op.table].push(op.r); return op.r.id; }
    var r = row(op.table, op.id);
    if (!r) return null;
    if (op.t === 'u') Object.keys(op.r).forEach(function (k) { r[k] = op.r[k]; });
    if (op.t === 'd') r.deleted_at = op.at;
    return r.id;
  }
  changes.ops.forEach(apply);
  function record(op) {
    var id = apply(op);
    changes.ops.push(op);
    try { sessionStorage.setItem(KEY, JSON.stringify(changes)); } catch (e) {}
    return id;
  }

  var api = {
    T: T,
    today: TODAY,
    now: nowStamp,
    dadd: dadd,
    ddiff: ddiff,
    find: function (table, id) {
      var r = row(table, id);
      return r && !r.deleted_at ? r : null;
    },
    all: function (table) { return T[table].filter(function (r) { return !r.deleted_at; }); },
    insert: function (table, r) {
      r.status_id = r.status_id === undefined ? 1 : r.status_id;
      r.created_at = r.created_at || nowStamp();
      r.deleted_at = null;
      return record({ t: 'i', table: table, r: r, id: nextId(table) }) ;
    },
    update: function (table, id, patch) {
      patch.updated_at = nowStamp();
      return record({ t: 'u', table: table, id: +id, r: patch });
    },
    remove: function (table, id) { return record({ t: 'd', table: table, id: +id, at: nowStamp() }); },
    // Mirrors logActivity() in config.php: the signed-in admin, from the office.
    log: function (action, entity, id, desc) {
      return record({ t: 'i', table: 'activity_log', r: { user_id: 2, username: 'Maram Aashna', action: action,
        entity: entity, entity_id: id === null || id === undefined ? null : String(id), description: desc,
        ip_address: '127.0.0.1', created_at: nowStamp(), deleted_at: null } });
    }
  };
  return api;
}());
