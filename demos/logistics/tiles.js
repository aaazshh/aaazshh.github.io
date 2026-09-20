/**
 * One place to decide where the map tiles come from.
 *
 * Leaflet itself needs no key, it is just the map library. The tiles are the
 * part somebody has to serve, and that is where a key comes in.
 *
 * Out of the box this uses CARTO's Positron basemap, which needs no key and no
 * account. That is fine for a walkthrough, but the fair-use tiles are rate
 * limited and can thin out if a page is busy.
 *
 * To use your own tiles instead, sign up for a free MapTiler account, copy the
 * key from the dashboard and paste it into MAPTILER_KEY below. Everything else
 * switches over on its own. The free tier is generous enough for a portfolio.
 *
 *   https://cloud.maptiler.com/account/keys/
 *
 * The real portal and the real driver app both draw raw OpenStreetMap tiles.
 * Those are keyless too, but OSM asks that apps and sites with real traffic do
 * not lean on their servers, so this walkthrough does not.
 */

'use strict';

var MAPTILER_KEY = '';

function basemap(map) {
  var layer = MAPTILER_KEY
    ? L.tileLayer(
        'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=' + MAPTILER_KEY,
        {
          attribution:
            '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> ' +
            '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>',
          maxZoom: 20,
          crossOrigin: true
        }
      )
    : L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        maxZoom: 19
      });

  return layer.addTo(map);
}
