// The pointer: a little pink pixel-art book. Over anything that can be
// clicked, its pages start turning. Only for mice and trackpads; touch
// screens keep their own behaviour, and so does any iframe (the demos).

(function () {
  'use strict';

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  var GW = 22, GH = 22, SCALE = 2, HEAD = 3;   // HEAD: room above for a standing page      // grid cells, and CSS pixels per cell
  var HOT_X = 3, HOT_Y = 3 + HEAD;             // the top corner of the left page is the tip

  var INK = [74, 35, 54], COVER = [244, 128, 176], COVER_HI = [255, 186, 214], COVER_LO = [214, 86, 146];
  var PAGE = [255, 251, 252], PAGE_SHADE = [241, 214, 226], STACK = [236, 200, 215], BACK = [247, 232, 239];

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Rasterises one shape onto the grid with hard edges: drawn anti-aliased on
  // a scratch canvas, then every cell more than half covered is in.
  var scratch = document.createElement('canvas');
  scratch.width = GW;
  scratch.height = GH;
  var sc = scratch.getContext('2d', { willReadFrequently: true });
  function mask(pts) {
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, GW, GH);
    sc.setTransform(1, 0, 0, 1, 0, HEAD);
    sc.fillStyle = '#000';
    poly(sc, pts);
    var d = sc.getImageData(0, 0, GW, GH).data, m = new Uint8Array(GW * GH);
    for (var i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    return m;
  }

  // Paints a shape: fill, an optional shading rule per cell, and an outline
  // one cell thick on its own boundary, so overlapping shapes keep a line
  // between them.
  // outline 'own' draws a line around the shape's own edge, so a page keeps a
  // line against the cover under it; 'outside' only where it meets nothing,
  // so the cover reads as a pink band with a single dark rim.
  function layer(buf, m, fill, shadeFn, outline) {
    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        var i = y * GW + x;
        if (!m[i]) continue;
        var border = x === 0 || y === 0 || x === GW - 1 || y === GH - 1;
        var edge = outline === 'outside'
          ? border || !buf[i - 1] && !m[i - 1] || !buf[i + 1] && !m[i + 1] || !buf[i - GW] && !m[i - GW] || !buf[i + GW] && !m[i + GW]
          : outline === 'none' ? false
          : border || !m[i - 1] || !m[i + 1] || !m[i - GW] || !m[i + GW];
        buf[i] = edge ? INK : (shadeFn ? shadeFn(x, y) || fill : fill);
      }
    }
  }

  function frame(angle) {
    var buf = new Array(GW * GH);
    var a = angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);

    // The cover, the page block, then the two lying pages.
    layer(buf, mask([[0.6, 3.6], [11, 5.4], [21.4, 3.6], [21.6, 15.6], [11, 18.6], [0.4, 15.6]]), COVER, function (x, y) {
      if (y >= 16 + HEAD) return COVER_LO;
      if (y <= 5 + HEAD || x <= 1) return COVER_HI;
    }, 'outside');
    layer(buf, mask([[2, 13.4], [11, 15.4], [20, 13.4], [20, 15], [11, 17.2], [2, 15]]), STACK, function (x, y) {
      if ((x + y) % 3 === 0) return PAGE_SHADE;
    }, 'none');
    layer(buf, mask([[11, 4.6], [6.4, 2.2], [2.2, 2.6], [1.9, 13.4], [6.4, 13.2], [11, 15.4]]), PAGE, function (x) {
      if (x >= 9) return PAGE_SHADE;
    });
    layer(buf, mask([[11, 4.6], [15.6, 2.2], [19.8, 2.6], [20.1, 13.4], [15.6, 13.2], [11, 15.4]]), PAGE, function (x) {
      if (x <= 12) return PAGE_SHADE;
    });

    // The turning page, as a small 3D sheet: hinged on the spine, its height
    // off the book drawn up and a little to the left the way the book is
    // seen, and its free edge trailing behind the part near the spine.
    if (angle > 0 && angle < 180) {
      var W = 8.8, dir = angle < 90 ? 1 : -1;
      var top = [], bot = [];
      for (var k = 0; k <= 6; k++) {
        var u = W * k / 6;
        var au = a - dir * 0.55 * sa * Math.pow(k / 6, 1.5);   // the curl
        var px = u * Math.cos(au), pz = u * Math.sin(au);
        var f = Math.abs(px) / W;                               // flat-page tilt, by distance out
        var yt = 4.6 - 2.4 * Math.min(1, f * 1.9) + 0.4 * Math.max(0, f * 2 - 1);
        var yb = 15.4 - 2.2 * Math.min(1, f * 1.9) + 0.2 * Math.max(0, f * 2 - 1);
        var sx = 11 + px - 0.32 * pz;
        top.push([sx, yt - 0.62 * pz]);
        bot.push([sx, yb - 0.62 * pz]);
      }
      var pts = top.concat(bot.reverse());
      var shade = Math.cos(a) < 0 ? BACK : PAGE;
      layer(buf, mask(pts), shade, function (x) {
        if (angle > 40 && angle < 140 && x <= 11 && x >= 8) return PAGE_SHADE;
      });
    }
    return buf;
  }

  function render(buf) {
    var c = document.createElement('canvas');
    c.width = GW;
    c.height = GH;
    var ctx = c.getContext('2d'), img = ctx.createImageData(GW, GH);
    for (var i = 0; i < buf.length; i++) {
      if (!buf[i]) continue;
      img.data[i * 4] = buf[i][0];
      img.data[i * 4 + 1] = buf[i][1];
      img.data[i * 4 + 2] = buf[i][2];
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // One turn of a page, eased: slow off the stack, quick over the top, and a
  // soft landing. The rest frame is the book lying open.
  var FRAMES = [];
  var STEPS = 16;
  for (var f = 0; f <= STEPS; f++) {
    var t = f / STEPS;
    var e = -(Math.cos(Math.PI * t) - 1) / 2;
    FRAMES.push(render(frame(e * 180)));
  }
  var REST = FRAMES[0];

  var el = document.createElement('div');
  el.className = 'book-cursor';
  el.setAttribute('aria-hidden', 'true');
  var view = document.createElement('canvas');
  view.width = GW;
  view.height = GH;
  view.style.width = GW * SCALE + 'px';
  view.style.height = GH * SCALE + 'px';
  el.appendChild(view);
  document.body.appendChild(el);
  var vc = view.getContext('2d');
  vc.drawImage(REST, 0, 0);
  document.documentElement.classList.add('has-book-cursor');

  var CLICKABLE = 'a[href], button, [role="button"], label, select, summary, input, textarea, [data-open], [data-demo],' +
    ' .jr-pen, .jr-brush, .jr-book, .titlebar, .grip';

  var x = -100, y = -100, tilt = 0, lastX = null, shown = false;
  var hovering = false, pressed = false, flip = -1, clock = 0, pause = 0, raf = 0, then = 0;

  function show(on) {
    if (on === shown) return;
    shown = on;
    el.classList.toggle('is-shown', on);
  }

  function loop(now) {
    raf = 0;
    var dt = then ? Math.min(0.05, (now - then) / 1000) : 0.016;
    then = now;
    var busy = false;

    // Lean a touch into the direction of travel, and settle back.
    tilt += ((lastX === null ? 0 : clamp((x - lastX) * 0.9, -10, 10)) - tilt) * Math.min(1, dt * 14);
    lastX = x;
    if (Math.abs(tilt) > 0.05) busy = true;

    if (still.matches) {
      flip = -1;
    } else if (flip >= 0) {
      busy = true;
      clock += dt;
      var idx = Math.floor(clock / 0.036);
      if (idx > STEPS) {
        // Landed. Keep turning while the pointer stays on something clickable.
        flip = hovering ? 0 : -1;
        clock = 0;
        pause = hovering ? 0.12 : 0;
        vc.clearRect(0, 0, GW, GH);
        vc.drawImage(REST, 0, 0);
      } else if (pause > 0) {
        pause -= dt;
        clock = 0;
      } else {
        vc.clearRect(0, 0, GW, GH);
        vc.drawImage(FRAMES[idx], 0, 0);
      }
    }

    el.style.transform = 'translate3d(' + (x - HOT_X * SCALE) + 'px,' + (y - HOT_Y * SCALE) + 'px,0) rotate(' + tilt.toFixed(2) +
      'deg) scale(' + (pressed ? 0.88 : 1) + ')';
    if (busy) raf = requestAnimationFrame(loop);
    else then = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') { show(false); return; }
    x = e.clientX;
    y = e.clientY;
    show(true);
    kick();
  }, { passive: true });

  document.addEventListener('pointerover', function (e) {
    var t = e.target;
    var on = !!(t && t.closest && t.closest(CLICKABLE));
    if (on && !hovering && flip < 0) { flip = 0; clock = 0; pause = 0; }
    hovering = on;
    kick();
  });

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    pressed = true;
    el.classList.add('is-pressed');
    kick();
  });
  document.addEventListener('pointerup', function () {
    pressed = false;
    el.classList.remove('is-pressed');
    kick();
  });

  // Out of the window, or into a demo's iframe, which draws its own pointer.
  document.addEventListener('pointerout', function (e) {
    var to = e.relatedTarget;
    if (!to || to.tagName === 'IFRAME') show(false);
  });
  window.addEventListener('blur', function () { show(false); });
}());
