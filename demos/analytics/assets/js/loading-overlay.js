(function () {
    const OVERLAY_ID = 'primeLoadingOverlay';

    function createLoadingOverlay() {
        if (document.getElementById(OVERLAY_ID)) {
            return document.getElementById(OVERLAY_ID);
        }

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'prime-loading-overlay';
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="prime-loading-card" role="status">
                <img class="prime-loading-gif" src="assets/img/green_bar_loader_only2.gif" alt="" aria-hidden="true">
                <p>Generating analytics...</p>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    function ensureLoadingOverlay() {
        if (document.body) {
            return createLoadingOverlay();
        }

        document.addEventListener('DOMContentLoaded', createLoadingOverlay, { once: true });
        return null;
    }

    window.ensureLoadingOverlay = ensureLoadingOverlay;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createLoadingOverlay, { once: true });
    } else {
        createLoadingOverlay();
    }
})();
