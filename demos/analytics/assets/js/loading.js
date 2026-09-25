function showLoading() {
    const overlay = typeof window.ensureLoadingOverlay === 'function'
        ? window.ensureLoadingOverlay()
        : document.getElementById('primeLoadingOverlay');

    if (!overlay) {
        return;
    }

    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('prime-loading-active');
}

let activeLoadingRequests = 0;
let manualLoadingRequests = 0;
let jqueryLoadingBound = false;
let fetchLoadingBound = false;

function hideLoading() {
    if (activeLoadingRequests > 0 || manualLoadingRequests > 0) {
        return;
    }

    const overlay = typeof window.ensureLoadingOverlay === 'function'
        ? window.ensureLoadingOverlay()
        : document.getElementById('primeLoadingOverlay');

    if (!overlay) {
        return;
    }

    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('prime-loading-active');
}

window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.primeShowLoading = showLoading;
window.primeHideLoading = hideLoading;

function beginManualLoading() {
    manualLoadingRequests += 1;
    showLoading();
}

function endManualLoading() {
    manualLoadingRequests = Math.max(0, manualLoadingRequests - 1);
    hideLoading();
}

window.primeBeginLoading = beginManualLoading;
window.primeEndLoading = endManualLoading;

function beginLoadingRequest() {
    activeLoadingRequests += 1;
    showLoading();
}

function endLoadingRequest() {
    activeLoadingRequests = Math.max(0, activeLoadingRequests - 1);
    if (activeLoadingRequests === 0) {
        hideLoading();
    }
}

function bindFetchLoading() {
    if (fetchLoadingBound || typeof window.fetch !== 'function') {
        return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = function () {
        const args = Array.from(arguments);
        const options = args[1];
        if (options && options.primeNoLoading) {
            args[1] = Object.assign({}, options);
            delete args[1].primeNoLoading;
            return originalFetch.apply(window, args);
        }

        beginLoadingRequest();
        return originalFetch.apply(window, args)
            .finally(endLoadingRequest);
    };

    fetchLoadingBound = true;
}

function bindJqueryLoading() {
    if (jqueryLoadingBound || !window.jQuery) {
        return;
    }

    window.jQuery(document)
        .ajaxStart(function () {
            beginLoadingRequest();
        })
        .ajaxStop(function () {
            activeLoadingRequests = 0;
            hideLoading();
        })
        .ajaxError(function () {
            activeLoadingRequests = 0;
            hideLoading();
        });

    jqueryLoadingBound = true;
}

window.addEventListener('load', function () {
    if (activeLoadingRequests === 0) {
        hideLoading();
    }
});

bindFetchLoading();

document.addEventListener('DOMContentLoaded', function () {
    bindJqueryLoading();
    setTimeout(bindJqueryLoading, 0);
    setTimeout(bindJqueryLoading, 250);
    setTimeout(bindJqueryLoading, 1000);

    document.addEventListener('submit', function (event) {
        const form = event.target;
        if (form && form.tagName === 'FORM' && !form.dataset.noLoading) {
            showLoading();
        }
    });

    document.addEventListener('click', function (event) {
        const link = event.target.closest('a[href]');
        if (!link || link.dataset.noLoading) {
            return;
        }

        const href = link.getAttribute('href') || '';
        const target = link.getAttribute('target');

        if (
            target === '_blank' ||
            href === '' ||
            href === '#' ||
            href.startsWith('#') ||
            href.startsWith('javascript:') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            link.hasAttribute('download') ||
            link.getAttribute('data-bs-toggle')
        ) {
            return;
        }

        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) {
            showLoading();
        }
    });
});
