// The wallpaper: a painted desk with a journal open on it. The book's pages
// turn (drag a corner, or just tap a page), the pens can be pushed around, the
// flowers move in the breeze, and there is a paintbrush by the ink tray for
// anyone who goes looking. All of it is decoration, so it stays out of the
// accessibility tree and out of the way of the desktop that sits on top.

(function () {
  'use strict';

  var root = document.getElementById('journal');
  var stage = document.getElementById('journal-stage');
  if (!root || !stage) return;

  var W = 1200, H = 665;                // the painting, in stage pixels
  var ART = 'assets/journal/';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var windowLayer = document.getElementById('windows');

  // Where the book sits in the picture: a homography from the flat spread
  // (585 by 385, spine at 275) onto the photo.
  var HM = [[1.0696638507430114, 0.28333830523927156, 315.2301228973214],
            [-0.3106390966102774, 0.6201720838095749, 246.5112191895458],
            [0.00015295593774056483, -0.0001485985370306437, 1.0]];
  var FW = 585, FH = 385, SP = 275, LW = 310;
  var PENS = {
    pencil: { src: 'pencil.webp', x: 907, y: 10, w: 67, h: 240, a: [915, 17], b: [970, 246] },
    long: { src: 'pen-long.webp', x: 914, y: 11, w: 194, h: 260, a: [926, 23], b: [1104, 267] },
    short: { src: 'pen-short.webp', x: 1101, y: 128, w: 66, h: 193, a: [1113, 139], b: [1160, 317] },
    book: { src: 'pen-book.webp', x: 467, y: 277, w: 259, h: 136, a: [480, 290], b: [722, 409] }
  };
  var FLOWERS = {
    a: { x: 195, y: 0, w: 430, h: 310, f: 'jr-wind-a', ox: '30%', oy: '95%', a: 0.7, d: 5.5 },
    b: { x: 0, y: 275, w: 160, h: 160, f: 'jr-wind-b', ox: '0%', oy: '60%', a: -0.9, d: 4.2 },
    c1: { x: 840, y: 330, w: 170, h: 150, f: 'jr-wind-b', ox: '20%', oy: '40%', a: 1, d: 4.8 },
    c2: { x: 1040, y: 455, w: 160, h: 135, f: 'jr-wind-a', ox: '60%', oy: '90%', a: -0.7, d: 6 },
    d: { x: 1110, y: 30, w: 90, h: 110, f: 'jr-wind-b', ox: '80%', oy: '80%', a: 0.8, d: 5 }
  };
  var TRAY = { x: 498, y: 0, w: 138, h: 96 };   // the ink tray at the top of the desk

  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function el(tag, cls, css) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    return e;
  }

  /* Fitting the stage: cover, but steered so the book stays in view --------- */

  var S = 1, OX = 0, OY = 0, box = { left: 0, top: 0 };
  function fit() {
    var r = root.getBoundingClientRect();
    var vw = r.width, vh = r.height;
    box = r;
    S = Math.max(vw / W, vh / H);
    OX = Math.min(0, Math.max(vw - W * S, vw / 2 - 640 * S));
    OY = Math.min(0, Math.max(vh - H * S, vh / 2 - 300 * S));
    stage.style.transform = 'translate(' + OX + 'px,' + OY + 'px) scale(' + S + ')';
  }
  function toStage(cx, cy) { return [(cx - box.left - OX) / S, (cy - box.top - OY) / S]; }

  /* Breeze filters for the flowers ------------------------------------------ */

  var NS = 'http://www.w3.org/2000/svg';
  var defs = document.createElementNS(NS, 'svg');
  defs.setAttribute('width', '0');
  defs.setAttribute('height', '0');
  defs.setAttribute('class', 'jr-defs');
  defs.innerHTML =
    '<filter id="jr-wind-a" x="-3%" y="-3%" width="106%" height="106%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="4" result="n">' +
        '<animate attributeName="baseFrequency" values="0.018 0.03;0.021 0.034;0.018 0.03" dur="9s" repeatCount="indefinite"/></feTurbulence>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G">' +
        '<animate attributeName="scale" values="2;8;3;7;2" dur="4.5s" repeatCount="indefinite"/></feDisplacementMap></filter>' +
    '<filter id="jr-wind-b" x="-3%" y="-3%" width="106%" height="106%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.025 0.02" numOctaves="2" seed="9" result="n">' +
        '<animate attributeName="baseFrequency" values="0.025 0.02;0.028 0.024;0.025 0.02" dur="7s" repeatCount="indefinite"/></feTurbulence>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="G" yChannelSelector="R">' +
        '<animate attributeName="scale" values="3;7;2;6;3" dur="3.8s" repeatCount="indefinite"/></feDisplacementMap></filter>';
  root.appendChild(defs);

  /* Page art ----------------------------------------------------------------- */

  /* The pages are painted in the picture's own palette and run through a
     wobble and a soft blur, on warm paper with the same top right light, so a
     turned page reads as part of the painting instead of a sticker on it.
     Each page is one SVG image, drawn once, that the page strips all share. */

  var T = '#c7804f', T2 = '#e2ad80', T3 = '#f1d6b8';     // terracotta
  var L = '#a58ccf', L2 = '#cbbbe6', L3 = '#e8dff4';     // lilac
  var BR = '#7a5537', TX = '#cdb9a2', SK = '#b8967a';     // ink, text, sketch

  function lines(x, y, w, n, gap, col) {
    var s = '';
    gap = gap || 11;
    for (var i = 0; i < n; i++) {
      var ww = w * (i === n - 1 ? 0.4 + rnd() * 0.3 : 0.78 + rnd() * 0.22);
      var yy = y + i * gap + (rnd() - 0.5);
      s += '<path d="M' + x + ' ' + yy.toFixed(1) + ' h' + ww.toFixed(1) + '" stroke="' + (col || TX) +
        '" stroke-width="2.6" stroke-linecap="round" opacity="' + (0.7 + rnd() * 0.3).toFixed(2) + '"/>';
    }
    return s;
  }
  function flower(cx, cy, r, c, c2) {
    var s = '';
    for (var i = 0; i < 5; i++) {
      s += '<ellipse cx="' + cx + '" cy="' + (cy - r * 0.55) + '" rx="' + (r * 0.38) + '" ry="' + (r * 0.58) +
        '" fill="' + (i % 2 ? (c2 || L2) : (c || L)) + '" transform="rotate(' + (i * 72 + 8) + ' ' + cx + ' ' + cy + ')"/>';
    }
    return s + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.22) + '" fill="#fbf3e6"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.11) + '" fill="#dcae62"/>';
  }
  function leaf(x, y, l, ang, c) {
    return '<path d="M0 0 Q ' + l * 0.5 + ' ' + (-l * 0.35) + ' ' + l + ' 0 Q ' + l * 0.5 + ' ' + l * 0.35 + ' 0 0Z" fill="' +
      (c || T2) + '" transform="translate(' + x + ' ' + y + ') rotate(' + ang + ')"/>';
  }
  function sprig(x, y, h, c) {
    var s = '<path d="M' + x + ' ' + y + ' C ' + (x + 6) + ' ' + (y - h * 0.4) + ', ' + (x - 6) + ' ' + (y - h * 0.7) + ', ' + x + ' ' + (y - h) +
      '" stroke="' + (c || T) + '" stroke-width="2" fill="none"/>';
    for (var i = 1; i < 6; i++) {
      var yy = y - h * i / 6;
      s += leaf(x, yy, 12 + rnd() * 6, -30 - rnd() * 20, i % 2 ? T2 : (c || T)) +
        leaf(x, yy - 4, 12 + rnd() * 6, -150 + rnd() * 20, i % 2 ? (c || T) : T2);
    }
    return s;
  }
  function ring(cx, cy, r, c) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fbf3e6" stroke="' + (c || SK) + '" stroke-width="2"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 3.5) + '" fill="none" stroke="' + (c || SK) + '" stroke-width=".8" opacity=".6"/>';
  }
  function wash(x, y, w, h, c, o) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + Math.min(w, h) * 0.3 +
      '" fill="' + c + '" opacity="' + (o || 0.7) + '" filter="url(#wash)"/>';
  }
  function blot(cx, cy, r, c, o) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '" opacity="' + (o || 0.7) + '" filter="url(#wash)"/>';
  }
  function tape(x, y, w, ang) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="17" fill="#e9dcc4" opacity=".78" transform="rotate(' +
      ang + ' ' + (x + w / 2) + ' ' + (y + 8) + ')"/>';
  }

  // back: a left hand page, spine on its right and only x 35..310 showing.
  function page(art, back, n) {
    var gut = back
      ? '<linearGradient id="g" x1="1" y1="0" x2="0" y2="0">'
      : '<linearGradient id="g" x1="0" y1="0" x2="1" y2="0">';
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 385" width="310" height="385" preserveAspectRatio="none">' +
      '<defs>' +
        '<linearGradient id="p" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fffff6"/><stop offset="1" stop-color="#fbf9e3"/></linearGradient>' +
        '<radialGradient id="sun" cx=".88" cy=".04" r="1"><stop offset="0" stop-color="#fffffa" stop-opacity="1"/><stop offset=".6" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>' +
        gut + '<stop offset="0" stop-color="#7a5236" stop-opacity=".2"/><stop offset=".07" stop-color="#7a5236" stop-opacity=".07"/><stop offset=".22" stop-color="#7a5236" stop-opacity="0"/></linearGradient>' +
        '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="' + n + '"/>' +
          '<feColorMatrix values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .2  0 0 0 .03 0"/></filter>' +
        '<filter id="ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="' + (n + 3) + '" result="t"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="t" scale="3.2" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".4"/></filter>' +
        '<filter id="wash" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="3" seed="' + (n + 9) + '" result="t"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="t" scale="14" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="1.6"/></filter>' +
      '</defs>' +
      '<rect width="310" height="385" fill="url(#p)"/>' +
      '<rect width="310" height="385" filter="url(#grain)"/>' +
      '<g filter="url(#ink)" opacity=".78" style="mix-blend-mode:multiply" fill="none">' + art + '</g>' +
      '<rect width="310" height="385" fill="url(#sun)"/>' +
      '<rect width="310" height="385" fill="url(#g)"/>' +
      '</svg>') + '")';
  }

  var P = [];
  // Spread one: hello, and the portals.
  P[1] = page(
    '<path d="M62 46 h96" stroke="' + BR + '" stroke-width="7" stroke-linecap="round" opacity=".55"/>' +
    '<path d="M62 62 h60" stroke="' + T + '" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
    lines(62, 84, 200, 3) +
    blot(172, 196, 68, L3, 0.9) +
    '<path d="M168 262 C 160 230 178 204 166 170" stroke="' + T + '" stroke-width="2.4"/>' +
    leaf(166, 238, 40, -28, T2) + leaf(164, 218, 36, -152, T) + leaf(168, 196, 26, -40, T2) +
    flower(166, 158, 38, L, L2) + flower(214, 206, 16, T2, T3) + flower(118, 214, 13, L2, L3) +
    tape(70, 118, 62, -24) + tape(222, 248, 58, -24) +
    lines(62, 296, 210, 6), true, 1);
  P[2] = page(
    wash(34, 38, 246, 176, T3, 0.8) +
    '<rect x="40" y="46" width="232" height="158" rx="8" fill="#fbf4e8" stroke="' + SK + '" stroke-width="1.8"/>' +
    '<path d="M40 64 h232" stroke="' + SK + '" stroke-width="1.4"/>' +
    '<circle cx="52" cy="55" r="3" fill="' + T + '"/><circle cx="62" cy="55" r="3" fill="' + T2 + '"/><circle cx="72" cy="55" r="3" fill="' + L2 + '"/>' +
    '<rect x="40" y="64" width="48" height="140" fill="' + T3 + '"/>' +
    lines(48, 80, 30, 6, 16, T2) +
    '<rect x="100" y="76" width="50" height="34" rx="4" fill="' + L3 + '"/><rect x="158" y="76" width="50" height="34" rx="4" fill="' + T3 + '"/>' +
    '<rect x="216" y="76" width="46" height="34" rx="4" fill="' + L3 + '"/>' +
    '<path d="M104 184 C 124 160 138 172 154 150 S 190 158 206 134 S 240 142 258 124" stroke="' + T + '" stroke-width="2.4"/>' +
    '<path d="M104 190 h154" stroke="' + SK + '" stroke-width="1.2"/>' +
    lines(30, 238, 236, 7) + flower(252, 338, 14, T, T2) + sprig(230, 364, 40, T), false, 2);
  // Spread two: the apps, and the delivery routes.
  P[3] = page(
    blot(120, 150, 70, T3, 0.85) + blot(214, 170, 60, L3, 0.9) +
    '<rect x="68" y="56" width="86" height="164" rx="14" fill="#fbf4e8" stroke="' + SK + '" stroke-width="2"/>' +
    '<path d="M98 64 h26" stroke="' + SK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="78" y="78" width="66" height="36" rx="6" fill="' + T2 + '" opacity=".8"/>' +
    lines(80, 128, 60, 5, 15, TX) +
    '<rect x="176" y="84" width="86" height="164" rx="14" fill="#fbf4e8" stroke="' + SK + '" stroke-width="2"/>' +
    '<path d="M206 92 h26" stroke="' + SK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M188 212 C 196 180 222 190 226 160 S 244 128 250 112" stroke="' + L + '" stroke-width="2.4" stroke-dasharray="1 6" stroke-linecap="round"/>' +
    '<circle cx="250" cy="112" r="6" fill="' + T + '"/><circle cx="188" cy="212" r="4" fill="' + L + '"/>' +
    lines(62, 280, 214, 6), true, 3);
  P[4] = page(
    blot(90, 110, 56, L3, 0.9) + blot(220, 250, 70, T3, 0.85) + blot(230, 90, 36, L3, 0.7) +
    '<path d="M62 76 C 90 130 60 170 120 196 S 200 190 206 240 S 170 300 236 318" stroke="' + SK + '" stroke-width="2.2" stroke-dasharray="2 7" stroke-linecap="round"/>' +
    ring(62, 76, 13) + ring(120, 196, 11) + ring(206, 240, 12) +
    '<path d="M236 326 C 226 312 224 302 236 296 C 248 302 246 312 236 326 Z" fill="' + T + '"/><circle cx="236" cy="306" r="3.4" fill="#fbf3e6"/>' +
    '<g transform="translate(142 128) rotate(-12)"><rect x="0" y="0" width="30" height="16" rx="2" fill="' + L2 + '" stroke="' + L + '" stroke-width="1.2"/>' +
      '<path d="M30 5 h8 l6 6 v5 h-14 z" fill="' + T2 + '" stroke="' + T + '" stroke-width="1.2"/>' +
      '<circle cx="8" cy="18" r="3.4" fill="' + BR + '" opacity=".7"/><circle cx="36" cy="18" r="3.4" fill="' + BR + '" opacity=".7"/></g>' +
    lines(30, 350, 150, 2), false, 4);
  // Spread three: the fish farm, and the numbers.
  P[5] = page(
    '<path d="M50 150 C 90 136 120 164 160 150 S 240 136 292 150 L 292 250 C 250 262 214 240 170 252 S 90 262 50 250 Z" fill="' + L3 + '" filter="url(#wash)" opacity=".95"/>' +
    '<g transform="translate(126 190)"><ellipse rx="28" ry="12" fill="' + T2 + '"/><path d="M24 0 L42 -12 L38 0 L42 12 Z" fill="' + T + '"/>' +
      '<path d="M-6 -11 Q 2 -20 10 -11" fill="' + T + '"/><circle cx="-16" cy="-3" r="2.2" fill="' + BR + '"/>' +
      '<path d="M-4 -8 Q 2 0 -4 8 M 4 -9 Q 10 0 4 9" stroke="' + T + '" stroke-width="1" opacity=".6"/></g>' +
    '<g transform="translate(222 222) scale(-.7 .7)"><ellipse rx="28" ry="12" fill="' + L2 + '"/><path d="M24 0 L42 -12 L38 0 L42 12 Z" fill="' + L + '"/>' +
      '<circle cx="-16" cy="-3" r="2.4" fill="' + BR + '"/></g>' +
    '<path d="M70 176 q10 -6 20 0 t20 0 M 190 170 q10 -6 20 0 t20 0 M 160 236 q10 -6 20 0 t20 0" stroke="' + L + '" stroke-width="1.6"/>' +
    '<path d="M62 60 h110" stroke="' + BR + '" stroke-width="7" stroke-linecap="round" opacity=".5"/>' + lines(62, 80, 200, 3) +
    [0, 1, 2].map(function (i) {
      var y = 288 + i * 26;
      return '<rect x="62" y="' + y + '" width="13" height="13" rx="3" stroke="' + T + '" stroke-width="1.6" fill="#fbf4e8"/>' +
        (i < 2 ? '<path d="M65 ' + (y + 6) + ' l4 4 l7 -10" stroke="' + T + '" stroke-width="2"/>' : '') + lines(86, y + 7, 180, 1);
    }).join(''), true, 5);
  P[6] = page(
    wash(28, 40, 250, 170, L3, 0.75) +
    '<path d="M44 190 h222" stroke="' + SK + '" stroke-width="1.6"/>' +
    [58, 96, 70, 128, 104, 150].map(function (h, i) {
      return '<rect x="' + (54 + i * 36) + '" y="' + (190 - h) + '" width="22" height="' + h + '" rx="3" fill="' + [T2, L2, T3, T, L2, T2][i] + '"/>';
    }).join('') +
    '<path d="M60 120 C 100 100 120 96 150 80 S 220 60 262 44" stroke="' + L + '" stroke-width="2.2"/>' +
    '<circle cx="262" cy="44" r="4" fill="' + L + '"/>' +
    '<g transform="translate(66 250)"><rect x="0" y="16" width="36" height="30" rx="6" fill="' + T2 + '" stroke="' + T + '" stroke-width="1.4"/>' +
      '<path d="M8 16 v-6 a10 10 0 0 1 20 0 v6" stroke="' + T + '" stroke-width="3"/><circle cx="18" cy="30" r="3.4" fill="' + BR + '" opacity=".7"/></g>' +
    lines(120, 262, 150, 3) + lines(30, 318, 236, 4), false, 6);
  // Spread four: a bouquet to end on, and the endpaper.
  P[7] = page(
    blot(170, 170, 92, T3, 0.85) + blot(210, 130, 48, L3, 0.8) +
    sprig(130, 280, 110, T) + sprig(224, 286, 116, T) + sprig(176, 300, 140, BR) +
    flower(172, 150, 42, L, L2) + flower(222, 196, 28, T2, T3) + flower(118, 190, 26, L2, L3) + flower(210, 112, 18, T, T2) +
    '<path d="M150 318 q14 -12 28 0 q14 12 28 0" stroke="' + T + '" stroke-width="2"/>' +
    lines(82, 342, 180, 2), true, 7);
  var pat = '';
  for (var py = 30; py < 385; py += 46) {
    for (var px = ((py / 46) % 2 ? 30 : 52); px < 310; px += 44) {
      pat += (px + py) % 3 ? flower(px, py, 9, T2, T3) : flower(px, py, 9, L2, L3);
    }
  }
  P[8] = page(blot(155, 190, 150, T3, 0.5) + pat, false, 8);

  /* The book ---------------------------------------------------------------- */

  var book = el('div', 'jr-book');
  stage.appendChild(book);
  (function place() {
    var d = 1400, cx = FW / 2, cy = FH / 2;
    var H4 = [[HM[0][0], HM[0][1], 0, HM[0][2]], [HM[1][0], HM[1][1], 0, HM[1][2]], [0, 0, 1, 0], [HM[2][0], HM[2][1], 0, HM[2][2]]];
    var Pm = [[1, 0, -cx / d, 0], [0, 1, -cy / d, 0], [0, 0, 1, 0], [0, 0, -1 / d, 1]];
    var M = H4.map(function (r) {
      return [0, 1, 2, 3].map(function (j) { return r.reduce(function (s, v, k) { return s + v * Pm[k][j]; }, 0); });
    });
    var cm = [];
    for (var j = 0; j < 4; j++) for (var i = 0; i < 4; i++) cm.push(M[i][j]);
    book.style.transform = 'matrix3d(' + cm.join(',') + ')';
  }());
  var HI = (function () {
    var a = HM[0][0], b = HM[0][1], c = HM[0][2], d = HM[1][0], e = HM[1][1], f = HM[1][2], g = HM[2][0], h = HM[2][1], i = HM[2][2];
    return [[e * i - f * h, -(b * i - c * h), b * f - c * e],
            [-(d * i - f * g), a * i - c * g, -(a * f - c * d)],
            [d * h - e * g, -(a * h - b * g), a * e - b * d]];
  }());
  function toBook(x, y) {
    var v = [0, 1, 2].map(function (r) { return HI[r][0] * x + HI[r][1] * y + HI[r][2]; });
    return [v[0] / v[2], v[1] / v[2]];
  }

  /* Every leaf is cut into strips hinged one onto the next, so it can bend as
     it turns instead of swinging over like a board. Each strip shows its own
     slice of the same page image on both sides. */
  var SEG = 8, SW = LW / SEG;
  var TEX_R = 'url("' + ART + 'page-right.webp")';
  var SPREAD = [[TEX_R, P[1]], [P[2], P[3]], [P[4], P[5]], [P[6], P[7]]];
  var N = SPREAD.length;

  var baseL = el('div', 'jr-base jr-base-l', 'background-image:url("' + ART + 'page-left.webp")');
  var baseR = el('div', 'jr-base jr-base-r', 'background-image:' + P[8]);
  baseL.appendChild(el('div', 'jr-cast jr-cast-l'));
  baseR.appendChild(el('div', 'jr-cast jr-cast-r'));
  book.appendChild(baseL);
  book.appendChild(baseR);

  var leaves = SPREAD.map(function (faces, i) {
    var leafEl = el('div', 'jr-leaf');
    var segs = [];
    var parent = leafEl;
    for (var k = 0; k < SEG; k++) {
      var seg = el('div', 'jr-seg', 'left:' + (k ? SW : 0) + 'px;width:' + SW + 'px');
      var front = el('div', 'jr-face jr-front', 'background-image:' + faces[0] + ';background-position:' + (-k * SW) + 'px 0');
      var back = el('div', 'jr-face jr-back', 'background-image:' + faces[1] + ';background-position:' + (-(SEG - 1 - k) * SW) + 'px 0;transform-origin:' + SW / 2 + 'px 50%');
      if (k === SEG - 1) back.style.clipPath = 'inset(0 0 0 ' + (LW - SP) + 'px)';
      seg.appendChild(front);
      seg.appendChild(back);
      parent.appendChild(seg);
      segs.push(seg);
      parent = seg;
    }
    var castF = el('div', 'jr-cast jr-cast-r jr-cast-f');
    var castB = el('div', 'jr-cast jr-cast-r jr-cast-b');
    leafEl.appendChild(castF);
    leafEl.appendChild(castB);
    book.appendChild(leafEl);
    return { el: leafEl, segs: segs, castF: castF, castB: castB, i: i };
  });

  var current = 0;          // leaves before this one lie on the left
  var moving = {};          // leaf index -> its spring state while it moves
  var lifts = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function restAngle(i) { return i < current ? -180 : 0; }
  function stackZ(i, a) { return a < -90 ? (i + 1) * 0.5 : (N - i) * 0.5; }
  function shade(t) { return (0.36 * Math.pow(Math.abs(Math.sin(t * Math.PI / 180)), 1.2)).toFixed(3); }

  // Lays one leaf out: A is the angle at the spine, B how far the free edge
  // runs ahead of it (negative) or trails behind it (positive).
  function pose(i, A, B, z) {
    var lf = leaves[i];
    var prev = 0, th = [];
    for (var k = 0; k < SEG; k++) {
      var t = (k + 0.5) / SEG;
      th.push(clamp(A + B * Math.pow(t, 1.6), -180, 0));
    }
    for (k = 0; k < SEG; k++) {
      var seg = lf.segs[k];
      var rel = th[k] - prev;
      prev = th[k];
      seg.style.transform = k ? 'rotateY(' + rel.toFixed(3) + 'deg)' : 'translateZ(' + z.toFixed(2) + 'px) rotateY(' + rel.toFixed(3) + 'deg)';
      var left = k ? (th[k - 1] + th[k]) / 2 : th[0];
      var right = k < SEG - 1 ? (th[k] + th[k + 1]) / 2 : th[k];
      seg.style.setProperty('--a0', shade(left));
      seg.style.setProperty('--a1', shade(right));
    }
  }

  function settleLeaf(i) {
    var a = restAngle(i), z = stackZ(i, a);
    pose(i, a, 0, z);
    var lf = leaves[i];
    lf.castF.style.transform = 'translateZ(' + (z + 0.3) + 'px)';
    lf.castB.style.transform = 'translateZ(' + (z + 0.3) + 'px) rotateY(-180deg)';
    lf.el.classList.toggle('is-flipped', a === -180);
  }
  leaves.forEach(function (lf, i) { settleLeaf(i); });

  function state(i) {
    if (!moving[i]) {
      var a = restAngle(i);
      moving[i] = { A: a, v: 0, B: 0, bv: 0, T: a, drag: null, peek: false, path: null };
    }
    var s = moving[i];
    s.z = N * 0.5 + 1.5 + (lifts++ % 6) * 0.35;
    leaves[i].el.classList.add('is-turning');
    return s;
  }

  // Sets a released page on its way. A flick already moving the right way
  // gets there sooner; a page let go from standing still takes its time.
  function glide(s) {
    var dist = Math.abs(s.T - s.A);
    var along = (s.T - s.A) * s.v > 0 ? Math.min(1, Math.abs(s.v) / 600) : 0;
    s.path = { from: s.A, t: 0, dur: (0.2 + 0.42 * dist / 180) * (1 - along * 0.45) };
  }

  function spring(x, v, target, k, c, dt) {
    v += (-k * (x - target) - c * v) * dt;
    return [x + v * dt, v];
  }

  var casts = [];
  function clearCasts() {
    casts.forEach(function (c) { c.style.opacity = 0; });
    casts = [];
  }
  function cast(elm, amount, reach) {
    elm.style.opacity = amount.toFixed(3);
    elm.style.setProperty('--reach', reach.toFixed(1) + '%');
    casts.push(elm);
  }

  function stepBook(dt) {
    var keys = Object.keys(moving);
    clearCasts();
    if (!keys.length) return;
    for (var n = 0; n < keys.length; n++) {
      var i = +keys[n], s = moving[i];
      var sub = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / sub;
      for (var q = 0; q < sub; q++) {
        var r, lift = Math.sin(-s.A * Math.PI / 180), bt;
        if (s.drag) {
          r = spring(s.A, s.v, s.drag.target, 320, 34, h);
          bt = -s.drag.dir * 18 * lift + s.v * 0.02;
        } else if (s.path) {
          // Chasing a point that eases along from where the page was let go
          // to where it lands, so it lifts off gently instead of snapping.
          var pa = s.path;
          pa.t = Math.min(pa.dur, pa.t + h);
          var e = pa.t / pa.dur;
          e = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
          r = spring(s.A, s.v, pa.from + (s.T - pa.from) * e, 260, 30, h);
          if (pa.t >= pa.dur) s.path = null;
          bt = -s.v * 0.07 * Math.min(1, lift * 2.2);
        } else {
          r = spring(s.A, s.v, s.T, s.peek ? 160 : 90, s.peek ? 24 : 18, h);
          bt = -s.v * 0.07 * Math.min(1, lift * 2.2);
        }
        s.A = r[0]; s.v = r[1];
        // The stack stops a page dead, it does not bounce off it.
        if (s.A > 0) { s.A = 0; if (s.v > 0) s.v = 0; }
        if (s.A < -180) { s.A = -180; if (s.v < 0) s.v = 0; }
        r = spring(s.B, s.bv, clamp(bt, -44, 44), 170, 11, h);
        s.B = r[0]; s.bv = r[1];
      }
      if (!s.drag && !s.path && Math.abs(s.A - s.T) < 0.03 && Math.abs(s.v) < 1 && Math.abs(s.B) < 0.05 && Math.abs(s.bv) < 1) {
        delete moving[i];
        leaves[i].el.classList.remove('is-turning');
        settleLeaf(i);
        continue;
      }
      pose(i, s.A, s.B, s.z);

      // The lifted page throws a soft shadow onto whatever it is leaving and
      // whatever it is about to cover.
      var chord = s.A + s.B * 0.4;
      var up = Math.sin(-chord * Math.PI / 180);
      if (chord > -90) {
        var under = i + 1 < N && !moving[i + 1] ? leaves[i + 1].castF : baseR.firstChild;
        cast(under, 0.34 * up, Math.cos(chord * Math.PI / 180) * 92 + 14);
      } else {
        var below = i > 0 && !moving[i - 1] ? leaves[i - 1].castB : baseL.firstChild;
        cast(below, 0.34 * up, -Math.cos(chord * Math.PI / 180) * 92 + 14);
      }
    }
  }

  /* Turning by hand. The page follows the pointer on a stiff spring, so it has
     a little weight to it, and is let go on a softer one that keeps whatever
     speed the flick gave it. */
  var PEEK = -13;
  var peekLeaf = -1;
  var held = null;

  book.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || held) return;
    var st = toStage(e.clientX, e.clientY), lp = toBook(st[0], st[1]);
    var i, dir;
    if (lp[0] > SP && current < N) { i = current; dir = 1; }
    else if (lp[0] < SP && current > 0) { i = current - 1; dir = -1; }
    else return;
    e.preventDefault();
    var s = state(i);
    s.peek = false;
    s.path = null;
    if (peekLeaf === i) peekLeaf = -1;
    var grab = dir > 0 ? Math.max(lp[0] - SP, 60) : Math.max(SP - lp[0], 60);
    s.drag = { dir: dir, grab: grab, target: s.A, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    held = { i: i, id: e.pointerId };
    root.classList.add('is-grabbing');

    function move(ev) {
      if (ev.pointerId !== held.id) return;
      var p = toStage(ev.clientX, ev.clientY), l = toBook(p[0], p[1]);
      if (Math.abs(ev.clientX - s.drag.x) + Math.abs(ev.clientY - s.drag.y) > 6) s.drag.moved = true;
      var c = clamp((l[0] - SP) / s.drag.grab, -1, 1);
      s.drag.target = -Math.acos(c) * 180 / Math.PI;
    }
    function up(ev) {
      if (ev.pointerId !== held.id) return;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      root.classList.remove('is-grabbing');
      var d = s.drag;
      var tap = !d.moved && performance.now() - d.t < 400 && ev.type === 'pointerup';
      var done = d.dir > 0 ? (s.A < -90 || s.v < -220) : (s.A > -90 || s.v > 220);
      if (tap) done = true;
      if (done) current += d.dir;
      s.T = d.dir > 0 ? (done ? -180 : 0) : (done ? 0 : -180);
      glide(s);
      s.drag = null;
      held = null;
    }
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  });

  // A mouse near the outer edge lifts the corner a little, to say it turns.
  root.addEventListener('pointermove', function (e) {
    if (held || e.pointerType !== 'mouse') return;
    var st = toStage(e.clientX, e.clientY), lp = toBook(st[0], st[1]);
    var want = current < N && lp[0] > SP + LW * 0.7 && lp[0] < SP + LW + 12 && lp[1] > 0 && lp[1] < FH ? current : -1;
    if (want === peekLeaf) return;
    if (peekLeaf >= 0 && moving[peekLeaf] && moving[peekLeaf].peek) moving[peekLeaf].T = restAngle(peekLeaf);
    peekLeaf = want;
    if (want >= 0 && (!moving[want] || moving[want].peek)) {
      var s = state(want);
      s.peek = true;
      s.T = PEEK;
    }
  });
  root.addEventListener('pointerleave', function () {
    if (peekLeaf >= 0 && moving[peekLeaf] && moving[peekLeaf].peek) moving[peekLeaf].T = restAngle(peekLeaf);
    peekLeaf = -1;
  });

  function turn(dir) {
    var i = dir > 0 ? current : current - 1;
    if (i < 0 || i >= N || held) return;
    var s = state(i);
    s.peek = false;
    current += dir;
    s.T = restAngle(i);
    glide(s);
  }
  // Arrow keys turn pages, but only when nothing else wants them.
  addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var t = e.target;
    if (t && t.closest && (t.closest('.window') || t.closest('input, textarea, select, [contenteditable]'))) return;
    turn(e.key === 'ArrowRight' ? 1 : -1);
  });

  /* Flowers ----------------------------------------------------------------- */

  var flowerWrap = el('div', 'jr-flowers');
  stage.appendChild(flowerWrap);
  Object.keys(FLOWERS).forEach(function (k) {
    var m = FLOWERS[k];
    var d = el('div', 'jr-flower', 'left:' + m.x + 'px;top:' + m.y + 'px;width:' + m.w + 'px;height:' + m.h + 'px;--ox:' + m.ox +
      ';--oy:' + m.oy + ';--a:' + m.a + 'deg;--d:' + m.d + 's;--dl:' + (-rnd() * 4).toFixed(2) + 's');
    var img = el('img');
    img.alt = '';
    img.src = ART + 'flowers-' + k + '.webp';
    img.className = 'jr-breeze';
    img.style.setProperty('--wind', 'url(#' + m.f + ')');
    d.appendChild(img);
    flowerWrap.appendChild(d);
  });

  /* Wet paint, from the brush ------------------------------------------------ */

  var PR = 1.5;                         // paint resolution over stage pixels
  var paint = el('canvas', 'jr-paint');
  paint.width = W * PR;
  paint.height = H * PR;
  stage.appendChild(paint);
  var pc = paint.getContext('2d');
  pc.scale(PR, PR);

  /* Pens and the brush ------------------------------------------------------- */

  var things = el('div', 'jr-things');
  stage.appendChild(things);
  var topZ = 5;

  function dragger(node, onMove, onUp) {
    node.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      node.style.zIndex = ++topZ;
      node.classList.add('is-held');
      var id = e.pointerId;
      var begin = onMove(e, true);
      function move(ev) { if (ev.pointerId === id) onMove(ev, false, begin); }
      function up(ev) {
        if (ev.pointerId !== id) return;
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
        removeEventListener('pointercancel', up);
        node.classList.remove('is-held');
        if (onUp) onUp(ev);
      }
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
    });
  }

  Object.keys(PENS).forEach(function (k, idx) {
    var m = PENS[k];
    var ang = Math.atan2(m.b[1] - m.a[1], m.b[0] - m.a[0]);
    var pen = el('div', 'jr-pen', 'left:' + m.x + 'px;top:' + m.y + 'px;width:' + m.w + 'px;height:' + m.h + 'px;z-index:' + (++topZ));
    var bob = el('div', 'jr-bob', '--d:' + (5 + idx * 1.3) + 's;--dl:' + (-idx * 1.7) + 's;--bx:' + (-Math.sin(ang) * 1.6).toFixed(2) +
      'px;--by:' + (Math.cos(ang) * 1.6).toFixed(2) + 'px;--br:' + (idx % 2 ? -0.5 : 0.5) + 'deg');
    var img = el('img');
    img.alt = '';
    img.src = ART + m.src;
    bob.appendChild(img);
    pen.appendChild(bob);
    things.appendChild(pen);
    var x = 0, y = 0;
    dragger(pen, function (e, first, b) {
      if (first) return { sx: e.clientX, sy: e.clientY, ox: x, oy: y, lx: e.clientX };
      x = b.ox + (e.clientX - b.sx) / S;
      y = b.oy + (e.clientY - b.sy) / S;
      pen.style.translate = x + 'px ' + y + 'px';
      pen.style.setProperty('--tilt', clamp((e.clientX - b.lx) * 0.9, -12, 12) + 'deg');
      b.lx = e.clientX;
    }, function () { pen.style.setProperty('--tilt', '0deg'); });
  });

  // The brush. Pick it up and it paints; drag the tip through the ink tray to
  // load a new colour. The paint dries off the desk a few seconds after the
  // last stroke, and a double click washes it off straight away.
  var BW = 176, BH = 35.2, TIPX = 4 * BW / 220, TIPY = 21 * BH / 44;
  var COLORS = ['#a58ccf', '#c7804f', '#d99a8f', '#d6a458', '#8aa0c8', '#7a5537'];
  var brush = el('div', 'jr-brush', 'width:' + BW + 'px;height:' + BH + 'px;transform-origin:' + TIPX + 'px ' + TIPY + 'px;z-index:' + (++topZ));
  var brushBob = el('div', 'jr-bob', '--d:6.4s;--dl:-2s;--bx:.6px;--by:1.4px;--br:.4deg');
  var brushImg = el('img');
  brushImg.alt = '';
  brushImg.src = ART + 'brush.svg';
  brushBob.appendChild(brushImg);
  brush.appendChild(brushBob);
  things.appendChild(brush);

  var tip = { x: 664, y: 97 }, tilt = -21, color = 0, load = 1, inTray = false, last = null, dryTimer = 0;
  function placeBrush() {
    brush.style.transform = 'translate(' + (tip.x - TIPX).toFixed(1) + 'px,' + (tip.y - TIPY).toFixed(1) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
  }
  placeBrush();

  function dab(x0, y0, x1, y1, speed) {
    var dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    var steps = Math.max(1, Math.ceil(d / 1.4));
    var nx = d ? -dy / d : 0, ny = d ? dx / d : 1;
    var width = clamp(15 - speed * 5, 6, 15) * (0.5 + load * 0.5);
    pc.fillStyle = COLORS[color];
    for (var s = 1; s <= steps; s++) {
      var t = s / steps, x = x0 + dx * t, y = y0 + dy * t;
      for (var b = 0; b < 4; b++) {
        var off = (rnd() - 0.5) * width * 1.1;
        pc.globalAlpha = (0.035 + rnd() * 0.04) * (0.35 + load * 0.65);
        pc.beginPath();
        pc.arc(x + nx * off, y + ny * off, width * (0.35 + rnd() * 0.3), 0, 6.2832);
        pc.fill();
      }
    }
    pc.globalAlpha = 1;
    load = Math.max(0.2, load - d * 0.0012);
  }

  function dry() {
    paint.classList.add('is-drying');
    dryTimer = setTimeout(function () {
      pc.clearRect(0, 0, W, H);
      paint.classList.remove('is-drying');
    }, 2600);
  }

  dragger(brush, function (e, first) {
    var p = toStage(e.clientX, e.clientY);
    if (first) {
      clearTimeout(dryTimer);
      paint.classList.remove('is-drying');
      last = { x: p[0], y: p[1], t: performance.now() };
      tip.x = p[0];
      tip.y = p[1];
      tilt = -38;
      placeBrush();
      return;
    }
    var now = performance.now();
    var speed = Math.hypot(p[0] - last.x, p[1] - last.y) / Math.max(8, now - last.t);
    var intray = p[0] > TRAY.x && p[0] < TRAY.x + TRAY.w && p[1] > TRAY.y && p[1] < TRAY.y + TRAY.h;
    if (intray && !inTray) {
      color = (color + 1) % COLORS.length;
      load = 1;
    }
    inTray = intray;
    if (!intray) dab(last.x, last.y, p[0], p[1], speed);
    tilt = clamp(-38 + (p[0] - last.x) * 1.2, -58, -18);
    tip.x = p[0];
    tip.y = p[1];
    last = { x: p[0], y: p[1], t: now };
    placeBrush();
  }, function () {
    tilt = -21;
    placeBrush();
    clearTimeout(dryTimer);
    dryTimer = setTimeout(dry, 6000);
  });
  brush.addEventListener('dblclick', function () {
    clearTimeout(dryTimer);
    dry();
  });

  /* Petals and motes in the light ------------------------------------------- */

  var petalWrap = el('div', 'jr-petals');
  stage.appendChild(petalWrap);
  var motes = el('canvas', 'jr-motes');
  motes.width = W;
  motes.height = H;
  stage.appendChild(motes);
  stage.appendChild(el('div', 'jr-glow'));
  var mc = motes.getContext('2d');

  var PETAL = ['#c98a5a', '#d9a070', '#e6bd92', '#b47ab8'];
  var petals = [];
  function spawn() {
    if (petals.length > 22) return;
    var src = rnd() < 0.7 ? [260 + rnd() * 300, 40 + rnd() * 200] : [860 + rnd() * 130, 350 + rnd() * 100];
    var p = el('div', 'jr-petal');
    p.innerHTML = '<svg viewBox="0 0 12 9" width="12" height="9"><path d="M1 4.5 Q6 -1 11 4.5 Q6 10 1 4.5Z" fill="' +
      PETAL[Math.floor(rnd() * 4)] + '"/><path d="M2 4.5 H10" stroke="rgba(255,255,255,.5)" stroke-width=".6"/></svg>';
    petalWrap.appendChild(p);
    petals.push({ el: p, x: src[0], y: src[1], vx: 0.15 + rnd() * 0.35, vy: 0.25 + rnd() * 0.3, ph: rnd() * 6, sp: 0.02 + rnd() * 0.03,
      r: rnd() * 360, rs: (rnd() - 0.5) * 3, life: 0, max: 420 + rnd() * 260, s: 0.7 + rnd() * 0.7 });
  }
  var sparks = [];
  for (var sp = 0; sp < 45; sp++) {
    sparks.push({ x: 500 + rnd() * 700, y: rnd() * H, r: 0.6 + rnd() * 1.6, p: rnd() * 6, vy: -0.05 - rnd() * 0.12 });
  }

  /* Pausing: the scenery holds still while a window is being dragged or fills
     the screen, since the frosted glass would otherwise re-blur it every frame. */
  var paused = false;
  function checkPause() {
    var busy = windowLayer && (windowLayer.classList.contains('is-busy') ||
      !!windowLayer.querySelector('.window.is-zoomed:not(.is-min)'));
    var p = busy || still.matches;
    if (p === paused) return;
    paused = p;
    root.classList.toggle('is-paused', p);
    if (defs.pauseAnimations) { if (p) defs.pauseAnimations(); else defs.unpauseAnimations(); }
  }
  if (windowLayer) {
    new MutationObserver(checkPause).observe(windowLayer, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }
  if (still.addEventListener) still.addEventListener('change', checkPause);
  checkPause();

  var tick = 0, then = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - then) / 1000);
    then = now;
    stepBook(dt);
    if (!paused) {
      tick++;
      if (tick % 38 === 0) spawn();
      for (var k = petals.length - 1; k >= 0; k--) {
        var p = petals[k];
        p.life++; p.ph += p.sp; p.r += p.rs;
        p.x += p.vx + Math.sin(p.ph) * 0.6;
        p.y += p.vy + Math.cos(p.ph * 1.3) * 0.15;
        var a = Math.min(1, p.life / 30) * Math.min(1, (p.max - p.life) / 60);
        p.el.style.opacity = a;
        p.el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + p.r.toFixed(1) +
          'deg) rotateX(' + (Math.sin(p.ph) * 70).toFixed(1) + 'deg) scale(' + p.s.toFixed(2) + ')';
        if (p.life > p.max) { p.el.remove(); petals.splice(k, 1); }
      }
      mc.clearRect(0, 0, W, H);
      for (var j = 0; j < sparks.length; j++) {
        var s = sparks[j];
        s.p += 0.03; s.y += s.vy;
        if (s.y < -4) { s.y = H + 4; s.x = 500 + rnd() * 700; }
        mc.fillStyle = 'rgba(255,250,236,' + (Math.max(0, Math.sin(s.p)) * 0.75).toFixed(3) + ')';
        mc.beginPath();
        mc.arc(s.x, s.y, s.r, 0, 6.2832);
        mc.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  addEventListener('resize', fit);
  fit();
  requestAnimationFrame(frame);
}());
