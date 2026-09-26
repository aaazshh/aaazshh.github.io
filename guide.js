// A little guide for first visits: every few seconds a star flies to the next
// thing worth clicking (experience/, then prime-supermarket/, then a demo
// button), leaves a trail of twinkles, bursts when it lands and makes the
// thing glow. Inside prime-supermarket/ it takes the Portal and App buttons in
// turn. Once any demo has been opened it retires for good.

(function () {
  'use strict';

  var DONE = 'desktop.guide.done';
  try { if (localStorage.getItem(DONE)) return; } catch (e) {}

  var desktop = document.getElementById('desktop');
  var windowLayer = document.getElementById('windows');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var COLORS = ['#f7c8d8', '#f3dc9b', '#d8c8f2', '#fff4d6', '#c9e6dd'];

  var canvas = document.createElement('canvas');
  canvas.className = 'guide-layer';
  canvas.setAttribute('aria-hidden', 'true');
  desktop.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var particles = [], comet = null, running = false, retired = false, timer = null, chipTurn = 0, lastAt = null;

  function retire() {
    if (retired) return;
    retired = true;
    try { localStorage.setItem(DONE, '1'); } catch (e) {}
    clearTimeout(timer);
    setTimeout(function () { canvas.remove(); }, 400);
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    var win = el.closest('.window');
    if (win && win.classList.contains('is-min')) return false;
    var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  }

  // What to point at right now.
  function nextStep() {
    if (windowLayer.querySelector('.window-demo')) { retire(); return null; }
    var prime = windowLayer.querySelector('[data-window-id="prime"]:not(.is-min)');
    if (prime) {
      // Each hint lands on the next Portal or App button down the list.
      var chips = Array.prototype.filter.call(prime.querySelectorAll('.chip.is-live'), visible);
      if (!chips.length) return null;
      return { el: chips[chipTurn++ % chips.length], chip: true };
    }
    var exp = windowLayer.querySelector('[data-window-id="experience"]:not(.is-min)');
    if (exp) {
      var folder = exp.querySelector('[data-open="prime"]');
      return visible(folder) ? { el: folder } : null;
    }
    var icon = document.querySelector('.icon[data-open="experience"]');
    return visible(icon) ? { el: icon.querySelector('.glyph') || icon } : null;
  }

  function fit() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), r = desktop.getBoundingClientRect();
    if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return r;
  }

  function star(x, y, r, rot, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 2.2;
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = i * Math.PI / 2;
      ctx.quadraticCurveTo(Math.cos(a + Math.PI / 4) * r * 0.22, Math.sin(a + Math.PI / 4) * r * 0.22, Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function sprinkle(x, y, n, spread, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
      particles.push({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 12, r: 3 + Math.random() * 4.5, rot: Math.random() * 3,
        spin: (Math.random() - 0.5) * 4, life: 0, max: 0.9 + Math.random() * 0.9, color: COLORS[i % COLORS.length], tw: Math.random() * 6 });
    }
  }

  function loop() {
    var last = performance.now(), pending = false;
    running = true;
    function frame() {
      pending = false;
      var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var box = fit();
      ctx.clearRect(0, 0, box.width, box.height);
      if (comet) {
        comet.t = Math.min(1, comet.t + dt / comet.dur);
        var e = comet.t < 0.5 ? 2 * comet.t * comet.t : 1 - Math.pow(-2 * comet.t + 2, 2) / 2, u = 1 - e;
        var x = u * u * comet.a.x + 2 * u * e * comet.c.x + e * e * comet.b.x;
        var y = u * u * comet.a.y + 2 * u * e * comet.c.y + e * e * comet.b.y;
        sprinkle(x, y, 3, 8, 16);
        star(x, y, 9, comet.t * 9, '#fffaf0', 1);
        star(x, y, 5, -comet.t * 7, '#f3dc9b', 0.9);
        if (comet.t >= 1) { sprinkle(comet.b.x, comet.b.y, 34, 22, 110); var done = comet.done; comet = null; done(); }
      }
      particles = particles.filter(function (p) {
        p.life += dt;
        if (p.life >= p.max) return false;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 26 * dt; p.vx *= 0.97; p.rot += p.spin * dt;
        var k = p.life / p.max, twinkle = 0.55 + 0.45 * Math.sin(p.tw + p.life * 18);
        star(p.x, p.y, p.r * (1 - k * 0.5), p.rot, p.color, (1 - k) * twinkle);
        return true;
      });
      if (comet || particles.length) schedule();
      else { running = false; ctx.clearRect(0, 0, box.width, box.height); }
    }
    // A frame is also asked of a timer, so a hidden tab can't stall the trail.
    function schedule() {
      if (pending) return;
      pending = true;
      var fired = false;
      function go() { if (fired) return; fired = true; frame(); }
      requestAnimationFrame(go);
      setTimeout(go, 50);
    }
    schedule();
  }

  function glow(step) {
    var el = step.el;
    el.classList.remove('is-guided');
    void el.offsetWidth;
    el.classList.add('is-guided');
    setTimeout(function () { el.classList.remove('is-guided'); }, 2600);
  }

  function hint() {
    if (retired) return;
    var step = nextStep();
    if (step) {
      if (still.matches) glow(step);
      else {
        var box = desktop.getBoundingClientRect(), r = step.el.getBoundingClientRect();
        var b = { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
        // Between buttons in the same window the star hops from the last one.
        var a = step.chip && lastAt ? lastAt : { x: box.width * (0.55 + Math.random() * 0.3), y: 60 + Math.random() * 40 };
        lastAt = step.chip ? b : null;
        var c = { x: (a.x + b.x) / 2 + (Math.random() - 0.5) * 160, y: Math.min(a.y, b.y) - (step.chip ? 50 : 90) };
        comet = { a: a, b: b, c: c, t: 0, dur: step.chip ? 0.8 : 1.15, done: function () { glow(step); } };
        if (!running) loop();
      }
    }
    timer = setTimeout(hint, step && step.chip ? 3200 : 7000);
  }

  // A click anywhere pushes the next hint back, so it never talks over someone
  // who is already exploring.
  document.addEventListener('pointerdown', function () {
    if (retired) return;
    clearTimeout(timer);
    timer = setTimeout(hint, 4500);
    setTimeout(function () { if (windowLayer.querySelector('.window-demo')) retire(); }, 400);
  });

  timer = setTimeout(hint, 1600);
})();
