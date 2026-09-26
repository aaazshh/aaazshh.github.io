/**
 * IT Ticketing: ticketing_page.dart, create_ticket_sheet.dart,
 * ticket_details_page.dart and ticket_ui.dart, over hq-web's
 * /teamswork routes (TeamsWorkController).
 */
(function (H) {
  'use strict';
  var t = H.t, esc = H.esc, icon = H.icon, Api = H.Api;

  var TONES = {
    'Urgent': ['#FBE4E1', '#A0301F', '#C0392B'], 'In progress': ['#FCEFC9', '#8C6515', '#D48F1A'],
    'Resolved': ['#E2EEDE', '#3A6B36', '#2E5838'], 'Closed': ['#E2EEDE', '#3A6B36', '#2E5838']
  };
  function status(tk) {
    if (tk.isResolved === true) return 'Resolved';
    var s = String(tk.status || '');
    if (TONES[s]) return s;
    if (String(tk.priority || '').toLowerCase() === 'urgent') return 'Urgent';
    return 'In progress';
  }
  // _ticketDesc reads desc, location or department, none of which the list
  // endpoint returns, so the second line stays empty on the real app too.
  function desc(tk) { return String(tk.desc || tk.location || tk.department || ''); }
  function statusLabel(s) {
    return ({ 'Urgent': t('urgent'), 'In progress': t('inProgress'), 'Resolved': t('resolved'), 'Closed': t('closed') }[s] || s).toUpperCase();
  }

  function TicketingPage() {
    var p = H.prefs(), dept = String(p.department || ''), email = String(p.email || ''), roleId = +p.role_id || 0;
    var full = roleId === 1 || roleId === 2 || ['IT', 'ITD'].indexOf(dept.trim().toUpperCase()) !== -1;
    var keys = full ? ['All', 'Mine', 'Urgent', 'Resolved'] : ['Mine', 'Resolved'], active = keys[0];
    var tickets = [], loading = true, error = null;
    var node = H.screen('', H.hero(t('itTicketingTitle'), t('itTicketingSubtitle')) + '<div class="scroll" data-body></div>' +
      '<button class="fab" data-fab aria-label="' + esc(t('newTicket')) + '" style="box-shadow:0 6px 12px rgba(0,0,0,0.22)">' + icon('add_rounded') + '</button>');
    var sc = { el: node }, body = node.querySelector('[data-body]');
    function visible() {
      if (full) return tickets;
      var mine = email.toLowerCase();
      if (!mine) return [];
      return tickets.filter(function (x) { return String(x.requestorEmail || '').toLowerCase() === mine; });
    }
    function filtered() {
      return visible().filter(function (x) {
        if (active === 'All') return true;
        if (active === 'Resolved') { var s = status(x); return s === 'Resolved' || s === 'Closed'; }
        if (active === 'Urgent') return status(x) === 'Urgent';
        if (active === 'Mine') {
          if (!full) return true;
          var a = String(x.assigneeEmail || '').toLowerCase();
          return a !== '' && a === email.toLowerCase();
        }
        return true;
      });
    }
    function label(k) { return k === 'Mine' ? t('filterMine') : k === 'Urgent' ? t('urgent') : k === 'Resolved' ? t('resolved') : t('all'); }
    function skeleton() {
      var s = '<div class="entrance" style="padding:18px 18px 110px">';
      if (full) s += '<div class="tk-card" style="height:82px;padding:0 16px;display:flex;align-items:center">' + [0, 1, 2].map(function () {
        return '<span style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="bone" style="width:30px;height:18px"></span><span style="width:54px;height:8px;border-radius:4px;background:#E6EAE7"></span></span>';
      }).join('') + '</div><div style="height:18px"></div>';
      s += '<div style="display:flex;gap:8px">' + keys.map(function (_, i) { return '<span style="width:' + (i % 2 ? 76 : 62) + 'px;height:36px;border-radius:999px;background:#E8ECE9"></span>'; }).join('') + '</div><div style="height:18px"></div>';
      s += '<div class="tk-card">' + [0, 1, 2, 3].map(function (i) {
        return '<div style="height:82px;padding:0 14px;display:flex;align-items:center;gap:12px;' + (i < 3 ? 'border-bottom:0.5px solid var(--line)' : '') + '"><span style="width:42px;height:42px;border-radius:12px;background:#F0DCCF"></span>' +
          '<span style="display:flex;flex-direction:column;gap:9px"><span class="bone" style="width:150px;height:11px"></span><span style="width:95px;height:9px;border-radius:5px;background:#E5E9E6"></span></span></div>';
      }).join('') + '</div></div>';
      return s;
    }
    function paint() {
      if (loading) { body.innerHTML = skeleton(); return; }
      if (error) {
        body.innerHTML = '<div style="height:100%;display:grid;place-items:center;text-align:center"><div><div style="color:red;font-size:13px">' + esc(error) + '</div>' +
          '<button class="btn btn-green" data-retry style="width:auto;padding:0 24px;margin:12px auto 0;height:40px;border-radius:20px">' + esc(t('retry')) + '</button></div></div>';
        body.querySelector('[data-retry]').onclick = load;
        return;
      }
      var all = visible(), list = filtered();
      var urgent = all.filter(function (x) { return status(x) === 'Urgent'; }).length, prog = all.filter(function (x) { return status(x) === 'In progress'; }).length;
      var res = all.filter(function (x) { var s = status(x); return s === 'Resolved' || s === 'Closed'; }).length;
      body.innerHTML = '<div style="padding:18px 18px 110px">' +
        (full ? '<div class="tk-card tk-stats"><div><b style="color:var(--green)">' + urgent + '</b><small>' + esc(t('urgent')) + '</small></div><div><b style="color:#D48F1A">' + prog + '</b><small>' + esc(t('inProgress')) +
          '</small></div><div><b style="color:var(--muted)">' + res + '</b><small>' + esc(t('resolved')) + '</small></div></div>' : '') +
        '<div class="tk-filters hscroll" style="' + (full ? '' : 'margin-top:0') + '">' + keys.map(function (k) { return '<button class="tk-filter press' + (k === active ? ' on' : '') + '" data-f="' + k + '">' + esc(label(k)) + '</button>'; }).join('') + '</div>' +
        '<div class="tk-head">' + esc(t('recentTickets')) + '</div><div class="entrance" style="animation-duration:240ms">' +
        (list.length ? '<div class="tk-card">' + list.map(function (x, i) {
          var s = status(x), tone = TONES[s];
          return '<button class="tk-row" data-i="' + i + '"><span class="tk-ico"><img src="assets/icon-ticket.png" alt=""></span><span class="c"><span class="t"><b>' + esc(x.title || '') + '</b><code>' + esc(x.id || '') + '</code></span>' +
            '<span class="d" style="display:block">' + esc(desc(x)) + '</span><span class="s"><i style="background:' + tone[2] + '"></i><span class="status-chip" style="background:' + tone[0] + ';color:' + tone[1] + '">' + esc(statusLabel(s)) + '</span></span></span></button>';
        }).join('') + '</div>' : '<div class="tk-empty">' + icon('confirmation_number_outlined') + esc(t('noTicketsFound')) + '</div>') + '</div></div>';
      body.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { active = b.dataset.f; paint(); }; });
      body.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { H.push(TicketDetailsPage(list[+b.dataset.i])); }; });
    }
    function load() {
      loading = true; error = null; paint();
      Api.request('GET', '/teamswork/tickets').then(function (r) {
        if (r.body.success === true) tickets = r.body.tickets.map(function (x) { return Object.assign({}, x); });
        else error = r.body.error || 'Failed to load tickets';
      }).catch(function () { error = 'Network error. Please try again.'; }).then(function () { loading = false; paint(); });
    }
    node.querySelector('[data-fab]').onclick = function () {
      createTicketSheet().then(function (created) { if (created) { tickets.unshift(created); paint(); } });
    };
    sc.resume = function (updated) {
      if (!updated || !updated.id) return;
      for (var i = 0; i < tickets.length; i++) if (tickets[i].id === updated.id) tickets[i] = updated;
      paint();
    };
    sc.enter = load;
    return sc;
  }

  /* ==== CreateTicketSheet ================================================= */
  var PRIORITIES = ['Low', 'Medium', 'Important', 'Urgent'];
  var AV = ['#2E5838', '#5B4FCF', '#B05A2F', '#2F7A8A', '#7A2F6E'];
  function hashColor(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0; return AV[Math.abs(h) % AV.length]; }
  function tInitials(name) { var p = name.trim().split(' '); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name ? name[0].toUpperCase() : '?'; }

  function createTicketSheet() {
    var p = H.prefs(), me = { id: String(p.user_id || ''), name: p.username || '', email: p.email || '' };
    var v = { title: '', desc: '', tag: '' }, priority = null, dept = null, cat = null, loc = null, assignee = null;
    var fields = {}, loadingFields = true, results = [], loadingA = false, showA = false, aq = '', err = null, submitting = false, deb = null;
    return H.sheet('<div class="handle line"></div><div class="ct"><h2>' + esc(t('newTicket')) + '</h2><div class="scroll" data-body style="flex:1"></div></div>',
      { cls: 'r28', height: '82%', wire: function (s, o) {
        var body = s.querySelector('[data-body]');
        function label(text, req) { return '<div class="ct-label">' + esc(text) + (req === false ? '' : '<em>*</em>') + '</div>'; }
        function textField(key, lab, rows, req) {
          return label(lab, req) + '<div class="ct-box">' + (rows ? '<textarea data-v="' + key + '" rows="' + rows + '" placeholder="' + esc(lab) + '">' + esc(v[key]) + '</textarea>'
            : '<input data-v="' + key + '" placeholder="' + esc(lab) + '" value="' + esc(v[key]) + '">') + '</div><div style="height:12px"></div>';
        }
        function dd(lab, key, value, opts, loading) {
          var text = value ? (opts.filter(function (x) { return x.key === value; })[0] || {}).text : null;
          return label(lab) + '<div class="ct-box"><button class="ct-select" data-dd="' + key + '"' + (opts.length ? '' : ' disabled') + '><span class="' + (text ? '' : 'hint') + '">' + esc(text || (loading ? t('loading') : lab)) + '</span>' + icon('keyboard_arrow_down_rounded') + '</button></div><div style="height:12px"></div>';
        }
        function optsFor(title) { return (fields[title] || { options: [] }).options; }
        function assigneeField() {
          if (assignee) {
            return '<div class="ct-box ct-selected"><span class="avatar-c" style="background:' + hashColor(assignee.name) + '">' + esc(tInitials(assignee.name)) + '</span><div><b>' + esc(assignee.name) + '</b><small>' + esc(assignee.email) + '</small></div>' +
              '<button data-unassign aria-label="Remove">' + icon('close') + '</button></div>';
          }
          var pop = '';
          if (showA) {
            pop = '<div class="ct-pop">' + (loadingA ? '<div style="padding:16px;display:grid;place-items:center"><span class="spin sm" style="border-top-color:#6750A4"></span></div>'
              : !results.length ? '<div class="msg">' + esc(aq ? t('noResultsFound') : t('startTypingToSearch')) + '</div>'
              : results.map(function (r, i) {
                return '<button class="sugg-row sm" data-pick="' + i + '"><span class="avatar-c" style="width:32px;height:32px;background:' + hashColor(r.name) + '">' + esc(tInitials(r.name)) + '</span><div><b style="font-size:13px">' + esc(r.name) + '</b><small style="font-size:11px">' + esc(r.email) + '</small></div></button>';
              }).join('')) + '</div>';
          }
          return '<div class="ct-box"><input data-assignee placeholder="' + esc(t('searchByName')) + '" value="' + esc(aq) + '" autocomplete="off"></div>' + pop;
        }
        function render() {
          body.innerHTML = textField('title', t('titleField')) + textField('desc', t('descriptionField'), 3) +
            label(t('priority')) + '<div class="ct-box"><button class="ct-select" data-prio><span class="' + (priority ? '' : 'hint') + '">' + esc(priority || t('priority')) + '</span>' + icon('keyboard_arrow_down_rounded') + '</button></div><div style="height:12px"></div>' +
            dd(t('department'), 'department', dept, optsFor('department'), loadingFields) + dd(t('category'), 'category', cat, optsFor('category'), loadingFields) + dd(t('location'), 'location', loc, optsFor('location'), loadingFields) +
            label(t('assignee')) + assigneeField() + '<div style="height:12px"></div>' + textField('tag', t('tag') + ' (optional)', 0, false) +
            label(t('requestor'), false) + '<div class="ct-box" style="padding:11px 14px;font-size:13.5px;' + (me.name ? '' : 'color:var(--muted)') + '">' + esc(me.name || t('loading')) + '</div>' +
            (err ? '<div class="ct-err">' + esc(err) + '</div>' : '') + '<div style="height:20px"></div><button class="primary-btn" data-submit' + (submitting ? ' disabled' : '') + '>' + (submitting ? '<span class="spin white"></span>' : esc(t('submit'))) + '</button>';
          wire();
        }
        function repaint(focus) {
          var a = document.activeElement, key = a && a.dataset && (a.dataset.v || (a.hasAttribute('data-assignee') ? '@' : '')), pos = a && a.selectionStart, top = body.scrollTop;
          render(); body.scrollTop = top;
          var k = focus || key;
          if (k) { var n = k === '@' ? body.querySelector('[data-assignee]') : body.querySelector('[data-v="' + k + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
        }
        function fetchA(q) {
          loadingA = true; repaint();
          Api.request('GET', '/microsoft/me/people?search=' + q + '&cursor=').then(function (r) {
            results = (r.body.data || []).map(function (u) { return { id: u.id || u.email || '', name: u.name || '', email: u.email || '' }; });
          }).catch(function () { results = []; }).then(function () { loadingA = false; repaint(); });
        }
        function wire() {
          body.querySelectorAll('[data-v]').forEach(function (i) { i.oninput = function () { v[i.dataset.v] = i.value; }; });
          body.querySelector('[data-prio]').onclick = function () {
            var r = this.getBoundingClientRect();
            H.menu(r.left, r.top, PRIORITIES.map(function (x) { return { label: x, value: x, selected: x === priority }; }), { width: r.width }).then(function (x) { if (x) { priority = x; repaint(); } });
          };
          body.querySelectorAll('[data-dd]').forEach(function (b) {
            b.onclick = function () {
              var key = b.dataset.dd, cur = key === 'department' ? dept : key === 'category' ? cat : loc, r = b.getBoundingClientRect();
              H.menu(r.left, r.top, optsFor(key).map(function (x) { return { label: x.text, value: x.key, selected: x.key === cur }; }), { width: r.width }).then(function (x) {
                if (!x) return;
                if (key === 'department') dept = x; else if (key === 'category') cat = x; else loc = x;
                repaint();
              });
            };
          });
          var ai = body.querySelector('[data-assignee]');
          if (ai) {
            ai.onfocus = function () { if (showA) return; showA = true; fetchA(ai.value.trim()); };
            ai.onblur = function () { setTimeout(function () { if (document.activeElement && document.activeElement.hasAttribute && document.activeElement.hasAttribute('data-assignee')) return; showA = false; repaint(); }, 200); };
            ai.oninput = function () { aq = ai.value; clearTimeout(deb); deb = setTimeout(function () { fetchA(ai.value.trim()); }, 350); };
          }
          body.querySelectorAll('[data-pick]').forEach(function (b) {
            b.onmousedown = function (e) { e.preventDefault(); };
            b.onclick = function () { assignee = results[+b.dataset.pick]; aq = ''; showA = false; if (document.activeElement) document.activeElement.blur(); repaint(); };
          });
          var un = body.querySelector('[data-unassign]'); if (un) un.onclick = function () { assignee = null; repaint(); };
          body.querySelector('[data-submit]').onclick = submit;
        }
        function submit() {
          var title = v.title.trim(), d = v.desc.trim();
          if (!title || !d || !priority || !dept || !cat || !loc || !assignee) { err = t('fillAllRequiredFields'); return repaint(); }
          var df = fields.department, lf = fields.location, cf = fields.category;
          if (!df || !lf || !cf) { err = t('failedToCreateTicket'); return repaint(); }
          submitting = true; err = null; repaint();
          var cfv = {}; cfv[df.id] = [dept]; cfv[lf.id] = [loc]; cfv[cf.id] = [cat];
          var b = { title: title, description: d, priority: priority, requestor: { id: me.id, name: me.name, email: me.email },
            assignee: { id: assignee.id, name: assignee.name, email: assignee.email }, customFields: cfv };
          if (v.tag.trim()) b.tags = [v.tag.trim()];
          Api.request('POST', '/teamswork/tickets', b).then(function (r) {
            if (r.body.success === true) o.close(r.body.ticket);
            else { submitting = false; err = r.body.error || t('failedToCreateTicket'); repaint(); }
          }).catch(function () { submitting = false; err = t('networkError'); repaint(); });
        }
        render();
        Api.request('GET', '/teamswork/instance').then(function (r) {
          var inst = r.body.instance || r.body.item || r.body.data || r.body;
          ['customFields', 'customFieldsLeft', 'customFieldsRight'].forEach(function (k) {
            (inst[k] || []).forEach(function (f) {
              if (!f.id || !f.title) return;
              fields[f.title.trim().toLowerCase()] = { id: f.id, title: f.title, options: (f.options || []).filter(function (x) { return x.key; }).map(function (x) { return { key: x.key, text: String(x.text || '').trim() }; }) };
            });
          });
        }).catch(function () { fields = {}; }).then(function () { loadingFields = false; repaint(); });
      } });
  }

  /* ==== TicketDetailsPage ================================================= */
  function TicketDetailsPage(ticket) {
    var tk = Object.assign({}, ticket), loading = true, resolving = false, attachments = [];
    var node = H.screen('', '<div data-head></div><div data-bar></div><div style="flex:1;min-height:0;position:relative"><div class="scroll" style="height:100%" data-body></div><div data-float></div></div>');
    var sc = { el: node };
    function isResolved() { return tk.isResolved === true || ['Resolved', 'Closed', 'resolved'].indexOf(tk.status) !== -1; }
    function field(label, value, child) {
      return '<div class="td-f"><b>' + esc(label) + '</b>' + (child || '<span>' + esc(value === null || value === undefined ? '—' : value) + '</span>') + '</div>';
    }
    function paint() {
      var done = isResolved();
      node.querySelector('[data-head]').innerHTML = H.hero(t('details'), tk.id);
      node.querySelector('[data-head] [data-back]').removeAttribute('data-back');
      node.querySelector('[data-head] .hero-back').onclick = function () { H.pop(tk); };
      node.querySelector('[data-bar]').innerHTML = loading ? '<div class="linear"></div>' : '';
      var body = node.querySelector('[data-body]');
      body.style.paddingBottom = done ? '28px' : '110px';
      body.innerHTML = '<div class="td-card"><div class="td-chips"><span class="td-chip" style="background:' + (done ? 'var(--green-light)' : '#FFF2D3') + ';color:' + (done ? 'var(--green)' : '#C98200') + '">' +
        icon(done ? 'check_circle_rounded' : 'schedule_rounded') + esc(done ? t('resolved') : t('inProgress')) + '</span><span class="td-chip" style="background:#F2F2F2;color:var(--ink);font-weight:700">' +
        esc(tk.priority ? tk.priority : t('noPriority')) + '</span></div>' +
        field('ID', tk.id) + field(t('titleField'), tk.title) + (tk.description ? field(t('descriptionField'), tk.description) : '') +
        field(t('requestor'), tk.requestor) + field(t('requestorEmail'), tk.requestorEmail) + field(t('assignee'), tk.assignee) + field(t('assigneeEmail'), tk.assigneeEmail) +
        field(t('createdDate'), tk.createdAt) + field(t('priority'), null, '<span>' + icon('arrow_upward_rounded') + '<span style="font-weight:500">' + esc(tk.priority || '') + '</span></span>') +
        field(t('tag'), tk.tag ? tk.tag : '—') + field(t('createdBy'), tk.createdBy) +
        (attachments.length ? field(t('attachments'), null, attachments.map(function (a) { return '<a>' + icon('attach_file_rounded') + esc(a.caption || a.src || '') + '</a>'; }).join('')) : '') + '</div>';
      var fl = node.querySelector('[data-float]');
      fl.innerHTML = done ? '' : '<button class="resolve-btn" data-resolve' + (resolving ? ' disabled' : '') + '>' + (resolving ? '<span class="spin white" style="width:20px;height:20px"></span>' : esc(t('resolve'))) + '</button>';
      var rb = fl.querySelector('[data-resolve]');
      if (rb) rb.onclick = resolve;
    }
    function resolve() {
      resolving = true; paint();
      Api.request('PATCH', '/teamswork/tickets/' + (tk.teamsworkId || '') + '/resolve').then(function (r) {
        if (r.body.success === true) { tk.isResolved = true; tk.status = 'Resolved'; H.pop(tk); }
        else { resolving = false; paint(); H.snack(r.body.error || 'Failed to resolve ticket.', null, 3); }
      }).catch(function () { resolving = false; paint(); H.snack(t('failedToResolveTicket'), null, 3); });
    }
    sc.enter = function () {
      paint();
      var id = tk.teamsworkId || '';
      if (!id) { loading = false; return paint(); }
      Promise.all([Api.request('GET', '/teamswork/tickets/' + id), Api.request('GET', '/teamswork/tickets/' + id + '/attachments')]).then(function (res) {
        if (res[0].body.success === true) tk = Object.assign({}, res[0].body.ticket);
        if (res[1].body.success === true) attachments = res[1].body.attachments || [];
      }).catch(function () {}).then(function () { loading = false; paint(); });
    };
    return sc;
  }

  H.screens.TicketingPage = TicketingPage;
})(HQ);
