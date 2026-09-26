/**
 * Bulletin Board: bulletin_board_page.dart, bulletin_board_detail_page.dart,
 * create_bulletin_post_sheet.dart, bulletin_audience_badge.dart and
 * linkified_text.dart, over hq-web's /bulletin routes (BulletinService).
 */
(function (H) {
  'use strict';
  var t = H.t, esc = H.esc, icon = H.icon, el = H.el, Api = H.Api;

  var EMOJI = { group_buy: '🛍️', lost_found: '🔍', quick_help: '🤝', reminder: '⏰', poll: '📊' };
  var ICON_BG = { group_buy: '#DBEAFE', lost_found: '#FEF3C7', quick_help: '#FFE4E6', reminder: '#CCFBF1', poll: '#EDE9FE' };
  var CAT = { group_buy: ['#DBEAFE', '#1D4ED8'], lost_found: ['#FEF3C7', '#B45309'], quick_help: ['#FFE4E6', '#BE123C'], reminder: ['#CCFBF1', '#0F766E'], poll: ['#EDE9FE', '#6D28D9'] };
  var PILL = { open: ['#DCF5E4', '#1A6B3A'], resolved: ['#E0F0FF', '#1A5F9E'], closing_soon: ['#FEF3C7', '#B45309'], expired: ['#FFE4E6', '#B42318'],
    urgent: ['#FFE4E6', '#B42318'], normal: ['#F3F4F6', '#6B7280'], low: ['#DCF5E4', '#1A6B3A'] };
  var STATUS = { open: '#2E5838', closing_soon: '#B45309', resolved: '#374151', expired: '#6B7280' };
  function catLabel(c) { return { group_buy: 'Group Buy', lost_found: 'Lost & Found', quick_help: 'Quick Help', reminder: 'Reminder', poll: 'Poll' }[c] || c; }
  function actionLabel(c) { return { group_buy: 'Join', lost_found: 'Claim', quick_help: 'Help', reminder: 'Acknowledge', poll: 'Vote' }[c] || 'View'; }
  function actionType(c) { return { group_buy: 'joined', lost_found: 'claimed', quick_help: 'helped', reminder: 'acknowledged', poll: 'voted' }[c] || ''; }

  function postFrom(j) {
    return { id: j.id, category: j.category, title: j.title, description: j.description, status: j.status, metadata: j.metadata || null, imageUrl: j.image_url || null,
      isPinned: j.is_pinned === true, expiresAt: j.expires_at ? H.parseLocal(j.expires_at) : null, createdAt: H.parseLocal(j.created_at),
      authorId: j.author_id, authorName: j.author_name || '', commentCount: j.comment_count || 0, isOwner: j.is_owner === true, isAdmin: j.is_admin === true,
      visibility: j.visibility || 'everyone', deptIds: j.audience_department_ids || [], userIds: j.audience_user_ids || [],
      deptNames: j.audience_department_names || [], userNames: j.audience_user_names || [] };
  }
  function restricted(p) { return p.visibility !== 'everyone'; }
  function audienceBadge(p, compact) {
    var label = 'Restricted';
    if (p.visibility === 'departments') {
      var n = p.deptNames;
      label = !n.length ? 'Specific departments' : compact && n.length > 2 ? n.slice(0, 2).join(', ') + ' +' + (n.length - 2) : n.join(', ');
    } else if (p.visibility === 'users') {
      var u = p.userNames, c = u.length ? u.length : p.userIds.length;
      label = compact || !u.length ? (c === 1 ? '1 person' : c + ' people') : u.length > 2 ? u.slice(0, 2).join(', ') + ' +' + (u.length - 2) : u.join(', ');
    }
    return '<span class="aud">' + icon('lock_outline') + '<span>' + esc(label) + '</span></span>';
  }
  function timeAgo(d, short) {
    var ms = Date.now() - d.getTime(), m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000), days = Math.floor(ms / 86400000);
    if (m < 60) return m + 'm';
    if (h < 24) return h + 'h';
    if (short || days < 7) return days + 'd';
    return d.getDate() + ' ' + H.MON[d.getMonth()];
  }
  function pill(s) {
    var c = PILL[s] || ['var(--line)', 'var(--muted)'];
    var lab = { open: t('open'), resolved: t('claimed'), closing_soon: t('closingSoon'), expired: t('expired'), urgent: t('urgent'), normal: t('normal'), low: t('low') }[s] || s;
    return '<span class="s-pill" style="background:' + c[0] + ';color:' + c[1] + '">' + esc(lab) + '</span>';
  }
  // LinkifiedText: URLs and emails become tappable (looseUrl, no humanize).
  function linkify(text) {
    var re = /(https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+|\b[a-z0-9-]+\.(?:com|sg|net|org|io)(?:\/[^\s]*)?)/gi, out = '', last = 0, m;
    text = String(text || '');
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index)) + '<a class="linkish" data-ext>' + esc(m[0]) + '</a>';
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  function wireLinks(root) { root.querySelectorAll('[data-ext]').forEach(function (a) { a.onclick = function () { H.live('Opening links outside the app'); }; }); }
  function fmt(d) { return H.dfmt(d, 'd MMM yyyy, h:mm a'); }
  function humanize(e, fallback) {
    var generic = fallback || 'Something went wrong. Please try again.', msg = String(e && e.message || e).replace(/^(ErrorDescription|Exception|FlutterError|_Exception):\s*/, '').trim(), low = msg.toLowerCase();
    if (!msg) return generic;
    if (/socketexception|failed host lookup|connection refused|connection closed|network is unreachable|timeoutexception|timed out/.test(low)) return 'Please check your internet connection and try again.';
    if (/could not be found|not be found|\bhttp\s*\d{3}\b|\b[45]\d{2}\b|formatexception|unexpected character|html|exception/.test(low)) return generic;
    return msg;
  }

  /* ==== ApiManager (bulletin) ============================================ */
  function data(r, ok) { if (r.status === (ok || 200)) return r.body.data; throw H.ErrorDescription((r.body && r.body.message) || 'HTTP ' + r.status); }
  function none(r) { if (r.status !== 200) throw H.ErrorDescription((r.body && r.body.message) || 'HTTP ' + r.status); }
  var B = {
    posts: function (cat, page) { return Api.request('GET', '/bulletin/posts?' + (cat ? 'category=' + cat + '&' : '') + 'page=' + page).then(function (r) { return data(r); }); },
    detail: function (id) { return Api.request('GET', '/bulletin/posts/' + id).then(function (r) { return data(r); }); },
    create: function (b) { return Api.request('POST', '/bulletin/posts', b).then(function (r) { return data(r, 201); }); },
    del: function (id) { return Api.request('DELETE', '/bulletin/posts/' + id).then(none); },
    comment: function (id, c) { return Api.request('POST', '/bulletin/posts/' + id + '/comments', { content: c }).then(function (r) { return data(r, 201); }); },
    delComment: function (id, cid) { return Api.request('DELETE', '/bulletin/posts/' + id + '/comments/' + cid).then(none); },
    interact: function (id, type, meta) { var b = { action_type: type }; if (meta) b.metadata = meta; return Api.request('POST', '/bulletin/posts/' + id + '/interact', b).then(function (r) { return data(r); }); },
    pin: function (id, on) { return Api.request('PATCH', '/bulletin/posts/' + id + '/pin', { pinned: on }).then(none); },
    status: function (id, s) { return Api.request('PATCH', '/bulletin/posts/' + id + '/status', { status: s }).then(none); },
    depts: function () { return Api.request('GET', '/bulletin/audience/departments').then(function (r) { return data(r); }); },
    users: function () { return Api.request('GET', '/bulletin/audience/users').then(function (r) { return data(r); }); }
  };

  /* ==== BulletinBoardPage ================================================= */
  function BulletinBoardPage() {
    var KEYS = [null, 'group_buy', 'lost_found', 'reminder'], cat = null, posts = [], page = 1, last = 1, loading = false, loadingMore = false, error = null;
    var node = H.screen('bb', H.hero(t('bulletinBoardTitle'), t('bulletinBoardSubtitle')) + '<div class="scroll" data-body></div>' +
      '<button class="fab bb-fab" data-fab aria-label="' + esc(t('post')) + '">' + icon('add') + '</button>');
    var sc = { el: node }, body = node.querySelector('[data-body]');
    function labels() { return [t('all'), t('categoryGroupBuy'), t('categoryLostFound'), t('categoryReminders')]; }
    function card(p, first) {
      var exp = p.expiresAt, now = new Date();
      return '<div class="post-card" data-p="' + p.id + '"><span class="emo" style="background:' + (ICON_BG[p.category] || 'var(--line)') + '">' + (EMOJI[p.category] || '📋') + '</span><div class="c"><b>' + esc(p.title) + '</b>' +
        '<span class="by">' + esc(p.authorName) + ' · ' + timeAgo(p.createdAt) + '</span>' + (restricted(p) ? audienceBadge(p, true) : '') +
        '<span class="foot">' + icon('mode_comment_outlined') + p.commentCount + '<span class="sp"></span>' +
        (p.category === 'lost_found' ? pill(p.status) : '') + (p.category === 'quick_help' ? pill((p.metadata || {}).urgency || 'normal') : '') +
        (exp && exp > now && (exp - now) / 60000 <= 30 ? pill('closing_soon') : '') + (exp && exp < now ? pill('expired') : '') + '</span></div></div>';
    }
    function banner(p) {
      return '<div class="pinned" data-p="' + p.id + '">' + icon('campaign_outlined') + '<span class="pin-chip"><span style="font-size:11px">📌</span>' + esc(t('pinned')) + '</span>' +
        '<h3>' + esc(p.title) + '</h3><p>' + esc(p.description) + '</p><div class="btns"><button class="f">' + esc(actionLabel(p.category)) + '</button><button>' + esc(t('details')) + '</button></div></div>';
    }
    function paint() {
      var bar = '<div class="bb-cats"><div class="hscroll">' + KEYS.map(function (k, i) { return '<button class="bb-cat' + (cat === k ? ' on' : '') + '" data-cat="' + i + '">' + esc(labels()[i]) + '</button>'; }).join('') + '</div></div>';
      var content;
      if (loading) {
        content = '<div class="pulse" style="padding:18px 16px 100px">' + [0, 1, 2, 3].map(function (i) {
          return '<div class="bb-skel" style="height:' + (i ? 104 : 132) + 'px"><span class="bone" style="display:block;width:' + (i ? 168 : 210) + 'px;height:11px"></span>' +
            '<span style="display:block;height:9px;border-radius:5px;background:#E6EAE7;margin-top:12px"></span><span style="display:block;width:132px;height:9px;border-radius:5px;background:#E6EAE7;margin-top:8px"></span></div>';
        }).join('') + '</div>';
      } else if (error && !posts.length) {
        content = '<div style="padding:120px 20px;text-align:center"><div style="color:var(--muted)">' + esc(error) + '</div><button class="text-btn" data-retry style="margin-top:12px">' + esc(t('retry')) + '</button></div>';
      } else if (!posts.length) {
        content = '<div style="padding:160px 20px;text-align:center;color:var(--muted)">' + esc(t('noPostsYet')) + '</div>';
      } else {
        var pinned = posts.filter(function (p) { return p.isPinned; }), feed = posts.filter(function (p) { return !p.isPinned; });
        content = (pinned.length ? banner(pinned[0]) + pinned.slice(1).map(function (p) { return card(p); }).join('') : '') +
          (feed.length ? '<div class="bb-latest">' + esc(t('latestPosts')) + '</div>' + feed.map(function (p) { return card(p); }).join('') : '') +
          (loadingMore ? '<div class="pulse" style="padding:20px;display:grid;place-items:center"><span class="bone" style="width:92px;height:9px;border-radius:5px"></span></div>' : '') + '<div style="height:100px"></div>';
      }
      var top = body.scrollTop;
      body.innerHTML = bar + content;
      body.scrollTop = top;
      body.querySelectorAll('[data-cat]').forEach(function (b) { b.onclick = function () { var k = KEYS[+b.dataset.cat]; if (k === cat) return; cat = k; fetch(true); }; });
      var retry = body.querySelector('[data-retry]'); if (retry) retry.onclick = function () { fetch(true); };
      body.querySelectorAll('[data-p]').forEach(function (c) {
        var p = posts.filter(function (x) { return String(x.id) === c.dataset.p; })[0];
        c.onclick = function () { H.push(BulletinBoardDetailPage(p.id)); };
        H.longPress(c, function (pt) {
          if (!p.isAdmin) return;
          H.menu(pt.x, pt.y, [{ label: p.isPinned ? t('unpinPost') : t('pinPost'), value: 'pin', icon: p.isPinned ? 'push_pin' : 'push_pin_outlined' }]).then(function (v) {
            if (v !== 'pin') return;
            B.pin(p.id, !p.isPinned).then(function () { fetch(true); }).catch(function (e) { H.snack(String(e.message || e)); });
          });
        });
      });
    }
    function fetch(reset) {
      if (reset) { loading = true; error = null; page = 1; } else loadingMore = true;
      paint();
      B.posts(cat, reset ? 1 : page + 1).then(function (d) {
        var incoming = d.posts.map(postFrom);
        if (reset) { posts = incoming; page = 1; } else { posts = posts.concat(incoming); page++; }
        last = d.last_page || 1;
      }).catch(function (e) { error = String(e.message || e); }).then(function () { loading = false; loadingMore = false; paint(); });
    }
    body.onscroll = function () { if (body.scrollTop + body.clientHeight >= body.scrollHeight - 200 && !loadingMore && page < last) fetch(false); };
    node.querySelector('[data-fab]').onclick = function () { createSheet().then(function (ok) { if (ok === true) fetch(true); }); };
    sc.resume = function () { fetch(true); };
    sc.enter = function () { fetch(true); };
    return sc;
  }

  /* ==== BulletinBoardDetailPage =========================================== */
  function BulletinBoardDetailPage(postId) {
    var post = null, comments = [], counts = {}, mine = null, poll = {}, loading = true, posting = false, interacting = false, error = null, commentText = '';
    var node = H.screen('', '<header class="appbar light"><button class="icon-btn" data-back aria-label="Back">' + icon('arrow_back') + '</button><div class="appbar-title">' + esc(t('post')) + '</div><span data-menu></span></header>' +
      '<div style="flex:1;min-height:0;display:flex;flex-direction:column" data-body></div>');
    var sc = { el: node }, body = node.querySelector('[data-body]');
    function effective() {
      if (post.status === 'resolved' || post.status === 'expired') return post.status;
      var e = post.expiresAt; if (!e) return post.status;
      var n = new Date(); if (e < n) return 'expired';
      if ((e - n) / 60000 <= 30) return 'closing_soon';
      return post.status;
    }
    function header() {
      var st = effective(), meta = post.metadata || {}, c = CAT[post.category] || ['var(--line)', 'var(--muted)'], sc2 = STATUS[st] || '#73777F';
      var tint = st === 'expired' ? 'var(--danger)' : st === 'closing_soon' ? '#B45309' : 'var(--muted)';
      var U = { urgent: ['Urgent', '#BE123C'], normal: ['Normal', '#6B7280'], low: ['Low', '#15803D'] }[meta.urgency || 'normal'] || ['Normal', '#6B7280'];
      return '<div class="bd-head"><div class="bd-top"><span class="cat-chip-s" style="background:' + c[0] + ';color:' + c[1] + '">' + esc(catLabel(post.category)) + '</span><span class="sp"></span>' +
        (post.category === 'quick_help' && st !== 'resolved' ? '<span class="badge10" style="background:' + U[1] + '1a;color:' + U[1] + '">' + U[0].toUpperCase() + '</span>' : '') +
        '<span class="badge10" style="background:' + sc2 + '1a;color:' + sc2 + '">' + esc(st.replace(/_/g, ' ').toUpperCase()) + '</span></div>' +
        '<h2>' + esc(post.title) + '</h2>' + (restricted(post) ? '<div style="margin-top:8px">' + audienceBadge(post, false) + '</div>' : '') +
        '<div class="bd-desc">' + linkify(post.description) + '</div>' + (post.imageUrl ? '<img class="bd-img" data-img src="' + esc(post.imageUrl) + '" alt="">' : '') +
        '<div class="bd-meta">' + icon('person_outline') + esc(post.authorName) + '<span>&nbsp; · &nbsp;</span>' + esc(fmt(post.createdAt)) + '</div>' +
        (post.expiresAt ? '<div class="bd-meta" style="color:' + tint + '">' + icon('timer_outlined') + esc((st === 'expired' ? 'Closed ' : 'Closes ') + fmt(post.expiresAt)) + '</div>' : '') + '</div>';
    }
    function actions() {
      var meta = post.metadata || {};
      if (post.category === 'poll') {
        var opts = meta.options || [], show = meta.show_results_immediately === true || mine !== null, voted = mine && mine.metadata ? mine.metadata.option_index : null;
        var total = Object.keys(poll).reduce(function (a, k) { return a + (+poll[k] || 0); }, 0), can = mine === null && !interacting;
        return '<div class="poll"><div class="poll-h">' + icon('poll_outlined') + total + ' ' + (total === 1 ? 'vote' : 'votes') + '</div>' + opts.map(function (o, i) {
          var isV = voted !== null && voted !== undefined && String(voted) === String(i), pct = total ? (+poll[String(i)] || 0) / total : 0;
          return '<button class="poll-opt' + (isV ? ' voted' : '') + '" data-vote="' + i + '"' + (can ? '' : ' disabled') + ' style="cursor:' + (can ? 'pointer' : 'default') + '">' +
            (show ? '<span class="fill" data-pct="' + pct + '"></span>' : '') + (isV ? '<span class="ck">' + icon('check') + '</span>' : '') + '<span>' + esc(o) + '</span>' +
            (show ? '<em data-pctl="' + pct + '">0%</em>' : '') + '</button>';
        }).join('') + (interacting ? '<div style="padding-top:4px;display:grid;place-items:center"><span class="spin sm"></span></div>' : '') + '</div>';
      }
      if (post.category === 'group_buy') {
        if (meta.order_link) return '<div class="bd-act"><button class="fill-btn" data-order>' + icon('open_in_new') + esc(t('openOrderLink')) + '</button></div>';
        return '<div class="bd-act"><div class="note-box">' + icon('info_outline') + esc(t('noOrderLinkProvided')) + '</div></div>';
      }
      if (post.category === 'quick_help' && post.isOwner) {
        var res = post.status === 'resolved';
        return '<div class="bd-act">' + (res ? '' : '<button class="fill-btn green" data-resolve>' + icon('check_circle_outline') + esc(t('markResolved')) + '</button>') +
          '<button class="out-btn" data-delete>' + icon('delete_outline') + esc(t('deletePost')) + '</button></div>';
      }
      var need = meta.people_needed, done = mine !== null;
      return '<div class="bd-act">' + (post.category === 'quick_help' && need ? '<div class="need">' + icon('people_outline') + need + ' ' + (need === 1 ? 'person' : 'people') + ' needed</div>' : '') +
        '<button class="fill-btn' + (done ? ' done' : '') + '" data-act' + (done || interacting ? ' disabled' : '') + '>' + (interacting ? '<span class="spin sm white"></span>' : esc(done ? '✓ ' + t('done') : actionLabel(post.category))) + '</button></div>';
    }
    function paint() {
      var menuSlot = node.querySelector('[data-menu]');
      menuSlot.innerHTML = post && (post.isOwner || post.isAdmin) ? '<button class="icon-btn" data-dots aria-label="More">' + icon('more_vert') + '</button>' : '';
      var dots = menuSlot.querySelector('[data-dots]');
      if (dots) dots.onclick = function () {
        var r = dots.getBoundingClientRect();
        H.menu(r.right - 150, r.top + 8, [{ label: t('deletePost'), value: 'delete' }]).then(function (v) { if (v === 'delete') deletePost(); });
      };
      if (loading) { body.innerHTML = '<div style="flex:1;display:grid;place-items:center"><span class="spin"></span></div>'; return; }
      if (error) { body.innerHTML = '<div style="flex:1;display:grid;place-items:center;color:var(--muted);padding:20px;text-align:center">' + esc(error) + '</div>'; return; }
      var top = (body.querySelector('.scroll') || {}).scrollTop || 0;
      body.innerHTML = '<div class="scroll" style="padding-bottom:8px">' + header() + actions() + '<div class="bd-comments-h">' + esc(t('comments')) + '</div>' +
        (comments.length ? '' : '<div class="bd-none">' + esc(t('noCommentsYet')) + '</div>') + comments.map(function (c, i) {
          return '<div class="cm"><i>' + esc(c.authorName ? c.authorName[0].toUpperCase() : '?') + '</i><div><div class="who">' + esc(c.authorName) + '<span>&nbsp; · &nbsp;' + timeAgo(c.createdAt, true) + '</span></div>' +
            '<div class="txt">' + linkify(c.content) + '</div></div>' + (post.isAdmin || post.isOwner ? '<button data-delc="' + i + '" aria-label="Delete comment">' + icon('close') + '</button>' : '') + '</div>';
        }).join('') + '</div><div class="comment-bar"><textarea data-comment rows="1" placeholder="' + esc(t('addComment')) + '">' + esc(commentText) + '</textarea>' +
        '<button data-send aria-label="Send"' + (posting ? ' disabled' : '') + '>' + (posting ? '<span class="spin sm"></span>' : icon('send_rounded')) + '</button></div>';
      body.querySelector('.scroll').scrollTop = top;
      wireLinks(body);
      H.raf(function () {
        body.querySelectorAll('[data-pct]').forEach(function (f) { f.style.width = (+f.dataset.pct * 100) + '%'; });
        body.querySelectorAll('[data-pctl]').forEach(function (l) { animatePct(l, +l.dataset.pctl); });
      });
      var ta = body.querySelector('[data-comment]');
      ta.oninput = function () { commentText = ta.value; ta.style.height = 'auto'; ta.style.height = Math.min(90, ta.scrollHeight) + 'px'; };
      ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
      body.querySelector('[data-send]').onclick = send;
      body.querySelectorAll('[data-delc]').forEach(function (b) {
        b.onclick = function () {
          var c = comments[+b.dataset.delc];
          B.delComment(postId, c.id).then(function () { comments = comments.filter(function (x) { return x.id !== c.id; }); paint(); }).catch(function (e) { H.snack(String(e.message || e)); });
        };
      });
      body.querySelectorAll('[data-vote]').forEach(function (b) { b.onclick = function () { if (mine === null && !interacting) interact({ option_index: +b.dataset.vote }); }; });
      var act = body.querySelector('[data-act]'); if (act) act.onclick = function () { interact(null); };
      var ord = body.querySelector('[data-order]'); if (ord) ord.onclick = function () { H.live('Opening the group order link'); };
      var rs = body.querySelector('[data-resolve]'); if (rs) rs.onclick = function () { B.status(postId, 'resolved').then(load).catch(function (e) { H.snack(String(e.message || e)); }); };
      var dl = body.querySelector('[data-delete]'); if (dl) dl.onclick = deletePost;
      var img = body.querySelector('[data-img]');
      if (img) img.onclick = function () {
        var lb = el('<div class="lightbox"><img src="' + esc(post.imageUrl) + '" alt=""></div>');
        lb.onclick = function () { lb.remove(); };
        document.getElementById('app').appendChild(lb);
      };
    }
    function animatePct(label, target) {
      var t0 = null, from = 0;
      function step() {
        var now = performance.now(); if (t0 === null) t0 = now;
        var k = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - k, 3);
        label.textContent = Math.round((from + (target - from) * e) * 100) + '%';
        if (k < 1 && label.isConnected) H.raf(step);
      }
      step();
    }
    function apply(d, withComments) {
      post = postFrom(d.post);
      if (withComments) comments = d.comments.map(function (c) { return { id: c.id, authorName: (c.user && c.user.name) || '', content: c.content, createdAt: H.parseLocal(c.created_at) }; });
      counts = d.interaction_counts && !Array.isArray(d.interaction_counts) ? d.interaction_counts : {};
      poll = d.poll_vote_counts && typeof d.poll_vote_counts === 'object' ? d.poll_vote_counts : {};
      mine = d.user_interaction || null;
    }
    function load() {
      loading = true; error = null; paint();
      return B.detail(postId).then(function (d) { apply(d, true); }).catch(function (e) { error = String(e.message || e); }).then(function () { loading = false; paint(); });
    }
    function interact(meta) {
      interacting = true; paint();
      B.interact(post.id, actionType(post.category), meta).then(function () {
        return B.detail(postId).then(function (d) { apply(d, false); }).catch(function () {});
      }).catch(function (e) { H.snack(String(e.message || e)); }).then(function () { interacting = false; paint(); });
    }
    function send() {
      var text = commentText.trim();
      if (!text || posting) return;
      posting = true; paint();
      B.comment(postId, text).then(function (c) {
        commentText = '';
        comments.push({ id: c.id, authorName: (c.user && c.user.name) || '', content: c.content, createdAt: H.parseLocal(c.created_at) });
      }).catch(function (e) { H.snack(String(e.message || e)); }).then(function () { posting = false; paint(); });
    }
    function deletePost() {
      H.alert(t('deletePostQuestion'), t('deletePostUndo'), [{ label: t('cancel'), value: false }, { label: t('delete'), value: true, style: 'color:var(--danger)' }]).then(function (ok) {
        if (ok !== true) return;
        B.del(postId).then(function () { H.pop(); }).catch(function (e) { H.snack(String(e.message || e)); });
      });
    }
    sc.enter = load;
    return sc;
  }

  /* ==== CreateBulletinPostSheet =========================================== */
  var CATS = [
    { key: 'poll', label: 'Poll', icon: 'poll_outlined', color: '#6D28D9', hidden: true },
    { key: 'group_buy', label: 'Group Buy', icon: 'shopping_bag_outlined', color: '#1D4ED8', hidden: false },
    { key: 'lost_found', label: 'Lost & Found', icon: 'search_outlined', color: '#B45309', hidden: false },
    { key: 'reminder', label: 'Reminder', icon: 'alarm_outlined', color: '#0F766E', hidden: false },
    { key: 'quick_help', label: 'Quick Help', icon: 'handshake_outlined', color: '#BE123C', hidden: true }
  ];
  function createSheet() {
    var step = 0, cat = null, submitting = false, formError = null, v = { title: '', desc: '', collection: '', contact: '', orderLink: '', location: '', contactMethod: '', helpLocation: '' };
    var expires = null, image = null, hr = false, vis = 'everyone', depts = [], users = [], selDepts = {}, selUsers = {}, loadingAud = false, userSearch = '';
    return H.sheet('<div class="handle line" style="width:40px"></div><div style="height:12px"></div><div class="cb-sheet"><div class="cb-head" data-head></div><div class="cb-body" data-body></div><div data-foot></div></div>',
      { height: '92%', wire: function (s, o) {
        var head = s.querySelector('[data-head]'), body = s.querySelector('[data-body]'), foot = s.querySelector('[data-foot]');
        function fmtDt(d) { return d ? H.ymd(d) + 'T' + H.pad(d.getHours()) + ':' + H.pad(d.getMinutes()) + ':00' : null; }
        function field(label, key, hint, rows) {
          return '<div class="cb-f"><b>' + esc(label) + '</b>' + (rows ? '<textarea data-v="' + key + '" rows="' + rows + '" placeholder="' + esc(hint || '') + '">' + esc(v[key]) + '</textarea>'
            : '<input data-v="' + key + '" placeholder="' + esc(hint || '') + '" value="' + esc(v[key]) + '">') + '</div>';
        }
        function expLabel() { return cat === 'group_buy' ? 'Closing time (optional)' : cat === 'quick_help' ? 'Needed by (optional)' : cat === 'poll' ? 'Poll closing time (optional)' : 'Expiry (optional)'; }
        function catFields() {
          if (cat === 'group_buy') return field(t('grabOrderLink'), 'orderLink', 'https://grab.com/food/...') + field(t('collectionPoint'), 'collection', 'e.g. Pantry L3') + field(t('contactField'), 'contact', 'Name or Teams handle');
          if (cat === 'lost_found') return field(t('location'), 'location', t('whereLastSeen')) + field(t('contactMethod'), 'contactMethod', 'Email or Teams') +
            '<div class="cb-hr cb-f"><button class="checkbox' + (hr ? ' on' : '') + '" data-hr role="checkbox" aria-checked="' + hr + '">' + (hr ? icon('check') : '') + '</button><span>' + esc(t('hrReportCheckbox')) + '</span></div>';
          return '';
        }
        function audience() {
          var opts = [['everyone', 'public', 'Everyone', 'All staff can see this post'], ['departments', 'apartment_outlined', 'Specific departments', 'Only people in the chosen departments'],
            ['users', 'people_outline', 'Specific people', 'Only the people you pick']];
          var extra = '';
          if (vis !== 'everyone') {
            if (loadingAud) extra = '<div style="padding:12px 0;display:grid;place-items:center"><span class="spin sm"></span></div>';
            else if (vis === 'departments') extra = depts.length ? '<div class="fchips">' + depts.map(function (d) {
              var on = !!selDepts[d.id];
              return '<button class="fchip' + (on ? ' on' : '') + '" data-dept="' + d.id + '">' + (on ? icon('check') : '') + esc(d.name || 'Dept ' + d.id) + '</button>';
            }).join('') + '</div>' : '<div style="font-size:12px;color:var(--muted)">No departments available</div>';
            else {
              var q = userSearch.trim().toLowerCase(), list = !q ? users : users.filter(function (u) { return String(u.name || '').toLowerCase().indexOf(q) !== -1 || String(u.email || '').toLowerCase().indexOf(q) !== -1; });
              var chosen = users.filter(function (u) { return selUsers[u.id]; });
              extra = (chosen.length ? '<div class="fchips" style="margin-top:0">' + chosen.map(function (u) {
                return '<span class="fchip on" style="padding-right:6px">' + esc(u.name || 'User ' + u.id) + '<button data-unuser="' + u.id + '" aria-label="Remove">' + icon('cancel') + '</button></span>';
              }).join('') + '</div>' : '') +
                '<div class="people-search">' + icon('search') + '<input data-usersearch placeholder="Search people by name or email…" value="' + esc(userSearch) + '"></div>' +
                '<div class="people-list">' + (list.length ? list.map(function (u) {
                  var on = !!selUsers[u.id];
                  return '<button data-user="' + u.id + '"><span class="checkbox' + (on ? ' on' : '') + '" style="--cb:var(--t-bull-ink)">' + (on ? icon('check') : '') + '</span><span><b>' + esc(u.name || 'User ' + u.id) + '</b>' + (u.email ? '<small>' + esc(u.email) + '</small>' : '') + '</span></button>';
                }).join('') : '<div class="msg">No matches</div>') + '</div>';
            }
            extra = '<div style="height:10px"></div>' + extra;
          }
          return '<div class="aud-h">' + icon('visibility_outlined') + 'Who can see this?</div>' + opts.map(function (x) {
            var on = vis === x[0];
            return '<button class="aud-opt' + (on ? ' on' : '') + '" data-vis="' + x[0] + '">' + icon(x[1]) + '<div><b>' + x[2] + '</b><small>' + x[3] + '</small></div>' + icon(on ? 'radio_button_checked' : 'radio_button_unchecked') + '</button>';
          }).join('') + extra;
        }
        function render() {
          head.innerHTML = step > 0 ? '<button data-step aria-label="Back">' + icon('arrow_back_ios_new') + '</button><b>' + esc(t('post') + ' ' + catLabel(cat)) + '</b><i></i>'
            : '<button data-close aria-label="Close">' + icon('close') + '</button><b>' + esc(t('chooseCategory')) + '</b><i></i>';
          var hb = head.querySelector('button .mi'); if (hb && step > 0) hb.style.fontSize = '18px';
          if (step === 0) {
            body.innerHTML = CATS.filter(function (c) { return !c.hidden; }).map(function (c) {
              return '<button class="cb-cat" data-cat="' + c.key + '" style="' + (cat === c.key ? 'background:var(--t-bull-bg);border:1.5px solid var(--t-bull-ink)' : '') + '"><span style="color:' + c.color + ';display:grid">' + icon(c.icon) + '</span><span class="lab">' + c.label + '</span>' + icon('chevron_right', 'chev') + '</button>';
            }).join('');
            foot.innerHTML = '';
          } else {
            body.innerHTML = (formError ? '<div class="cb-err">' + icon('error_outline') + '<span>' + esc(formError) + '</span></div>' : '') +
              field(t('titleField'), 'title', t('shortClearTitle')) + field(t('descriptionField'), 'desc', t('provideMoreDetails'), 4) + catFields() +
              '<div class="cb-f"><b>' + esc(expLabel()) + '</b><button class="cb-date' + (expires ? ' set' : '') + '" data-exp>' + icon('calendar_today_outlined') + '<span>' + esc(expires ? fmt(expires) : t('selectDateAndTime')) + '</span>' +
              (expires ? '<span data-clearexp style="display:grid">' + icon('close') + '</span>' : '') + '</button></div>' + audience() + '<div style="height:12px"></div>' +
              (cat !== 'poll' ? (image ? '<div class="cb-pic"><img src="' + image + '" alt=""><button class="x" data-rmimg aria-label="Remove image">' + icon('close') + '</button><button class="chg" data-img>' + icon('edit') + 'Change</button></div>'
                : '<button class="cb-img" data-img>' + icon('image_outlined') + esc(t('addImageOptional')) + '</button>') : '');
            foot.innerHTML = '<div class="cb-foot"><button data-submit' + (submitting ? ' disabled' : '') + '>' + (submitting ? '<span class="spin sm white"></span>' : esc(t('post'))) + '</button></div>';
          }
          wire();
        }
        function repaint() {
          var a = document.activeElement, key = a && a.dataset && (a.dataset.v || (a.hasAttribute && a.hasAttribute('data-usersearch') ? '@' : '')), pos = a && a.selectionStart, top = body.scrollTop;
          render(); body.scrollTop = top;
          if (key) { var n = key === '@' ? body.querySelector('[data-usersearch]') : body.querySelector('[data-v="' + key + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
        }
        function ensureAudience() {
          if (depts.length && users.length) return;
          loadingAud = true; repaint();
          Promise.all([B.depts(), B.users()]).then(function (r) { depts = r[0]; users = r[1]; })
            .catch(function (e) { H.errorDialog(humanize(e, "Couldn't load departments and people. Please check your connection and try again.")); })
            .then(function () { loadingAud = false; repaint(); });
        }
        function wire() {
          var close = head.querySelector('[data-close]'); if (close) close.onclick = function () { o.close(); };
          var back = head.querySelector('[data-step]'); if (back) back.onclick = function () { step = 0; render(); };
          body.querySelectorAll('[data-cat]').forEach(function (b) { b.onclick = function () { cat = b.dataset.cat; step = 1; render(); body.scrollTop = 0; }; });
          body.querySelectorAll('[data-v]').forEach(function (i) { i.oninput = function () { v[i.dataset.v] = i.value; }; });
          var hrb = body.querySelector('[data-hr]'); if (hrb) hrb.onclick = function () { hr = !hr; repaint(); };
          var exp = body.querySelector('[data-exp]');
          if (exp) exp.onclick = function (e) {
            if (e.target.closest('[data-clearexp]')) { expires = null; return repaint(); }
            var now = new Date();
            H.datePicker({ initial: expires || H.addDays(now, 1), first: now, last: H.addDays(now, 365) }).then(function (d) {
              if (!d) return;
              H.timePicker({ h: now.getHours(), m: now.getMinutes() }).then(function (tm) {
                if (!tm) return;
                expires = new Date(d.getFullYear(), d.getMonth(), d.getDate(), tm.h, tm.m); repaint();
              });
            });
          };
          body.querySelectorAll('[data-vis]').forEach(function (b) { b.onclick = function () { vis = b.dataset.vis; repaint(); if (vis !== 'everyone') ensureAudience(); }; });
          body.querySelectorAll('[data-dept]').forEach(function (b) { b.onclick = function () { var id = +b.dataset.dept; if (selDepts[id]) delete selDepts[id]; else selDepts[id] = true; repaint(); }; });
          body.querySelectorAll('[data-user]').forEach(function (b) { b.onclick = function () { var id = +b.dataset.user; if (selUsers[id]) delete selUsers[id]; else selUsers[id] = true; repaint(); }; });
          body.querySelectorAll('[data-unuser]').forEach(function (b) { b.onclick = function () { delete selUsers[+b.dataset.unuser]; repaint(); }; });
          var us = body.querySelector('[data-usersearch]'); if (us) us.oninput = function () { userSearch = us.value; repaint(); };
          body.querySelectorAll('[data-img]').forEach(function (b) {
            b.onclick = function () {
              H.pickFromSource(4000, 4000, 0.7).then(function (d) { if (d) { image = d; repaint(); } });
            };
          });
          var rm = body.querySelector('[data-rmimg]'); if (rm) rm.onclick = function () { image = null; repaint(); };
          var sub = foot.querySelector('[data-submit]'); if (sub) sub.onclick = submit;
        }
        function meta() {
          if (cat === 'group_buy') return { closing_time: fmtDt(expires), collection_point: v.collection.trim(), contact: v.contact.trim(), order_link: v.orderLink.trim() };
          if (cat === 'lost_found') return { is_lost: true, location: v.location.trim(), contact_method: v.contactMethod.trim() };
          if (cat === 'reminder') return { expiry_dt: fmtDt(expires) };
          return {};
        }
        function showErr(m) { formError = m; repaint(); body.scrollTop = 0; }
        function submit() {
          if (!v.title.trim() || !v.desc.trim()) return showErr(t('titleDescriptionRequired'));
          if (cat === 'lost_found' && !hr) return showErr(t('hrReportConfirmError'));
          if (vis === 'departments' && !Object.keys(selDepts).length) return showErr('Select at least one department, or choose Everyone.');
          if (vis === 'users' && !Object.keys(selUsers).length) return showErr('Select at least one person, or choose Everyone.');
          formError = null; submitting = true; repaint();
          var b = { category: cat, title: v.title.trim(), description: v.desc.trim(), metadata: meta(), visibility: vis };
          if (expires) b.expires_at = fmtDt(expires);
          if (image) b.image_base64 = image;
          if (vis === 'departments') b.audience_department_ids = Object.keys(selDepts).map(Number);
          if (vis === 'users') b.audience_user_ids = Object.keys(selUsers).map(Number);
          B.create(b).then(function () { image = null; o.close(true); })
            .catch(function (e) { submitting = false; repaint(); H.errorDialog(humanize(e, "Couldn't post your bulletin. Please try again.")); });
        }
        render();
      } });
  }

  H.screens.BulletinBoardPage = BulletinBoardPage;
})(HQ);
