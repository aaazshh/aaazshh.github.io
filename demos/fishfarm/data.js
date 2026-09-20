/**
 * One set of records behind every screen: the same cage that is short on feed
 * on the dashboard is the one the net log has a tear against, and the one the
 * mobile app opens when you scan it. Made up, but consistent.
 */

'use strict';

var DATA = (function () {

  var species = [
    { id: 1, name: 'Hybrid Grouper', cn: '龍虎斑', price: 22 },
    { id: 2, name: 'Red Snapper', cn: '紅雞', price: 16 },
    { id: 3, name: 'Orange-spotted Grouper', cn: '青斑', price: 18 },
    { id: 4, name: 'Seabass', cn: '金目鱸', price: 12 },
    { id: 5, name: 'Silver Pompano', cn: '銀鯧', price: 14 },
    { id: 6, name: 'Threadfin', cn: '午魚', price: 19 },
    { id: 7, name: 'Golden Trevally', cn: '汶浪', price: 10 }
  ];

  // x, y, w, h are the cage's box on the farm map, the way the map editor
  // stores them. Farm 1 is the near pontoon, farm 2 sits further out.
  var cages = [
    { name: 'A1', farm: 1, x: 4, y: 6, w: 20, h: 16, species: 'Hybrid Grouper', stock: 8400, avg: 0.62, stocked: '14 Mar', status: 'Growing' },
    { name: 'A2', farm: 1, x: 27, y: 6, w: 20, h: 16, species: 'Hybrid Grouper', stock: 7950, avg: 0.58, stocked: '14 Mar', status: 'Growing' },
    { name: 'A3', farm: 1, x: 50, y: 6, w: 20, h: 16, species: 'Red Snapper', stock: 6100, avg: 0.44, stocked: '02 Apr', status: 'Growing' },
    { name: 'B1', farm: 1, x: 4, y: 26, w: 20, h: 16, species: 'Seabass', stock: 11200, avg: 0.81, stocked: '19 Jan', status: 'Near harvest' },
    { name: 'B2', farm: 1, x: 27, y: 26, w: 20, h: 16, species: 'Seabass', stock: 10450, avg: 0.78, stocked: '19 Jan', status: 'Near harvest' },
    { name: 'B3', farm: 1, x: 50, y: 26, w: 20, h: 16, species: 'Silver Pompano', stock: 5300, avg: 0.36, stocked: '28 Apr', status: 'Growing' },
    { name: 'C1', farm: 1, x: 4, y: 46, w: 20, h: 16, species: 'Threadfin', stock: 4200, avg: 0.51, stocked: '11 Feb', status: 'Treatment' },
    { name: 'C2', farm: 1, x: 27, y: 46, w: 20, h: 16, species: 'Golden Trevally', stock: 6800, avg: 0.29, stocked: '06 May', status: 'Growing' },
    { name: 'C3', farm: 1, x: 50, y: 46, w: 20, h: 16, species: null, stock: 0, avg: 0, stocked: '', status: 'Empty' },
    { name: 'G1', farm: 2, x: 6, y: 8, w: 24, h: 18, species: 'Orange-spotted Grouper', stock: 9100, avg: 0.67, stocked: '22 Feb', status: 'Growing' },
    { name: 'H1', farm: 2, x: 34, y: 8, w: 24, h: 18, species: 'Red Snapper', stock: 7400, avg: 0.49, stocked: '15 Mar', status: 'Growing' },
    { name: 'I1', farm: 2, x: 6, y: 32, w: 24, h: 18, species: 'Seabass', stock: 12800, avg: 0.88, stocked: '04 Jan', status: 'Near harvest' },
    { name: 'J1', farm: 2, x: 34, y: 32, w: 24, h: 18, species: 'Hybrid Grouper', stock: 8850, avg: 0.55, stocked: '30 Mar', status: 'Net repair' },
    { name: 'K1', farm: 2, x: 6, y: 56, w: 24, h: 18, species: null, stock: 0, avg: 0, stocked: '', status: 'Empty' }
  ];

  var feeds = [
    { name: 'Pellet 3mm', bags: 64, kg: 25, supplier: 'Sea Harvest Feeds', used7: 38, low: false },
    { name: 'Pellet 5mm', bags: 41, kg: 25, supplier: 'Sea Harvest Feeds', used7: 52, low: false },
    { name: 'Pellet 8mm', bags: 9, kg: 25, supplier: 'Ocean Nutrition SG', used7: 34, low: true },
    { name: 'Trash fish', bags: 18, kg: 20, supplier: 'Jurong Fishery Port', used7: 71, low: false },
    { name: 'Starter crumble', bags: 22, kg: 10, supplier: 'Ocean Nutrition SG', used7: 6, low: false }
  ];

  var stores = [
    { kind: 'Supplement', name: 'Vitamin C premix', qty: 14, unit: 'kg', expires: 'Nov 2026', low: false },
    { kind: 'Supplement', name: 'Probiotic blend', qty: 6, unit: 'kg', expires: 'Aug 2026', low: true },
    { kind: 'Medicine', name: 'Oxytetracycline', qty: 3, unit: 'kg', expires: 'Feb 2027', low: true },
    { kind: 'Medicine', name: 'Formalin 37%', qty: 40, unit: 'L', expires: 'Jun 2027', low: false },
    { kind: 'Medicine', name: 'Praziquantel', qty: 8, unit: 'kg', expires: 'Mar 2027', low: false },
    { kind: 'Vaccine', name: 'Iridovirus vaccine', qty: 2400, unit: 'doses', expires: 'Dec 2026', low: false },
    { kind: 'Vaccine', name: 'Streptococcus vaccine', qty: 900, unit: 'doses', expires: 'Sep 2026', low: true }
  ];

  var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var deadTrend = [41, 63, 38, 52, 87, 44, 29];
  var feedTrend = [420, 465, 410, 480, 505, 440, 300];

  var mortality = [
    { date: 'Today 07:20', cage: 'C1', species: 'Threadfin', count: 34, sign: 'Skin lesions', by: 'Hafiz', note: 'Same cage as yesterday, treatment started' },
    { date: 'Today 06:55', cage: 'A2', species: 'Hybrid Grouper', count: 6, sign: 'None noted', by: 'Siti', note: '' },
    { date: 'Yesterday 17:40', cage: 'C1', species: 'Threadfin', count: 41, sign: 'Skin lesions', by: 'Hafiz', note: 'Raised an incident' },
    { date: 'Yesterday 07:10', cage: 'J1', species: 'Hybrid Grouper', count: 12, sign: 'Gill pale', by: 'Ramesh', note: '' },
    { date: 'Yesterday 06:48', cage: 'B1', species: 'Seabass', count: 9, sign: 'None noted', by: 'Siti', note: '' },
    { date: '2 days ago 16:20', cage: 'H1', species: 'Red Snapper', count: 15, sign: 'Eye cloudy', by: 'Ramesh', note: '' },
    { date: '2 days ago 07:05', cage: 'A1', species: 'Hybrid Grouper', count: 7, sign: 'None noted', by: 'Siti', note: '' },
    { date: '3 days ago 07:30', cage: 'I1', species: 'Seabass', count: 11, sign: 'None noted', by: 'Hafiz', note: '' }
  ];

  var feedings = [
    { date: 'Today', session: 'Morning', cage: 'B1', feed: 'Pellet 8mm', kg: 85, by: 'Siti' },
    { date: 'Today', session: 'Morning', cage: 'B2', feed: 'Pellet 8mm', kg: 78, by: 'Siti' },
    { date: 'Today', session: 'Morning', cage: 'I1', feed: 'Pellet 8mm', kg: 96, by: 'Ramesh' },
    { date: 'Today', session: 'Morning', cage: 'A1', feed: 'Pellet 5mm', kg: 62, by: 'Siti' },
    { date: 'Today', session: 'Morning', cage: 'G1', feed: 'Pellet 5mm', kg: 70, by: 'Ramesh' },
    { date: 'Today', session: 'Noon', cage: 'A2', feed: 'Pellet 5mm', kg: 58, by: 'Hafiz' },
    { date: 'Today', session: 'Noon', cage: 'A3', feed: 'Pellet 3mm', kg: 34, by: 'Hafiz' }
  ];

  var surveys = [
    { date: 'Today 06:30', farm: 1, temp: 29.4, o2: 6.1, ph: 8.1, sal: 30, turb: 'Clear', by: 'Siti' },
    { date: 'Today 06:45', farm: 2, temp: 29.1, o2: 5.8, ph: 8.0, sal: 31, turb: 'Clear', by: 'Ramesh' },
    { date: 'Yesterday 06:30', farm: 1, temp: 29.8, o2: 5.4, ph: 8.1, sal: 30, turb: 'Slight algae', by: 'Siti' },
    { date: 'Yesterday 06:40', farm: 2, temp: 29.5, o2: 5.2, ph: 8.0, sal: 31, turb: 'Slight algae', by: 'Ramesh' },
    { date: '2 days ago 06:35', farm: 1, temp: 30.2, o2: 4.9, ph: 7.9, sal: 29, turb: 'Murky', by: 'Hafiz' },
    { date: '3 days ago 06:30', farm: 1, temp: 29.6, o2: 5.7, ph: 8.0, sal: 30, turb: 'Clear', by: 'Siti' },
    { date: '4 days ago 06:30', farm: 1, temp: 29.3, o2: 6.0, ph: 8.1, sal: 30, turb: 'Clear', by: 'Siti' },
    { date: '5 days ago 06:30', farm: 1, temp: 29.0, o2: 6.2, ph: 8.2, sal: 30, turb: 'Clear', by: 'Ramesh' },
    { date: '6 days ago 06:30', farm: 1, temp: 28.8, o2: 6.3, ph: 8.2, sal: 30, turb: 'Clear', by: 'Siti' }
  ];

  var nets = [
    { kind: 'Broken', date: 'Today 08:10', cage: 'J1', size: '6 x 6 x 5 m', by: 'Ramesh', note: 'Tear on the north panel, about a metre, cage isolated', state: 'Open' },
    { kind: 'Change', date: 'Yesterday 14:20', cage: 'A3', size: '5 x 5 x 4 m', by: 'Hafiz', note: 'Swapped to a clean net, old one sent to wash', state: 'Done' },
    { kind: 'Wash', date: 'Yesterday 11:05', cage: 'B3', size: '5 x 5 x 4 m', by: 'Siti', note: 'Heavy fouling after three weeks', state: 'Done' },
    { kind: 'Wash', date: '2 days ago 10:30', cage: 'A1', size: '6 x 6 x 5 m', by: 'Siti', note: '', state: 'Done' },
    { kind: 'Change', date: '4 days ago 09:15', cage: 'C2', size: '4 x 4 x 4 m', by: 'Ramesh', note: 'Grading, moved to a bigger mesh', state: 'Done' },
    { kind: 'Broken', date: '6 days ago 15:40', cage: 'H1', size: '6 x 6 x 5 m', by: 'Hafiz', note: 'Repaired on the pontoon the same afternoon', state: 'Closed' }
  ];

  var harvests = [
    { date: 'Today 05:40', cage: 'I1', species: 'Seabass', kg: 620, pcs: 705, type: 'Live', buyer: 'Jurong Fishery Port', by: 'Ramesh' },
    { date: 'Yesterday 05:30', cage: 'B1', species: 'Seabass', kg: 540, pcs: 668, type: 'Ice chilled', buyer: 'Prime Supermarket', by: 'Siti' },
    { date: '3 days ago 05:45', cage: 'B2', species: 'Seabass', kg: 480, pcs: 615, type: 'Ice chilled', buyer: 'Prime Supermarket', by: 'Siti' },
    { date: '5 days ago 05:35', cage: 'G1', species: 'Orange-spotted Grouper', kg: 310, pcs: 462, type: 'Live', buyer: 'Restaurant group', by: 'Hafiz' },
    { date: '8 days ago 05:50', cage: 'I1', species: 'Seabass', kg: 580, pcs: 659, type: 'Live', buyer: 'Jurong Fishery Port', by: 'Ramesh' }
  ];

  var incidents = [
    { id: 'FF-311', status: 'Open', type: 'Mortality spike', cage: 'C1', raised: 'Yesterday 17:55', by: 'Hafiz', note: 'Threadfin losses up three days running, skin lesions on most of them. Samples sent for lab diagnosis, formalin bath started this morning.' },
    { id: 'FF-310', status: 'In progress', type: 'Broken net', cage: 'J1', raised: 'Today 08:12', by: 'Ramesh', note: 'Tear on the north panel. Cage isolated, divers booked for the afternoon slack tide.' },
    { id: 'FF-308', status: 'Closed', type: 'Low oxygen', cage: 'Farm 1', raised: '2 days ago 06:40', by: 'Hafiz', note: 'Dissolved oxygen at 4.9 after the algae bloom. Aerators run overnight, back to 5.7 the next morning.' },
    { id: 'FF-305', status: 'Closed', type: 'Boat damage', cage: 'A3', raised: '9 days ago 13:10', by: 'Siti', note: 'Supply boat clipped the walkway, two floats replaced.' }
  ];

  var people = [
    { name: 'guest8', role: 'Farm supervisor', farm: 1 },
    { name: 'guest41', role: 'Farm hand', farm: 1 },
    { name: 'guest42', role: 'Farm hand', farm: 2 },
    { name: 'Maram Aashna', role: 'Admin', farm: null }
  ];

  function cage(name) {
    for (var i = 0; i < cages.length; i++) {
      if (cages[i].name === name) return cages[i];
    }
    return null;
  }

  function fish(name) {
    for (var i = 0; i < species.length; i++) {
      if (species[i].name === name) return species[i];
    }
    return null;
  }

  function totals() {
    var stocked = cages.filter(function (c) { return c.stock > 0; });
    return {
      cages: cages.length,
      active: stocked.length,
      stock: stocked.reduce(function (n, c) { return n + c.stock; }, 0),
      biomass: Math.round(stocked.reduce(function (n, c) { return n + c.stock * c.avg; }, 0)),
      deadToday: mortality.filter(function (m) { return m.date.indexOf('Today') === 0; })
        .reduce(function (n, m) { return n + m.count; }, 0),
      feedToday: feedings.filter(function (f) { return f.date === 'Today'; })
        .reduce(function (n, f) { return n + f.kg; }, 0),
      species: stocked.map(function (c) { return c.species; }).filter(function (s, i, a) {
        return a.indexOf(s) === i;
      }).length
    };
  }

  return {
    species: species, cages: cages, feeds: feeds, stores: stores,
    days: days, deadTrend: deadTrend, feedTrend: feedTrend,
    mortality: mortality, feedings: feedings, surveys: surveys,
    nets: nets, harvests: harvests, incidents: incidents, people: people,
    cage: cage, fish: fish, totals: totals
  };
}());
