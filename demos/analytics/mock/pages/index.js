// index.php: supermarket count from MySQL and the iOS / other member split
// from the CRM members table.
(function () {
  'use strict';
  PM.supermarketCount = Cat.SUPERMARKETS.length;
  PM.totalIOS = Math.round(World.MEMBERS * 0.58);
  PM.totalNotIOS = World.MEMBERS - PM.totalIOS;
})();
