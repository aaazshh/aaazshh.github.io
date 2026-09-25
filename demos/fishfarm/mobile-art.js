/**
 * The crew app's painted artwork, ported from the Flutter CustomPainters:
 *   Ocean       fish_background.dart   (the reef behind every screen)
 *   PrimeDraw   prime_logo_animation.dart (the leaf drawn on a 4600 ms loop)
 *   LeafToFish  prime_to_fish_morph.dart  (the 2500 ms login hand-off)
 * Same geometry, same timings, same colours. Every animation runs on
 * requestAnimationFrame and also on a timer fallback, so a hidden tab (where
 * frames stop) still reaches the end of a timed sequence.
 */

'use strict';

var Art = (function () {

  /* ---- small helpers ------------------------------------------------- */
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function seeded(s) {
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /* ---- Ocean (FishBackground) ------------------------------------------ */
  var FISH_TONES = ['#5FB4CE', '#4E9FC7', '#77C6B4', '#F2A65A', '#6C8ED9'];
  var CORAL_TONES = ['#E98A7A', '#D98CB0', '#F2A65A', '#CF7F9B'];

  function Ocean(canvas, opts) {
    this.canvas = canvas;
    this.animated = !!opts.animated;
    this.interactive = !!opts.interactive;
    this.bubblesOnTap = !!opts.bubblesOnTap;
    this.intensity = opts.intensity === undefined ? 1 : opts.intensity;
    this.rnd = seeded(7);
    this.time = 0;
    this.pointer = null;
    this.fish = []; this.weeds = []; this.corals = []; this.bubbles = [];
    this.size = null;
    this.running = false;
    var self = this;
    if (this.interactive || this.bubblesOnTap) {
      var host = opts.host || canvas.parentNode;
      host.addEventListener('pointerdown', function (e) { self.down(self.local(e)); });
      host.addEventListener('pointermove', function (e) { if (self.interactive && self.pointer) self.pointer = self.local(e); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
        host.addEventListener(n, function () { self.pointer = null; });
      });
    }
    this.resize();
    this.paint();
    if (this.animated) this.start();
  }
  Ocean.prototype.local = function (e) {
    var r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  Ocean.prototype.down = function (p) {
    if (this.interactive) this.pointer = p;
    if (this.bubblesOnTap) this.burst(p);
  };
  Ocean.prototype.resize = function () {
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    var first = !this.size;
    this.size = { w: w, h: h };
    if (first) this.populate();
  };
  Ocean.prototype.populate = function () {
    var w = this.size.w, h = this.size.h, r = this.rnd, i;
    var count = w * h > 320000 ? 7 : 5;
    for (i = 0; i < count; i++) {
      var dir = r() < 0.5 ? 1 : -1;
      this.fish.push({ x: r() * w, y: 60 + r() * (h - 160), vx: dir * (14 + r() * 26), vy: 0, size: 13 + r() * 12,
        color: FISH_TONES[i % FISH_TONES.length], phase: r() * Math.PI * 2, wobble: 2 + r() * 2 });
    }
    for (i = 0; i < 5; i++) {
      this.weeds.push({ x: (i + 0.5) / 5 + (r() - 0.5) * 0.06, height: 60 + r() * 70, phase: r() * Math.PI * 2,
        blades: 3 + Math.floor(r() * 2), color: i % 2 === 0 ? '#74C6A2' : '#57B08C' });
    }
    for (i = 0; i < 4; i++) {
      this.corals.push({ x: (i + 0.5) / 4 + (r() - 0.5) * 0.18, height: 34 + r() * 40, arms: 2 + Math.floor(r() * 2),
        phase: r() * Math.PI * 2, color: CORAL_TONES[i % CORAL_TONES.length] });
    }
    for (i = 0; i < 9; i++) this.bubbles.push({ x: r(), y: r() * h, r: 2 + r() * 4, speed: 18 + r() * 26, burst: false });
  };
  Ocean.prototype.burst = function (p) {
    if (!this.size) return;
    var r = this.rnd, n = 7 + Math.floor(r() * 4);
    for (var i = 0; i < n; i++) {
      this.bubbles.push({ x: Math.min(1, Math.max(0, (p.x + (r() - 0.5) * 46) / this.size.w)), y: p.y - r() * 14,
        r: 2 + r() * 5, speed: 34 + r() * 46, burst: true });
    }
    if (this.bubbles.length > 90) this.bubbles.splice(0, this.bubbles.length - 90);
    if (!this.running) this.paint();
  };
  Ocean.prototype.update = function (dt) {
    if (!this.size || dt <= 0) return;
    this.time += dt;
    var w = this.size.w, h = this.size.h, self = this;
    this.fish.forEach(function (f) {
      f.phase += f.wobble * dt;
      if (self.pointer) {
        var dx = f.x - self.pointer.x, dy = f.y - self.pointer.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110 && d > 0.001) { var push = (1 - d / 110) * 240; f.vx += dx / d * push * dt; f.vy += dy / d * push * dt; }
      }
      var target = 26 * (f.vx < 0 ? -1 : 1);
      f.vx += (target - f.vx) * 0.6 * dt;
      f.vy *= 1 - 1.2 * dt;
      var bob = Math.sin(f.phase * 0.6) * 10 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt + bob;
      if (f.y < 50) f.y = 50;
      if (f.y > h - 70) f.y = h - 70;
      var m = f.size * 2 + 20;
      if (f.x < -m) { f.x = w + m; f.y = 60 + self.rnd() * (h - 160); }
      else if (f.x > w + m) { f.x = -m; f.y = 60 + self.rnd() * (h - 160); }
    });
    this.bubbles = this.bubbles.filter(function (b) { return !(b.burst && b.y < -12); });
    this.bubbles.forEach(function (b) {
      b.y -= b.speed * dt;
      if (b.burst) b.x += Math.sin(self.time * 4 + b.r) * 0.0006;
      else if (b.y < -10) { b.y = h + 10; b.x = self.rnd(); }
    });
  };
  Ocean.prototype.start = function () {
    var self = this, last = 0;
    this.running = true;
    function frame(ts) {
      if (!self.running) return;
      if (!self.canvas.isConnected) { self.running = false; return; }
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      self.update(dt);
      self.paint();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
  Ocean.prototype.stop = function () { this.running = false; };
  Ocean.prototype.paint = function () {
    var f = fit(this.canvas), ctx = f.ctx, w = f.w, h = f.h, o = Math.max(0, Math.min(1, this.intensity)), self = this;
    if (!w || !h) return;
    if (!this.size) this.resize();
    ctx.clearRect(0, 0, w, h);
    // Light rays
    ctx.fillStyle = 'rgba(255,255,255,' + 0.10 * o + ')';
    var rayW = w * 0.22;
    for (var i = 0; i < 3; i++) {
      var x = w * (0.15 + i * 0.3);
      ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x + rayW, -20);
      ctx.lineTo(x + rayW * 1.9, h * 0.75); ctx.lineTo(x + rayW * 0.9, h * 0.75); ctx.closePath(); ctx.fill();
    }
    // Bubbles
    this.bubbles.forEach(function (b) {
      var cx = b.x * w, a = (b.burst ? 0.55 : 0.34) * o;
      ctx.beginPath(); ctx.arc(cx, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + a * 0.25 + ')'; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + a * 0.8 + ')'; ctx.fill();
    });
    // Corals
    this.corals.forEach(function (c) {
      var bx = c.x * w, by = h, sway = Math.sin(self.time * 0.5 + c.phase) * 2, ch = c.height;
      ctx.strokeStyle = rgba(c.color, 0.34 * o); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.fillStyle = rgba(c.color, 0.26 * o);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sway * 0.4, by - ch * 0.34, bx + sway, by - ch * 0.55); ctx.stroke();
      for (var a = 0; a < c.arms * 2; a++) {
        var dir = a % 2 === 0 ? -1 : 1, k = Math.floor(a / 2), spread = (k + 1) * 0.42;
        var armLen = ch * (0.42 - k * 0.08), forkY = by - ch * (0.5 - k * 0.12);
        var tipX = bx + sway + dir * ch * spread * 0.52, tipY = forkY - armLen;
        ctx.beginPath(); ctx.moveTo(bx + sway * 0.8, forkY);
        ctx.quadraticCurveTo(bx + dir * ch * spread * 0.28, forkY - armLen * 0.62, tipX, tipY); ctx.stroke();
        ctx.beginPath(); ctx.arc(tipX, tipY, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(bx + sway, by - ch * 0.55, 3.6, 0, Math.PI * 2); ctx.fill();
    });
    // Seaweed
    this.weeds.forEach(function (wd) {
      ctx.strokeStyle = rgba(wd.color, 0.42 * o); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      var bx = wd.x * w, sway = Math.sin(self.time * 1.1 + wd.phase);
      for (var b = 0; b < wd.blades; b++) {
        var spread = (b - (wd.blades - 1) / 2) * 9, hh = wd.height * (0.7 + 0.3 * (1 - Math.abs(b) / wd.blades));
        ctx.beginPath(); ctx.moveTo(bx + spread, h);
        ctx.quadraticCurveTo(bx + spread + sway * 14, h - hh * 0.5, bx + spread + sway * 22, h - hh); ctx.stroke();
      }
    });
    // Fish
    this.fish.forEach(function (fi) {
      var s = fi.size, tail = Math.sin(fi.phase) * 0.35;
      ctx.save(); ctx.translate(fi.x, fi.y);
      if (fi.vx < 0) ctx.scale(-1, 1);
      ctx.strokeStyle = rgba(fi.color, 0.55 * o); ctx.fillStyle = rgba(fi.color, 0.12 * o);
      ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(s * 1.1, 0);
      ctx.bezierCurveTo(s * 0.7, -s * 0.75, -s * 0.5, -s * 0.7, -s * 0.85, 0);
      ctx.bezierCurveTo(-s * 0.5, s * 0.7, s * 0.7, s * 0.75, s * 1.1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(-s * 1.6, -s * (0.55 - tail)); ctx.lineTo(-s * 1.35, 0);
      ctx.lineTo(-s * 1.6, s * (0.55 + tail)); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.15, -s * 0.62); ctx.quadraticCurveTo(s * 0.45, -s * 1.02, s * 0.55, -s * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.62, -s * 0.12, s * 0.1, 0, Math.PI * 2); ctx.fillStyle = rgba(fi.color, 0.75 * o); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.2, 0, s * 0.5, -Math.PI / 2.6, -Math.PI / 2.6 + Math.PI / 1.3); ctx.stroke();
      ctx.restore();
    });
  };

  /* ---- stroke geometry for the Prime leaf and the fish ------------------ */
  // Each stroke: segments on the 0..100 grid. 'M' starts a sub-path.
  var PRIME = [
    { w: 12.4, cap: 'round', weight: 1.1, d: [['M', 21, 28], ['C', 12, 31, 8.5, 43, 10.5, 56], ['C', 13, 72, 26, 84, 41, 89],
      ['M', 79, 28], ['C', 88, 31, 91.5, 43, 89.5, 56], ['C', 87, 72, 74, 84, 59, 89]] },
    { w: 12.8, cap: 'square', weight: 0.45, d: [['M', 50, 94], ['L', 50, 50]] },
    { w: 11.3, cap: 'round', weight: 0.7, d: [['M', 22, 27], ['C', 33, 29, 43, 38, 50, 49], ['C', 57, 38, 67, 29, 78, 27]] },
    { w: 7.1, cap: 'round', weight: 0.65, d: [['M', 28, 18.5], ['C', 36.5, 19.5, 43.5, 24, 50, 30.5], ['C', 56.5, 24, 63.5, 19.5, 72, 18.5],
      ['M', 36.5, 11], ['Q', 43.5, 12, 50, 17.8], ['Q', 56.5, 12, 63.5, 11]] }
  ];
  var FISH = [
    { w: 7.0, cap: 'round', weight: 1.1, d: [['M', 10, 50], ['C', 24, 20, 56, 18, 72, 50], ['M', 72, 50], ['C', 56, 82, 24, 80, 10, 50]] },
    { w: 5.5, cap: 'round', weight: 0.45, d: [['M', 32, 30], ['C', 38, 12, 50, 10, 56, 29]] },
    { w: 7.0, cap: 'round', weight: 0.7, d: [['M', 94, 26], ['L', 72, 50], ['L', 94, 74]] },
    { w: 4.2, cap: 'round', weight: 0.65, d: [['M', 28, 33], ['C', 23, 42, 23, 58, 28, 67], ['O', 22, 48, 2.4]] }
  ];

  // Dense polyline per sub-path, with cumulative lengths.
  function flatten(stroke) {
    var subs = [], cur = null, px = 0, py = 0;
    stroke.d.forEach(function (s) {
      var i, t;
      if (s[0] === 'M') { cur = [[s[1], s[2]]]; subs.push(cur); px = s[1]; py = s[2]; return; }
      if (s[0] === 'L') { cur.push([s[1], s[2]]); px = s[1]; py = s[2]; return; }
      if (s[0] === 'C') {
        for (i = 1; i <= 40; i++) {
          t = i / 40; var u = 1 - t;
          cur.push([u * u * u * px + 3 * u * u * t * s[1] + 3 * u * t * t * s[3] + t * t * t * s[5],
            u * u * u * py + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6]]);
        }
        px = s[5]; py = s[6]; return;
      }
      if (s[0] === 'Q') {
        for (i = 1; i <= 30; i++) {
          t = i / 30; var v = 1 - t;
          cur.push([v * v * px + 2 * v * t * s[1] + t * t * s[3], v * v * py + 2 * v * t * s[2] + t * t * s[4]]);
        }
        px = s[3]; py = s[4]; return;
      }
      if (s[0] === 'O') { // addOval: a closed circle, starting at angle 0 like Flutter
        cur = [];
        for (i = 0; i <= 48; i++) { t = i / 48 * Math.PI * 2; cur.push([s[1] + s[3] * Math.cos(t), s[2] + s[3] * Math.sin(t)]); }
        subs.push(cur);
      }
    });
    return subs.map(function (pts) {
      var len = [0];
      for (var i = 1; i < pts.length; i++) {
        len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      }
      return { pts: pts, len: len, total: len[len.length - 1] };
    });
  }
  function pointAt(sub, dist) {
    var len = sub.len, pts = sub.pts;
    if (dist <= 0) return pts[0];
    if (dist >= sub.total) return pts[pts.length - 1];
    var i = 1;
    while (len[i] < dist) i++;
    var f = (dist - len[i - 1]) / (len[i] - len[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  }
  var primeFlat = PRIME.map(flatten), fishFlat = FISH.map(flatten);

  // Flutter's Curves are cubic beziers; solve x(t) = x for the parameter.
  function cubic(a, b, c, d) {
    function at(p1, p2, t) { var u = 1 - t; return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) {
        t = (lo + hi) / 2;
        if (at(a, c, t) < x) lo = t; else hi = t;
      }
      return at(b, d, t);
    };
  }
  var easeInOut = cubic(0.42, 0, 0.58, 1);
  var easeInOutCubic = cubic(0.645, 0.045, 0.355, 1);
  var easeOut = cubic(0, 0, 0.58, 1);
  var easeIn = cubic(0.42, 0, 1, 1);

  /* ---- PrimeLogoAnimation ------------------------------------------------ */
  function drawPrime(ctx, size, progress, color) {
    var unit = size / 100;
    var total = PRIME.reduce(function (n, s) { return n + s.weight; }, 0), used = 0, tip = null;
    ctx.strokeStyle = color; ctx.lineJoin = 'round';
    for (var k = 0; k < PRIME.length; k++) {
      var st = PRIME[k], start = used / total, end = (used + st.weight) / total;
      used += st.weight;
      if (progress <= start) break;
      var sp = Math.min(1, Math.max(0, (progress - start) / (end - start)));
      ctx.lineWidth = st.w * unit; ctx.lineCap = st.cap === 'square' ? 'square' : 'round';
      primeFlat[k].forEach(function (sub) {
        var vis = sub.total * sp;
        ctx.beginPath();
        var p0 = sub.pts[0];
        ctx.moveTo(p0[0] * unit, p0[1] * unit);
        for (var i = 1; i < sub.pts.length && sub.len[i] <= vis; i++) ctx.lineTo(sub.pts[i][0] * unit, sub.pts[i][1] * unit);
        var end = pointAt(sub, vis);
        ctx.lineTo(end[0] * unit, end[1] * unit);
        ctx.stroke();
        if (sp < 1) tip = end;
      });
    }
    if (tip && progress < 1) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.85)'; ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(tip[0] * unit, tip[1] * unit, size * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(tip[0] * unit, tip[1] * unit, size * 0.028, 0, Math.PI * 2); ctx.fill();
    }
  }

  function PrimeLoop(canvas, period) {
    this.canvas = canvas;
    this.period = period || 4600;
    this.t0 = performance.now();
    var self = this;
    function frame() {
      if (!canvas.isConnected) return;
      self.paint();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    this.paint();
  }
  PrimeLoop.prototype.paint = function () {
    var f = fit(this.canvas), ctx = f.ctx;
    var t = ((performance.now() - this.t0) % this.period) / this.period;
    var draw = easeInOut(Math.min(1, Math.max(0, t / 0.62)));
    var opacity = t < 0.06 ? t / 0.06 : t < 0.84 ? 1 : 1 - (t - 0.84) / 0.16;
    ctx.clearRect(0, 0, f.w, f.h);
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    drawPrime(ctx, Math.min(f.w, f.h), draw, '#ffffff');
    ctx.globalAlpha = 1;
  };

  /* ---- PrimeToFishTransition --------------------------------------------- */
  var SAMPLES = 72;
  function resample(flat) {
    return flat.map(function (subs) {
      return subs.map(function (sub) {
        var out = [];
        for (var i = 0; i < SAMPLES; i++) out.push(pointAt(sub, sub.total * i / (SAMPLES - 1)));
        return out;
      });
    });
  }
  var leafPts = resample(primeFlat), fishPts = resample(fishFlat);

  function lerpColor(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var r = Math.round((x >> 16 & 255) + ((y >> 16 & 255) - (x >> 16 & 255)) * t);
    var g = Math.round((x >> 8 & 255) + ((y >> 8 & 255) - (x >> 8 & 255)) * t);
    var bl = Math.round((x & 255) + ((y & 255) - (x & 255)) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function drawMorph(ctx, rect, progress, color, wag) {
    var scale = Math.min(rect.w, rect.h) / 100;
    ctx.save();
    ctx.translate(rect.x + (rect.w - 100 * scale) / 2, rect.y + (rect.h - 100 * scale) / 2);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color; ctx.lineJoin = 'round';
    for (var s = 0; s < 4; s++) {
      ctx.lineWidth = PRIME[s].w + (FISH[s].w - PRIME[s].w) * progress;
      ctx.lineCap = progress < 0.5 ? (PRIME[s].cap === 'square' ? 'square' : 'round') : 'round';
      var n = Math.min(leafPts[s].length, fishPts[s].length);
      for (var i = 0; i < n; i++) {
        var from = leafPts[s][i], to = fishPts[s][i];
        ctx.beginPath();
        for (var j = 0; j < SAMPLES; j++) {
          var x = from[j][0] + (to[j][0] - from[j][0]) * progress, y = from[j][1] + (to[j][1] - from[j][1]) * progress;
          if (s === 2 && wag) y += wag * 3.5 * Math.abs(j / (SAMPLES - 1) - 0.5) * 2;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Plays the hand-off over `host` (full size). startRect is the on-screen
   * logo box relative to host; done() fires once, on the last frame or on the
   * timer fallback, whichever comes first.
   */
  function morph(host, startRect, size, done) {
    var canvas = document.createElement('canvas');
    canvas.className = 'morph-layer';
    host.appendChild(canvas);
    var duration = 2500, t0 = performance.now(), finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done();
    }
    setTimeout(finish, duration + 150);
    function span(t, a, b, curve) { return curve(Math.min(1, Math.max(0, (t - a) / (b - a)))); }
    function frame() {
      if (finished) return;
      var t = Math.min(1, (performance.now() - t0) / duration);
      var f = fit(canvas), ctx = f.ctx;
      var end = { x: f.w / 2 - size / 2, y: f.h / 2 - size / 2, w: size, h: size };
      var st = startRect || end;
      var appear = span(t, 0, 0.10, easeOut), glide = span(t, 0, 0.46, easeInOutCubic);
      var mo = span(t, 0.34, 0.72, easeInOutCubic), swim = span(t, 0.78, 1, easeIn);
      var rect = { x: st.x + (end.x - st.x) * glide, y: st.y + (end.y - st.y) * glide,
        w: st.w + (end.w - st.w) * glide, h: st.h + (end.h - st.h) * glide };
      ctx.clearRect(0, 0, f.w, f.h);
      ctx.fillStyle = 'rgba(10,39,64,' + 0.30 * appear + ')';
      ctx.fillRect(0, 0, f.w, f.h);
      var cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      if (swim > 0) {
        for (var i = 0; i < 3; i++) {
          var rt = Math.min(1, Math.max(0, (swim - i * 0.16) / (1 - i * 0.16)));
          if (rt <= 0) continue;
          var rad = size * (0.18 + 0.75 * rt);
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - rt) * 0.55 + ')';
          ctx.lineWidth = 2.6 * (1 - rt) + 0.6;
          ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 1.15 / 2, 0, 0, Math.PI * 2); ctx.stroke();
        }
        for (var b = 0; b < 6; b++) {
          var ph = b / 6, bt = Math.min(1, Math.max(0, (swim - ph * 0.35) / (1 - ph * 0.35)));
          if (bt <= 0) continue;
          var wob = Math.sin(bt * Math.PI * 3 + b) * size * 0.05;
          var bx = cx - size * 0.30 * (b % 2 === 0 ? 1 : 1.5) * bt + wob, by = cy - size * (0.25 + ph * 0.5) * bt;
          var br = size * (0.018 + ph * 0.022) * (1 - bt * 0.35);
          ctx.fillStyle = 'rgba(255,255,255,' + (1 - bt) * 0.5 + ')';
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - bt) * 0.65 + ')'; ctx.lineWidth = 1.1; ctx.stroke();
        }
      }
      ctx.globalAlpha = appear * (1 - swim);
      var wag = mo < 0.7 ? 0 : Math.sin(t * Math.PI * 9) * ((mo - 0.7) / 0.3);
      drawMorph(ctx, { x: rect.x - f.w * 0.85 * swim, y: rect.y - size * 0.10 * swim, w: rect.w, h: rect.h }, mo,
        lerpColor('#ffffff', '#5AC8FA', mo), wag);
      ctx.globalAlpha = 1;
      if (t >= 1) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- FishFarmLogo glyph (the tank's white fish) ------------------------ */
  var GLYPH = '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="#fff" d="M20 50C20 33 36 24 52 27C66 30 76 40 80 50C76 60 66 70 52 73C36 76 20 67 20 50Z"/>' +
    '<path fill="#fff" d="M78 44L92 33L88 50L92 67L78 56Z"/><circle cx="38" cy="45" r="4.2" fill="#5AC8FA"/></svg>';

  return { Ocean: Ocean, PrimeLoop: PrimeLoop, morph: morph, GLYPH: GLYPH };
}());
