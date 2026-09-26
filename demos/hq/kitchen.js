/**
 * Meal Order: meal_order_page.dart, menu_page.dart, orders_page.dart,
 * select_day_page.dart, order_detail_page.dart, meals_page.dart, with the
 * shared pieces from kitchen_ui.dart and meal_data.dart. hq-web proxies the
 * kitchen service (KitchenController); its answers come from sample data.
 */
(function (H) {
  'use strict';
  var t = H.t, esc = H.esc, icon = H.icon, el = H.el, Api = H.Api, pad = H.pad;

  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fullDay(d) { return H.WEEKDAY[d.getDay()] + ', ' + d.getDate() + ' ' + H.MONTH[d.getMonth()] + ' ' + d.getFullYear(); }
  function range(s, e) { return s.getDate() + ' to ' + e.getDate() + ' ' + H.MONTH[e.getMonth()] + ' ' + e.getFullYear(); }
  function monday(d) { var x = H.startOfDay(d); return H.addDays(x, -((x.getDay() + 6) % 7)); }
  function isPast(d) { return H.startOfDay(d) < H.startOfDay(new Date()); }

  /* ==== MealOrder (meal_data.dart) ======================================== */
  function parsePreference(pref) {
    if (pref === 'No Rice') return ['No Rice', null, []];
    if (pref.indexOf('Rice Only') !== -1) {
      return [pref.indexOf('Brown') === 0 ? 'Brown' : 'White', pref.indexOf('More') !== -1 ? 'More' : pref.indexOf('Less') !== -1 ? 'Less' : 'Normal', []];
    }
    var sel = ['Pork', 'Meat', 'Vegetables'];
    if (pref.indexOf('NO PORK') !== -1) sel.splice(sel.indexOf('Pork'), 1);
    if (pref.indexOf('NO MEAT') !== -1) sel.splice(sel.indexOf('Meat'), 1);
    if (pref.indexOf('NO VEG') !== -1) sel.splice(sel.indexOf('Vegetables'), 1);
    return [pref.indexOf('Brown') === 0 ? 'Brown' : 'White', pref.indexOf('Less') !== -1 ? 'Less' : pref.indexOf('More') !== -1 ? 'More' : 'Normal', sel];
  }
  function summary(o) {
    var rice = o.rice || 'White', size = o.size || 'Normal';
    if (rice === 'No Rice') return 'No Rice';
    var rn = rice === 'Brown' ? 'Brown' : 'White', sn = size === 'Less' ? 'Less' : size === 'More' ? 'More' : 'Normal';
    var hp = o.sel.indexOf('Pork') !== -1, hm = o.sel.indexOf('Meat') !== -1, hv = o.sel.indexOf('Vegetables') !== -1;
    if (!hp && !hm && !hv) { var base = rn + ' Rice Only'; return sn === 'Normal' ? base : base + ' ' + sn; }
    var ex = [];
    if (!hp) ex.push('NO PORK'); if (!hm) ex.push('NO MEAT'); if (!hv) ex.push('NO VEG');
    return ex.length ? rn + ' ' + sn + ' ' + ex.join(' ') : rn + ' ' + sn;
  }
  function orderFromJson(j) {
    var p = parsePreference(j.meal_preference || '');
    return { id: j.id, date: H.parseLocal(j.order_date), mealName: j.meal_name || '', imagePath: j.image_base64 || '', rice: p[0], size: p[1], sel: p[2], qty: j.order_quantity || 1 };
  }

  /* ==== ApiManager (kitchen) ============================================== */
  function fail(r, fb) { throw H.ErrorDescription((r.body && (r.body.error || r.body.message)) || fb); }
  var K = {
    sync: function () { return Api.request('POST', '/kitchen/sync-user').catch(function () {}); },
    departments: function () { return Api.request('GET', '/kitchen/departments').then(function (r) { if (r.status === 200 && r.body.success === true) return r.body.data; fail(r, 'Failed to fetch departments'); }); },
    userDept: function () {
      return Api.request('GET', '/kitchen/department').then(function (r) {
        if (r.status === 200 && r.body.success === true) { var d = r.body.data; return d && d.department_id ? { id: d.department_id, name: d.department_name } : null; }
        fail(r, 'Failed to fetch department');
      });
    },
    setDept: function (id) { return Api.request('POST', '/kitchen/department', { department_id: id }).then(function (r) { if (r.status !== 200 || r.body.success !== true) fail(r, 'Failed to save department'); }); },
    orders: function () { return Api.request('GET', '/kitchen/orders').then(function (r) { if (r.status === 200 && r.body.success === true) return r.body.data.map(orderFromJson); fail(r, 'Failed to fetch orders'); }); },
    add: function (o) {
      return Api.request('POST', '/kitchen/orders', { date: dateKey(o.date), meal_preference: summary(o), quantity: o.qty }).then(function (r) {
        if (r.status === 200 && r.body.success === true) return r.body.data.id;
        fail(r, 'Failed to add order');
      });
    },
    edit: function (o) { return Api.request('PATCH', '/kitchen/orders/' + o.id, { meal_preference: summary(o), quantity: o.qty }).then(function (r) { if (r.status !== 200 || r.body.success !== true) fail(r, 'Failed to edit order'); }); },
    del: function (id) { return Api.request('DELETE', '/kitchen/orders/' + id).then(function (r) { if (r.status !== 200 || r.body.success !== true) fail(r, 'Failed to delete order'); }); },
    menu: function (off) {
      return Api.request('GET', '/kitchen/menu/weekly?week_offset=' + off).then(function (r) {
        if (r.status === 200 && r.body.success === true) return r.body.data || { menu: [] };
        fail(r, 'Failed to fetch menu');
      });
    },
    likes: function () { return Api.request('GET', '/kitchen/food-items/likes').then(function (r) { if (r.status === 200) return r.body.data || []; fail(r, 'Unknown error'); }); },
    like: function (id, on) { return Api.request(on ? 'POST' : 'DELETE', '/kitchen/food-items/' + id + '/likes').then(function (r) { if (r.status !== 200) fail(r, 'Unknown error'); }); }
  };

  /* ==== kitchen_ui.dart ================================================== */
  function Cutoff(j) {
    j = j || {};
    var c = { time: String(j.time || '10:00'), display: String(j.display || '10:00 AM') };
    function at(day) { var p = c.time.split(':'); return new Date(day.getFullYear(), day.getMonth(), day.getDate(), parseInt(p[0], 10) || 9, parseInt(p[1], 10) || 0); }
    c.isLockedFor = function (day) {
      var n = new Date(), td = H.startOfDay(n), d = H.startOfDay(day);
      if (d < td) return true;
      if (d > td) return false;
      return !(n < at(day));
    };
    c.isClosingSoonFor = function (day) { var n = new Date(); return H.sameDay(day, n) && n < at(day); };
    return c;
  }
  function toast(msg, ok) {
    var n = el('<div class="top-toast" role="status" style="background:' + (ok === false ? '#FDECEA' : 'var(--green-light)') + ';border:1px solid ' + (ok === false ? 'rgba(180,35,24,0.25)' : 'rgba(46,88,56,0.25)') + '">' +
      icon(ok === false ? 'error_outline_rounded' : 'check_circle_rounded') + '<span>' + esc(msg) + '</span></div>');
    n.querySelector('.mi').style.color = ok === false ? '#B42318' : 'var(--green)';
    document.getElementById('app').appendChild(n);
    function hide() { n.classList.remove('show'); setTimeout(function () { n.remove(); }, 280); }
    n.onclick = hide;
    H.raf(function () { n.classList.add('show'); });
    setTimeout(hide, 2600);
  }
  function cutoffDialog(display) {
    return H.cute({ icon: 'lock_clock_rounded', tint: '#FFF4D6', color: '#B7791F', title: "That's a wrap for today! 🍱",
      message: "Today's orders closed at " + display + ", so they can't be changed or cancelled anymore. You can still order for tomorrow onwards though!", ok: 'Got it' });
  }
  function errorMessage(e, fallback, display) {
    var raw = String(e && e.message || e).replace(/^(Exception|ErrorDescription):\s*/, '').trim(), low = raw.toLowerCase();
    if (!raw) return fallback;
    if (/cut-off|cutoff|closed for|no longer|too late|past the/.test(low)) {
      return display ? "Today's orders closed at " + display + '. You can still order for tomorrow onwards.' : "Today's orders are closed. You can still order for tomorrow onwards.";
    }
    var technical = raw.length > 140 || /[\n<{]/.test(raw) || raw.indexOf('#0 ') !== -1 || /exception|sqlstate|stack trace|null/.test(low);
    return technical ? fallback : raw;
  }
  function weekSelector(label, hl) {
    return '<div class="k-card k-week"><button class="press" data-prev aria-label="Previous week">' + icon('chevron_left_rounded') + '</button><span class="' + (hl ? 'hl' : '') + '">' + esc(label) + '</span>' +
      '<button class="press" data-next aria-label="Next week">' + icon('chevron_right_rounded') + '</button></div>';
  }
  function badge(closingSoon, openLabel, lockLabel, display) {
    return closingSoon ? '<span class="k-badge warn">' + icon('timer_outlined') + esc(openLabel + ' ' + display) + '</span>' : '<span class="k-badge lock">' + icon('lock_clock_rounded') + esc(lockLabel) + '</span>';
  }
  // Image.asset() on the kitchen's base64 string always misses, so these rows
  // show the restaurant icon fallback, exactly as they do on a phone.
  function assetFallback(size, grey) {
    return '<span class="k-img' + (grey ? ' grey' : '') + '" style="width:' + size + 'px;height:' + size + 'px">' + icon('restaurant') + '</span>';
  }
  function emptyState(ic, msg, h) {
    return '<div class="k-empty" style="height:' + (h || 320) + 'px"><i>' + icon(ic) + '</i><p>' + esc(msg) + '</p></div>';
  }

  /* ==== MealOrderPage ===================================================== */
  function MealOrderPage() {
    var orders = [], deptId = null, deptName = null, departments = [], deptLoading = true;
    var node = H.screen('', H.hero(t('mealOrder'), t('mealOrderSubtitle')) + '<div class="scroll" style="padding:12px 20px 24px" data-body></div>');
    var sc = { el: node }, body = node.querySelector('[data-body]');
    var WEEK = function () { return [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')]; };
    var MONTHS = function () { return ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].map(t); };
    function todayOrders() {
      var k = dateKey(new Date());
      return orders.filter(function (o) { return dateKey(o.date) === k; });
    }
    function yellow(ic) {
      var dots = [[10, 6, 5], [19, 2, 9], [31, 11, 4], [21, 23, 14], [7, 29, 6], [36, 30, 5], [28, 43, 8]];
      return '<span class="k-yellow"><span class="blob"></span>' + dots.map(function (d) { return '<span class="d" style="left:' + d[0] + 'px;top:' + d[1] + 'px;width:' + d[2] + 'px;height:' + d[2] + 'px"></span>'; }).join('') +
        '<span class="d" style="left:15px;bottom:10px;width:5px;height:5px"></span><span class="pill" style="left:40px;top:16px;width:20px;height:8px"></span><span class="pill" style="left:35px;top:50px;width:18px;height:7px"></span>' +
        '<span class="ic">' + icon(ic, 'sh') + icon(ic) + '</span></span>';
    }
    function nav(label, sub, ic, key) {
      return '<button class="k-card k-nav press" data-nav="' + key + '"><div><b>' + esc(label) + '</b><small>' + esc(sub) + '</small></div>' + yellow(ic) + '</button>';
    }
    function paint() {
      var n = new Date(), label = WEEK()[(n.getDay() + 6) % 7] + ', ' + n.getDate() + ' ' + MONTHS()[n.getMonth()] + ' ' + n.getFullYear(), td = todayOrders();
      var has = deptId !== null, accent = has ? 'var(--green)' : '#B23B3B';
      body.innerHTML = '<div class="k-card k-today"><h3>' + esc(t('today')) + '</h3><small>' + esc(label) + '</small>' +
        (td.length ? '<div style="height:14px"></div>' + td.map(function (o) {
          return '<div class="k-order">' + assetFallback(46) + '<div><b>' + esc(o.mealName) + '</b><small>' + esc(summary(o)) + '</small></div><span class="qty">' + o.qty + '</span></div>';
        }).join('') : '<p>' + esc(t('noOrdersForToday')) + '</p>') + '</div><div style="height:22px"></div>' +
        '<button class="k-card k-dept press" data-dept' + (deptLoading ? ' disabled' : '') + '><i style="background:color-mix(in srgb,' + accent + ' 14%,transparent);color:' + accent + '">' + icon('apartment_rounded') + '</i><div><small>' + esc(t('department')) + '</small>' +
        (deptLoading ? '<span class="bone pulse" style="display:block;width:138px;height:13px;margin-top:2px;border-radius:7px"></span>' : '<b style="color:' + (has ? 'var(--ink)' : '#B23B3B') + '">' + esc(deptName || t('selectYourDepartment')) + '</b>') +
        '</div>' + icon('keyboard_arrow_down_rounded') + '</button><div style="height:14px"></div>' +
        nav(t('menu'), t('menuDesc'), 'calendar_month_rounded', 'menu') + '<div style="height:14px"></div>' + nav(t('orders'), t('ordersDesc'), 'receipt_long_rounded', 'orders') +
        '<div style="height:14px"></div>' + nav(t('meals'), t('mealsDesc'), 'soup_kitchen_rounded', 'meals');
      body.querySelector('[data-dept]').onclick = function () { if (!deptLoading) openPicker(); };
      body.querySelectorAll('[data-nav]').forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.nav;
          if (k !== 'meals' && deptId === null) { H.snack(t('selectDepartmentFirst')); return openPicker(); }
          if (k === 'menu') H.push(MenuPage(function (o) { orders.push(o); paint(); }));
          else if (k === 'orders') H.push(OrdersPage(orders, function (u) { orders = u.slice(); paint(); }));
          else H.push(MealsPage());
        };
      });
    }
    function openPicker() {
      var ready = departments.length ? Promise.resolve() : K.departments().then(function (d) { departments = d; }).catch(function () {});
      ready.then(function () {
        if (!departments.length) return;
        H.sheet('<div class="handle" style="width:40px;background:rgba(0,0,0,0.12)"></div><div style="padding:16px 20px 8px;font-size:16px;font-weight:800">' + esc(t('selectYourDepartment')) + '</div>' +
          '<div class="tile-list" style="overflow-y:auto;padding-bottom:8px">' + departments.map(function (d, i) {
            return (i ? '<div style="height:1px;background:rgba(0,0,0,0.12)"></div>' : '') + '<button data-d="' + i + '" style="min-height:56px;padding:8px 16px 8px 16px"><span style="font-weight:600">' + esc(d.name) + '</span>' +
              (d.id === deptId ? '<span class="mi" style="color:var(--green);font-size:24px">check_rounded</span>' : '') + '</button>';
          }).join('') + '</div>', { wire: function (s, o) { s.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { o.close(departments[+b.dataset.d]); }; }); } }).then(function (d) {
          if (!d) return;
          var prev = [deptId, deptName];
          deptId = d.id; deptName = d.name; paint();
          K.setDept(d.id).catch(function () { deptId = prev[0]; deptName = prev[1]; paint(); H.snack('Could not save department. Please try again.'); });
        });
      });
    }
    sc.enter = function () {
      paint();
      K.sync().then(function () {
        return K.orders().then(function (o) { orders = o; paint(); }).catch(function () {});
      }).then(function () {
        return K.departments().then(function (d) {
          departments = d;
          return K.userDept().then(function (c) { deptId = c ? c.id : null; deptName = c ? c.name : null; });
        }).catch(function () {});
      }).then(function () { deptLoading = false; paint(); });
    };
    return sc;
  }

  /* ==== MenuPage =========================================================== */
  function MenuPage(onOrderAdded) {
    var off = 0, data = {}, cutoff = Cutoff(), loading = true, error = null;
    var node = H.screen('', '<div data-hero></div><div style="flex:1;min-height:0;display:flex;flex-direction:column" data-body></div>');
    var sc = { el: node }, body = node.querySelector('[data-body]');
    function weekStart() { return H.addDays(monday(new Date()), off * 7); }
    function load() {
      loading = true; error = null; paint();
      K.menu(off).then(function (d) {
        data = {};
        (d.menu || []).forEach(function (m) {
          data[m.order_date] = { date: H.parseLocal(m.order_date), name: m.name, image: m.image_base64, brown: m.brown_rice_enabled !== 0 && m.brown_rice_enabled !== false };
        });
        cutoff = Cutoff(d.cutoff); loading = false;
      }).catch(function () { error = 'Failed to load menu. Tap to retry.'; loading = false; }).then(paint);
    }
    function paint() {
      var ws = weekStart(), we = H.addDays(ws, 4);
      node.querySelector('[data-hero]').innerHTML = H.hero('Menu', range(ws, we));
      if (loading) { body.innerHTML = '<div style="flex:1;display:grid;place-items:center"><span class="spin"></span></div>'; return; }
      if (error) { body.innerHTML = '<div style="flex:1;display:grid;place-items:center"><button class="text-btn" data-retry style="color:var(--muted);font-size:13px">' + esc(error) + '</button></div>'; body.querySelector('[data-retry]').onclick = load; return; }
      var days = [0, 1, 2, 3, 4].map(function (i) { return H.addDays(ws, i); });
      var any = days.some(function (d) { return data[dateKey(d)]; });
      body.innerHTML = '<div class="scroll" style="padding:12px 20px 24px">' + weekSelector(off === 0 ? 'Current Week' : range(ws, we), off === 0) + '<div style="height:14px"></div><div class="k-card">' +
        (!any ? '<div style="padding:48px 0;text-align:center;font-size:13px;color:var(--muted)">This week\'s menu is yet to be set.</div>' : days.map(function (d, i) {
          var m = data[dateKey(d)], past = isPast(d), has = !!m && !past, locked = has && cutoff.isLockedFor(d), soon = has && cutoff.isClosingSoonFor(d), grey = past || !m || locked;
          var pic = m && m.image ? '<span class="pic' + (grey ? ' grey' : '') + '"><img src="' + esc(m.image) + '" alt=""></span>' : '<span class="pic">' + icon('restaurant') + '</span>';
          return (i ? '<div class="k-sep"></div>' : '') + '<button class="k-day press' + (soon ? ' warm' : '') + '" data-d="' + dateKey(d) + '"' + (has || locked ? '' : ' disabled') + '>' + pic +
            '<div><b class="' + (grey ? 'grey' : '') + '">' + esc(m ? m.name : '—') + '</b><small>' + esc(fullDay(d)) + '</small>' + (soon || locked ? badge(soon, 'Closes', 'Closed for today', cutoff.display) : '') + '</div></button>';
        }).join('')) + '</div></div>';
      body.querySelector('[data-prev]').onclick = function () { off--; load(); };
      body.querySelector('[data-next]').onclick = function () { off++; load(); };
      body.querySelectorAll('[data-d]').forEach(function (b) {
        b.onclick = function () {
          var d = H.parseLocal(b.dataset.d), m = data[b.dataset.d];
          if (cutoff.isLockedFor(d)) return cutoffDialog(cutoff.display);
          H.push(OrderDetailPage({ date: m.date, name: m.name, rice: m.brown ? ['White', 'Brown', 'No Rice'] : ['White', 'No Rice'] }, null, null, cutoff.display));
        };
      });
    }
    sc.resume = function (order) { if (order) { if (onOrderAdded) onOrderAdded(order); toast('Order placed. Enjoy your meal!'); } };
    sc.enter = function () { K.sync(); load(); };
    return sc;
  }

  /* ==== OrderDetailPage ==================================================== */
  function OrderDetailPage(meal, existing, onRemove, cutoffDisplay) {
    var sizes = ['Normal', 'More', 'Less'], sels = ['Pork', 'Meat', 'Vegetables'];
    var rice = existing ? existing.rice : meal.rice[0];
    if (rice && meal.rice.indexOf(rice) === -1) rice = meal.rice[0];
    var size = existing ? existing.size : sizes[0], sel = existing ? existing.sel.slice() : sels.slice(), qty = existing ? existing.qty : 1, saving = false;
    var orig = { rice: rice, size: size, sel: sel.join(','), qty: qty };
    var d = meal.date;
    var node = H.screen('', H.hero('Order', fullDay(d)) + '<div class="scroll" style="padding-bottom:8px" data-body></div><div class="k-bottom"><button class="k-btn" data-go></button></div>');
    var sc = { el: node }, body = node.querySelector('[data-body]'), go = node.querySelector('[data-go]');
    function changed() { return !existing || rice !== orig.rice || size !== orig.size || qty !== orig.qty || sel.join(',') !== orig.sel; }
    function showRemove() { return qty === 0 || (existing && !changed()); }
    function radio(lab, on, attr) { return '<button class="k-opt press' + (on ? ' on' : '') + '" ' + attr + '><span class="k-radio">' + (on ? '<i></i>' : '') + '</span>' + esc(lab) + '</button>'; }
    function paint() {
      body.innerHTML = '<div class="k-hero">' + icon('restaurant') + '</div><div class="k-card k-form"><h3>' + esc(meal.name || '') + '</h3><div class="k-hr"></div>' +
        '<div class="k-sec">Rice</div>' + meal.rice.map(function (r) { return radio(r, rice === r, 'data-rice="' + r + '"'); }).join('') + '<div class="k-hr"></div>' +
        '<div class="k-sec">Size</div>' + sizes.map(function (s) { return radio(s, size === s, 'data-size="' + s + '"'); }).join('') + '<div class="k-hr"></div>' +
        '<div class="k-sec">Selection</div>' + sels.map(function (s) {
          var on = sel.indexOf(s) !== -1;
          return '<button class="k-opt press' + (on ? ' on' : '') + '" data-sel="' + s + '"><span class="k-check">' + (on ? icon('check') : '') + '</span>' + esc(s) + '</button>';
        }).join('') + '<div class="k-hr"></div><div class="k-qty"><button class="press" data-q="-1"' + (qty > 0 ? '' : ' disabled') + ' aria-label="Less">' + icon('remove') + '</button><b>' + qty + '</b>' +
        '<button class="press" data-q="1" aria-label="More">' + icon('add') + '</button></div></div>';
      go.className = 'k-btn' + (showRemove() ? ' red' : '');
      go.disabled = saving;
      go.textContent = showRemove() ? 'Remove' : 'Save';
      body.querySelectorAll('[data-rice]').forEach(function (b) { b.onclick = function () { rice = b.dataset.rice; paint(); }; });
      body.querySelectorAll('[data-size]').forEach(function (b) { b.onclick = function () { size = b.dataset.size; paint(); }; });
      body.querySelectorAll('[data-sel]').forEach(function (b) {
        b.onclick = function () { var i = sel.indexOf(b.dataset.sel); if (i !== -1) sel.splice(i, 1); else sel.push(b.dataset.sel); paint(); };
      });
      body.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { qty += +b.dataset.q; paint(); }; });
    }
    go.onclick = function () {
      if (saving) return;
      if (showRemove()) { if (onRemove) onRemove(); else H.pop(null); return; }
      var o = { id: existing ? existing.id : null, date: d, mealName: meal.name || '', imagePath: '', rice: rice, size: size, sel: sel.slice(), qty: qty };
      saving = true; paint();
      (o.id ? K.edit(o) : K.add(o).then(function (id) { o.id = id; })).then(function () { H.pop(o); }).catch(function (e) {
        saving = false; paint();
        toast(errorMessage(e, "Couldn't save your order. Please try again.", cutoffDisplay), false);
      });
    };
    sc.enter = function () { K.sync(); paint(); };
    return sc;
  }

  /* ==== OrdersPage ========================================================= */
  function OrdersPage(initial, onChanged) {
    var off = 0, local = initial.slice(), loading = true, error = null, menu = {}, cutoff = Cutoff();
    var node = H.screen('', '<div data-hero></div><div style="flex:1;min-height:0;display:flex;flex-direction:column" data-body></div>' +
      '<div class="k-bottom"><button class="k-btn" data-add>Add Order</button></div>');
    var sc = { el: node }, body = node.querySelector('[data-body]'), pending = null;
    function weekStart() { return H.addDays(monday(new Date()), off * 7); }
    function fetchOrders() {
      return K.orders().then(function (o) { local = o; loading = false; error = null; paint(); onChanged(local); })
        .catch(function (e) { loading = false; error = String(e.message || e); paint(); });
    }
    function fetchMenu() {
      K.menu(off).then(function (d) {
        if (!d.menu) return;
        menu = {};
        d.menu.forEach(function (m) {
          var brown = m.brown_rice_enabled !== 0 && m.brown_rice_enabled !== false;
          menu[m.order_date] = { date: H.parseLocal(m.order_date), name: m.name, rice: brown ? ['White', 'Brown', 'No Rice'] : ['White', 'No Rice'] };
        });
        cutoff = Cutoff(d.cutoff); paint();
      }).catch(function () {});
    }
    function removeOrder(o) {
      local = local.filter(function (x) { return x !== o; }); onChanged(local); paint();
      if (o.id === null) return;
      K.del(o.id).catch(function (e) {
        local.unshift(o); onChanged(local); paint();
        toast(errorMessage(e, "Couldn't cancel your order. Please try again.", cutoff.display), false);
      });
    }
    function paint() {
      var ws = weekStart(), we = H.addDays(ws, 4);
      node.querySelector('[data-hero]').innerHTML = H.hero('Orders', range(ws, we));
      if (loading) { body.innerHTML = '<div style="flex:1;display:grid;place-items:center"><span class="spin"></span></div>'; return; }
      if (error) {
        body.innerHTML = '<div style="flex:1;display:grid;place-items:center;text-align:center;font-size:13px;color:var(--muted);white-space:pre-line" data-retry>Failed to load orders: ' + esc(error) + '\nTap to retry.</div>';
        body.querySelector('[data-retry]').onclick = fetchOrders;
        return;
      }
      var groups = '', any = false, hasMenu = false;
      for (var i = 0; i < 5; i++) {
        var d = H.addDays(ws, i), key = dateKey(d), day = local.filter(function (o) { return dateKey(o.date) === key; });
        if (menu[key]) hasMenu = true;
        if (!day.length) continue;
        any = true;
        groups += '<div class="k-dayhead">' + esc(fullDay(d)) + '</div>' + day.map(function (o) {
          var past = isPast(d), closedToday = !past && cutoff.isLockedFor(d), soon = cutoff.isClosingSoonFor(d), grey = past || closedToday;
          return '<button class="k-oc press' + (soon ? ' warm' : '') + '" data-o="' + local.indexOf(o) + '"' + (!grey || closedToday ? '' : ' disabled') + '>' + assetFallback(46, grey) +
            '<div><b class="' + (grey ? 'grey' : '') + '">' + esc(o.mealName) + '</b>' + (summary(o) ? '<small>' + esc(summary(o)) + '</small>' : '') +
            (soon || closedToday ? badge(soon, 'Edit until', 'Locked for today', cutoff.display) : '') + '</div><span class="qty' + (grey ? ' grey' : '') + '">' + o.qty + '</span></button>';
        }).join('') + '<div style="height:8px"></div>';
      }
      body.innerHTML = '<div class="scroll" style="padding:12px 20px 8px">' + weekSelector(off === 0 ? 'Current Week' : range(ws, we), off === 0) + '<div style="height:16px"></div>' +
        (any ? groups : emptyState('receipt_long_rounded', off >= 0 && !hasMenu ? "This week's menu is yet to be set." : 'No orders for this week.')) + '</div>';
      body.querySelector('[data-prev]').onclick = function () { off--; paint(); fetchMenu(); };
      body.querySelector('[data-next]').onclick = function () { off++; paint(); fetchMenu(); };
      body.querySelectorAll('[data-o]').forEach(function (b) {
        b.onclick = function () {
          var o = local[+b.dataset.o], d = o.date;
          if (!isPast(d) && cutoff.isLockedFor(d)) return cutoffDialog(cutoff.display);
          var m = menu[dateKey(d)];
          if (!m) return;
          pending = { kind: 'edit', order: o };
          H.push(OrderDetailPage(m, o, function () { removeOrder(o); pending = null; H.pop(); }, cutoff.display));
        };
      });
    }
    node.querySelector('[data-add]').onclick = function () { pending = { kind: 'add' }; H.push(SelectDayPage(menu, cutoff)); };
    sc.resume = function (result) {
      var p = pending; pending = null;
      if (!result || !p) return;
      if (p.kind === 'add') { local.push(result); onChanged(local); paint(); fetchOrders(); toast('Order added. Enjoy your meal!'); }
      else { var i = local.indexOf(p.order); if (i !== -1) local[i] = result; onChanged(local); paint(); toast('Order updated'); }
    };
    sc.enter = function () { K.sync(); paint(); fetchOrders(); fetchMenu(); };
    return sc;
  }

  /* ==== SelectDayPage ====================================================== */
  function SelectDayPage(menu, cutoff) {
    var ws = monday(new Date()), we = H.addDays(ws, 4);
    var node = H.screen('', H.pageHeader('Select Day', range(ws, we)) + '<div class="scroll" style="padding:12px 20px 24px"><div class="k-card" data-list></div></div>');
    var sc = { el: node }, list = node.querySelector('[data-list]');
    list.innerHTML = [0, 1, 2, 3, 4].map(function (i) {
      var d = H.addDays(ws, i), m = menu[dateKey(d)], past = isPast(d), today = H.sameDay(d, new Date()), has = !!m && !past;
      var locked = has && cutoff.isLockedFor(d), soon = has && cutoff.isClosingSoonFor(d), tap = has && !locked, grey = past || !m || locked;
      return (i ? '<div class="k-sep"></div>' : '') + '<button class="k-day press' + (soon ? ' warm' : today && tap ? ' gold' : '') + '" data-d="' + dateKey(d) + '"' + (tap || locked ? '' : ' disabled') + '>' +
        '<span class="pic">' + icon('restaurant') + '</span><div><b class="' + (grey ? 'grey' : '') + '">' + esc(m ? m.name : '—') + '</b><small>' + esc(fullDay(d)) + '</small>' +
        (soon || locked ? badge(soon, 'Closes', 'Closed for today', cutoff.display) : '') + '</div></button>';
    }).join('');
    list.querySelectorAll('[data-d]').forEach(function (b) {
      b.onclick = function () {
        var d = H.parseLocal(b.dataset.d);
        if (cutoff.isLockedFor(d)) return cutoffDialog(cutoff.display);
        H.push(OrderDetailPage(menu[b.dataset.d], null, null, cutoff.display));
      };
    });
    sc.resume = function (order) { if (order) setTimeout(function () { H.pop(order); }, 60); };
    return sc;
  }

  /* ==== MealsPage ========================================================== */
  function MealsPage() {
    var meals = [], loading = true, error = null, q = '', timers = {}, committed = {};
    var node = H.screen('', H.hero('Meals', 'Double-tap to like a meal') +
      '<label class="k-search">' + icon('search_rounded') + '<input data-q placeholder="Search Meals"></label><div class="scroll" style="padding:10px 20px 24px" data-body></div>');
    var sc = { el: node }, body = node.querySelector('[data-body]');
    function filtered() { return q ? meals.filter(function (m) { return m.food_item_name.toLowerCase().indexOf(q.toLowerCase()) !== -1; }) : meals; }
    function paint() {
      if (loading) {
        body.innerHTML = [0, 1, 2, 3, 4, 5].map(function () {
          return '<div class="meal-card"><span class="shimmer" style="width:56px;height:56px;border-radius:10px"></span><div><span class="shimmer" style="display:block;height:14px;border-radius:6px"></span>' +
            '<span class="shimmer" style="display:block;width:80px;height:12px;border-radius:6px;margin-top:6px"></span></div><span class="shimmer" style="width:22px;height:22px;border-radius:11px"></span></div>';
        }).join('');
        return;
      }
      if (error) {
        body.innerHTML = '<div style="height:100%;display:grid;place-items:center;text-align:center;color:var(--muted);font-size:13px" data-retry><div>' + icon('wifi_off_rounded') + '<div style="margin-top:12px">' + esc(error) + '</div></div></div>';
        body.querySelector('.mi').style.fontSize = '40px';
        body.querySelector('[data-retry]').onclick = load;
        return;
      }
      var list = filtered();
      if (!list.length) { body.innerHTML = emptyState('search_off_rounded', 'No meals found.', 360); return; }
      body.innerHTML = list.map(function (m) {
        return '<div class="meal-card" data-m="' + m.food_item_id + '"><img src="' + esc(m.image) + '" alt=""><div><b>' + esc(m.food_item_name) + '</b><small>' + m.total_likes + ' ' + (m.total_likes === 1 ? 'like' : 'likes') + '</small></div>' +
          '<button class="' + (m.is_liked ? 'liked' : '') + '" data-like="' + m.food_item_id + '" aria-label="Like">' + icon(m.is_liked ? 'favorite_rounded' : 'favorite_border_rounded') + '</button></div>';
      }).join('');
      body.querySelectorAll('[data-like]').forEach(function (b) { b.onclick = function () { toggle(b.dataset.like); }; });
      body.querySelectorAll('[data-m]').forEach(function (c) { c.ondblclick = function () { toggle(c.dataset.m); }; });
    }
    function toggle(id) {
      var m = meals.filter(function (x) { return String(x.food_item_id) === String(id); })[0];
      if (!m) return;
      m.is_liked = !m.is_liked; m.total_likes += m.is_liked ? 1 : -1; paint();
      if (!(id in committed)) committed[id] = !m.is_liked;
      clearTimeout(timers[id]);
      timers[id] = setTimeout(function () {
        var liked = m.is_liked;
        if (committed[id] === liked) return;
        K.like(m.food_item_id, liked).then(function () { committed[id] = liked; }).catch(function () { m.is_liked = !liked; m.total_likes += liked ? -1 : 1; paint(); });
      }, 600);
    }
    function load() {
      loading = true; error = null; paint();
      K.sync().then(K.likes).then(function (raw) { meals = raw.map(function (x) { return Object.assign({}, x); }); loading = false; })
        .catch(function () { error = 'Failed to load meals. Tap to retry.'; loading = false; }).then(paint);
    }
    node.querySelector('[data-q]').oninput = function () { q = this.value; paint(); };
    sc.enter = load;
    return sc;
  }

  H.screens.MealOrderPage = MealOrderPage;
})(HQ);
