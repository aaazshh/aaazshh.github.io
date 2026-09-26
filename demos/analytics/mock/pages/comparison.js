// comparison.php: the category list and the filter values echoed into the page.
(function () {
  'use strict';
  var seen = {};
  Cat.PRODUCTS.forEach(function (p) { seen[p.category] = 1; });
  PM.categories = Object.keys(seen).sort();
  PM.category = PM.get('category', ''); PM.priceDate = PM.get('price_date', '');
  PM.categoryOptions = function () {
    return PM.categories.map(function (c) {
      return '<option value="' + PM.esc(c) + '"' + (c === PM.category ? ' selected' : '') + '>' + PM.esc(c) + '</option>';
    }).join('');
  };
})();
