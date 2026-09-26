/**
 * Meetings: meeting_rooms_page.dart, meeting_schedule_page.dart,
 * create_meeting_page.dart and edit_meeting_page.dart. Rooms, agendas,
 * people and suggested times come from hq-web's Microsoft Graph routes.
 */
(function (H) {
  'use strict';
  var t = H.t, esc = H.esc, icon = H.icon, el = H.el, pad = H.pad, Api = H.Api;

  /* ==== ApiManager: rooms + Graph ======================================== */
  function errOf(r) { return (r.body && (r.body.error || r.body.message)) || 'HTTP ' + r.status; }
  var M = {
    getMeetingRooms: function () {
      return Api.request('GET', '/microsoft/meeting-rooms').then(function (r) {
        if (r.status === 200) return r.body.data || [];
        throw H.ErrorDescription(errOf(r));
      });
    },
    getLocations: function () {
      return Api.request('GET', '/meeting-rooms/locations').then(function (r) {
        if (r.status === 200) return r.body.data || [];
        throw H.ErrorDescription(errOf(r));
      });
    },
    patch: function (email, what, body) {
      return Api.request('PATCH', '/meeting-rooms/' + encodeURIComponent(email) + '/' + what, body).then(function (r) {
        if (r.status >= 200 && r.status < 300) return r.body;
        throw H.ErrorDescription((r.body && r.body.message) || 'HTTP ' + r.status);
      });
    },
    del: function (email) {
      return Api.request('DELETE', '/meeting-rooms/' + encodeURIComponent(email)).then(function (r) {
        if (r.status < 200 || r.status >= 300) throw H.ErrorDescription((r.body && r.body.message) || 'HTTP ' + r.status);
      });
    },
    create: function (body) {
      return Api.request('POST', '/meeting-rooms', body).then(function (r) {
        if (r.status < 200 || r.status >= 300) throw H.ErrorDescription((r.body && r.body.message) || 'HTTP ' + r.status);
      });
    },
    roomCalendar: function (email, s, e) {
      var q = '?startDate=' + H.ymd(s) + 'T00:00:00&endDate=' + H.ymd(e) + 'T23:59:59';
      return Api.request('GET', '/microsoft/rooms/' + encodeURIComponent(email) + '/calendar' + q).then(function (r) {
        if (r.status === 200 && r.body.success === true) return r.body.data;
        throw H.ErrorDescription(errOf(r));
      });
    },
    people: function (search, cursor) {
      return Api.request('GET', '/microsoft/me/people?search=' + (search || '') + '&cursor=' + (cursor || '')).then(function (r) {
        if (r.status === 200) return r.body;
        throw H.ErrorDescription(errOf(r));
      });
    },
    findTimes: function (attendees, s, e) {
      return Api.request('POST', '/microsoft/me/findMeetingTimes', { attendees: attendees, startTime: H.dartIso(s), endTime: H.dartIso(e) }).then(function (r) {
        if (r.status === 200) return r.body.data;
        throw H.ErrorDescription(errOf(r));
      });
    },
    createMeeting: function (b) {
      return Api.request('POST', '/microsoft/me/events', b).then(function (r) {
        if (r.status === 200) return r.body.link || '';
        throw H.ErrorDescription(r.body.message || r.body.error || 'Unknown error');
      });
    },
    updateMeeting: function (id, body) {
      return Api.request('PATCH', '/microsoft/me/events/' + id, body).then(function (r) {
        if (r.status < 200 || r.status >= 300) throw H.ErrorDescription((r.body && (r.body.message || r.body.error)) || 'Something went wrong. Please try again.');
      });
    },
    cancelMeeting: function (id) {
      return Api.request('DELETE', '/microsoft/me/events/' + id + '?scope=series').then(function (r) {
        if (r.status < 200 || r.status >= 300) throw H.ErrorDescription((r.body && (r.body.message || r.body.error)) || 'Something went wrong. Please try again.');
      });
    }
  };
  function clean(e) { var s = String(e && e.message || e); return s; }

  /* ==== MeetingRoomsPage ================================================== */
  var LEAVES = [[0.06, 0.10, 30, -0.05, 0.85], [0.40, 0.05, 22, 0.10, 0.60], [0.76, 0.14, 34, 0.18, 0.90], [0.18, 0.38, 26, 0.30, 0.70],
    [0.58, 0.36, 30, -0.12, 0.85], [0.89, 0.46, 20, 0.05, 0.55], [0.08, 0.68, 32, 0.22, 0.80], [0.44, 0.70, 24, -0.20, 0.65],
    [0.72, 0.76, 28, 0.12, 0.85], [0.28, 0.92, 22, 0.04, 0.60], [0.92, 0.86, 26, -0.08, 0.75]];
  function defaultArt() {
    return '<span class="art">' + LEAVES.map(function (l, i) {
      return '<span style="left:' + (l[0] * 100) + '%;top:' + (l[1] * 100) + '%;font-size:' + l[2] + 'px;opacity:' + l[4] + ';transform:rotate(' + (l[3] * 360) + 'deg)">' + (i % 2 ? '🌿' : '🍃') + '</span>';
    }).join('') + '</span>';
  }
  function tileList(title, rows) {
    return '<div class="handle line"></div>' + (title ? '<div class="sheet-title">' + esc(title) + '</div>' : '<div style="height:14px"></div>') +
      '<div class="tile-list" style="padding-bottom:8px;overflow-y:auto">' + rows.map(function (r, i) {
        return '<button data-i="' + i + '" class="' + (r.on ? 'on' : '') + '">' + icon(r.icon) + '<span>' + esc(r.label) + '</span>' + (r.on ? icon('check_rounded', 'check') : '') + '</button>';
      }).join('') + '</div>';
  }
  function pickFromList(title, rows) {
    return H.sheet(tileList(title, rows), { wire: function (s, o) { s.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { o.close(rows[+b.dataset.i].value); }; }); } });
  }

  function MeetingRoomsPage() {
    var roleId = +H.prefs().role_id || 0, isAdmin = roleId === 1 || roleId === 2;
    var node = H.screen('', H.hero(t('meetingRoomsTitle'), t('meetingRoomsSubtitle'),
      isAdmin ? '<button class="hero-add press" data-add aria-label="' + esc(t('addMeetingRoom')) + '">' + icon('add_rounded') + '</button>' : '') +
      '<div data-loc></div><div class="rooms" data-rooms></div>');
    var sc = { el: node }, locations = [], selectedLoc = null, rooms = null, error = null;
    var locBox = node.querySelector('[data-loc]'), box = node.querySelector('[data-rooms]');

    function locName(id) { var l = locations.filter(function (x) { return x.id === id; })[0]; return l ? l.name : null; }
    function paintLoc() {
      if (!locations.length) { locBox.innerHTML = ''; return; }
      locBox.innerHTML = '<div class="loc-bar press-soft" data-pick><i>' + icon('place_outlined') + '</i><div><small>' + esc(t('location')) + '</small><b>' +
        esc(selectedLoc === null ? t('allLocations') : (locName(selectedLoc) || t('allLocations'))) + '</b></div>' + icon('keyboard_arrow_down_rounded') + '</div>';
      locBox.querySelector('[data-pick]').onclick = function () {
        pickFromList(t('location'), [{ label: t('allLocations'), icon: 'apps_rounded', value: -1, on: selectedLoc === null }].concat(locations.map(function (l) {
          return { label: l.name, icon: 'place_outlined', value: l.id, on: selectedLoc === l.id };
        }))).then(function (v) { if (v === undefined || v === null) return; selectedLoc = v === -1 ? null : v; paintLoc(); paint(); });
      };
    }
    function paint() {
      if (rooms === null) {
        box.innerHTML = '<div class="entrance">' + [0, 1, 2, 3].map(function () { return '<div class="room-skel"><span class="bone" style="width:112px;height:11px"></span></div>'; }).join('') + '</div>';
        return;
      }
      if (error) {
        box.innerHTML = '<div class="center-note"><div>' + icon('wifi_off_rounded') + '<p style="font-size:13px;color:#777">' + esc(error) + '</p><button class="text-btn" data-retry style="color:#5F4A26">Retry</button></div></div>';
        box.querySelector('.mi').style.cssText = 'font-size:40px;color:#BBA97A';
        box.querySelector('[data-retry]').onclick = refresh;
        return;
      }
      var list = selectedLoc === null ? rooms : rooms.filter(function (r) { return r.locationId === selectedLoc; });
      if (!list.length) { box.innerHTML = '<div class="center-note">' + esc(rooms.length ? t('noRoomsInLocation') : t('noMeetingRoomsFound')) + '</div>'; return; }
      box.innerHTML = '<div class="room-list entrance" style="animation-delay:50ms"></div>';
      var listEl = box.firstChild, h = Math.max(96, (box.clientHeight - 14 * 3 - 16) / 4);
      list.forEach(function (room) {
        var card = el('<button class="room-card press-soft" style="height:' + h + 'px">' + (room.imageUrl ? '<span class="art"></span><img class="photo" src="' + esc(room.imageUrl) + '" alt="">' : defaultArt()) +
          '<span class="shade"></span><span class="name"><b>' + esc(room.name) + '</b><em>' + esc(t('book')) + '</em></span></button>');
        card.onclick = function () { H.push(MeetingSchedulePage(room.name, room.email), { smooth: true }); };
        if (isAdmin) H.longPress(card, function () { roomOptions(room); });
        listEl.appendChild(card);
      });
    }
    function load() {
      return M.getMeetingRooms().then(function (list) {
        rooms = list.map(function (r) { return { name: r.name || 'Unknown', email: r.email || '', imageUrl: r.image_url || null, locationId: r.location_id === null || r.location_id === undefined ? null : +r.location_id }; })
          .sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        error = null;
      }).catch(function (e) { rooms = []; error = clean(e); }).then(paint);
    }
    function refresh() { rooms = null; paint(); load(); }
    function roomOptions(room) {
      H.sheet('<div style="padding:12px 20px 32px"><div class="handle line" style="margin-top:0"></div><div style="height:16px"></div><b style="font-size:15px;font-weight:700">' + esc(room.name) + '</b><div style="height:6px"></div>' +
        '<button class="opt-tile press" data-a="edit_name">' + icon('edit_outlined') + '<span>' + esc(t('editRoomName')) + '</span></button>' +
        '<button class="opt-tile press" data-a="edit_picture">' + icon('image_outlined') + '<span>' + esc(t('editPicture')) + '</span></button>' +
        (locations.length ? '<button class="opt-tile press" data-a="set_location">' + icon('place_outlined') + '<span>' + esc(t('setLocation')) + '</span></button>' : '') +
        '<button class="opt-tile danger press" data-a="delete">' + icon('delete_outline_rounded') + '<span>' + esc(t('deleteRoom')) + '</span></button></div>',
      { wire: function (s, o) { s.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { o.close(b.dataset.a); }; }); } }).then(function (a) {
        if (a === 'edit_name') editName(room);
        else if (a === 'edit_picture') editPicture(room);
        else if (a === 'set_location') setLocation(room);
        else if (a === 'delete') deleteRoom(room);
      });
    }
    function editName(room) {
      H.dialog('<h2 class="bold">' + esc(t('editRoomName')) + '</h2><div class="m3-field"><input data-n value="' + esc(room.name) + '"><label>' + esc(t('roomName')) + '</label></div><div data-err></div>' +
        '<div class="actions"><button class="text-btn" data-c style="color:var(--muted)">' + esc(t('cancel')) + '</button><button class="text-btn" data-s style="font-weight:700">' + esc(t('save')) + '</button></div>',
      { wire: function (d, o) {
        d.style.borderRadius = '16px';
        var inp = d.querySelector('[data-n]'), err = d.querySelector('[data-err]');
        setTimeout(function () { inp.focus(); inp.select(); }, 50);
        function save() {
          var v = inp.value.trim();
          if (!v) { err.innerHTML = '<div class="soft-err">' + icon('edit_note_rounded') + esc(t('roomNameCannotBeEmpty')) + '</div>'; return; }
          o.close(v);
        }
        inp.oninput = function () { err.innerHTML = ''; };
        inp.onkeydown = function (e) { if (e.key === 'Enter') save(); };
        d.querySelector('[data-c]').onclick = function () { o.close(); };
        d.querySelector('[data-s]').onclick = save;
      } }).then(function (v) {
        if (!v || v === room.name) return;
        M.patch(room.email, 'name', { name: v }).then(function () { refresh(); H.snack(t('roomNameUpdated')); })
          .catch(function (e) { H.snack('Failed to update name: ' + clean(e)); });
      });
    }
    function editPicture(room) {
      H.pickFromSource(1200, 900, 0.85).then(function (b64) {
        if (!b64) return;
        M.patch(room.email, 'image', { image: b64 }).then(function () { refresh(); H.snack(t('roomPictureUpdated')); })
          .catch(function (e) { H.snack('Failed to update picture: ' + clean(e)); });
      });
    }
    function setLocation(room) {
      pickFromList(t('setLocation'), [{ label: t('noLocation'), icon: 'block_rounded', value: -1, on: room.locationId === null }].concat(locations.map(function (l) {
        return { label: l.name, icon: 'place_outlined', value: l.id, on: room.locationId === l.id };
      }))).then(function (v) {
        if (v === undefined || v === null) return;
        var id = v === -1 ? null : v;
        if (id === room.locationId) return;
        M.patch(room.email, 'location', { location_id: id }).then(function () { refresh(); H.snack(t('roomLocationUpdated')); })
          .catch(function (e) { H.snack('Failed to update location: ' + clean(e)); });
      });
    }
    function deleteRoom(room) {
      H.dialog('<h2 class="bold">' + esc(t('deleteRoom')) + '</h2><p>Remove "' + esc(room.name) + '" from the list?</p><div class="actions"><button class="text-btn" data-c style="color:var(--muted)">' + esc(t('cancel')) + '</button>' +
        '<button class="text-btn" data-d style="color:var(--danger);font-weight:700">' + esc(t('delete')) + '</button></div>',
      { wire: function (d, o) { d.style.borderRadius = '16px'; d.querySelector('[data-c]').onclick = function () { o.close(false); }; d.querySelector('[data-d]').onclick = function () { o.close(true); }; } }).then(function (ok) {
        if (ok !== true) return;
        // The Dart shows the same snackbar whether or not the delete call errors.
        M.del(room.email).catch(function () {}).then(function () { refresh(); H.snack('"' + room.name + '" removed'); });
      });
    }
    function createRoom() {
      var locId = selectedLoc, pic = null;
      H.sheet('<div style="padding:12px 20px 24px;overflow-y:auto"><div class="handle line" style="margin-top:0"></div><div style="height:18px"></div>' +
        '<b style="display:block;font-size:17px;font-weight:800">' + esc(t('addMeetingRoom')) + '</b><div style="margin-top:4px;font-size:12px;color:var(--muted)">' + esc(t('addCoverPhotoOptional')) + '</div><div style="height:18px"></div>' +
        '<label class="form-label">' + esc(t('roomName')) + '</label><input class="filled-input" data-name placeholder="e.g. Boardroom A"><div style="height:12px"></div>' +
        '<label class="form-label">' + esc(t('roomEmail')) + '</label><input class="filled-input" data-email type="email" placeholder="e.g. boardroom-a@company.com">' +
        (locations.length ? '<div style="height:12px"></div><label class="form-label">' + esc(t('location')) + '</label><button class="pick-box" data-loc>' + icon('place_outlined') + '<span data-locname></span>' + icon('keyboard_arrow_down_rounded') + '</button>' : '') +
        '<div style="height:16px"></div><button class="cover-pick" data-pic></button><div data-err></div><div style="height:20px"></div><button class="primary-btn" data-go>' + esc(t('createRoom')) + '</button></div>',
      { cls: 'r24', wire: function (s, o) {
        var err = s.querySelector('[data-err]'), go = s.querySelector('[data-go]'), picBtn = s.querySelector('[data-pic]');
        function paintLocName() { var n = s.querySelector('[data-locname]'); if (n) n.textContent = locId === null ? t('noLocation') : (locName(locId) || t('noLocation')); }
        function paintPic() {
          picBtn.innerHTML = pic ? '<img src="' + pic + '" alt=""><em>' + esc(t('change')) + '</em>' : icon('add_photo_alternate_outlined') + '<b>' + esc(t('addCoverPhotoOptional')) + '</b>';
        }
        paintLocName(); paintPic();
        var lb = s.querySelector('[data-loc]');
        if (lb) lb.onclick = function () {
          pickFromList(null, [{ label: t('noLocation'), icon: 'block_rounded', value: -1, on: locId === null }].concat(locations.map(function (l) {
            return { label: l.name, icon: 'place_outlined', value: l.id, on: locId === l.id };
          }))).then(function (v) { if (v === undefined || v === null) return; locId = v === -1 ? null : v; paintLocName(); });
        };
        picBtn.onclick = function () { H.pickFromSource(1200, 900, 0.85).then(function (b) { if (b) { pic = b; paintPic(); } }); };
        go.onclick = function () {
          var name = s.querySelector('[data-name]').value.trim(), email = s.querySelector('[data-email]').value.trim();
          function fail(m) { err.innerHTML = '<div style="margin-top:10px;font-size:12px;color:var(--danger)">' + esc(m) + '</div>'; }
          if (!name || !email) return fail(t('roomNameEmailRequired'));
          if (email.indexOf('@') === -1) return fail(t('enterValidEmail'));
          err.innerHTML = ''; go.disabled = true; go.textContent = t('creating');
          var body = { name: name, email: email };
          if (pic) body.image = pic;
          if (locId !== null) body.location_id = locId;
          M.create(body).then(function () { o.close(true); }).catch(function (e) { go.disabled = false; go.textContent = t('createRoom'); fail(clean(e)); });
        };
      } }).then(refresh);
    }
    var add = node.querySelector('[data-add]');
    if (add) add.onclick = createRoom;
    sc.enter = function () {
      paint();
      load();
      M.getLocations().then(function (l) { locations = l.map(function (x) { return { id: +x.id, name: String(x.name || '') }; }); paintLoc(); if (rooms !== null) paint(); }).catch(function () {});
    };
    return sc;
  }

  /* ==== MeetingSchedulePage =============================================== */
  var SEAT = [['top:0;left:50%;margin-left:-12px;width:24px;height:10px'], ['bottom:0;left:50%;margin-left:-12px;width:24px;height:10px'],
    ['left:5px;top:50%;margin-top:-12px;width:10px;height:24px'], ['right:5px;top:50%;margin-top:-12px;width:10px;height:24px']];
  function stripHtml(h) { return String(h || '').replace(/<[^>]+>/g, '').split('&nbsp;').join(' ').trim(); }
  function eventKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function MeetingSchedulePage(roomName, roomEmail) {
    var today = new Date(), selectedDay = new Date(today.getTime()), displayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var tab = 0, expanded = false, loading = true, loadError = null, events = {};
    var me = { email: String(H.prefs().email || '').toLowerCase(), name: String(H.prefs().username || '').toLowerCase() };
    var node = H.screen('', H.hero(t('scheduleMeeting'), roomName) + '<div data-body style="flex:1;min-height:0;display:flex;flex-direction:column"></div>' +
      '<button class="fab" data-fab aria-label="' + esc(t('newMeeting')) + '" hidden>' + icon('add') + '</button>');
    var sc = { el: node }, body = node.querySelector('[data-body]'), fab = node.querySelector('[data-fab]');
    var loc = H.locale();

    function dayLetters() { var s = new Date(2024, 0, 7), out = []; for (var i = 0; i < 7; i++) out.push(H.dfmt(H.addDays(s, i), 'EEEEE', loc)); return out; }
    function relative(d) {
      var diff = Math.round((H.startOfDay(d) - H.startOfDay(today)) / 86400000);
      return diff === 0 ? t('today') : diff === 1 ? t('tomorrow') : H.dfmt(d, 'EEEE', loc);
    }
    function isAttendee(ev) {
      if (ev.is_mine === 'true') return true;
      if (me.name && String(ev.subtitle || '').toLowerCase() === me.name) return true;
      if (!me.email) return false;
      return decode(ev.attendees).some(function (a) { return String(a.email || '').toLowerCase() === me.email; });
    }
    function decode(json) { if (!json || json === '[]') return []; try { var d = JSON.parse(json); return Array.isArray(d) ? d : []; } catch (e) { return []; } }

    function loadEvents() {
      loading = true; loadError = null; paint();
      return M.roomCalendar(roomEmail, H.addDays(new Date(), -1), H.addDays(new Date(), 60)).then(function (list) {
        var mapped = {};
        list.forEach(function (e) {
          var st = e.start_time || '', dt = H.parseLocal(st);
          if (!dt) return;
          var key = eventKey(dt);
          (mapped[key] = mapped[key] || []).push({
            time: e.time || '', duration: e.duration || '', title: e.title || t('noTitle'), subtitle: e.organizer_name || '',
            description: stripHtml(e.body), agenda: e.agenda || '', attendees: JSON.stringify(e.attendees || []),
            can_edit: e.can_edit === true ? 'true' : '', booking_id: String(e.booking_id === null || e.booking_id === undefined ? '' : e.booking_id),
            start_time: st, end_time: e.end_time || '', is_all_day_flag: e.is_all_day === true ? 'true' : '', is_recurring: e.is_recurring === true ? 'true' : ''
          });
        });
        Object.keys(mapped).forEach(function (k) { mapped[k].sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; }); });
        events = mapped; loading = false;
      }).catch(function (e) { loadError = clean(e); loading = false; }).then(paint);
    }

    function skeleton() {
      function b(w, h, r) { return '<span style="display:block;width:' + w + ';height:' + h + 'px;border-radius:' + r + 'px;background:#E1E6E2"></span>'; }
      var week = '';
      for (var i = 0; i < 7; i++) week += '<span style="display:flex;flex-direction:column;align-items:center;gap:9px">' + b('18px', 7, 4) + b('30px', 30, 15) + '</span>';
      var rows = '';
      for (var j = 0; j < 3; j++) rows += '<div style="height:78px;margin-bottom:10px;padding:14px;background:#fff;border-radius:16px;border:0.5px solid var(--line);display:flex;align-items:center;gap:12px">' +
        b('46px', 46, 12) + '<span style="flex:1;display:flex;flex-direction:column;gap:9px">' + b(j === 1 ? '164px' : '196px', 11, 6) + b('104px', 8, 4) + '</span></div>';
      return '<div class="pulse" style="padding:16px 20px 28px"><div style="display:flex;gap:8px">' + b('82px', 30, 15) + b('88px', 30, 15) + '</div>' +
        '<div style="margin-top:18px;height:126px;padding:16px;background:#fff;border-radius:18px;border:0.5px solid var(--line)"><div style="display:flex;justify-content:center">' + b('112px', 11, 6) + '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:18px">' + week + '</div></div><div style="height:22px"></div>' + b('96px', 11, 6) + '<div style="height:12px"></div>' + rows + '</div>';
    }
    function weekStrip() {
      var start = H.addDays(H.startOfDay(selectedDay), -selectedDay.getDay()), L = dayLetters(), cells = '';
      for (var i = 0; i < 7; i++) {
        var d = H.addDays(start, i), sel = H.sameDay(d, selectedDay), tod = H.sameDay(d, today), has = !!events[eventKey(d)];
        cells += '<button class="wd' + (sel ? ' sel' : '') + (tod ? ' today' : '') + '" data-day="' + eventKey(d) + '"><small>' + esc(L[d.getDay()]) + '</small><span class="n">' + d.getDate() + '</span><span class="dot' + (has ? ' on' : '') + '"></span></button>';
      }
      return '<div class="cal"><div class="cal-mon">' + esc(H.dfmt(selectedDay, 'MMM', loc)) + '</div><div class="week">' + cells + '</div></div>';
    }
    function monthGrid() {
      var L = dayLetters(), first = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1), n = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
      var days = [];
      for (var i = 0; i < first.getDay(); i++) days.push(null);
      for (var d = 1; d <= n; d++) days.push(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d));
      while (days.length % 7) days.push(null);
      var rows = '';
      for (var r = 0; r < days.length / 7; r++) {
        rows += '<div class="mgrid-row">' + days.slice(r * 7, r * 7 + 7).map(function (x) {
          if (!x) return '<span class="md blank"></span>';
          return '<button class="md' + (H.sameDay(x, selectedDay) ? ' sel' : '') + (H.sameDay(x, today) ? ' today' : '') + '" data-mday="' + eventKey(x) + '"><span class="n">' + x.getDate() + '</span><span class="dot' + (events[eventKey(x)] ? ' on' : '') + '"></span></button>';
        }).join('') + '</div>';
      }
      return '<div class="cal"><div class="month-nav"><button data-mnav="-1" aria-label="Previous month">' + icon('chevron_left') + '</button><b>' + esc(H.dfmt(displayMonth, 'MMMM yyyy', loc)) + '</b>' +
        '<button data-mnav="1" aria-label="Next month">' + icon('chevron_right') + '</button></div><div style="height:4px"></div><div class="mgrid-row">' +
        L.map(function (l) { return '<span class="l">' + esc(l) + '</span>'; }).join('') + '</div><div style="height:4px"></div>' + rows + '</div>';
    }
    function eventRow(ev, i, key) {
      var allDay = ev.time === 'All day';
      return '<button class="ev-card" data-ev="' + key + '|' + i + '"><span class="t">' + (allDay ? '<em>' + esc(t('allDay')) + '</em>' : '<b>' + esc(ev.time) + '</b><small>' + esc(ev.duration) + '</small>') + '</span>' +
        '<span class="bar"></span><span class="c"><b>' + esc(ev.title) + '</b>' + (isAttendee(ev) ? icon('star_rounded', 'star') : '') +
        (ev.subtitle ? '<small>' + esc(t('bookedBy', { name: ev.subtitle })) + '</small>' : '') + (ev.description ? '<small class="desc">' + esc(ev.description) + '</small>' : '') + '</span>' + icon('chevron_right_rounded') + '</button>';
    }
    function list() {
      if (loadError) {
        return '<div class="center-note"><div>' + icon('error_outline') + '<p style="margin:12px 0 6px;font-weight:700">' + esc(t('couldNotLoadBookings')) + '</p><p style="margin:0;font-size:12px;color:var(--muted)">' + esc(loadError) + '</p>' +
          '<button class="text-btn" data-retry style="margin-top:16px">' + esc(t('retry')) + '</button></div></div>';
      }
      var days = tab === 0 ? Array.apply(null, Array(14)).map(function (_, i) { return H.addDays(today, i); }) : [selectedDay];
      return '<div class="agenda">' + days.map(function (d) {
        var key = eventKey(d), evs = events[key] || [];
        return '<div class="day-head"><b>' + esc(H.dfmt(d, 'd MMM', loc)) + '</b><span>' + esc(relative(d)) + '</span></div>' +
          (evs.length ? evs.map(function (e, i) { return eventRow(e, i, key); }).join('') : '<div class="no-ev">' + esc(t('noEvents')) + '</div>') + '<div style="height:8px"></div>';
      }).join('') + '</div>';
    }
    function paint() {
      fab.hidden = loading;
      if (loading) { body.innerHTML = skeleton(); return; }
      body.innerHTML = '<div class="tabbar"><button class="tab' + (tab === 0 ? ' on' : '') + '" data-tab="0">' + esc(t('agenda')) + '</button><button class="tab' + (tab === 1 ? ' on' : '') + '" data-tab="1">' + esc(t('dayView')) + '</button></div>' +
        '<div data-cal>' + (expanded ? monthGrid() : weekStrip()) + '</div><button class="cal-toggle' + (expanded ? ' open' : '') + '" data-toggle aria-label="Show calendar">' + icon('keyboard_arrow_down_rounded') + '</button>' + list();
      var err = body.querySelector('.center-note .mi'); if (err) err.style.cssText = 'font-size:40px;color:#FF5252';
      body.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = +b.dataset.tab; paint(); }; });
      body.querySelectorAll('[data-day]').forEach(function (b) { b.onclick = function () { selectedDay = H.parseLocal(b.dataset.day); paint(); }; });
      body.querySelectorAll('[data-mday]').forEach(function (b) { b.onclick = function () { selectedDay = H.parseLocal(b.dataset.mday); expanded = false; paint(); }; });
      body.querySelectorAll('[data-mnav]').forEach(function (b) { b.onclick = function () { displayMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + +b.dataset.mnav, 1); paint(); }; });
      body.querySelector('[data-toggle]').onclick = function () { expanded = !expanded; paint(); };
      var retry = body.querySelector('[data-retry]'); if (retry) retry.onclick = loadEvents;
      body.querySelectorAll('[data-ev]').forEach(function (b) { b.onclick = function () { var p = b.dataset.ev.split('|'); showDetail(events[p[0]][+p[1]]); }; });
      // a vertical fling on the calendar opens or closes the month grid
      var cal = body.querySelector('[data-cal]'), sy = null, st = 0;
      cal.onpointerdown = function (e) { sy = e.clientY; st = performance.now(); };
      cal.onpointerup = function (e) {
        if (sy === null) return;
        var dy = e.clientY - sy, v = dy / Math.max(1, performance.now() - st) * 1000; sy = null;
        if (Math.abs(dy) < 20) return;
        if (v > 100 && !expanded) { expanded = true; paint(); } else if (v < -100 && expanded) { expanded = false; paint(); }
      };
    }
    function showDetail(ev) {
      var att = decode(ev.attendees);
      H.sheet('<div class="handle" style="margin:12px auto 20px"></div><div class="ed-sheet">' +
        '<div class="ed-title"><h3>' + esc(ev.title) + '</h3>' + (ev.can_edit === 'true' ? '<button class="ed-pencil" data-edit aria-label="' + esc(t('editMeeting')) + '">' + icon('edit_rounded') + '</button>' : '') + '</div>' +
        '<div class="ed-line">' + icon('access_time_rounded') + esc(ev.time === 'All day' ? t('allDay') : ev.time + '  ·  ' + ev.duration) + '</div>' +
        (ev.subtitle ? '<div class="ed-line" style="margin-top:4px">' + icon('meeting_room_outlined') + esc(t('bookedBy', { name: ev.subtitle })) + '</div>' : '') +
        (ev.description ? '<div class="ed-cap">' + icon('notes_rounded') + esc(t('descriptionField')) + '</div><div class="ed-text">' + esc(ev.description) + '</div>' : '') +
        (ev.agenda ? '<div class="ed-cap">' + icon('format_list_bulleted_rounded') + esc(t('agenda')) + '</div><div class="ed-agenda">' + esc(ev.agenda) + '</div>' : '') +
        (att.length ? '<div class="ed-cap">' + icon('star_rounded') + esc(t('requiredAttendees')) + '</div>' + att.map(function (a) {
          var n = a.name || '';
          return '<div class="ed-person"><span class="avatar-c" style="background:' + H.avatarColor(n) + '">' + esc(H.initials(n)) + '</span><div><b>' + esc(n) + '</b>' + (a.email ? '<small>' + esc(a.email) + '</small>' : '') + '</div></div>';
        }).join('') : '') + '</div>',
      { cls: 'r24', height: '55%', wire: function (s, o) {
        s.style.maxHeight = '92%';
        var edit = s.querySelector('[data-edit]');
        if (edit) edit.onclick = function () { o.close(); openEdit(ev); };
        // DraggableScrollableSheet: drag the handle between 35% and 92%.
        var handle = s.querySelector('.handle'), startY = null, startH = 0;
        handle.style.cursor = 'ns-resize'; handle.style.padding = '0'; handle.style.touchAction = 'none';
        handle.onpointerdown = function (e) { startY = e.clientY; startH = s.offsetHeight; handle.setPointerCapture(e.pointerId); };
        handle.onpointermove = function (e) {
          if (startY === null) return;
          var host = s.parentNode.offsetHeight, h = Math.min(host * 0.92, Math.max(host * 0.35, startH + startY - e.clientY));
          s.style.height = h + 'px';
        };
        handle.onpointerup = function () { startY = null; };
      } });
    }
    function openEdit(ev) {
      var id = parseInt(ev.booking_id, 10);
      if (isNaN(id)) return;
      var start = H.parseLocal(ev.start_time); if (!start) return;
      var end = H.parseLocal(ev.end_time) || new Date(start.getTime() + 3600000);
      var att = decode(ev.attendees).filter(function (a) { return String(a.email || '').toLowerCase() !== roomEmail.toLowerCase(); })
        .map(function (a) { return { name: a.name || '', email: a.email || '', type: a.type || 'required' }; });
      H.push(EditMeetingPage({ bookingId: id, roomName: roomName, roomEmail: roomEmail, title: ev.title || '', description: ev.description || '', agenda: ev.agenda || '',
        start: start, end: end, attendees: att, isAllDay: ev.is_all_day_flag === 'true', isRecurring: ev.is_recurring === 'true' }));
    }
    function banner(msg) {
      var b = el('<div class="banner" role="status"><i>' + icon('check_rounded') + '</i><span>' + esc(msg) + '</span></div>');
      document.getElementById('app').appendChild(b);
      H.raf(function () { b.classList.add('show'); });
      setTimeout(function () { b.classList.remove('show'); setTimeout(function () { b.remove(); }, 340); }, 320 + 1700);
    }
    function addBooking(bk) {
      var entry = { time: bk.startTime, duration: bk.duration, title: bk.title, subtitle: bk.organizerName, description: bk.description,
        agenda: bk.agenda, attendees: JSON.stringify(bk.attendees), is_mine: 'true' };
      var dates = [bk.date];
      if (bk.isAllDay && bk.endDate) { for (var d = H.addDays(bk.date, 1); d <= bk.endDate; d = H.addDays(d, 1)) dates.push(d); }
      dates = dates.concat(bk.extraDates);
      dates.forEach(function (d) {
        var k = eventKey(d);
        (events[k] = events[k] || []).push(entry);
        events[k].sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
      });
      selectedDay = bk.date; displayMonth = new Date(bk.date.getFullYear(), bk.date.getMonth(), 1);
      tab = (bk.isAllDay || bk.extraDates.length) ? 0 : 1;
      paint();
    }
    fab.onclick = function () { H.push(CreateMeetingPage(roomName, roomEmail)); };
    sc.resume = function (result) {
      if (!result) return;
      if (result.newBooking) { addBooking(result.newBooking); loadEvents(); }
      else if (result === 'updated' || result === 'cancelled') { banner(result === 'cancelled' ? t('meetingCancelled') : t('meetingUpdated')); loadEvents(); }
    };
    sc.enter = loadEvents;
    return sc;
  }

  /* ==== shared bits for create and edit ================================= */
  function fmtTime(h, m) { return pad(h) + ':' + pad(m); }
  function endOf(st, dur) { var tot = st.h * 60 + st.m + dur; return { h: Math.floor(tot / 60) % 24, m: tot % 60 }; }
  function fmtDateShort(d) { return d.getDate() + '-' + H.MON[d.getMonth()] + '-' + String(d.getFullYear()).slice(2); }
  function durationLabel(n) {
    if (n < 60) return n + ' min';
    var h = Math.floor(n / 60), m = n % 60;
    return m === 0 ? h + ' hr' : h + ' hr ' + m + ' min';
  }
  function chip(c, i, list, green) {
    return green ? '<span class="att-chip g">' + esc(c.name || c.email) + '<button data-rm="' + list + '|' + i + '" aria-label="Remove">' + icon('close_rounded') + '</button></span>'
      : '<span class="att-chip"><button data-rm="' + list + '|' + i + '" aria-label="Remove">' + icon('close_rounded') + '</button><i style="background:' + H.avatarColor(c.name) + '">' + esc(H.initials(c.name)) + '</i>' + esc(c.name) + '</span>';
  }
  // The attendee pickers share one suggestion panel under the active field.
  function Attendees(opts) {
    var self = { req: opts.req || [], opt: opts.opt || [], optionalActive: false, show: !!opts.showInitially, contacts: [], loading: false,
      hasMore: true, cursor: '', lastQuery: '__init__', query: '', debounce: null };
    self.filtered = function () {
      return self.contacts.filter(function (c) {
        return !self.req.some(function (a) { return a.email === c.email; }) && !self.opt.some(function (a) { return a.email === c.email; });
      });
    };
    self.fetch = function (q, more) {
      if (!more && q === self.lastQuery && !opts.always) return;
      if (more && !self.hasMore) return;
      self.loading = true; opts.repaint();
      if (!more) { self.cursor = ''; self.hasMore = true; self.lastQuery = q; }
      M.people(q, more ? self.cursor : '').then(function (res) {
        var users = (res.data || []).map(function (u) { return { name: u.name || '', email: u.email || '' }; });
        if (opts.always) users = users.filter(function (c) { return c.email; });
        self.loading = false; self.hasMore = !!res.cursor && !opts.always; self.cursor = res.cursor || '';
        self.contacts = more ? self.contacts.concat(users) : users;
        opts.repaint();
      }).catch(function () { self.loading = false; opts.repaint(); });
    };
    self.panel = function () {
      var list = self.filtered(), head = opts.always ? t('people') : (self.query ? t('people') + ' (' + list.length + ')' : t('people'));
      var inner;
      if (self.loading && !list.length) inner = '<div class="sugg-spin" style="height:' + (opts.always ? 120 : 260) + 'px"><span class="spin sm" style="border-top-color:' + (opts.always ? 'var(--green)' : '#5F4A26') + '"></span></div>';
      else if (!list.length) inner = '<div class="sugg-empty">' + esc(t('noContactsFound')) + '</div>';
      else inner = '<div class="sugg-list" style="max-height:' + (opts.always ? 220 : 260) + 'px">' + list.map(function (c, i) {
        return '<button class="sugg-row' + (opts.always ? ' sm' : '') + '" data-add="' + i + '"><span class="avatar-c" style="background:' + H.avatarColor(c.name) + '">' + esc(H.initials(c.name)) + '</span>' +
          '<div><b>' + esc(c.name) + '</b><small>' + esc(c.email) + '</small></div>' + (opts.always ? '' : icon('add_rounded')) + '</button>';
      }).join('') + (self.hasMore ? '<div class="sugg-spin" style="padding:10px 0"><span class="spin sm" style="border-top-color:#5F4A26"></span></div>' : '') + '</div>';
      return '<div class="sugg"><div class="sugg-h">' + esc(head) + '</div>' + inner + '</div>';
    };
    self.html = function () {
      var green = !!opts.always;
      return '<div class="att-label">' + icon('star_rounded') + (green ? esc(t('requiredAttendees')) : 'Required') + '</div>' +
        (self.req.length ? '<div class="chip-wrap">' + self.req.map(function (c, i) { return chip(c, i, 'req', green); }).join('') + '</div>' : '') +
        '<input class="bare" data-field="req" placeholder="' + esc(t('inviteAttendees')) + '" autocomplete="off">' + (self.show && !self.optionalActive ? self.panel() : '') +
        '<div style="height:14px"></div><div class="att-label">' + icon('person_outline_rounded') + 'Optional</div>' +
        (self.opt.length ? '<div class="chip-wrap">' + self.opt.map(function (c, i) { return chip(c, i, 'opt', green); }).join('') + '</div>' : '') +
        '<input class="bare" data-field="opt" placeholder="' + esc(t('inviteOptionalAttendees')) + '" autocomplete="off">' + (self.show && self.optionalActive ? self.panel() : '');
    };
    self.wire = function (root) {
      root.querySelectorAll('[data-field]').forEach(function (inp) {
        var isOpt = inp.dataset.field === 'opt';
        inp.value = isOpt === self.optionalActive ? self.query : '';
        inp.onfocus = function () {
          if (self.show && self.optionalActive === isOpt) return;
          self.optionalActive = isOpt; self.show = true; opts.repaint(inp.dataset.field);
        };
        inp.onblur = function () {
          if (opts.always) return;
          setTimeout(function () {
            var a = document.activeElement;
            if (a && a.dataset && a.dataset.field) return;
            if (root.contains(a) && a.closest('.sugg')) return;
            if (!self.show) return;
            self.show = false; opts.repaint();
          }, 200);
        };
        inp.oninput = function () {
          self.query = inp.value;
          if (!opts.always) opts.repaintPanel();
          clearTimeout(self.debounce);
          self.debounce = setTimeout(function () { self.fetch(inp.value); }, 350);
        };
      });
      root.querySelectorAll('[data-add]').forEach(function (b) {
        b.onmousedown = function (e) { e.preventDefault(); };
        b.onclick = function () {
          var c = self.filtered()[+b.dataset.add];
          if (!c) return;
          (self.optionalActive ? self.opt : self.req).push(c);
          self.query = ''; self.contacts = []; self.lastQuery = '__init__';
          if (opts.onChange) opts.onChange();
          opts.repaint(self.optionalActive ? 'opt' : 'req');
          self.fetch('');
        };
      });
      root.querySelectorAll('[data-rm]').forEach(function (b) {
        b.onmousedown = function (e) { e.preventDefault(); };
        b.onclick = function () {
          var p = b.dataset.rm.split('|');
          (p[0] === 'opt' ? self.opt : self.req).splice(+p[1], 1);
          if (opts.onChange) opts.onChange();
          opts.repaint();
        };
      });
      var sl = root.querySelector('.sugg-list');
      if (sl && !opts.always) sl.onscroll = function () {
        if (!self.loading && self.hasMore && sl.scrollTop + sl.clientHeight >= sl.scrollHeight - 60) self.fetch(self.query, true);
      };
    };
    return self;
  }
  // keep focus and caret across a repaint
  function repaintKeepingFocus(host, render) {
    var a = document.activeElement, field = a && a.dataset && a.dataset.field, text = a && a.dataset && a.dataset.text, pos = a && a.selectionStart;
    var scrollTop = host.scrollTop;
    render();
    host.scrollTop = scrollTop;
    var sel = field ? '[data-field="' + field + '"]' : text ? '[data-text="' + text + '"]' : null;
    if (sel) { var n = host.querySelector(sel); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
  }

  /* ==== CreateMeetingPage ================================================= */
  function CreateMeetingPage(roomName, roomEmail) {
    var now = new Date(), startDate = H.startOfDay(now), startTime = { h: 8, m: 0 }, dur = 60, teams = true, submitting = false;
    var allDay = false, recurring = false, showTS = true, interval = 1, unit = 'week', recDays = {}, recUntil = H.addDays(startDate, 180), endDate = startDate;
    recDays[(now.getDay() + 6) % 7 + 1] = true;
    var ts = [], tsLoading = false, tsError = '', vals = { title: '', desc: '', agenda: '' };
    var node = H.screen('', '<div class="cm-top"><button class="circle-btn" data-back aria-label="Close">' + icon('close_rounded') + '</button><div><b>' + esc(t('newMeeting')) + '</b><small>' + esc(t('newMeetingSubtitle')) + '</small></div></div>' +
      '<div class="scroll" data-host><div class="cm-body" data-body></div></div>');
    var sc = { el: node }, host = node.querySelector('[data-host]'), body = node.querySelector('[data-body]');
    var att = Attendees({ showInitially: true, repaint: function () { repaint(); }, repaintPanel: function () { repaint(); },
      onChange: function () { ts = []; tsError = ''; } });

    function fetchTS() {
      if (tsLoading) return;
      tsLoading = true; tsError = ''; repaint();
      var e = endOf(startTime, dur), s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startTime.h, startTime.m);
      var attendees = [{ address: roomEmail, name: roomName }].concat(att.req.map(function (c) { return { address: c.email, name: c.name }; }), att.opt.map(function (c) { return { address: c.email, name: c.name }; }));
      M.findTimes(attendees, s, new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), e.h, e.m)).then(function (d) {
        tsLoading = false; ts = d; repaint();
      }).catch(function (err) { tsLoading = false; tsError = clean(err); repaint(); });
    }
    function tsPanel() {
      if (tsLoading) return '<div class="ts-panel" style="padding:20px 0;display:grid;place-items:center"><span class="spin sm"></span></div>';
      if (tsError) return '<div class="ts-panel"><div class="msg">' + icon('error_outline_rounded') + '<span style="flex:1">' + esc(t('couldNotLoadSuggestions')) + '</span><button data-tsretry>' + esc(t('retry')) + '</button></div></div>';
      if (!ts.length) return '<div class="ts-panel"><div class="msg">' + esc(t('noSuggestionsAvailable')) + '</div></div>';
      var count = att.req.length + 1, D = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '<div class="ts-panel">' + ts.map(function (slot, i) {
        var s = H.parseLocal(slot.start), e = H.parseLocal(slot.end), sm = s.getHours() * 60 + s.getMinutes(), em = e.getHours() * 60 + e.getMinutes();
        var diff = (em - sm + 1440) % 1440, lab = diff < 60 ? diff + ' min' : diff % 60 === 0 ? (diff / 60) + ' ' + (diff === 60 ? 'hr' : 'hrs') : Math.floor(diff / 60) + ' hr ' + (diff % 60) + ' min';
        var sel = H.sameDay(s, startDate) && sm === startTime.h * 60 + startTime.m;
        return '<button class="ts-slot' + (sel ? ' sel' : '') + '" data-ts="' + i + '"><div><b>' + D[(s.getDay() + 6) % 7 + 1] + ' ' + fmtDateShort(s) + '</b><small>' +
          fmtTime(s.getHours(), s.getMinutes()) + ' – ' + fmtTime(e.getHours(), e.getMinutes()) + '  (' + lab + ')</small></div><em>' + icon('person_outline_rounded') + count + '</em></button>';
      }).join('') + '</div>';
    }
    function fbox(inner, attr) { return '<button class="fbox" ' + attr + '>' + inner + '</button>'; }
    function render() {
      var end = endOf(startTime, dur), DL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      body.innerHTML = '<div class="cm-card">' +
        '<div class="slot">' + icon('calendar_month_outlined') + '<div><input class="bare title" data-text="title" placeholder="' + esc(t('addMeetingTitle')) + '" value="' + esc(vals.title) + '"></div></div><div class="div48"></div>' +
        '<div class="slot">' + icon('group_outlined') + '<div data-att>' + att.html() + '</div></div><div class="div48"></div>' +
        '<div class="slot">' + icon('access_time_rounded') + '<div>' +
        (allDay ? '<div class="two"><div><div class="small-cap">' + esc(t('startDate')) + '</div>' + fbox('<span>' + fmtDateShort(startDate) + '</span>' + icon('calendar_today_outlined'), 'data-pick="start" style="display:flex;width:100%;justify-content:space-between"') +
          '</div><div><div class="small-cap">' + esc(t('endDate')) + '</div>' + fbox('<span>' + fmtDateShort(endDate) + '</span>' + icon('calendar_today_outlined'), 'data-pick="end" style="display:flex;width:100%;justify-content:space-between"') + '</div></div>'
          : fbox('<span style="flex:1;text-align:left">' + fmtDateShort(startDate) + '</span>' + icon('calendar_today_outlined'), 'data-pick="start" style="display:flex;width:100%"')) +
        (!allDay ? '<div class="time-row">' + fbox(icon('access_time') + fmtTime(startTime.h, startTime.m), 'data-pick="stime"') + icon('arrow_forward_rounded', 'arrow') +
          fbox(icon('access_time') + fmtTime(end.h, end.m), 'data-pick="etime"') + '<button class="dur-pill" data-pick="etime">' + durationLabel(dur) + '</button></div>' +
          '<button class="ts-toggle' + (showTS ? ' open' : '') + '" data-tstoggle>' + icon('event_available_outlined') + esc(t('timeSuggestions')) + icon('info_outline_rounded', 'info') + icon('keyboard_arrow_down_rounded', 'chev') + '</button>' +
          (showTS ? tsPanel() : '') : '') +
        '<div class="flags"><button class="allday' + (allDay ? ' on' : '') + '" data-allday><i>' + (allDay ? icon('check_rounded') : '') + '</i>' + esc(t('allDay')) + '</button>' +
        '<button class="rec-pill' + (recurring ? ' on' : '') + '" data-rec>' + icon('repeat_rounded') + esc(t('recurring')) + '</button></div>' +
        (recurring ? '<div class="rec-panel"><div class="rec-row">' + esc(t('repeatEvery')) + fbox(interval + ' ' + icon('keyboard_arrow_down_rounded'), 'data-interval') + fbox(unit + ' ' + icon('keyboard_arrow_down_rounded'), 'data-unit') + '</div>' +
          (unit === 'week' ? '<div class="rec-days">' + DL.map(function (l, i) { return '<button data-rd="' + (i + 1) + '" class="' + (recDays[i + 1] ? 'on' : '') + '">' + l + '</button>'; }).join('') + '</div>' : '') +
          '<div class="rec-row" style="margin-top:10px">' + esc(t('until')) + fbox(fmtDateShort(recUntil) + ' ' + icon('keyboard_arrow_down_rounded'), 'data-until') + '<button class="rec-del" data-recdel aria-label="Remove recurrence">' + icon('delete_outline_rounded') + '</button></div></div>' : '') +
        '</div></div><div class="div48"></div>' +
        '<div class="slot">' + icon('meeting_room_outlined') + '<div class="room-slot"><div style="flex:1"><small>Conference Room</small><b>' + esc(roomName) + ' (' + esc(roomEmail) + ')</b></div><span class="pre-sel">' + icon('lock_outline_rounded') + esc(t('preSelected')) + '</span></div></div><div class="div48"></div>' +
        '<div class="slot">' + icon('videocam_outlined') + '<div class="teams-row"><span>' + esc(t('teamsMeeting')) + '</span><button class="switch' + (teams ? ' on' : '') + '" data-teams role="switch" aria-checked="' + teams + '" style="--sw:var(--green)"></button></div></div></div>' +
        '<div class="cm-card"><div class="slot">' + icon('notes_rounded') + '<div><textarea class="bare" data-text="desc" rows="2" placeholder="' + esc(t('addMeetingDescription')) + '">' + esc(vals.desc) + '</textarea></div></div></div>' +
        '<div class="cm-card"><div class="slot">' + icon('format_list_bulleted_rounded') + '<div><textarea class="bare" data-text="agenda" rows="1" placeholder="' + esc(t('addAgenda')) + '">' + esc(vals.agenda) + '</textarea></div></div></div>' +
        '<button class="book-btn" data-book' + (submitting ? ' disabled' : '') + '>' + (submitting ? '<span class="spin white" style="width:20px;height:20px"></span>' : esc(t('bookMeeting'))) + '</button>';
      att.wire(body.querySelector('[data-att]'));
      body.querySelectorAll('[data-text]').forEach(function (i) {
        i.oninput = function () { vals[i.dataset.text] = i.value; if (i.tagName === 'TEXTAREA') autosize(i); };
        if (i.tagName === 'TEXTAREA') autosize(i);
      });
      wire();
    }
    function autosize(ta) {
      var max = ta.dataset.text === 'desc' ? 4 : 3;
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, max * 20 + 2) + 'px';
    }
    function repaint() { repaintKeepingFocus(host, render); }
    function wire() {
      body.querySelectorAll('[data-pick]').forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.pick;
          if (k === 'start') {
            H.datePicker({ initial: startDate, first: new Date(), last: H.addDays(new Date(), 365), selectable: function (d) { return d.getDay() !== 0 && d.getDay() !== 6; } }).then(function (p) {
              if (!p) return;
              startDate = p; if (endDate < startDate) endDate = startDate;
              ts = []; tsError = ''; fetchTS(); repaint();
            });
          } else if (k === 'end') {
            H.datePicker({ initial: endDate < startDate ? startDate : endDate, first: startDate, last: H.addDays(new Date(), 365) }).then(function (p) { if (p) { endDate = p; repaint(); } });
          } else if (k === 'stime') {
            H.timePicker(startTime).then(function (p) { if (p) { startTime = p; repaint(); } });
          } else {
            H.timePicker(endOf(startTime, dur)).then(function (p) {
              if (!p) return;
              var diff = (p.h * 60 + p.m - (startTime.h * 60 + startTime.m) + 1440) % 1440;
              if (diff > 0) { dur = diff; repaint(); }
            });
          }
        };
      });
      var tog = body.querySelector('[data-tstoggle]');
      if (tog) tog.onclick = function () { showTS = !showTS; repaint(); if (showTS && !ts.length && !tsLoading) fetchTS(); };
      var tr = body.querySelector('[data-tsretry]'); if (tr) tr.onclick = fetchTS;
      body.querySelectorAll('[data-ts]').forEach(function (b) {
        b.onclick = function () {
          var slot = ts[+b.dataset.ts], s = H.parseLocal(slot.start), e = H.parseLocal(slot.end);
          var diff = ((e.getHours() * 60 + e.getMinutes()) - (s.getHours() * 60 + s.getMinutes()) + 1440) % 1440;
          startDate = H.startOfDay(s); startTime = { h: s.getHours(), m: s.getMinutes() }; if (diff > 0) dur = diff;
          repaint();
        };
      });
      body.querySelector('[data-allday]').onclick = function () { allDay = !allDay; repaint(); };
      body.querySelector('[data-rec]').onclick = function () { recurring = !recurring; repaint(); };
      body.querySelector('[data-teams]').onclick = function () { teams = !teams; repaint(); };
      var iv = body.querySelector('[data-interval]');
      if (iv) {
        iv.onclick = function () {
          H.sheet('<div class="handle" style="margin-bottom:16px"></div><div class="sheet-title" style="padding-top:0;color:#111">' + esc(t('repeatInterval')) + '</div><div class="tile-list" style="overflow-y:auto;padding-bottom:8px">' +
            Array.apply(null, Array(12)).map(function (_, i) { var v = i + 1; return '<button data-v="' + v + '" class="' + (v === interval ? 'on' : '') + '" style="min-height:40px"><span>' + v + '</span>' + (v === interval ? icon('check_rounded', 'check') : '') + '</button>'; }).join('') + '</div>',
          { wire: function (s, o) { s.querySelectorAll('[data-v]').forEach(function (x) { x.onclick = function () { o.close(+x.dataset.v); }; }); } }).then(function (v) { if (v) { interval = v; repaint(); } });
        };
        body.querySelector('[data-unit]').onclick = function () {
          H.sheet('<div class="handle" style="margin-bottom:16px"></div><div class="sheet-title" style="padding-top:0;color:#111">' + esc(t('repeatUnit')) + '</div><div class="tile-list" style="padding-bottom:8px">' +
            ['day', 'week', 'month'].map(function (u) { return '<button data-v="' + u + '" class="' + (u === unit ? 'on' : '') + '" style="min-height:40px"><span>' + u + '</span>' + (u === unit ? icon('check_rounded', 'check') : '') + '</button>'; }).join('') + '</div>',
          { wire: function (s, o) { s.querySelectorAll('[data-v]').forEach(function (x) { x.onclick = function () { o.close(x.dataset.v); }; }); } }).then(function (v) { if (v) { unit = v; repaint(); } });
        };
        body.querySelectorAll('[data-rd]').forEach(function (b) {
          b.onclick = function () {
            var d = +b.dataset.rd, n = Object.keys(recDays).length;
            if (recDays[d] && n > 1) delete recDays[d]; else recDays[d] = true;
            repaint();
          };
        });
        body.querySelector('[data-until]').onclick = function () {
          H.datePicker({ initial: recUntil, first: startDate, last: H.addDays(new Date(), 365 * 3) }).then(function (p) { if (p) { recUntil = p; repaint(); } });
        };
        body.querySelector('[data-recdel]').onclick = function () {
          recurring = false; recDays = {}; recDays[(startDate.getDay() + 6) % 7 + 1] = true; interval = 1; unit = 'week'; repaint();
        };
      }
      body.querySelector('[data-book]').onclick = submit;
    }
    function recurringDates() {
      if (!recurring) return [];
      var out = [];
      if (unit === 'week') {
        var ws = H.addDays(startDate, -((startDate.getDay() + 6) % 7)), days = Object.keys(recDays).map(Number).sort();
        outer: for (var w = 0; w < 400; w++) {
          for (var k = 0; k < days.length; k++) {
            var c = H.addDays(ws, days[k] - 1);
            if (H.sameDay(c, startDate) || c < startDate) continue;
            if (c > recUntil) break outer;
            out.push(c);
            if (out.length >= 100) break outer;
          }
          ws = H.addDays(ws, 7 * interval);
        }
      } else if (unit === 'day') {
        for (var cur = H.addDays(startDate, interval); cur <= recUntil && out.length < 100; cur = H.addDays(cur, interval)) out.push(cur);
      } else {
        for (var a = interval; out.length < 100; a += interval) {
          var cand = new Date(startDate.getFullYear(), startDate.getMonth() + a, startDate.getDate());
          if (cand > recUntil) break;
          out.push(cand);
        }
      }
      return out;
    }
    function submit() {
      var missing = [];
      if (!vals.title.trim()) missing.push(t('missingTitle'));
      if (!vals.desc.trim()) missing.push(t('missingDescription'));
      if (!att.req.length && !att.opt.length) missing.push(t('missingAttendees'));
      if (allDay && endDate < startDate) missing.push(t('endDateOnOrAfterStart'));
      if (missing.length) {
        return H.cute({ icon: 'edit_note_rounded', title: t('almostThere'), message: t('completeToBook'),
          extra: '<div class="missing">' + missing.map(function (m) { return '<div><i>' + icon('priority_high_rounded') + '</i>' + esc(m) + '</div>'; }).join('') + '</div>' });
      }
      submitting = true; repaint();
      var s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), allDay ? 0 : startTime.h, allDay ? 0 : startTime.m);
      var e = allDay ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59) : (function () { var x = endOf(startTime, dur); return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), x.h, x.m); })();
      var attendees = att.req.map(function (c) { return { name: c.name, address: c.email, type: 'required' }; }).concat(att.opt.map(function (c) { return { name: c.name, address: c.email, type: 'optional' }; }));
      var b = { title: vals.title.trim(), description: vals.desc.trim(), meetingRoomName: roomName, meetingRoomEmail: roomEmail, attendees: attendees,
        startTime: H.dartIso(s), endTime: H.dartIso(e), isAllDay: allDay, isRecurring: recurring, isTeamsMeeting: teams, agenda: vals.agenda.trim() };
      if (recurring) { b.recurringInterval = interval; b.recurringUnit = unit; b.recurringDays = Object.keys(recDays).map(Number); b.recurringUntil = H.dartIso(recUntil); }
      M.createMeeting(b).then(function (link) {
        submitting = false;
        H.pop({ newBooking: { title: b.title, date: startDate, startTime: allDay ? 'All day' : fmtTime(startTime.h, startTime.m), duration: allDay ? '' : durationLabel(dur),
          organizerName: H.prefs().username || '', isAllDay: allDay, endDate: allDay ? endDate : null, extraDates: recurringDates(), description: b.description,
          agenda: b.agenda, teamsLink: link, attendees: att.req.concat(att.opt).map(function (c) { return { name: c.name, email: c.email }; }) } });
      }).catch(function (err) {
        submitting = false; repaint();
        var msg = clean(err).trim() || t('failedToBookMeeting');
        H.cute({ icon: 'event_busy_rounded', title: t('oopsTitle'), message: msg });
      });
    }
    sc.enter = function () { render(); att.fetch(''); fetchTS(); };
    return sc;
  }

  /* ==== EditMeetingPage =================================================== */
  function EditMeetingPage(o) {
    var vals = { title: o.title, desc: o.description, agenda: o.agenda }, submitting = false;
    var req = [], opt = [];
    o.attendees.forEach(function (a) { if (!a.email) return; (a.type === 'optional' ? opt : req).push({ name: a.name, email: a.email }); });
    var origReq = req.map(function (c) { return c.email.toLowerCase(); }).sort().join(','), origOpt = opt.map(function (c) { return c.email.toLowerCase(); }).sort().join(',');
    var allDay = o.isAllDay, startDate = H.startOfDay(o.start), lastDay = new Date(o.end.getTime() - 60000);
    var endDate = allDay && lastDay > startDate ? H.startOfDay(lastDay) : startDate;
    var startTime = allDay ? { h: 9, m: 0 } : { h: o.start.getHours(), m: o.start.getMinutes() };
    var mins = Math.round((o.end - o.start) / 60000), dur = !allDay && mins > 0 ? mins : 60;
    var node = H.screen('', '<div class="cm-top"><button class="circle-btn sm" data-back aria-label="Close">' + icon('close_rounded') + '</button><div><b>' + esc(t('editMeeting')) + '</b><small>' + esc(o.roomName) + '</small></div></div>' +
      '<div class="scroll" data-host><div class="cm-body" data-body></div></div>');
    var sc = { el: node }, host = node.querySelector('[data-host]'), body = node.querySelector('[data-body]');
    var att = Attendees({ req: req, opt: opt, always: true, repaint: function () { repaint(); }, repaintPanel: function () {} });
    function fmtShort(d) { return d.getDate() + ' ' + H.MON[d.getMonth()]; }
    function box(value, ic, attr) { return '<button class="fbox full" ' + attr + '><span>' + esc(value) + '</span>' + icon(ic) + '</button>'; }
    function labeled(label, value, ic, attr) { return '<div><div class="small-cap">' + esc(label) + '</div>' + box(value, ic, attr) + '</div>'; }
    function dateTime() {
      var end = endOf(startTime, dur);
      if (o.isRecurring) {
        return '<div class="rep-note">' + icon('event_repeat_rounded') + '<span>' + esc(t('repeatingMeetingNote')) + '</span></div><div style="height:8px"></div>' +
          (allDay ? '<b style="font-size:13.5px">' + esc(t('allDay')) + '</b>' : '<div class="two">' + labeled(t('startTimeLabel'), fmtTime(startTime.h, startTime.m), 'schedule_rounded', 'data-pick="stime"') +
            labeled(t('endTimeLabel'), fmtTime(end.h, end.m), 'schedule_rounded', 'data-pick="etime"') + '</div>');
      }
      return '<div class="toggle-row"><span>' + esc(t('allDayToggle')) + '</span><button class="switch' + (allDay ? ' on' : '') + '" data-allday role="switch" aria-checked="' + allDay + '"></button></div><div style="height:4px"></div>' +
        (allDay ? '<div class="two">' + labeled(t('startDate'), fmtShort(startDate), 'calendar_today_outlined', 'data-pick="start"') + labeled(t('endDate'), fmtShort(endDate), 'calendar_today_outlined', 'data-pick="end"') + '</div>'
          : '<div class="two">' + box(fmtShort(startDate), 'calendar_today_outlined', 'data-pick="start"') + box(fmtTime(startTime.h, startTime.m), 'schedule_rounded', 'data-pick="stime"') + box(fmtTime(end.h, end.m), 'schedule_rounded', 'data-pick="etime"') + '</div>');
    }
    function render() {
      body.innerHTML = '<div class="cm-card e"><div class="slot">' + icon('calendar_month_outlined') + '<div><input class="bare title" data-text="title" placeholder="' + esc(t('addMeetingTitle')) + '" value="' + esc(vals.title) + '"></div></div>' +
        '<div class="div-e"></div><div class="slot">' + icon('group_outlined') + '<div data-att>' + att.html() + '</div></div><div class="div-e"></div>' +
        '<div class="slot">' + icon('access_time_rounded') + '<div>' + dateTime() + '</div></div></div>' +
        '<div class="cm-card e"><div class="slot">' + icon('notes_rounded') + '<div><textarea class="bare" data-text="desc" rows="1" style="font-size:14px" placeholder="' + esc(t('descriptionField')) + '">' + esc(vals.desc) + '</textarea></div></div></div>' +
        '<div class="cm-card e"><div class="slot">' + icon('format_list_bulleted_rounded') + '<div><textarea class="bare" data-text="agenda" rows="1" style="font-size:14px" placeholder="' + esc(t('agenda')) + '">' + esc(vals.agenda) + '</textarea></div></div></div>' +
        '<button class="save-btn" data-save' + (submitting ? ' disabled' : '') + '>' + (submitting ? '<span class="spin white" style="width:20px;height:20px"></span>' : esc(t('saveChanges'))) + '</button>' +
        '<button class="cancel-btn" data-cancel' + (submitting ? ' disabled' : '') + '>' + icon('event_busy_rounded') + esc(t('cancelMeetingConfirm')) + '</button>';
      att.wire(body.querySelector('[data-att]'));
      body.querySelectorAll('[data-text]').forEach(function (i) {
        i.oninput = function () { vals[i.dataset.text] = i.value; if (i.tagName === 'TEXTAREA') { i.style.height = 'auto'; i.style.height = i.scrollHeight + 'px'; } };
        if (i.tagName === 'TEXTAREA') { i.style.height = 'auto'; i.style.height = i.scrollHeight + 'px'; }
      });
      body.querySelectorAll('[data-pick]').forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.pick;
          if (k === 'start') H.datePicker({ initial: startDate, first: H.addDays(new Date(), -1), last: H.addDays(new Date(), 365) }).then(function (p) { if (p) { startDate = p; if (endDate < startDate) endDate = startDate; repaint(); } });
          else if (k === 'end') H.datePicker({ initial: endDate < startDate ? startDate : endDate, first: startDate, last: H.addDays(new Date(), 365) }).then(function (p) { if (p) { endDate = p; repaint(); } });
          else if (k === 'stime') H.timePicker(startTime).then(function (p) { if (p) { startTime = p; repaint(); } });
          else H.timePicker(endOf(startTime, dur)).then(function (p) {
            if (!p) return;
            var diff = (p.h * 60 + p.m - (startTime.h * 60 + startTime.m) + 1440) % 1440;
            if (diff > 0) { dur = diff; repaint(); }
          });
        };
      });
      var ad = body.querySelector('[data-allday]');
      if (ad) ad.onclick = function () { allDay = !allDay; if (!allDay) { startTime = { h: 9, m: 0 }; dur = 60; } else endDate = startDate; repaint(); };
      body.querySelector('[data-save]').onclick = save;
      body.querySelector('[data-cancel]').onclick = cancelMeeting;
    }
    function repaint() { repaintKeepingFocus(host, render); }
    function sdt() { return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startTime.h, startTime.m); }
    function edt() { var e = endOf(startTime, dur); return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), e.h, e.m); }
    function popup(title, msg, ic) { H.cute({ icon: ic, title: title, message: msg }); }
    function save() {
      if (!vals.title.trim()) return popup(t('editBlankTitle'), t('titleBlankMsg'), 'edit_note_rounded');
      if (!att.req.length && !att.opt.length) return popup(t('editBlankTitle'), t('attendeesBlankMsg'), 'edit_note_rounded');
      var titleCh = vals.title.trim() !== o.title, descCh = vals.desc.trim() !== o.description, agCh = vals.agenda.trim() !== o.agenda;
      var timeCh = allDay !== o.isAllDay || sdt().getTime() !== o.start.getTime() || edt().getTime() !== o.end.getTime();
      var attCh = att.req.map(function (c) { return c.email.toLowerCase(); }).sort().join(',') !== origReq || att.opt.map(function (c) { return c.email.toLowerCase(); }).sort().join(',') !== origOpt;
      if (!titleCh && !descCh && !agCh && !timeCh && !attCh) return H.pop();
      submitting = true; repaint();
      var b = {};
      if (titleCh) b.title = vals.title.trim();
      if (descCh) b.description = vals.desc.trim();
      if (agCh) b.agenda = vals.agenda.trim();
      if (attCh) b.attendees = att.req.map(function (c) { return { name: c.name, address: c.email, type: 'required' }; }).concat(att.opt.map(function (c) { return { name: c.name, address: c.email, type: 'optional' }; }));
      if (timeCh) {
        if (allDay) { b.startTime = H.dartIso(startDate); b.endTime = H.dartIso(endDate); }
        else { b.startTime = H.dartIso(sdt()); b.endTime = H.dartIso(edt()); }
        b.isAllDay = allDay;
      }
      if (o.isRecurring) b.scope = 'series';
      M.updateMeeting(o.bookingId, b).then(function () { H.pop('updated'); }).catch(function (e) {
        submitting = false; repaint();
        H.cute({ icon: 'spa_rounded', title: t('oopsTitle'), message: clean(e).trim() || t('failedToBookMeeting') });
      });
    }
    function cancelMeeting() {
      H.cute({ icon: 'event_busy_rounded', tint: '#FFF0F0', color: 'var(--danger)', title: t('cancelMeetingTitle'), message: o.isRecurring ? t('cancelSeriesBody') : t('cancelMeetingBody'),
        actions: '<div class="row"><button class="btn btn-outline" data-ok="no">' + esc(t('keepMeeting')) + '</button><button class="btn btn-danger" data-ok="yes">' + esc(t('cancelMeetingConfirm')) + '</button></div>' }).then(function (v) {
        if (v !== 'yes') return;
        submitting = true; repaint();
        M.cancelMeeting(o.bookingId).then(function () { H.pop('cancelled'); }).catch(function (e) {
          submitting = false; repaint();
          H.cute({ icon: 'spa_rounded', title: t('oopsTitle'), message: clean(e).trim() || t('failedToBookMeeting') });
        });
      });
    }
    sc.enter = function () { render(); att.fetch(''); };
    return sc;
  }

  H.screens.MeetingRoomsPage = MeetingRoomsPage;
})(HQ);
