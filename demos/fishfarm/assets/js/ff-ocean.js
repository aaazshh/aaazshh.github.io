/*!
 * ff-ocean.js — the Fish Farm ocean backdrop.
 *
 * A canvas port of the Flutter app's FishBackground (`lib/fishfarm/
 * fish_background.dart`) so the portal and the mobile app render the same
 * world: light rays, rising bubbles, branching coral, swaying seaweed and
 * drifting fish.
 *
 * Usage:
 *   FFOcean.mount(document.getElementById('my-canvas'), {
 *     intensity: 1,        // 0..1, how visible the props are
 *     animated: true,      // false = paint one still frame (see below)
 *     interactive: true,   // fish dart away from the cursor
 *     bubblesOnTap: true   // click on empty space spawns a puff of bubbles
 *   });
 *
 * `animated: false` is the mode used on content-heavy portal pages: the scene
 * is painted once and then costs nothing, but a tap still wakes a short-lived
 * loop that animates *only* the burst bubbles until they pop off the top, then
 * goes idle again. Nothing repaints behind a page full of tables.
 *
 * Returns a handle with .destroy(). Respects prefers-reduced-motion by
 * painting a single static frame and suppressing tap bubbles.
 */
(function (global) {
    'use strict';

    var FISH_TONES = ['#5FB4CE', '#4E9FC7', '#77C6B4', '#F2A65A', '#6C8ED9'];
    var CORAL_TONES = ['#E98A7A', '#D98CB0', '#F2A65A', '#CF7F9B'];

    /* Seeded PRNG so the composition is identical on every load — the Dart
       side uses Random(7) for the same reason. */
    function seeded(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function rgba(hex, alpha) {
        var n = parseInt(hex.slice(1), 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }

    function Ocean(canvas, opts) {
        opts = opts || {};
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.intensity = opts.intensity == null ? 1 : opts.intensity;
        this.animated = opts.animated !== false;

        /* Bubbles and light rays are drawn in this colour. White reads on the
           deep-ocean login page; on the portal's pale wash it would be
           invisible, so those pages pass a teal instead. */
        this.ink = opts.ink || '#ffffff';
        this.interactive = !!opts.interactive;
        this.bubblesOnTap = !!opts.bubblesOnTap;

        /* Only genuine page background bubbles. Two reasons to skip a click:
           it landed on a control (a tap there is a click, not a splash), or it
           landed on an opaque surface like a card or the sidenav — the canvas
           sits behind those, so the bubbles would be invisible anyway and would
           only wake the render loop for nothing. */
        this.tapIgnore = opts.tapIgnore ||
            'a, button, input, select, textarea, label, summary, [role="button"],' +
            '[onclick], .btn, .form-control, .form-select, .dropdown-menu, .nav-link,' +
            '.card, .sidenav, .navbar, .modal, .offcanvas, table, footer';

        this.rnd = seeded(7);
        this.time = 0;
        this.pointer = null;
        this.w = 0;
        this.h = 0;
        this.fish = [];
        this.weeds = [];
        this.corals = [];
        this.bubbles = [];
        this._raf = null;
        this._burstRaf = null;
        this._last = 0;

        this.reduced = global.matchMedia &&
            global.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this._onResize = this.resize.bind(this);
        global.addEventListener('resize', this._onResize);

        if (this.interactive || this.bubblesOnTap) this._bindPointer();

        this.resize();
        if (this.reduced || !this.animated) {
            this.draw();
        } else {
            this._loop = this._loop.bind(this);
            this._raf = requestAnimationFrame(this._loop);
        }
    }

    Ocean.prototype._bindPointer = function () {
        var self = this;
        this._onMove = function (e) {
            var r = self.canvas.getBoundingClientRect();
            self.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        this._onLeave = function () { self.pointer = null; };
        this._onDown = function (e) {
            if (!self.bubblesOnTap || self.reduced) return;
            // Only empty background bubbles — never a control the user clicked.
            var t = e.target;
            if (t && t.closest && t.closest(self.tapIgnore)) return;
            var r = self.canvas.getBoundingClientRect();
            self.burst(e.clientX - r.left, e.clientY - r.top);
        };
        if (this.interactive) {
            global.addEventListener('pointermove', this._onMove, { passive: true });
        }
        global.addEventListener('pointerdown', this._onDown, { passive: true });
        document.addEventListener('pointerleave', this._onLeave);
    };

    /* In static mode nothing repaints until a tap. This runs only while burst
       bubbles are still on screen, then stops and leaves a clean still frame. */
    Ocean.prototype._startBurstLoop = function () {
        if (this._burstRaf) return;
        var self = this, last = 0;

        function step(ts) {
            var dt = last ? (ts - last) / 1000 : 0;
            last = ts;
            self.update(Math.max(0, Math.min(dt, 0.05)), true);
            self.draw();

            for (var i = 0; i < self.bubbles.length; i++) {
                if (self.bubbles[i].burst) {
                    self._burstRaf = requestAnimationFrame(step);
                    return;
                }
            }
            self._burstRaf = null;
        }
        this._burstRaf = requestAnimationFrame(step);
    };

    Ocean.prototype.resize = function () {
        var dpr = Math.min(global.devicePixelRatio || 1, 2);
        var w = this.canvas.clientWidth || global.innerWidth;
        var h = this.canvas.clientHeight || global.innerHeight;
        if (!w || !h) return;

        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var first = !this.w;
        this.w = w;
        this.h = h;
        if (first) this._populate();
        // Setting canvas.width wipes the bitmap; in static mode there's no loop
        // to put the scene back, so repaint it here.
        if (!first && (!this.animated || this.reduced)) this.draw();
    };

    Ocean.prototype._populate = function () {
        var r = this.rnd, w = this.w, h = this.h, i;
        this.fish = []; this.weeds = []; this.corals = []; this.bubbles = [];

        var fishCount = w * h > 320000 ? 7 : 5;
        for (i = 0; i < fishCount; i++) {
            var dir = r() < 0.5 ? 1 : -1;
            this.fish.push({
                x: r() * w, y: 60 + r() * Math.max(60, h - 160),
                vx: dir * (14 + r() * 26), vy: 0,
                size: 13 + r() * 12,
                color: FISH_TONES[i % FISH_TONES.length],
                phase: r() * Math.PI * 2,
                wobble: 2 + r() * 2
            });
        }

        for (i = 0; i < 5; i++) {
            this.weeds.push({
                x: (i + 0.5) / 5 + (r() - 0.5) * 0.06,
                h: 60 + r() * 70,
                phase: r() * Math.PI * 2,
                blades: 3 + (r() * 2 | 0),
                color: i % 2 === 0 ? '#74C6A2' : '#57B08C'
            });
        }

        for (i = 0; i < 4; i++) {
            this.corals.push({
                x: (i + 0.5) / 4 + (r() - 0.5) * 0.18,
                h: 34 + r() * 40,
                arms: 2 + (r() * 2 | 0),
                phase: r() * Math.PI * 2,
                color: CORAL_TONES[i % CORAL_TONES.length]
            });
        }

        for (i = 0; i < 9; i++) {
            this.bubbles.push({
                x: r(), y: r() * h, r: 2 + r() * 4, speed: 18 + r() * 26, burst: false
            });
        }
    };

    Ocean.prototype.burst = function (px, py) {
        var r = this.rnd, count = 7 + (r() * 4 | 0);
        for (var i = 0; i < count; i++) {
            this.bubbles.push({
                x: Math.max(0, Math.min(1, (px + (r() - 0.5) * 46) / this.w)),
                y: py - r() * 14,
                r: 2 + r() * 5,
                speed: 34 + r() * 46,
                burst: true
            });
        }
        if (this.bubbles.length > 90) this.bubbles.splice(0, this.bubbles.length - 90);
        if (!this.animated) this._startBurstLoop();
    };

    /**
     * @param {number} dt seconds since the last frame
     * @param {boolean} [burstOnly] advance only tap bubbles, leaving the rest
     *        of the scene frozen (static-page mode)
     */
    Ocean.prototype.update = function (dt, burstOnly) {
        if (!this.w || dt < 0) return;
        if (!burstOnly) this.time += dt;
        var w = this.w, h = this.h, r = this.rnd, i;

        for (i = 0; !burstOnly && i < this.fish.length; i++) {
            var f = this.fish[i];
            f.phase += f.wobble * dt;

            if (this.pointer) {
                var dx = f.x - this.pointer.x, dy = f.y - this.pointer.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 110 && dist > 0.001) {
                    var push = (1 - dist / 110) * 240;
                    f.vx += (dx / dist) * push * dt;
                    f.vy += (dy / dist) * push * dt;
                }
            }

            var target = f.vx < 0 ? -26 : 26;
            f.vx += (target - f.vx) * 0.6 * dt;
            f.vy *= (1 - 1.2 * dt);

            f.x += f.vx * dt;
            f.y += f.vy * dt + Math.sin(f.phase * 0.6) * 10 * dt;

            if (f.y < 50) f.y = 50;
            if (f.y > h - 70) f.y = h - 70;

            var margin = f.size * 2 + 20;
            if (f.x < -margin) { f.x = w + margin; f.y = 60 + r() * Math.max(60, h - 160); }
            else if (f.x > w + margin) { f.x = -margin; f.y = 60 + r() * Math.max(60, h - 160); }
        }

        for (i = this.bubbles.length - 1; i >= 0; i--) {
            var b = this.bubbles[i];
            if (burstOnly && !b.burst) continue;
            b.y -= b.speed * dt;
            if (b.burst) {
                if (b.y < -12) { this.bubbles.splice(i, 1); continue; }
                b.x += Math.sin(this.time * 4 + b.r) * 0.0006;
            } else if (b.y < -10) {
                b.y = h + 10;
                b.x = r();
            }
        }
    };

    Ocean.prototype.draw = function () {
        var ctx = this.ctx, o = Math.max(0, Math.min(1, this.intensity));
        if (!this.w) return;
        ctx.clearRect(0, 0, this.w, this.h);

        this._rays(o);
        this._bubbles(o);
        for (var i = 0; i < this.corals.length; i++) this._coral(this.corals[i], o);
        for (i = 0; i < this.weeds.length; i++) this._weed(this.weeds[i], o);
        for (i = 0; i < this.fish.length; i++) this._fish(this.fish[i], o);
    };

    Ocean.prototype._rays = function (o) {
        var ctx = this.ctx, rayW = this.w * 0.22;
        ctx.fillStyle = rgba(this.ink, 0.10 * o);
        for (var i = 0; i < 3; i++) {
            var x = this.w * (0.15 + i * 0.3);
            ctx.beginPath();
            ctx.moveTo(x, -20);
            ctx.lineTo(x + rayW, -20);
            ctx.lineTo(x + rayW * 1.9, this.h * 0.75);
            ctx.lineTo(x + rayW * 0.9, this.h * 0.75);
            ctx.closePath();
            ctx.fill();
        }
    };

    Ocean.prototype._bubbles = function (o) {
        var ctx = this.ctx, ink = this.ink;
        ctx.lineWidth = 1.2;
        for (var i = 0; i < this.bubbles.length; i++) {
            var b = this.bubbles[i], cx = b.x * this.w, cy = b.y;
            // Tap bubbles are the feedback for a click, so keep them legible
            // even when the ambient scene is dialled right down.
            var a = b.burst ? Math.max(0.5, 0.55 * o) : 0.34 * o;
            ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, 6.2832);
            ctx.fillStyle = rgba(ink, a * 0.25); ctx.fill();
            ctx.strokeStyle = rgba(ink, a); ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx - b.r * 0.3, cy - b.r * 0.3, b.r * 0.28, 0, 6.2832);
            ctx.fillStyle = rgba(ink, a * 0.8); ctx.fill();
        }
    };

    /* Stubby branching coral: a trunk forking into rounded arms tipped with
       buds. Sways far less than seaweed — coral is rigid. */
    Ocean.prototype._coral = function (c, o) {
        var ctx = this.ctx, bx = c.x * this.w, by = this.h;
        var sway = Math.sin(this.time * 0.5 + c.phase) * 2, h = c.h;

        ctx.strokeStyle = rgba(c.color, 0.34 * o);
        ctx.fillStyle = rgba(c.color, 0.26 * o);
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + sway * 0.4, by - h * 0.34, bx + sway, by - h * 0.55);
        ctx.stroke();

        for (var a = 0; a < c.arms * 2; a++) {
            var dir = a % 2 === 0 ? -1 : 1;
            var tier = a >> 1;
            var spread = (tier + 1) * 0.42;
            var armLen = h * (0.42 - tier * 0.08);
            var forkY = by - h * (0.5 - tier * 0.12);
            var tipX = bx + sway + dir * h * spread * 0.52;
            var tipY = forkY - armLen;

            ctx.beginPath();
            ctx.moveTo(bx + sway * 0.8, forkY);
            ctx.quadraticCurveTo(bx + dir * h * spread * 0.28, forkY - armLen * 0.62, tipX, tipY);
            ctx.stroke();

            ctx.beginPath(); ctx.arc(tipX, tipY, 3.2, 0, 6.2832); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(bx + sway, by - h * 0.55, 3.6, 0, 6.2832); ctx.fill();
    };

    Ocean.prototype._weed = function (weed, o) {
        var ctx = this.ctx, bx = weed.x * this.w, by = this.h;
        var sway = Math.sin(this.time * 1.1 + weed.phase);
        ctx.strokeStyle = rgba(weed.color, 0.42 * o);
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        for (var b = 0; b < weed.blades; b++) {
            var spread = (b - (weed.blades - 1) / 2) * 9;
            var h = weed.h * (0.7 + 0.3 * (1 - b / weed.blades));
            ctx.beginPath();
            ctx.moveTo(bx + spread, by);
            ctx.quadraticCurveTo(bx + spread + sway * 14, by - h * 0.5, bx + spread + sway * 22, by - h);
            ctx.stroke();
        }
    };

    Ocean.prototype._fish = function (f, o) {
        var ctx = this.ctx, s = f.size, tail = Math.sin(f.phase) * 0.35;

        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.vx < 0) ctx.scale(-1, 1);

        ctx.strokeStyle = rgba(f.color, 0.55 * o);
        ctx.fillStyle = rgba(f.color, 0.12 * o);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Body: a rounded teardrop with the nose at +x.
        ctx.beginPath();
        ctx.moveTo(s * 1.1, 0);
        ctx.bezierCurveTo(s * 0.7, -s * 0.75, -s * 0.5, -s * 0.7, -s * 0.85, 0);
        ctx.bezierCurveTo(-s * 0.5, s * 0.7, s * 0.7, s * 0.75, s * 1.1, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Tail fin, wagging.
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, 0);
        ctx.lineTo(-s * 1.6, -s * (0.55 - tail));
        ctx.lineTo(-s * 1.35, 0);
        ctx.lineTo(-s * 1.6, s * (0.55 + tail));
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Top fin.
        ctx.beginPath();
        ctx.moveTo(s * 0.15, -s * 0.62);
        ctx.quadraticCurveTo(s * 0.45, -s * 1.02, s * 0.55, -s * 0.5);
        ctx.stroke();

        // Eye.
        ctx.beginPath();
        ctx.arc(s * 0.62, -s * 0.12, s * 0.1, 0, 6.2832);
        ctx.fillStyle = rgba(f.color, 0.75 * o);
        ctx.fill();

        // Gill line.
        ctx.beginPath();
        ctx.arc(s * 0.2, 0, s * 0.5, -Math.PI / 2.6, -Math.PI / 2.6 + Math.PI / 1.3);
        ctx.stroke();

        ctx.restore();
    };

    Ocean.prototype._loop = function (ts) {
        var dt = this._last ? (ts - this._last) / 1000 : 0;
        this._last = ts;
        // Guard against huge jumps after the tab is backgrounded.
        this.update(Math.max(0, Math.min(dt, 0.05)));
        this.draw();
        this._raf = requestAnimationFrame(this._loop);
    };

    Ocean.prototype.destroy = function () {
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this._burstRaf) cancelAnimationFrame(this._burstRaf);
        global.removeEventListener('resize', this._onResize);
        if (this._onMove) {
            global.removeEventListener('pointermove', this._onMove);
            global.removeEventListener('pointerdown', this._onDown);
            document.removeEventListener('pointerleave', this._onLeave);
        }
    };

    global.FFOcean = {
        mount: function (canvas, opts) {
            if (!canvas || !canvas.getContext) return null;
            return new Ocean(canvas, opts);
        }
    };
})(window);
