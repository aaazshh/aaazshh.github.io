/**
 * One place to decide where the map tiles come from.
 *
 * Leaflet itself needs no key, it is just the map library. The tiles are the
 * part somebody has to serve, and that is where a key comes in.
 *
 * The key is NOT in this file and is never committed. The deploy workflow
 * (.github/workflows/pages.yml) swaps the placeholder below for the
 * MAPTILER_KEY repository secret on its way to GitHub Pages, so the value only
 * ever exists in GitHub's secret store and in the built output.
 *
 * Anywhere the swap has not happened, which means a local checkout, a fork, or
 * a deploy that did not run the workflow, the placeholder is still sitting
 * there. That is not an error: the map falls back to OpenStreetMap's own tiles,
 * which need no key at all, and everything keeps working.
 *
 * Worth being clear about what this does and does not buy. A tile key used from
 * a browser is readable by anyone who opens the network tab, because the tile
 * request goes straight from the visitor to MapTiler. Keeping it out of the
 * repo stops it being scraped off GitHub, and means rotating it is not a
 * commit. What actually protects it is the allowed-origins list on the key
 * itself, set in the MapTiler dashboard, so a copied key is useless anywhere
 * but this site.
 */

'use strict';

var MAPTILER_KEY = '__MAPTILER_KEY__';

function mapKey() {
  // An unsubstituted placeholder means no key, not a key named after itself.
  return MAPTILER_KEY.indexOf('MAPTILER_KEY') === -1 ? MAPTILER_KEY : '';
}

/**
 * The keyless basemap: OpenStreetMap's own tiles, which is what the real portal
 * and the real driver app both draw. CARTO's Positron used to sit here and
 * needed no key either, but it now stamps "API KEY REQUIRED" across every tile,
 * which is worse than plain OSM for something meant to be looked at.
 *
 * OSM ask that apps and sites with real traffic not lean on their servers, so
 * this is the fallback rather than the destination. Set MAPTILER_KEY and the
 * maps upgrade away from it.
 */
function osmLayer() {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19
  });
}

function maptilerLayer(key) {
  return L.tileLayer(
    'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=' + key,
    {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> ' +
        '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>',
      maxZoom: 20,
      crossOrigin: true
    }
  );
}

/**
 * Does this key work from the origin the page is being served from?
 *
 * Asked once per page, not once per map. It has to be asked at all because a
 * key whose allowed-origins list does not cover this site answers 403 with a
 * perfectly valid "unauthorised" PNG. The browser calls that a successful image
 * load, so Leaflet's own tileerror never fires and the map just quietly fills
 * with error squares. The metadata endpoint answers the same 403 as readable
 * text, which is something we can actually branch on.
 */
var keyWorks = (function () {
  var key = mapKey();
  if (!key) return Promise.resolve(false);
  return fetch('https://api.maptiler.com/maps/streets-v2/tiles.json?key=' + key)
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}());

/**
 * Draws the basemap into `map`, keyless first so there is never a blank or
 * broken map on screen, then upgrades to MapTiler if the key checks out.
 */
function basemap(map) {
  var base = osmLayer().addTo(map);

  keyWorks.then(function (ok) {
    if (!ok || !map.hasLayer(base)) return;
    maptilerLayer(mapKey()).addTo(map);
    map.removeLayer(base);
  });

  return base;
}
