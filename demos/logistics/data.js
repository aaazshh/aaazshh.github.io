/**
 * One set of numbers behind every screen in this demo, so a plate on the fleet
 * page is the same truck the control center is tracking and the same one the
 * driver app is driving. Made up, but consistent.
 */

'use strict';

var DATA = (function () {

  var companies = [
    { id: 1, name: 'Prime Supermarket', code: 'PSM', source: 'IPS transfer orders', outlets: 24, vehicles: 11 },
    { id: 2, name: 'Prime Fresh', code: 'PFR', source: 'Uploaded spreadsheet', outlets: 9, vehicles: 5 },
    { id: 3, name: 'Island Cold Chain', code: 'ICC', source: 'Uploaded spreadsheet', outlets: 6, vehicles: 2 }
  ];

  var outlets = [
    { name: 'Distribution Centre, Pandan Loop', addr: '15 Pandan Loop, 128423', lat: 1.3180, lng: 103.7490, zone: 'West', company: 'Prime Supermarket', hub: true },
    { name: 'Clementi Ave 3', addr: 'Blk 443 Clementi Ave 3, 120443', lat: 1.3150, lng: 103.7650, zone: 'West', company: 'Prime Supermarket' },
    { name: 'Jurong West St 52', addr: 'Blk 505 Jurong West St 52, 640505', lat: 1.3480, lng: 103.7200, zone: 'West', company: 'Prime Supermarket' },
    { name: 'Boon Lay Way', addr: '221 Boon Lay Way, 649847', lat: 1.3380, lng: 103.7060, zone: 'West', company: 'Prime Fresh' },
    { name: 'Bukit Batok St 21', addr: 'Blk 210 Bukit Batok St 21, 650210', lat: 1.3480, lng: 103.7500, zone: 'West', company: 'Prime Supermarket' },
    { name: 'Queenstown Blk 52', addr: 'Blk 52 Stirling Rd, 141052', lat: 1.2950, lng: 103.8060, zone: 'Central', company: 'Prime Supermarket' },
    { name: 'Tiong Bahru Plaza', addr: '302 Tiong Bahru Rd, 168732', lat: 1.2860, lng: 103.8270, zone: 'Central', company: 'Prime Supermarket' },
    { name: 'Toa Payoh Lor 4', addr: 'Blk 79 Lor 4 Toa Payoh, 310079', lat: 1.3350, lng: 103.8500, zone: 'Central', company: 'Prime Supermarket' },
    { name: 'Bishan St 22', addr: 'Blk 511 Bishan St 13, 570511', lat: 1.3560, lng: 103.8480, zone: 'Central', company: 'Prime Fresh' },
    { name: 'Ang Mo Kio Ave 10', addr: 'Blk 452 Ang Mo Kio Ave 10, 560452', lat: 1.3691, lng: 103.8454, zone: 'North', company: 'Prime Supermarket' },
    { name: 'Yishun Ring Rd', addr: 'Blk 846 Yishun Ring Rd, 760846', lat: 1.4290, lng: 103.8350, zone: 'North', company: 'Prime Supermarket' },
    { name: 'Woodlands Dr 50', addr: 'Blk 682 Woodlands Dr 62, 730682', lat: 1.4360, lng: 103.8000, zone: 'North', company: 'Prime Supermarket' },
    { name: 'Admiralty Link', addr: 'Blk 465 Admiralty Dr, 750465', lat: 1.4560, lng: 103.8180, zone: 'North', company: 'Island Cold Chain' },
    { name: 'Bedok North St 1', addr: 'Blk 87 Bedok North St 4, 460087', lat: 1.3300, lng: 103.9370, zone: 'East', company: 'Prime Supermarket' },
    { name: 'Tampines St 81', addr: 'Blk 826 Tampines St 81, 520826', lat: 1.3496, lng: 103.9390, zone: 'East', company: 'Prime Supermarket' },
    { name: 'Pasir Ris Dr 6', addr: 'Blk 416 Pasir Ris Dr 6, 510416', lat: 1.3720, lng: 103.9490, zone: 'East', company: 'Prime Fresh' },
    { name: 'Simei St 3', addr: 'Blk 248 Simei St 3, 520248', lat: 1.3430, lng: 103.9530, zone: 'East', company: 'Prime Supermarket' },
    { name: 'Geylang Serai', addr: '1 Geylang Serai, 402001', lat: 1.3160, lng: 103.8980, zone: 'East', company: 'Island Cold Chain' }
  ];

  var vehicles = [
    { plate: 'GBA 4821 X', cap: '1.7 t', status: 'In Transit', driver: 'Rahim Osman', company: 'Prime Supermarket', since: '12 Mar 2023' },
    { plate: 'GBM 7734 T', cap: '1.7 t', status: 'In Transit', driver: 'Kok Wai Lim', company: 'Prime Supermarket', since: '04 Jul 2023' },
    { plate: 'XE 8842 P', cap: '3.5 t', status: 'In Transit', driver: 'Siti Nurhaliza', company: 'Prime Supermarket', since: '21 Nov 2022' },
    { plate: 'GBD 2290 R', cap: '3.5 t', status: 'In Transit', driver: 'Prakash Menon', company: 'Prime Supermarket', since: '09 Feb 2024' },
    { plate: 'GBA 6610 M', cap: '1.2 t', status: 'In Transit', driver: 'Aisyah Rahman', company: 'Prime Fresh', since: '30 Aug 2023' },
    { plate: 'YN 5512 J', cap: '5 t', status: 'In Transit', driver: 'Daniel Tan', company: 'Prime Supermarket', since: '17 Jan 2022' },
    { plate: 'GBC 1184 K', cap: '1.7 t', status: 'Idle', driver: 'Jason Koh', company: 'Prime Supermarket', since: '02 May 2023' },
    { plate: 'GBB 3377 W', cap: '1.2 t', status: 'Idle', driver: 'Mei Ling Chua', company: 'Prime Fresh', since: '14 Jun 2023' },
    { plate: 'XD 9025 L', cap: '3.5 t', status: 'Idle', driver: 'Arun Raj', company: 'Prime Supermarket', since: '28 Sep 2022' },
    { plate: 'GBE 7701 V', cap: '1.7 t', status: 'Idle', driver: 'Hafiz Yusof', company: 'Island Cold Chain', since: '11 Apr 2024' },
    { plate: 'GBF 4409 N', cap: '5 t', status: 'Idle', driver: 'Wei Sheng Ng', company: 'Prime Supermarket', since: '23 Oct 2021' },
    { plate: 'GBG 2215 S', cap: '1.2 t', status: 'Idle', driver: 'Nurul Huda', company: 'Prime Fresh', since: '06 Dec 2023' },
    { plate: 'XF 6638 H', cap: '3.5 t', status: 'Maintenance', driver: 'Unassigned', company: 'Prime Supermarket', since: '19 Jul 2022' },
    { plate: 'GBH 8890 D', cap: '1.7 t', status: 'Maintenance', driver: 'Unassigned', company: 'Island Cold Chain', since: '05 Mar 2024' },
    { plate: 'GBJ 3312 F', cap: '1.2 t', status: 'Idle', driver: 'Chee Keong Soh', company: 'Prime Supermarket', since: '27 Jan 2023' },
    { plate: 'GBK 5567 Q', cap: '1.7 t', status: 'Idle', driver: 'Farah Idris', company: 'Prime Supermarket', since: '15 Aug 2022' },
    { plate: 'XG 1123 B', cap: '5 t', status: 'Idle', driver: 'Ravi Kumar', company: 'Prime Supermarket', since: '08 Nov 2023' },
    { plate: 'GBL 9904 Z', cap: '3.5 t', status: 'Idle', driver: 'Joanne Lee', company: 'Prime Fresh', since: '22 Feb 2024' }
  ];

  var users = [
    { name: 'Maram Aashna', email: 'maram@primesupermarket.sg', role: 'Super Admin', company: 'All companies', status: 'Active', created: '08 Jan 2024' },
    { name: 'Lena Fong', email: 'lena.fong@primesupermarket.sg', role: 'Admin', company: 'Prime Supermarket', status: 'Active', created: '14 Feb 2023' },
    { name: 'Marcus Teo', email: 'marcus.teo@primesupermarket.sg', role: 'Ops Manager', company: 'Prime Supermarket', status: 'Active', created: '03 Apr 2023' },
    { name: 'Rahim Osman', email: 'rahim.o@primesupermarket.sg', role: 'Driver', company: 'Prime Supermarket', status: 'Active', created: '12 Mar 2023' },
    { name: 'Kok Wai Lim', email: 'kokwai.l@primesupermarket.sg', role: 'Driver', company: 'Prime Supermarket', status: 'Active', created: '04 Jul 2023' },
    { name: 'Siti Nurhaliza', email: 'siti.n@primesupermarket.sg', role: 'Driver', company: 'Prime Supermarket', status: 'Active', created: '21 Nov 2022' },
    { name: 'Prakash Menon', email: 'prakash.m@primesupermarket.sg', role: 'Driver', company: 'Prime Supermarket', status: 'Active', created: '09 Feb 2024' },
    { name: 'Aisyah Rahman', email: 'aisyah.r@primefresh.sg', role: 'Driver', company: 'Prime Fresh', status: 'Active', created: '30 Aug 2023' },
    { name: 'Daniel Tan', email: 'daniel.t@primesupermarket.sg', role: 'Driver', company: 'Prime Supermarket', status: 'Active', created: '17 Jan 2022' },
    { name: 'Grace Wong', email: 'grace.w@primefresh.sg', role: 'Admin', company: 'Prime Fresh', status: 'Active', created: '26 May 2023' },
    { name: 'Hafiz Yusof', email: 'hafiz.y@islandcold.sg', role: 'Driver', company: 'Island Cold Chain', status: 'Suspended', created: '11 Apr 2024' },
    { name: 'Benjamin Chia', email: 'ben.chia@islandcold.sg', role: 'Ops Manager', company: 'Island Cold Chain', status: 'Active', created: '19 Sep 2023' }
  ];

  var roles = [
    { name: 'Super Admin', type: 'System', company: 'All companies', users: 1, note: 'Every portal, every company, can switch context' },
    { name: 'Admin', type: 'System', company: 'Per company', users: 2, note: 'Full access inside one company' },
    { name: 'Ops Manager', type: 'Custom', company: 'Prime Supermarket', users: 2, note: 'Orders, trips and incidents, no user management' },
    { name: 'Driver', type: 'System', company: 'Per company', users: 7, note: 'Mobile app and own deliveries only' },
    { name: 'Outlet Receiver', type: 'Custom', company: 'Prime Supermarket', users: 0, note: 'Confirms what arrived at one outlet' },
    { name: 'Finance Viewer', type: 'Custom', company: 'All companies', users: 0, note: 'Read only on pricing and commission reports' }
  ];

  var incidents = [
    { id: 'INC-2291', status: 'Pending', type: 'Breakdown', plate: 'XF 6638 H', driver: 'Arun Raj', raised: 'Today 08:42', where: 'PIE towards Tuas, exit 32', note: 'Warning light, pulled over on the shoulder. Recovery called.', stop: 'Jurong West St 52', orders: 2, outcome: 'Reassigned to GBF 4409 N', arrived: 'Pending' },
    { id: 'INC-2290', status: 'In Progress', type: 'SOS', plate: 'GBD 2290 R', driver: 'Prakash Menon', raised: 'Today 08:05', where: 'Woodlands Dr 50 loading bay', note: 'Driver pressed SOS. Admin on the phone, no injuries, blocked bay.', stop: 'Woodlands Dr 50', orders: 1, outcome: 'Waiting on outlet', arrived: 'Pending' },
    { id: 'INC-2288', status: 'Completed', type: 'Short delivery', plate: 'GBA 4821 X', driver: 'Rahim Osman', raised: 'Today 07:58', where: 'Queenstown Blk 52', note: 'Two cases of chilled short against the manifest, outlet signed for 16 of 18.', stop: 'Queenstown Blk 52', orders: 1, outcome: 'Credit note raised', arrived: '07:58' },
    { id: 'INC-2287', status: 'Completed', type: 'Access blocked', plate: 'GBA 6610 M', driver: 'Aisyah Rahman', raised: 'Yesterday 15:22', where: 'Geylang Serai', note: 'Loading bay taken by a third party truck for 40 minutes.', stop: 'Geylang Serai', orders: 3, outcome: 'Delivered late', arrived: '16:02' },
    { id: 'INC-2284', status: 'Completed', type: 'Damage', plate: 'YN 5512 J', driver: 'Daniel Tan', raised: 'Yesterday 11:07', where: 'Hillview Ave', note: 'Pallet wrap failed on a corner, one case of dry goods crushed.', stop: 'Hillview Ave', orders: 1, outcome: 'Written off', arrived: '11:07' }
  ];

  // Today, still running.
  var live = [
    {
      plate: 'GBA 4821 X', driver: 'Rahim Osman', trip: 'TR-4417', done: 4, total: 7, at: [1.3521, 103.8298],
      stops: ['Distribution Centre, Pandan Loop', 'Clementi Ave 3', 'Queenstown Blk 52', 'Tiong Bahru Plaza', 'Toa Payoh Lor 4', 'Ang Mo Kio Ave 10', 'Yishun Ring Rd']
    },
    {
      plate: 'GBM 7734 T', driver: 'Kok Wai Lim', trip: 'TR-4418', done: 2, total: 5, at: [1.3400, 103.9200],
      stops: ['Distribution Centre, Pandan Loop', 'Bedok North St 1', 'Tampines St 81', 'Pasir Ris Dr 6', 'Simei St 3']
    },
    {
      plate: 'XE 8842 P', driver: 'Siti Nurhaliza', trip: 'TR-4419', done: 6, total: 6, at: [1.3260, 103.7600],
      stops: ['Distribution Centre, Pandan Loop', 'Jurong West St 52', 'Boon Lay Way', 'Clementi Ave 3', 'Bukit Batok St 21', 'Distribution Centre, Pandan Loop']
    },
    {
      plate: 'GBD 2290 R', driver: 'Prakash Menon', trip: 'TR-4420', done: 1, total: 6, at: [1.4100, 103.8200],
      stops: ['Distribution Centre, Pandan Loop', 'Woodlands Dr 50', 'Admiralty Link', 'Yishun Ring Rd', 'Ang Mo Kio Ave 10', 'Bishan St 22']
    },
    {
      plate: 'GBA 6610 M', driver: 'Aisyah Rahman', trip: 'TR-4421', done: 3, total: 4, at: [1.3050, 103.9000],
      stops: ['Distribution Centre, Pandan Loop', 'Geylang Serai', 'Bedok North St 1', 'Simei St 3']
    },
    {
      plate: 'YN 5512 J', driver: 'Daniel Tan', trip: 'TR-4422', done: 5, total: 7, at: [1.3800, 103.7600],
      stops: ['Distribution Centre, Pandan Loop', 'Bukit Batok St 21', 'Jurong West St 52', 'Boon Lay Way', 'Clementi Ave 3', 'Woodlands Dr 50', 'Admiralty Link']
    }
  ];

  // Yesterday, finished, with the arrival time at every stop for the playback.
  var history = [
    {
      id: 'TR-4402', plate: 'GBA 4821 X', driver: 'Rahim Osman', start: '06:48', end: '11:26',
      stops: [
        ['Distribution Centre, Pandan Loop', '06:48'], ['Clementi Ave 3', '07:14'],
        ['Queenstown Blk 52', '07:58'], ['Tiong Bahru Plaza', '08:36'],
        ['Toa Payoh Lor 4', '09:29'], ['Ang Mo Kio Ave 10', '10:22'], ['Yishun Ring Rd', '11:26']
      ]
    },
    {
      id: 'TR-4403', plate: 'GBM 7734 T', driver: 'Kok Wai Lim', start: '07:02', end: '10:41',
      stops: [
        ['Distribution Centre, Pandan Loop', '07:02'], ['Bedok North St 1', '08:05'],
        ['Tampines St 81', '08:47'], ['Pasir Ris Dr 6', '09:33'], ['Simei St 3', '10:41']
      ]
    },
    {
      id: 'TR-4404', plate: 'YN 5512 J', driver: 'Daniel Tan', start: '06:31', end: '12:08',
      stops: [
        ['Distribution Centre, Pandan Loop', '06:31'], ['Bukit Batok St 21', '07:10'],
        ['Jurong West St 52', '08:02'], ['Boon Lay Way', '08:55'],
        ['Clementi Ave 3', '09:44'], ['Woodlands Dr 50', '11:02'], ['Admiralty Link', '12:08']
      ]
    },
    {
      id: 'TR-4405', plate: 'GBA 6610 M', driver: 'Aisyah Rahman', start: '13:15', end: '16:02',
      stops: [
        ['Distribution Centre, Pandan Loop', '13:15'], ['Geylang Serai', '14:20'],
        ['Bedok North St 1', '15:08'], ['Simei St 3', '16:02']
      ]
    }
  ];

  var orders = [
    { id: 'PO-88214', outlet: 'Ang Mo Kio Ave 10', cases: 34, kg: 412, win: '06:00 to 09:00', company: 'Prime Supermarket' },
    { id: 'PO-88215', outlet: 'Bedok North St 1', cases: 21, kg: 268, win: '06:00 to 09:00', company: 'Prime Supermarket' },
    { id: 'PO-88216', outlet: 'Jurong West St 52', cases: 47, kg: 590, win: '07:00 to 10:00', company: 'Prime Supermarket' },
    { id: 'PO-88217', outlet: 'Tampines St 81', cases: 12, kg: 143, win: '07:00 to 10:00', company: 'Prime Supermarket' },
    { id: 'PO-88218', outlet: 'Woodlands Dr 50', cases: 38, kg: 470, win: '08:00 to 11:00', company: 'Prime Supermarket' },
    { id: 'PO-88219', outlet: 'Clementi Ave 3', cases: 29, kg: 355, win: '08:00 to 11:00', company: 'Prime Supermarket' },
    { id: 'PO-88220', outlet: 'Toa Payoh Lor 4', cases: 16, kg: 198, win: '09:00 to 12:00', company: 'Prime Supermarket' },
    { id: 'PO-88221', outlet: 'Yishun Ring Rd', cases: 25, kg: 302, win: '09:00 to 12:00', company: 'Prime Supermarket' },
    { id: 'PO-88222', outlet: 'Queenstown Blk 52', cases: 18, kg: 221, win: '06:00 to 09:00', company: 'Prime Supermarket' },
    { id: 'PO-88223', outlet: 'Tiong Bahru Plaza', cases: 24, kg: 290, win: '06:00 to 09:00', company: 'Prime Supermarket' },
    { id: 'PO-88224', outlet: 'Boon Lay Way', cases: 31, kg: 388, win: '10:00 to 13:00', company: 'Prime Fresh' },
    { id: 'PO-88225', outlet: 'Pasir Ris Dr 6', cases: 14, kg: 176, win: '10:00 to 13:00', company: 'Prime Fresh' }
  ];

  function outlet(name) {
    for (var i = 0; i < outlets.length; i++) {
      if (outlets[i].name === name) return outlets[i];
    }
    return null;
  }

  function coords(names) {
    return names.map(function (n) {
      var o = outlet(n);
      return [o.lat, o.lng];
    });
  }

  return {
    companies: companies, outlets: outlets, vehicles: vehicles, users: users,
    roles: roles, incidents: incidents, live: live, history: history, orders: orders,
    outlet: outlet, coords: coords
  };
}());
