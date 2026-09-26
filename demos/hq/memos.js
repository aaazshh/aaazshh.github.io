/**
 * Memos: memo_list_page.dart over hq-web's /intranet/memos (MemoController,
 * MemoService::getMemos paginated by ten). Attachments stream from the
 * intranet, so opening or downloading one points at the live system.
 */
(function (H) {
  'use strict';
  var t = H.t, esc = H.esc, icon = H.icon, el = H.el, Api = H.Api;

  var TYPES = {
    excel: ['#1D7A44', 'table_chart_outlined', 'XLSX'], pdf: ['#D32F2F', 'picture_as_pdf_outlined', 'PDF'], word: ['#1565C0', 'description_outlined', 'DOCX'],
    image: ['#E65100', 'image_outlined', 'IMG'], csv: ['#00796B', 'grid_on_outlined', 'CSV'], other: ['#616161', 'folder_zip_outlined', 'FILE']
  };
  function fileType(mime) {
    switch (String(mime || '').toLowerCase().trim()) {
      case 'application/vnd.ms-excel': case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return 'excel';
      case 'application/pdf': return 'pdf';
      case 'application/msword': case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'word';
      case 'image/png': case 'image/jpeg': case 'image/jpg': case 'image/gif': case 'image/webp': return 'image';
      case 'text/csv': case 'application/csv': return 'csv';
      default: return 'other';
    }
  }
  function size(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
  function hexA(hex, a) { return hex + ('0' + Math.round(a * 255).toString(16)).slice(-2); }
  function memoFrom(j) {
    return { id: String(j.id), title: j.title || '', created: H.parseLocal(j.created_at) || new Date(), by: j.created_by || '',
      atts: (j.attachments || []).map(function (a) { return { id: a.id || 0, filename: a.filename || '', bytes: a.file_size || 0, type: fileType(a.file_type) }; }) };
  }
  function ago(d) {
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + 'd ago';
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function fullDate(d) { return d.getDate() + ' ' + H.MON[d.getMonth()] + ' ' + d.getFullYear() + ', ' + H.pad(d.getHours()) + ':' + H.pad(d.getMinutes()); }

  function MemoListPage() {
    var items = [], total = 0, page = 0, loading = false, hasMore = true, errorMsg = null, query = '', deb = null;
    var node = H.screen('', H.hero(t('memos'), t('memosSubtitle')) + '<div class="memo-count" data-count></div>' +
      '<div class="memo-search">' + icon('search_rounded') + '<input data-q placeholder="' + esc(t('searchMemos')) + '"><span data-clear></span></div><div class="scroll" data-list></div>');
    var sc = { el: node }, list = node.querySelector('[data-list]'), countBar = node.querySelector('[data-count]'), clear = node.querySelector('[data-clear]');
    function badge(atts) {
      var p = atts[0], c = p ? TYPES[p.type] : ['#9E9E9E', 'insert_drive_file_outlined'];
      return '<span class="att-badge">' + (atts.length > 1 ? '<span class="back" style="background:' + hexA(c[0], 0.06) + ';border-color:' + hexA(c[0], 0.18) + '"></span>' : '') +
        '<span class="front" style="background:' + hexA(c[0], 0.10) + ';color:' + c[0] + '">' + icon(c[1]) + '</span>' + (atts.length > 1 ? '<em style="background:' + c[0] + '">' + atts.length + '</em>' : '') + '</span>';
    }
    function paint() {
      countBar.innerHTML = items.length + ' of ' + total + ' memos' + (loading && items.length ? '<span class="bone pulse"></span>' : '');
      clear.innerHTML = query ? '<button aria-label="Clear search">' + icon('close_rounded') + '</button>' : '';
      if (query) clear.firstChild.onclick = function () { query = ''; reset(); };
      if (errorMsg && !items.length) {
        list.innerHTML = '<div style="height:400px;display:grid;place-items:center;padding:0 32px;text-align:center"><div><div style="width:56px;height:56px;border-radius:16px;background:#FFEBEE;color:#D32F2F;display:grid;place-items:center;margin:0 auto">' +
          icon('cloud_off_rounded') + '</div><b style="display:block;margin-top:14px;font-size:15px">' + esc(t('failedToLoadMemos')) + '</b><div style="margin-top:6px;font-size:12px;color:#9A9A9A">' + esc(errorMsg) + '</div>' +
          '<button data-retry style="margin-top:20px;border:0;border-radius:10px;background:#174B22;color:#fff;padding:10px 24px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">' + icon('refresh_rounded') + esc(t('tryAgain')) + '</button></div></div>';
        list.querySelector('[data-retry]').onclick = reset;
        return;
      }
      if (!items.length && loading) {
        list.innerHTML = '<div class="pulse" style="padding:18px 16px 24px">' + [0, 1, 2, 3].map(function () {
          return '<div class="memo-skel"><span style="width:48px;height:56px;border-radius:12px;background:#E8EDE9;flex:none"></span><span style="flex:1;display:flex;flex-direction:column">' +
            '<span class="bone" style="height:12px"></span><span class="bone" style="width:168px;height:12px;margin-top:9px"></span><span style="flex:1"></span><span style="display:flex;gap:8px">' +
            '<span style="width:58px;height:18px;border-radius:9px;background:#E7EBE8"></span><span style="width:74px;height:18px;border-radius:9px;background:#E7EBE8"></span></span></span></div>';
        }).join('') + '</div>';
        return;
      }
      if (!items.length) {
        list.innerHTML = '<div class="memo-empty">' + icon('inbox_outlined') + '<b>' + esc(t('noMemosFound')) + '</b><small>' + esc(t('pullToRefresh')) + '</small></div>';
        return;
      }
      var top = list.scrollTop, showErr = errorMsg && !loading;
      list.innerHTML = '<div style="padding-bottom:24px">' + items.map(function (m, i) {
        var n = m.atts.length;
        return (i ? '<div class="memo-sep"></div>' : '') + '<button class="memo-tile" data-m="' + i + '">' + badge(m.atts) + '<span class="c"><b>' + esc(m.title) + '</b><span class="meta">' +
          '<span>' + icon('attach_file_rounded') + n + ' ' + (n === 1 ? 'file' : 'files') + '</span><span>' + icon('person_outline_rounded') + esc(m.by) + '</span><span>' + icon('schedule_rounded') + esc(ago(m.created)) + '</span></span></span>' +
          icon('chevron_right_rounded') + '</button>';
      }).join('') + (showErr ? '<div style="padding:20px 16px;display:flex;align-items:center;gap:8px;font-size:12px;color:#9A9A9A">' + icon('error_outline_rounded') + '<span style="flex:1">' + esc(errorMsg) + '</span>' +
        '<button data-more style="border:0;border-radius:8px;background:#174B22;color:#fff;padding:6px 12px;font-size:11px;font-weight:600">' + esc(t('retry')) + '</button></div>'
        : hasMore ? '<div class="memo-sep"></div><div class="pulse" style="padding:20px 0;display:grid;place-items:center"><span class="bone" style="width:92px;height:9px;border-radius:5px"></span></div>' : '') + '</div>';
      list.scrollTop = top;
      list.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { detail(items[+b.dataset.m]); }; });
      var more = list.querySelector('[data-more]'); if (more) more.onclick = next;
    }
    function next() {
      if (loading || !hasMore) return;
      loading = true; errorMsg = null; paint();
      Api.request('GET', '/intranet/memos?search=' + query + '&page=' + (page + 1)).then(function (r) {
        if (r.status !== 200) throw H.ErrorDescription((r.body && r.body.error) || 'Unknown error');
        total = r.body.total; items = items.concat(r.body.data.map(memoFrom)); page++; hasMore = r.body.next_page_url !== null;
      }).catch(function (e) { errorMsg = String(e.message || e); }).then(function () { loading = false; paint(); });
    }
    function reset() { items = []; page = 0; hasMore = true; next(); }
    list.onscroll = function () { if (list.scrollTop + list.clientHeight >= list.scrollHeight - 200) next(); };
    node.querySelector('[data-q]').oninput = function () {
      var v = this.value;
      clearTimeout(deb);
      deb = setTimeout(function () { if (v === query) return; query = v; reset(); }, 400);
    };
    function detail(m) {
      H.sheet('<div class="handle" style="margin:10px auto 14px"></div><div class="memo-sheet"><h3>' + esc(m.title) + '</h3><div class="meta">' +
        '<span>' + icon('person_outline_rounded') + esc(m.by) + '</span><span>' + icon('schedule_rounded') + esc(fullDate(m.created)) + '</span></div><hr><h4>Attachments (' + m.atts.length + ')</h4>' +
        m.atts.map(function (a, i) {
          var c = TYPES[a.type];
          return '<div class="att-row"><span class="ft-icon"><i style="background:' + hexA(c[0], 0.10) + ';color:' + c[0] + '">' + icon(c[1]) + '</i><small style="color:' + c[0] + '">' + c[2] + '</small></span>' +
            '<div><b>' + esc(a.filename) + '</b><small>' + size(a.bytes) + '</small></div>' +
            '<button class="act-btn" data-open="' + i + '" style="background:' + hexA('#1565C0', 0.08) + ';color:#1565C0" aria-label="Open">' + icon('open_in_new_rounded') + '</button>' +
            '<button class="act-btn" data-dl="' + i + '" style="background:' + hexA('#174B22', 0.08) + ';color:#174B22" aria-label="Download">' + icon('download_outlined') + '</button></div>';
        }).join('') + '</div>', { cls: 'inset', wire: function (s, o) {
          s.querySelectorAll('[data-open]').forEach(function (b) {
            b.onclick = function () {
              var a = m.atts[+b.dataset.open];
              if (a.id === 0) return H.snack('could not open', '#F44336', 2);
              H.live('The attachment viewer (' + a.filename + ')');
            };
          });
          s.querySelectorAll('[data-dl]').forEach(function (b) {
            b.onclick = function () {
              var a = m.atts[+b.dataset.dl];
              o.close();
              H.snack('Downloading ' + a.filename + '...', null, 2);
              H.live('Downloading intranet attachments');
            };
          });
        } });
    }
    sc.enter = function () { paint(); next(); };
    return sc;
  }

  H.screens.MemoListPage = MemoListPage;
})(HQ);
