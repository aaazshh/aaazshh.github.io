/*!
 * ff-ocean-page.js — puts the reef behind every portal page.
 *
 * Loaded from header.php (which every rendering page includes), so this is the
 * single place the backdrop is wired up — no per-page markup.
 *
 * Deliberately the *static* variant: the scene is painted once at low intensity
 * so it never competes with tables and forms, and never burns a frame loop
 * behind a data-heavy page. Tapping empty background still puffs bubbles.
 *
 * login.php has its own head and mounts the full animated ocean itself.
 */
(function () {
    'use strict';

    function mount() {
        if (!window.FFOcean || document.getElementById('ff-ocean-page')) return;

        // Let the reef show through: the gradient moves to <html> so the body's
        // own (opaque) Argon background can't paint over the canvas.
        document.documentElement.classList.add('ff-ocean-html');
        document.body.classList.add('ff-ocean-page');

        var canvas = document.createElement('canvas');
        canvas.id = 'ff-ocean-page';
        canvas.className = 'ff-ocean-canvas ff-ocean-canvas--behind';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);

        // White ink vanishes on the pale wash — use the brand teal in light
        // mode and switch to white when the dark theme is on.
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';

        window.FFOceanPage = window.FFOcean.mount(canvas, {
            intensity: 0.35,
            animated: false,
            interactive: false,
            bubblesOnTap: true,
            ink: dark ? '#ffffff' : '#0b6e8f'
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
