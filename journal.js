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
    if (tag === 'img') e.draggable = false;
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

  // Nothing on the desk is a file to drag out of the page.
  root.addEventListener('dragstart', function (e) { e.preventDefault(); });
  root.addEventListener('selectstart', function (e) { e.preventDefault(); });

  /* The book ---------------------------------------------------------------- */

  var book = el('div', 'jr-book');
  stage.appendChild(book);
  // The homography handles the flat book. Height off the page is given its own
  // direction on screen: up the picture, leaning slightly with the desk, and
  // converging toward a vanishing point far below, the way the painting's
  // camera looks down at the table.
  var UPX = -0.1, UPY = -0.86, VANISH = 2600;
  (function place() {
    var M = [[HM[0][0], HM[0][1], UPX, HM[0][2]],
             [HM[1][0], HM[1][1], UPY, HM[1][2]],
             [0, 0, 1, 0],
             [HM[2][0], HM[2][1], UPY / VANISH, HM[2][2]]];
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

  /* Every leaf is cut into strips hinged one onto the next, and the strips are
     driven by a small simulation of a sheet of paper seen edge on: each hinge
     has an angle, neighbouring strips are held together by bending springs,
     gravity pulls every strip toward whichever side it is over, and the air
     holds back the free edge more than the spine. So a turning page curls,
     trails its edge, and settles onto the stack instead of swinging over like
     a board. Each strip shows its own slice of the page image on both sides. */
  var SEG = 16, SW = LW / SEG, D2R = Math.PI / 180;
  function img(name) { return 'url("' + ART + name + '")'; }
  var SPREAD = [[img('page-right.webp'), img('page-1.webp')], [img('page-2.webp'), img('page-3.webp')],
                [img('page-4.webp'), img('page-5.webp')], [img('page-6.webp'), img('page-7.webp')]];
  var N = SPREAD.length;

  var baseL = el('div', 'jr-base jr-base-l', 'background-image:' + img('page-left.webp'));
  var baseR = el('div', 'jr-base jr-base-r', 'background-image:' + img('page-8.webp'));
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
      // The left page is narrower than the leaf, so the last bit of the back
      // hangs off the book and is cut away.
      var hide = (LW - SP) - (SEG - 1 - k) * SW;
      if (hide > 0) back.style.clipPath = 'inset(0 0 0 ' + Math.min(hide, SW + 1) + 'px)';
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
  var moving = {};          // leaf index -> its sheet while it moves
  var lifts = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function restPhi(i) { return i < current ? 180 : 0; }
  function stackZ(i, flipped) { return flipped ? (i + 1) * 0.1 : (N - i) * 0.1; }

  // Light from the upper right. Returns how much darker (positive) or
  // brighter (negative) a face is than when it lies flat.
  var LX = 0.55, LZ = 0.835;
  function light(phi, back) {
    var nx = -Math.sin(phi * D2R), nz = Math.cos(phi * D2R);
    if (back) { nx = -nx; nz = -nz; }
    return LZ - (nx * LX + nz * LZ);
  }
  function setShade(seg, prop, v) {
    seg.style.setProperty('--' + prop + 'd', Math.max(0, v * 0.42).toFixed(3));
    seg.style.setProperty('--' + prop + 'l', Math.max(0, -v * 0.9).toFixed(3));
  }

  // Lays one leaf out from its strip angles (0 flat on the right, 180 flat on
  // the left).
  function pose(i, phi, z) {
    var lf = leaves[i], prev = 0;
    for (var k = 0; k < SEG; k++) {
      var seg = lf.segs[k];
      var a = -phi[k], rel = a - prev;
      prev = a;
      seg.style.transform = k ? 'rotateY(' + rel.toFixed(3) + 'deg)' : 'translateZ(' + z.toFixed(2) + 'px) rotateY(' + rel.toFixed(3) + 'deg)';
      var p0 = k ? (phi[k - 1] + phi[k]) / 2 : phi[0];
      var p1 = k < SEG - 1 ? (phi[k] + phi[k + 1]) / 2 : phi[k];
      setShade(seg, 'f0', light(p0, false));
      setShade(seg, 'f1', light(p1, false));
      setShade(seg, 'b0', light(p0, true));
      setShade(seg, 'b1', light(p1, true));
    }
  }

  var FLAT = [];
  function settleLeaf(i) {
    var r = restPhi(i), flipped = r === 180, z = stackZ(i, flipped);
    for (var k = 0; k < SEG; k++) FLAT[k] = r;
    pose(i, FLAT, z);
    var lf = leaves[i];
    lf.castF.style.transform = 'translateZ(' + (z + 0.04) + 'px)';
    lf.castB.style.transform = 'translateZ(' + (z + 0.04) + 'px) rotateY(-180deg)';
    lf.el.classList.toggle('is-flipped', flipped);
  }
  leaves.forEach(function (lf, i) { settleLeaf(i); });

  function sheet(i) {
    if (!moving[i]) {
      var r = restPhi(i), phi = new Float64Array(SEG), w = new Float64Array(SEG);
      for (var k = 0; k < SEG; k++) phi[k] = r;
      moving[i] = { phi: phi, w: w, target: r, hand: null, drive: 0 };
    }
    var s = moving[i];
    s.z = N * 0.1 + 0.2 + (lifts++ % 6) * 0.05;
    leaves[i].el.classList.add('is-turning');
    return s;
  }

  // Where the strips' joints are, edge on: x along the book, z up off it.
  var PX = new Float64Array(SEG + 1), PZ = new Float64Array(SEG + 1);
  function joints(phi) {
    for (var k = 0; k < SEG; k++) {
      PX[k + 1] = PX[k] + SW * Math.cos(phi[k] * D2R);
      PZ[k + 1] = PZ[k] + SW * Math.sin(phi[k] * D2R);
    }
  }

  var G = 2300, KB = 2200, AIR = 4, INNER = 25, PUSH = 5000;
  function simulate(s, h) {
    var phi = s.phi, w = s.w, hand = s.hand;
    var toLeft = s.target === 180;
    var tip = phi[SEG - 1];
    var over = toLeft ? tip : 180 - tip;          // how far the edge has come
    var push = !hand && s.drive ? PUSH * (toLeft ? 1 : -1) * clamp((128 - over) / 36, 0, 1) : 0;
    var fx = 0, fz = 0, g = 0;
    if (hand) {
      joints(phi);
      g = hand.seg;
      // A spring from the grabbed joint to the hand, like fingers on the page.
      var vx = (PX[g + 1] - hand.lx) / h, vz = (PZ[g + 1] - hand.lz) / h;
      hand.lx = PX[g + 1]; hand.lz = PZ[g + 1];
      fx = (hand.x - PX[g + 1]) * hand.k - vx * hand.c;
      fz = (hand.z - PZ[g + 1]) * hand.k - vz * hand.c;
    }
    for (var k = 0; k < SEG; k++) {
      var t = k / (SEG - 1);
      var tau = -G * Math.cos(phi[k] * D2R) * (1 - t * 0.7);
      if (k > 0) tau += KB * (phi[k - 1] - phi[k]) + INNER * (w[k - 1] - w[k]);
      if (k < SEG - 1) tau += KB * (phi[k + 1] - phi[k]) + INNER * (w[k + 1] - w[k]);
      tau += push * (1 - t);
      tau -= AIR * w[k] * (0.2 + 1.6 * t);
      if (hand && k <= g) {
        var dx = PX[g + 1] - PX[k], dz = PZ[g + 1] - PZ[k];
        tau += (dx * fz - dz * fx) / (dx * dx + dz * dz + 100) * 57.3 / (g + 1) * 3;
      }
      // The last few degrees before the stack: a cushion of air.
      var gap = toLeft ? 180 - phi[k] : phi[k];
      if (gap < 14 && (toLeft ? w[k] > 0 : w[k] < 0)) tau -= w[k] * 9 * (1 - gap / 14);
      w[k] += tau / (1 - t * 0.5) * h;
    }
    for (k = 0; k < SEG; k++) {
      phi[k] += w[k] * h;
      if (phi[k] < 0) { phi[k] = 0; if (w[k] < 0) w[k] *= -0.06; }
      if (phi[k] > 180) { phi[k] = 180; if (w[k] > 0) w[k] *= -0.06; }
    }
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
    var sub = Math.max(1, Math.ceil(dt * 240)), h = dt / sub;
    for (var n = 0; n < keys.length; n++) {
      var i = +keys[n], s = moving[i], k;
      for (var q = 0; q < sub; q++) simulate(s, h);
      if (!s.hand) {
        var still = true;
        for (k = 0; k < SEG && still; k++) still = Math.abs(s.phi[k] - s.target) < 0.05 && Math.abs(s.w[k]) < 2;
        if (still) {
          delete moving[i];
          leaves[i].el.classList.remove('is-turning');
          settleLeaf(i);
          continue;
        }
      }
      pose(i, s.phi, s.z);

      // The lifted page throws a soft shadow onto the page it is leaving or the
      // one it is about to cover, as far out as it overhangs.
      joints(s.phi);
      var top = 0, reachR = 0, reachL = 0;
      for (k = 1; k <= SEG; k++) {
        top = Math.max(top, PZ[k]);
        if (PX[k] > 0) reachR = Math.max(reachR, PX[k]); else reachL = Math.max(reachL, -PX[k]);
      }
      var amount = 0.36 * Math.min(1, top / 90);
      var mid = PX[SEG >> 1] + PX[SEG];
      if (mid >= 0) {
        var under = i + 1 < N && !moving[i + 1] ? leaves[i + 1].castF : baseR.firstChild;
        cast(under, amount, reachR / LW * 100 + 12);
      } else {
        var below = i > 0 && !moving[i - 1] ? leaves[i - 1].castB : baseL.firstChild;
        cast(below, amount, reachL / LW * 100 + 12);
      }
    }
  }

  /* Turning by hand. The grabbed point of the page is pulled toward the
     pointer by a spring, lifted along the arc the page would sweep, and the
     rest of the sheet follows the way paper does. */
  var peekLeaf = -1;
  var held = null;

  function aimHand(s, lx) {
    var r = (s.hand.seg + 1) * SW;
    var x = clamp(lx - SP, -r, r);
    // A little inside the page's reach, so the sheet bows as it is carried.
    var lift = Math.sqrt(Math.max(0, r * r - x * x));
    s.hand.x = x * 0.97;
    s.hand.z = lift * 0.9 + 6;
  }

  book.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || held) return;
    var st = toStage(e.clientX, e.clientY), lp = toBook(st[0], st[1]);
    var i, dir;
    if (lp[0] > SP && current < N) { i = current; dir = 1; }
    else if (lp[0] < SP && current > 0) { i = current - 1; dir = -1; }
    else return;
    e.preventDefault();
    var s = sheet(i);
    if (peekLeaf === i) peekLeaf = -1;
    var reach = Math.abs(lp[0] - SP);
    var seg = clamp(Math.round(reach / SW) - 1, SEG >> 1, SEG - 1);
    joints(s.phi);
    s.hand = { seg: seg, x: PX[seg + 1], z: PZ[seg + 1], lx: PX[seg + 1], lz: PZ[seg + 1], k: 2600, c: 90 };
    s.drive = 0;
    aimHand(s, lp[0]);
    var d = { dir: dir, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    held = { i: i, id: e.pointerId };
    root.classList.add('is-grabbing');

    function move(ev) {
      if (ev.pointerId !== held.id) return;
      var p = toStage(ev.clientX, ev.clientY), l = toBook(p[0], p[1]);
      if (Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) > 6) d.moved = true;
      aimHand(s, l[0]);
    }
    function up(ev) {
      if (ev.pointerId !== held.id) return;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      root.classList.remove('is-grabbing');
      var tip = s.phi[SEG - 1], spin = s.w[SEG >> 1];
      var tap = !d.moved && performance.now() - d.t < 400 && ev.type === 'pointerup';
      var done = d.dir > 0 ? (tip > 80 || spin > 160) : (tip < 100 || spin < -160);
      if (tap) done = true;
      if (done) current += d.dir;
      s.target = restPhi(i);
      s.hand = null;
      s.drive = done ? 1 : 0;
      held = null;
    }
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  });

  // A mouse near the outer edge lifts the corner a little, to say it turns.
  function peek(i, on) {
    if (on) {
      var s = sheet(i);
      joints(s.phi);
      s.hand = { seg: SEG - 1, x: LW * Math.cos(24 * D2R), z: LW * Math.sin(24 * D2R) * 0.8, lx: PX[SEG], lz: PZ[SEG], k: 1200, c: 70 };
      s.drive = 0;
    } else if (moving[i] && moving[i].hand && !held) {
      moving[i].hand = null;
    }
  }
  root.addEventListener('pointermove', function (e) {
    if (held || e.pointerType !== 'mouse') return;
    var st = toStage(e.clientX, e.clientY), lp = toBook(st[0], st[1]);
    var want = current < N && lp[0] > SP + LW * 0.72 && lp[0] < SP + LW + 12 && lp[1] > 0 && lp[1] < FH ? current : -1;
    if (want === peekLeaf) return;
    if (peekLeaf >= 0) peek(peekLeaf, false);
    peekLeaf = want;
    if (want >= 0 && (!moving[want] || moving[want].target === 0)) peek(want, true);
  });
  root.addEventListener('pointerleave', function () {
    if (peekLeaf >= 0) peek(peekLeaf, false);
    peekLeaf = -1;
  });

  function turn(dir) {
    var i = dir > 0 ? current : current - 1;
    if (i < 0 || i >= N || held) return;
    if (peekLeaf === i) peekLeaf = -1;
    var s = sheet(i);
    current += dir;
    s.target = restPhi(i);
    s.hand = null;
    s.drive = 1;
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
  // Things lying on the desk beyond the top of the book sit underneath it, so a
  // page standing up as it turns hides them the way it would a real pen.
  var behind = el('div', 'jr-things');
  stage.insertBefore(behind, book);
  var topZ = 5;

  function layer(node, a, b) {
    var under = true;
    for (var i = 0; i <= 8 && under; i++) {
      var p = toBook(a[0] + (b[0] - a[0]) * i / 8, a[1] + (b[1] - a[1]) * i / 8);
      under = p[1] < -6;          // past the top edge; beside the book does not count
    }
    var want = under ? behind : things;
    if (node.parentNode !== want) want.appendChild(node);
  }

  function dragger(node, onMove, onUp) {
    node.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      node.style.zIndex = ++topZ;
      node.classList.add('is-held');
      if (node.parentNode !== things) things.appendChild(node);
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
    // Only the pen itself takes the pointer, a strip along its length, so the
    // page under the empty corners of its box still turns.
    var ux = Math.cos(ang), uy = Math.sin(ang), hw = 11, ext = 6;
    var ax = m.a[0] - m.x - ux * ext, ay = m.a[1] - m.y - uy * ext;
    var bx = m.b[0] - m.x + ux * ext, by = m.b[1] - m.y + uy * ext;
    var hit = el('div', 'jr-hit', 'clip-path:polygon(' + [
      [ax - uy * hw, ay + ux * hw], [bx - uy * hw, by + ux * hw], [bx + uy * hw, by - ux * hw], [ax + uy * hw, ay - ux * hw]
    ].map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')');
    pen.appendChild(hit);
    things.appendChild(pen);
    var x = 0, y = 0;
    dragger(pen, function (e, first, b) {
      if (first) return { sx: e.clientX, sy: e.clientY, ox: x, oy: y, lx: e.clientX };
      x = b.ox + (e.clientX - b.sx) / S;
      y = b.oy + (e.clientY - b.sy) / S;
      pen.style.translate = x + 'px ' + y + 'px';
      pen.style.setProperty('--tilt', clamp((e.clientX - b.lx) * 0.9, -12, 12) + 'deg');
      b.lx = e.clientX;
    }, function () {
      pen.style.setProperty('--tilt', '0deg');
      layer(pen, [m.a[0] + x, m.a[1] + y], [m.b[0] + x, m.b[1] + y]);
    });
    layer(pen, m.a, m.b);
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
  function layerBrush() {
    var r = tilt * D2R;
    layer(brush, [tip.x, tip.y], [tip.x + Math.cos(r) * BW * 0.97, tip.y + Math.sin(r) * BW * 0.97]);
  }
  placeBrush();
  layerBrush();

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
    layerBrush();
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
