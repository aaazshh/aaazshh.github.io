/*!
 * ff-logo-draw.js, the Prime leaf, drawing itself on a loop.
 *
 * A canvas port of the Flutter app's idle login mark
 * (`lib/fishfarm/prime_logo_animation.dart`): the four strokes are revealed in
 * order with a glowing nib at the pen tip, the finished mark holds, fades, and
 * the cycle repeats.
 *
 *   FFLogoDraw.loop(canvas, { period, color })  → { destroy() }
 *
 * Falls back to a single fully-drawn frame under prefers-reduced-motion.
 */
(function (global) {
    'use strict';

    var SAMPLES = 72;

    /* Authored on a 0-100 grid, identical to buildPrimeStrokes() in
       prime_logo_animation.dart: two side leaves, stem, lower leaf, crown. */
    var LEAF = [
        ['M21,28 C12,31 8.5,43 10.5,56 C13,72 26,84 41,89',
         'M79,28 C88,31 91.5,43 89.5,56 C87,72 74,84 59,89'],
        ['M50,94 L50,50'],
        ['M22,27 C33,29 43,38 50,49 C57,38 67,29 78,27'],
        ['M28,18.5 C36.5,19.5 43.5,24 50,30.5 C56.5,24 63.5,19.5 72,18.5',
         'M36.5,11 Q43.5,12 50,17.8 Q56.5,12 63.5,11']
    ];
    var LEAF_W = [12.4, 12.8, 11.3, 7.1];
    // Share of the draw-on timeline each stroke occupies.
    var WEIGHTS = [1.1, 0.45, 0.7, 0.65];

    var strokes = null;

    /* Resample a path into SAMPLES evenly spaced points. Done once, in the
       canonical 100x100 space, so scaling later costs nothing. */
    function samplePath(d) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.style.opacity = '0';
        svg.style.pointerEvents = 'none';
        document.body.appendChild(svg);

        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);

        var len = p.getTotalLength(), pts = [], i, q;
        for (i = 0; i < SAMPLES; i++) {
            q = p.getPointAtLength(len * (i / (SAMPLES - 1)));
            pts.push([q.x, q.y]);
        }
        document.body.removeChild(svg);
        return { pts: pts, length: len };
    }

    function build() {
        if (strokes) return strokes;
        strokes = [];
        for (var s = 0; s < LEAF.length; s++) {
            for (var i = 0; i < LEAF[s].length; i++) {
                strokes.push({
                    stroke: s, sub: i,
                    from: samplePath(LEAF[s][i]).pts,
                    w0: LEAF_W[s],
                    weight: WEIGHTS[s]
                });
            }
        }
        return strokes;
    }

    function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    function fitCanvas(canvas) {
        var dpr = Math.min(global.devicePixelRatio || 1, 2);
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return null;
        if (canvas.width !== Math.round(w * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        return { ctx: ctx, w: w, h: h };
    }

    /* Map the 100x100 design grid onto the canvas, centred. */
    function enterGrid(ctx, w, h) {
        var scale = Math.min(w, h) / 100;
        ctx.save();
        ctx.translate((w - 100 * scale) / 2, (h - 100 * scale) / 2);
        ctx.scale(scale, scale);
        return scale;
    }

    // ── Looping draw-on (the idle logo) ──────────────────────────────────────

    /* Reveals only the leading `progress` fraction of the total stroke length,
       in stroke order, with a glowing nib at the pen tip. */
    function drawLeaf(ctx, progress, colour) {
        var all = build(), total = 0, i;
        for (i = 0; i < all.length; i++) total += all[i].weight / (LEAF[all[i].stroke].length);

        var consumed = 0, tip = null;
        ctx.lineJoin = 'round';

        for (i = 0; i < all.length; i++) {
            var st = all[i];
            var share = st.weight / LEAF[st.stroke].length;
            var start = consumed / total, end = (consumed + share) / total;
            consumed += share;
            if (progress <= start) break;

            var sp = Math.max(0, Math.min(1, (progress - start) / (end - start)));
            var count = Math.max(2, Math.round(SAMPLES * sp));

            ctx.lineWidth = st.w0;
            ctx.strokeStyle = colour;
            ctx.lineCap = st.stroke === 1 ? 'butt' : 'round';
            ctx.beginPath();
            for (var j = 0; j < count; j++) {
                var p = st.from[j];
                j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
            }
            ctx.stroke();
            if (sp < 1) tip = st.from[count - 1];
        }

        if (tip && progress < 1) {
            ctx.save();
            ctx.shadowColor = 'rgba(255,255,255,0.85)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.8, 0, 6.2832); ctx.fill();
            ctx.restore();
        }
    }

    /** Draw → hold → fade out → repeat, forever. Returns { destroy() }. */
    function loop(canvas, opts) {
        opts = opts || {};
        var period = opts.period || 4600;
        var colour = opts.color || '#ffffff';
        var reduced = global.matchMedia &&
            global.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var raf = null, start = null;

        function frame(ts) {
            var fit = fitCanvas(canvas);
            if (fit) {
                if (start === null) start = ts;
                var t = reduced ? 0.7 : ((ts - start) % period) / period;
                var draw = easeInOutCubic(Math.min(1, t / 0.62));
                var alpha = t < 0.06 ? t / 0.06 : (t < 0.84 ? 1 : 1 - (t - 0.84) / 0.16);

                fit.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                enterGrid(fit.ctx, fit.w, fit.h);
                drawLeaf(fit.ctx, draw, colour);
                fit.ctx.restore();
            }
            if (!reduced) raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);

        return { destroy: function () { if (raf) cancelAnimationFrame(raf); } };
    }
    global.FFLogoDraw = { loop: loop };
})(window);
