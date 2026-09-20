/**
 * One set of numbers behind every screen in this walkthrough, shaped the way the
 * real portal's tables are: companies carry an order_source, vehicles carry the
 * integer status the app stores (1 idle, 2 in transit, 3 unavailable), roles are
 * the per-company snake_case names, and transfer orders carry the IPS platform
 * and formatted id. Made up, but consistent, and the same truck on every page.
 */

'use strict';

var DATA = (function () {

  // The two companies the portal actually runs: PSM pulls transfer orders live
  // from IPS, Prime Online uploads a spreadsheet of home deliveries.
  var companies = [
    {
      id: 1, name: 'PSM Logistics', code: 'PSM', source: 'ips',
      sourceLabel: 'Transfer orders from IPS',
      sourceNote: 'DC60 and DC125 outlet deliveries, pulled live.'
    },
    {
      id: 2, name: 'Prime Online', code: 'POL', source: 'excel',
      sourceLabel: 'Imported from a spreadsheet',
      sourceNote: 'Home deliveries, uploaded as an Excel or CSV sheet.'
    }
  ];

  // Warehouses are the "Starts at" depots. outlet_code holds the warehouse code,
  // which the board maps to the order platform (DC125 is DEFU in IPS).
  var warehouses = [
    { name: 'Joo Koon Warehouse', code: 'DC60', key: 'DC60', address: 'Joo Koon, Singapore', lat: 1.3266, lng: 103.6781, company: 'PSM Logistics' },
    { name: 'Defu Warehouse', code: 'DC125', key: 'DEFU', address: 'Defu, Singapore', lat: 1.3612, lng: 103.8998, company: 'PSM Logistics' }
  ];

  var outlets = [
    { name: 'Clementi Ave 3', code: 'CLE443', address: 'Blk 443 Clementi Ave 3, 120443', lat: 1.3150, lng: 103.7650, company: 'PSM Logistics' },
    { name: 'Jurong West St 52', code: 'JRW505', address: 'Blk 505 Jurong West St 52, 640505', lat: 1.3480, lng: 103.7200, company: 'PSM Logistics' },
    { name: 'Boon Lay Way', code: 'BNL221', address: '221 Boon Lay Way, 649847', lat: 1.3380, lng: 103.7060, company: 'PSM Logistics' },
    { name: 'Bukit Batok St 21', code: 'BKB210', address: 'Blk 210 Bukit Batok St 21, 650210', lat: 1.3480, lng: 103.7500, company: 'PSM Logistics' },
    { name: 'Queenstown Blk 52', code: 'QTN052', address: 'Blk 52 Stirling Rd, 141052', lat: 1.2950, lng: 103.8060, company: 'PSM Logistics' },
    { name: 'Tiong Bahru Plaza', code: 'TBH302', address: '302 Tiong Bahru Rd, 168732', lat: 1.2860, lng: 103.8270, company: 'PSM Logistics' },
    { name: 'Toa Payoh Lor 4', code: 'TPY079', address: 'Blk 79 Lor 4 Toa Payoh, 310079', lat: 1.3350, lng: 103.8500, company: 'PSM Logistics' },
    { name: 'Bishan St 13', code: 'BSN511', address: 'Blk 511 Bishan St 13, 570511', lat: 1.3560, lng: 103.8480, company: 'PSM Logistics' },
    { name: 'Ang Mo Kio Ave 10', code: 'AMK452', address: 'Blk 452 Ang Mo Kio Ave 10, 560452', lat: 1.3691, lng: 103.8454, company: 'PSM Logistics' },
    { name: 'Yishun Ring Rd', code: 'YSH846', address: 'Blk 846 Yishun Ring Rd, 760846', lat: 1.4290, lng: 103.8350, company: 'PSM Logistics' },
    { name: 'Woodlands Dr 62', code: 'WDL682', address: 'Blk 682 Woodlands Dr 62, 730682', lat: 1.4360, lng: 103.8000, company: 'PSM Logistics' },
    { name: 'Admiralty Dr', code: 'ADM465', address: 'Blk 465 Admiralty Dr, 750465', lat: 1.4560, lng: 103.8180, company: 'PSM Logistics' },
    { name: 'Bedok North St 4', code: 'BDK087', address: 'Blk 87 Bedok North St 4, 460087', lat: 1.3300, lng: 103.9370, company: 'PSM Logistics' },
    { name: 'Tampines St 81', code: 'TMP826', address: 'Blk 826 Tampines St 81, 520826', lat: 1.3496, lng: 103.9390, company: 'PSM Logistics' },
    { name: 'Pasir Ris Dr 6', code: 'PSR416', address: 'Blk 416 Pasir Ris Dr 6, 510416', lat: 1.3720, lng: 103.9490, company: 'PSM Logistics' },
    { name: 'Simei St 3', code: 'SME248', address: 'Blk 248 Simei St 3, 520248', lat: 1.3430, lng: 103.9530, company: 'PSM Logistics' },
    { name: 'Geylang Serai', code: 'GYL001', address: '1 Geylang Serai, 402001', lat: 1.3160, lng: 103.8980, company: 'PSM Logistics' },
    { name: 'Hougang Ave 8', code: 'HGN682', address: 'Blk 682 Hougang Ave 8, 530682', lat: 1.3740, lng: 103.8890, company: 'PSM Logistics' }
  ];

  // Everywhere a truck can stop: the depots plus the outlets.
  var places = warehouses.concat(outlets);

  // status: 1 idle, 2 in transit, 3 unavailable, the integers the app stores.
  var vehicles = [
    { id: 1, plate: 'PSM1001', pallets: 8, cages: 12, tonnes: 2.4, status: 2, driver: 'Rahim Osman', driverId: 11, company: 'PSM Logistics', companyId: 1, created: '12 Mar 2023' },
    { id: 2, plate: 'PSM1002', pallets: 8, cages: 12, tonnes: 2.4, status: 2, driver: 'Lim Kok Wai', driverId: 12, company: 'PSM Logistics', companyId: 1, created: '04 Jul 2023' },
    { id: 3, plate: 'PSM1003', pallets: 12, cages: 18, tonnes: 3.5, status: 2, driver: 'Siti Nurhaliza', driverId: 13, company: 'PSM Logistics', companyId: 1, created: '21 Nov 2022' },
    { id: 4, plate: 'PSM1004', pallets: 12, cages: 18, tonnes: 3.5, status: 2, driver: 'Prakash Menon', driverId: 14, company: 'PSM Logistics', companyId: 1, created: '09 Feb 2024' },
    { id: 5, plate: 'PSM1005', pallets: 6, cages: 10, tonnes: 1.7, status: 2, driver: 'Daniel Tan', driverId: 15, company: 'PSM Logistics', companyId: 1, created: '17 Jan 2022' },
    { id: 6, plate: 'PSM1006', pallets: 16, cages: 24, tonnes: 5.0, status: 2, driver: 'Ravi Kumar', driverId: 16, company: 'PSM Logistics', companyId: 1, created: '08 Nov 2023' },
    { id: 7, plate: 'PSM1007', pallets: 8, cages: 12, tonnes: 2.4, status: 1, driver: 'Jason Koh', driverId: 17, company: 'PSM Logistics', companyId: 1, created: '02 May 2023' },
    { id: 8, plate: 'PSM1008', pallets: 12, cages: 18, tonnes: 3.5, status: 1, driver: 'Arun Raj', driverId: 18, company: 'PSM Logistics', companyId: 1, created: '28 Sep 2022' },
    { id: 9, plate: 'PSM1009', pallets: 16, cages: 24, tonnes: 5.0, status: 1, driver: 'Ng Wei Sheng', driverId: 19, company: 'PSM Logistics', companyId: 1, created: '23 Oct 2021' },
    { id: 10, plate: 'PSM1010', pallets: 6, cages: 10, tonnes: 1.7, status: 1, driver: 'Chee Keong Soh', driverId: 20, company: 'PSM Logistics', companyId: 1, created: '27 Jan 2023' },
    { id: 11, plate: 'PSM1011', pallets: 8, cages: 12, tonnes: 2.4, status: 1, driver: 'Farah Idris', driverId: 21, company: 'PSM Logistics', companyId: 1, created: '15 Aug 2022' },
    { id: 12, plate: 'PSM1012', pallets: 12, cages: 18, tonnes: 3.5, status: 3, driver: null, driverId: null, company: 'PSM Logistics', companyId: 1, created: '19 Jul 2022' },
    { id: 13, plate: 'POL2001', pallets: 4, cages: 8, tonnes: 1.2, status: 2, driver: 'Aisyah Rahman', driverId: 22, company: 'Prime Online', companyId: 2, created: '30 Aug 2023' },
    { id: 14, plate: 'POL2002', pallets: 4, cages: 8, tonnes: 1.2, status: 1, driver: 'Chua Mei Ling', driverId: 23, company: 'Prime Online', companyId: 2, created: '14 Jun 2023' },
    { id: 15, plate: 'POL2003', pallets: 6, cages: 10, tonnes: 1.7, status: 1, driver: 'Nurul Huda', driverId: 24, company: 'Prime Online', companyId: 2, created: '06 Dec 2023' },
    { id: 16, plate: 'POL2004', pallets: 4, cages: 8, tonnes: 1.2, status: 3, driver: null, driverId: null, company: 'Prime Online', companyId: 2, created: '05 Mar 2024' }
  ];

  // role_name is what the portal stores; kind is the permission family every
  // check keys off. psm_admin / psm_driver are created when a company is added.
  var roles = [
    { id: 1, name: 'super_admin', kind: 'super_admin', company: null, users: 1, builtin: true },
    { id: 2, name: 'psm_admin', kind: 'admin', company: 'PSM Logistics', users: 3, builtin: false },
    { id: 3, name: 'psm_driver', kind: 'driver', company: 'PSM Logistics', users: 11, builtin: false },
    { id: 4, name: 'pol_admin', kind: 'admin', company: 'Prime Online', users: 2, builtin: false },
    { id: 5, name: 'pol_driver', kind: 'driver', company: 'Prime Online', users: 3, builtin: false },
    { id: 6, name: 'psm_dispatch', kind: 'admin', company: 'PSM Logistics', users: 0, builtin: false }
  ];

  var users = [
    { id: 1, name: 'Maram Aashna', email: 'maram@psmlogistics.sg', role: 'super_admin', kind: 'super_admin', company: null, active: 1, created: '08 Jan 2024' },
    { id: 2, name: 'Lena Fong', email: 'lena.fong@psmlogistics.sg', role: 'psm_admin', kind: 'admin', company: 'PSM Logistics', active: 1, created: '14 Feb 2023' },
    { id: 3, name: 'Marcus Teo', email: 'marcus.teo@psmlogistics.sg', role: 'psm_admin', kind: 'admin', company: 'PSM Logistics', active: 1, created: '03 Apr 2023' },
    { id: 4, name: 'Serene Goh', email: 'serene.goh@psmlogistics.sg', role: 'psm_admin', kind: 'admin', company: 'PSM Logistics', active: 0, created: '22 Jun 2023' },
    { id: 5, name: 'Grace Wong', email: 'grace.wong@primeonline.sg', role: 'pol_admin', kind: 'admin', company: 'Prime Online', active: 1, created: '26 May 2023' },
    { id: 6, name: 'Benjamin Chia', email: 'ben.chia@primeonline.sg', role: 'pol_admin', kind: 'admin', company: 'Prime Online', active: 1, created: '19 Sep 2023' },
    { id: 11, name: 'Rahim Osman', email: 'rahim.o@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '12 Mar 2023' },
    { id: 12, name: 'Lim Kok Wai', email: 'kokwai.l@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '04 Jul 2023' },
    { id: 13, name: 'Siti Nurhaliza', email: 'siti.n@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '21 Nov 2022' },
    { id: 14, name: 'Prakash Menon', email: 'prakash.m@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '09 Feb 2024' },
    { id: 15, name: 'Daniel Tan', email: 'daniel.t@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '17 Jan 2022' },
    { id: 16, name: 'Ravi Kumar', email: 'ravi.k@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '08 Nov 2023' },
    { id: 17, name: 'Jason Koh', email: 'jason.k@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '02 May 2023' },
    { id: 18, name: 'Arun Raj', email: 'arun.r@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '28 Sep 2022' },
    { id: 19, name: 'Ng Wei Sheng', email: 'weisheng.n@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '23 Oct 2021' },
    { id: 20, name: 'Chee Keong Soh', email: 'cheekeong.s@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '27 Jan 2023' },
    { id: 21, name: 'Farah Idris', email: 'farah.i@psmlogistics.sg', role: 'psm_driver', kind: 'driver', company: 'PSM Logistics', active: 1, created: '15 Aug 2022' },
    { id: 22, name: 'Aisyah Rahman', email: 'aisyah.r@primeonline.sg', role: 'pol_driver', kind: 'driver', company: 'Prime Online', active: 1, created: '30 Aug 2023' },
    { id: 23, name: 'Chua Mei Ling', email: 'meiling.c@primeonline.sg', role: 'pol_driver', kind: 'driver', company: 'Prime Online', active: 1, created: '14 Jun 2023' },
    { id: 24, name: 'Nurul Huda', email: 'nurul.h@primeonline.sg', role: 'pol_driver', kind: 'driver', company: 'Prime Online', active: 1, created: '06 Dec 2023' }
  ];

  // Driver-raised SOS and breakdown reports. type and status are the portal's own
  // vocabulary: breakdown / accident / medical / other, then open, acknowledged,
  // reassigned, resolved.
  // Driver-raised SOS and breakdown reports. type and status are the portal's own
  // vocabulary: breakdown / accident / medical / other, then open, acknowledged,
  // reassigned, resolved. Stop outcomes are the ones the incident post-mortem
  // classifies: delivered before the breakdown, delivered by the rescue truck,
  // still with the rescue truck, never reassigned, stranded.
  var incidents = [
    {
      id: 2291, type: 'breakdown', status: 'open', plate: 'PSM1012', driver: 'Arun Raj',
      raisedMins: 34, lat: 1.33920, lng: 103.69740,
      address: 'PIE towards Tuas, after exit 32, Singapore',
      note: 'Engine warning light, pulled onto the shoulder. Recovery called.',
      routeId: 4417,
      ackSecs: null, reassignSecs: null, resolveSecs: null, lastDropSecs: null,
      stops: [
        { name: 'Queenstown Blk 52', code: 'QTN052', orders: [{ ref: 'DC-TO000799', pallets: 3, at: '07:41' }], outcome: 'delivered_before', arrived: '07:41' },
        { name: 'Jurong West St 52', code: 'JRW505', orders: [{ ref: 'DC-TO000803', pallets: 5 }], outcome: 'not_reassigned', arrived: null },
        { name: 'Boon Lay Way', code: 'BNL221', orders: [{ ref: 'DC-TO000807', pallets: 2 }], outcome: 'not_reassigned', arrived: null },
        { name: 'Bukit Batok St 21', code: 'BKB210', orders: [{ ref: 'DF-TO000322', pallets: 4 }], outcome: 'not_reassigned', arrived: null }
      ]
    },
    {
      id: 2290, type: 'accident', status: 'acknowledged', plate: 'PSM1004', driver: 'Prakash Menon',
      raisedMins: 71, lat: 1.43602, lng: 103.80014,
      address: 'Blk 682 Woodlands Dr 62, Singapore 730682',
      note: 'Clipped a bollard reversing into the bay. No injuries, tailgate dented.',
      routeId: 4420, ackBy: 'Lena Fong',
      ackSecs: 420, reassignSecs: null, resolveSecs: null, lastDropSecs: null,
      stops: [
        { name: 'Woodlands Dr 62', code: 'WDL682', orders: [{ ref: 'DC-TO000791', pallets: 4, at: '08:14' }], outcome: 'delivered_before', arrived: '08:14' },
        { name: 'Admiralty Dr', code: 'ADM465', orders: [{ ref: 'DC-TO000794', pallets: 3 }], outcome: 'not_reassigned', arrived: null },
        { name: 'Yishun Ring Rd', code: 'YSH846', orders: [{ ref: 'DC-TO000796', pallets: 3 }], outcome: 'not_reassigned', arrived: null },
        { name: 'Ang Mo Kio Ave 10', code: 'AMK452', orders: [{ ref: 'DF-TO000325', pallets: 2 }], outcome: 'not_reassigned', arrived: null },
        { name: 'Bishan St 13', code: 'BSN511', orders: [{ ref: 'DC-TO000798', pallets: 2 }], outcome: 'not_reassigned', arrived: null }
      ]
    },
    {
      id: 2288, type: 'breakdown', status: 'reassigned', plate: 'PSM1010', driver: 'Chee Keong Soh',
      raisedMins: 148, lat: 1.29503, lng: 103.80612,
      address: 'Blk 52 Stirling Rd, Singapore 141052',
      note: 'Tail lift jammed half down, cannot unload the cages.',
      routeId: 4412, ackBy: 'Marcus Teo',
      newRouteId: 4423, newPlate: 'PSM1009', newDriver: 'Ng Wei Sheng', newStatus: 'in progress',
      rescueStart: '09:05', rescueEnd: null,
      ackSecs: 240, reassignSecs: 1380, resolveSecs: null, lastDropSecs: 5760, rescueDriveSecs: 3900,
      stops: [
        { name: 'Queenstown Blk 52', code: 'QTN052', orders: [{ ref: 'DC-TO000772', pallets: 3, at: '07:58' }], outcome: 'delivered_before', arrived: '07:58' },
        { name: 'Tiong Bahru Plaza', code: 'TBH302', orders: [{ ref: 'DC-TO000775', pallets: 2, at: '09:26' }], outcome: 'delivered_by_rescue', arrived: '09:26' },
        { name: 'Toa Payoh Lor 4', code: 'TPY079', orders: [{ ref: 'DC-TO000778', pallets: 3 }], outcome: 'rescue_pending', arrived: null }
      ]
    },
    {
      id: 2287, type: 'other', status: 'resolved', plate: 'POL2001', driver: 'Aisyah Rahman',
      raisedMins: 1140, lat: 1.31604, lng: 103.89802,
      address: '1 Geylang Serai, Singapore 402001',
      note: 'Loading bay taken by a third party truck for 40 minutes.',
      routeId: 4405, ackBy: 'Grace Wong', resolvedBy: 'Grace Wong',
      resolution: 'Bay cleared, run finished 38 minutes late. No reassignment needed.',
      ackSecs: 180, reassignSecs: null, resolveSecs: 3060, lastDropSecs: 2820,
      stops: [
        { name: 'Geylang Serai', code: 'GYL001', orders: [{ ref: 'POL-20260919-0042', pallets: 1, at: '16:02' }], outcome: 'delivered_before', arrived: '16:02' }
      ]
    },
    {
      id: 2284, type: 'medical', status: 'resolved', plate: 'PSM1005', driver: 'Daniel Tan',
      raisedMins: 1620, lat: 1.36248, lng: 103.75617,
      address: 'Hillview Ave, Singapore',
      note: 'Driver felt faint, stopped and called it in.',
      routeId: 4401, ackBy: 'Lena Fong', resolvedBy: 'Lena Fong',
      newRouteId: 4402, newPlate: 'PSM1009', newDriver: 'Ng Wei Sheng', newStatus: 'completed',
      rescueStart: '10:20', rescueEnd: '11:44',
      resolution: 'Relief driver sent out, remaining stops completed by PSM1009.',
      ackSecs: 120, reassignSecs: 900, resolveSecs: 7200, lastDropSecs: 6240, rescueDriveSecs: 5040,
      stops: [
        { name: 'Bukit Batok St 21', code: 'BKB210', orders: [{ ref: 'DC-TO000751', pallets: 4, at: '11:44' }], outcome: 'delivered_by_rescue', arrived: '11:44' },
        { name: 'Jurong West St 52', code: 'JRW505', orders: [{ ref: 'DC-TO000754', pallets: 3, at: '12:31' }], outcome: 'delivered_by_rescue', arrived: '12:31' }
      ]
    }
  ];

  // Routes running right now. next is the stop the truck is heading for.
  var live = [
    {
      id: 4417, plate: 'PSM1001', driver: 'Rahim Osman', visited: 4, depot: 'Joo Koon Warehouse',
      at: [1.3521, 103.8298], speed: 46, seenMinsAgo: 0, start: '06:48', end: '12:10',
      stops: ['Clementi Ave 3', 'Queenstown Blk 52', 'Tiong Bahru Plaza', 'Toa Payoh Lor 4', 'Ang Mo Kio Ave 10', 'Yishun Ring Rd']
    },
    {
      id: 4418, plate: 'PSM1002', driver: 'Lim Kok Wai', visited: 2, depot: 'Defu Warehouse',
      at: [1.3400, 103.9200], speed: 38, seenMinsAgo: 1, start: '07:02', end: '11:40',
      stops: ['Bedok North St 4', 'Tampines St 81', 'Pasir Ris Dr 6', 'Simei St 3', 'Hougang Ave 8']
    },
    {
      id: 4419, plate: 'PSM1003', driver: 'Siti Nurhaliza', visited: 4, depot: 'Joo Koon Warehouse',
      at: [1.3260, 103.7600], speed: 0, seenMinsAgo: 2, start: '06:31', end: '10:55',
      stops: ['Jurong West St 52', 'Boon Lay Way', 'Clementi Ave 3', 'Bukit Batok St 21']
    },
    {
      id: 4420, plate: 'PSM1004', driver: 'Prakash Menon', visited: 1, depot: 'Defu Warehouse',
      at: [1.4100, 103.8200], speed: 0, seenMinsAgo: 12, start: '07:20', end: '12:45',
      stops: ['Woodlands Dr 62', 'Admiralty Dr', 'Yishun Ring Rd', 'Ang Mo Kio Ave 10', 'Bishan St 13']
    },
    {
      id: 4422, plate: 'PSM1006', driver: 'Ravi Kumar', visited: 5, depot: 'Joo Koon Warehouse',
      at: [1.3800, 103.7600], speed: 52, seenMinsAgo: 0, start: '06:15', end: '13:05',
      stops: ['Bukit Batok St 21', 'Jurong West St 52', 'Boon Lay Way', 'Clementi Ave 3', 'Woodlands Dr 62', 'Admiralty Dr']
    },
    {
      id: 4423, plate: 'PSM1009', driver: 'Ng Wei Sheng', visited: 2, depot: 'Joo Koon Warehouse',
      at: [1.2960, 103.8180], speed: 31, seenMinsAgo: 0, start: '09:05', end: '12:30',
      rescueFor: 'PSM1010',
      stops: ['Queenstown Blk 52', 'Tiong Bahru Plaza', 'Toa Payoh Lor 4']
    },
    {
      id: 4424, plate: 'POL2001', driver: 'Aisyah Rahman', visited: 3, depot: 'Defu Warehouse',
      at: [1.3050, 103.9000], speed: 24, seenMinsAgo: 1, start: '08:10', end: '12:20',
      stops: ['Geylang Serai', 'Bedok North St 4', 'Simei St 3', 'Hougang Ave 8']
    }
  ];

  // Finished trips, with the arrival time at every stop for the playback and the
  // per-stop delivery outcome the Deliveries tab shows. status is the delivery
  // receipt vocabulary: confirmed, disputed, awaiting_confirmation, not_delivered,
  // not_reached. An issue is what the outlet reported when it disagreed with the
  // driver, which is the whole point of keeping both sides.
  var history = [
    {
      id: 4412, plate: 'PSM1010', driver: 'Chee Keong Soh', date: '19 Sep 2026', start: '06:44', end: '09:26',
      avgSpeed: 29, maxSpeed: 71, depot: 'Joo Koon Warehouse',
      stops: [
        { name: 'Queenstown Blk 52', code: 'QTN052', at: '07:58', dwell: 1140, leg: 4440,
          receipt: { by: 'Siti (outlet)', at: '08:02', note: 'All cages checked in', photos: 2 },
          orders: [{ ref: 'DC-TO000772', platform: 'DC60', shipment: 'AM', items: 14, qty: 132, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Tiong Bahru Plaza', code: 'TBH302', at: '09:26', dwell: 900, leg: 4140,
          receipt: null,
          orders: [{ ref: 'DC-TO000775', platform: 'DC60', shipment: 'AM', items: 9, qty: 88, driver: 'Not delivered', status: 'not_delivered', issueNote: 'Tail lift jammed, handed to PSM1009' }] }
      ]
    },
    {
      id: 4405, plate: 'POL2001', driver: 'Aisyah Rahman', date: '19 Sep 2026', start: '13:15', end: '16:02',
      avgSpeed: 26, maxSpeed: 64, depot: 'Defu Warehouse',
      stops: [
        { name: 'Geylang Serai', code: 'GYL001', at: '14:20', dwell: 1500, leg: 2400,
          receipt: { by: 'Customer', at: '14:24', note: '', photos: 1 },
          orders: [{ ref: 'POL-20260919-0042', platform: 'POL', items: 6, qty: 18, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Bedok North St 4', code: 'BDK087', at: '15:08', dwell: 780, leg: 2100,
          receipt: { by: 'Customer', at: '15:11', note: '', photos: 1 },
          orders: [{ ref: 'POL-20260919-0043', platform: 'POL', items: 4, qty: 11, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Simei St 3', code: 'SME248', at: '16:02', dwell: 660, leg: 2580,
          receipt: { by: 'Customer', at: '16:09', note: 'Two chilled bags never came out of the van', photos: 3 },
          orders: [{ ref: 'POL-20260919-0047', platform: 'POL', items: 8, qty: 26, driver: 'Delivered', status: 'disputed', issueType: 'missing', issueQty: 2, issueNote: 'Two chilled bags missing' }] }
      ]
    },
    {
      id: 4401, plate: 'PSM1005', driver: 'Daniel Tan', date: '19 Sep 2026', start: '06:31', end: '12:08',
      avgSpeed: 33, maxSpeed: 78, depot: 'Joo Koon Warehouse',
      stops: [
        { name: 'Bukit Batok St 21', code: 'BKB210', at: '07:10', dwell: 1320, leg: 2340,
          receipt: { by: 'Rosli (outlet)', at: '07:15', note: '', photos: 1 },
          orders: [{ ref: 'DC-TO000751', platform: 'DC60', shipment: 'AM', items: 21, qty: 204, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Jurong West St 52', code: 'JRW505', at: '08:02', dwell: 1560, leg: 1800,
          receipt: { by: 'Kamala (outlet)', at: '08:08', note: '', photos: 2 },
          orders: [{ ref: 'DC-TO000754', platform: 'DC60', shipment: 'AM', items: 18, qty: 176, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Boon Lay Way', code: 'BNL221', at: '08:55', dwell: 1140, leg: 2040,
          receipt: { by: 'Jeremy (outlet)', at: '08:59', note: '', photos: 1 },
          orders: [{ ref: 'DF-TO000301', platform: 'DEFU', shipment: 'AM', items: 11, qty: 64, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Clementi Ave 3', code: 'CLE443', at: '09:44', dwell: 1020, leg: 1920,
          receipt: null,
          orders: [{ ref: 'DC-TO000758', platform: 'DC60', shipment: 'PM', items: 16, qty: 143, driver: 'Delivered', status: 'awaiting_confirmation' }] },
        { name: 'Woodlands Dr 62', code: 'WDL682', at: '11:02', dwell: 1380, leg: 3480,
          receipt: { by: 'Faizal (outlet)', at: '11:09', note: '', photos: 2 },
          orders: [{ ref: 'DC-TO000762', platform: 'DC60', shipment: 'PM', items: 24, qty: 231, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Admiralty Dr', code: 'ADM465', at: '12:08', dwell: 900, leg: 2580,
          receipt: { by: 'Wati (outlet)', at: '12:12', note: '', photos: 1 },
          orders: [{ ref: 'DF-TO000305', platform: 'DEFU', shipment: 'PM', items: 7, qty: 42, driver: 'Delivered', status: 'confirmed' }] }
      ]
    },
    {
      id: 4398, plate: 'PSM1002', driver: 'Lim Kok Wai', date: '18 Sep 2026', start: '07:02', end: '10:41',
      avgSpeed: 31, maxSpeed: 69, depot: 'Defu Warehouse',
      stops: [
        { name: 'Bedok North St 4', code: 'BDK087', at: '08:05', dwell: 1260, leg: 2520,
          receipt: { by: 'Hakim (outlet)', at: '08:10', note: '', photos: 1 },
          orders: [{ ref: 'DF-TO000288', platform: 'DEFU', shipment: 'AM', items: 13, qty: 97, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Tampines St 81', code: 'TMP826', at: '08:47', dwell: 1080, leg: 1440,
          receipt: { by: 'Angela (outlet)', at: '08:52', note: '', photos: 1 },
          orders: [{ ref: 'DF-TO000291', platform: 'DEFU', shipment: 'AM', items: 10, qty: 71, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Pasir Ris Dr 6', code: 'PSR416', at: '09:33', dwell: 960, leg: 1800,
          receipt: { by: 'Sandra (outlet)', at: '09:41', note: 'Counted twice, still two cases short', photos: 3 },
          orders: [{ ref: 'DC-TO000744', platform: 'DC60', shipment: 'AM', items: 19, qty: 168, driver: 'Delivered', status: 'disputed', issueType: 'short_qty', issueQty: 2, issueNote: 'Outlet counted 2 cases short' }] },
        { name: 'Simei St 3', code: 'SME248', at: '10:41', dwell: 840, leg: 3120,
          receipt: { by: 'Terence (outlet)', at: '10:45', note: '', photos: 1 },
          orders: [{ ref: 'DC-TO000747', platform: 'DC60', shipment: 'PM', items: 12, qty: 105, driver: 'Delivered', status: 'confirmed' }] }
      ]
    },
    {
      id: 4396, plate: 'PSM1006', driver: 'Ravi Kumar', date: '18 Sep 2026', start: '06:15', end: '11:58',
      avgSpeed: 35, maxSpeed: 82, depot: 'Joo Koon Warehouse',
      stops: [
        { name: 'Ang Mo Kio Ave 10', code: 'AMK452', at: '07:36', dwell: 1440, leg: 3360,
          receipt: { by: 'Mei Yee (outlet)', at: '07:42', note: '', photos: 2 },
          orders: [{ ref: 'DC-TO000731', platform: 'DC60', shipment: 'AM', items: 27, qty: 288, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Bishan St 13', code: 'BSN511', at: '08:41', dwell: 1200, leg: 2460,
          receipt: { by: 'Raj (outlet)', at: '08:47', note: '', photos: 1 },
          orders: [{ ref: 'DC-TO000734', platform: 'DC60', shipment: 'AM', items: 15, qty: 122, driver: 'Delivered', status: 'confirmed' }] },
        { name: 'Toa Payoh Lor 4', code: 'TPY079', at: '09:52', dwell: 1320, leg: 2940,
          receipt: { by: 'Lin (outlet)', at: '09:58', note: 'One tray of eggs cracked', photos: 2 },
          orders: [{ ref: 'DF-TO000279', platform: 'DEFU', shipment: 'AM', items: 8, qty: 55, driver: 'Delivered', status: 'disputed', issueType: 'damaged', issueQty: 1, issueNote: 'One tray of eggs cracked in transit' }] },
        { name: 'Yishun Ring Rd', code: 'YSH846', at: null, dwell: null, leg: 6180,
          receipt: null,
          orders: [{ ref: 'DC-TO000739', platform: 'DC60', shipment: 'PM', items: 22, qty: 197, driver: 'Not delivered', status: 'not_reached', issueNote: 'Outlet closed the bay, redelivery booked' }] }
      ]
    }
  ];

  // Transfer orders pulled from IPS for a delivery date. estPallets is what the
  // board seeds the pallet box with; pltSrc says whether IPS gave a packed count
  // or the board estimated it from the quantity.
  var transferOrders = [
    { ref: 'DC-TO000812', platform: 'DC60', shipment: 'AM', outlet: 'Ang Mo Kio Ave 10', code: 'AMK452', items: 27, qty: 288, estPallets: 4, pltSrc: 'ips' },
    { ref: 'DC-TO000813', platform: 'DC60', shipment: 'AM', outlet: 'Bedok North St 4', code: 'BDK087', items: 18, qty: 176, estPallets: 3, pltSrc: 'ips' },
    { ref: 'DC-TO000814', platform: 'DC60', shipment: 'AM', outlet: 'Jurong West St 52', code: 'JRW505', items: 31, qty: 342, estPallets: 5, pltSrc: 'ips' },
    { ref: 'DF-TO000330', platform: 'DEFU', shipment: 'AM', outlet: 'Tampines St 81', code: 'TMP826', items: 9, qty: 63, estPallets: 2, pltSrc: 'est' },
    { ref: 'DC-TO000815', platform: 'DC60', shipment: 'AM', outlet: 'Woodlands Dr 62', code: 'WDL682', items: 24, qty: 231, estPallets: 4, pltSrc: 'ips' },
    { ref: 'DF-TO000331', platform: 'DEFU', shipment: 'PM', outlet: 'Clementi Ave 3', code: 'CLE443', items: 12, qty: 84, estPallets: 2, pltSrc: 'ips' },
    { ref: 'DC-TO000816', platform: 'DC60', shipment: 'PM', outlet: 'Toa Payoh Lor 4', code: 'TPY079', items: 16, qty: 143, estPallets: 3, pltSrc: 'est' },
    { ref: 'DC-TO000817', platform: 'DC60', shipment: 'PM', outlet: 'Yishun Ring Rd', code: 'YSH846', items: 22, qty: 197, estPallets: 3, pltSrc: 'ips' },
    { ref: 'DF-TO000332', platform: 'DEFU', shipment: 'AM', outlet: 'Queenstown Blk 52', code: 'QTN052', items: 7, qty: 46, estPallets: 1, pltSrc: 'ips' },
    { ref: 'DC-TO000818', platform: 'DC60', shipment: 'PM', outlet: 'Tiong Bahru Plaza', code: 'TBH302', items: 14, qty: 121, estPallets: 2, pltSrc: 'est' },
    { ref: 'DF-TO000333', platform: 'DEFU', shipment: 'AM', outlet: 'Bishan St 13', code: 'BSN511', items: 11, qty: 78, estPallets: 2, pltSrc: 'ips' },
    { ref: 'DC-TO000819', platform: 'DC60', shipment: 'PM', outlet: 'Hougang Ave 8', code: 'HGN682', items: 19, qty: 164, estPallets: 3, pltSrc: 'ips' },
    { ref: 'DF-TO000334', platform: 'DEFU', shipment: 'PM', outlet: 'Simei St 3', code: 'SME248', items: 6, qty: 38, estPallets: 1, pltSrc: 'est' },
    { ref: 'DC-TO000820', platform: 'DC60', shipment: 'AM', outlet: 'Bukit Batok St 21', code: 'BKB210', items: 26, qty: 254, estPallets: 4, pltSrc: 'ips' }
  ];

  // Prime Online's side: home deliveries that came off an uploaded spreadsheet.
  // geo false is a row whose address the geocoder could not pin, which the board
  // refuses to dispatch until somebody fixes it.
  var polOrders = [
    { ref: 'POL-20260920-0051', customer: 'Tan Wei Ming', address: 'Blk 214 Bishan St 23, #08-142', postal: '570214', slot: 'AM', skus: ['MLK-1L', 'EGG-30', 'RCE-5KG'], items: 3, qty: 9, pallets: 1, geo: true },
    { ref: 'POL-20260920-0052', customer: 'Nadia Ismail', address: '18 Sunset Way, #02-07', postal: '597071', slot: 'AM', skus: ['VEG-BOX', 'CHK-1KG'], items: 2, qty: 5, pallets: 1, geo: true },
    { ref: 'POL-20260920-0053', customer: 'Jonathan Lau', address: 'Blk 682 Hougang Ave 8, #11-233', postal: '530682', slot: 'PM', skus: ['MLK-1L', 'BRD-WHL', 'JUI-2L', 'SNK-MIX'], items: 4, qty: 12, pallets: 1, geo: true },
    { ref: 'POL-20260920-0054', customer: 'Priya Balan', address: 'Blk 416 Pasir Ris Dr 6, #05-88', postal: '510416', slot: 'PM', skus: ['FRZ-PACK', 'ICE-2L'], items: 2, qty: 6, pallets: 1, geo: true },
    { ref: 'POL-20260920-0055', customer: 'Goh Siew Lan', address: '7 Jalan Kelabu Asap', postal: '278201', slot: 'AM', skus: ['RCE-5KG', 'OIL-2L', 'SUG-2KG'], items: 3, qty: 7, pallets: 1, geo: true },
    { ref: 'POL-20260920-0056', customer: 'Marcus Ferreira', address: 'Blk 52 Stirling Rd, #14-311', postal: '141052', slot: 'PM', skus: ['VEG-BOX'], items: 1, qty: 2, pallets: 1, geo: true },
    { ref: 'POL-20260920-0057', customer: 'Hafizah Salleh', address: 'unit 9, lorong 3 (no block given)', postal: '', slot: 'AM', skus: ['MLK-1L', 'EGG-30'], items: 2, qty: 4, pallets: 1, geo: false },
    { ref: 'POL-20260920-0058', customer: 'Chen Yu Han', address: 'Blk 826 Tampines St 81, #03-19', postal: '520826', slot: 'PM', skus: ['CHK-1KG', 'FRZ-PACK', 'JUI-2L'], items: 3, qty: 8, pallets: 1, geo: true }
  ];

  // The sheets somebody has already put through the importer.
  var polBatches = [
    { file: 'POL_deliveries_wk38.xlsx', when: '20 Sep 2026 07:14', rows: 96, created: 96, skipped: 0 },
    { file: 'POL_deliveries_wk37.xlsx', when: '13 Sep 2026 07:22', rows: 88, created: 86, skipped: 2 }
  ];

  // Orders already committed to a truck for the same date, which the board shows
  // inside the trailer rather than back in the pool.
  var committedOrders = [
    { ref: 'DC-TO000808', platform: 'DC60', outlet: 'Pasir Ris Dr 6', code: 'PSR416', pallets: 3, vehicle: 'PSM1007', status: 'Pending' },
    { ref: 'DF-TO000328', platform: 'DEFU', outlet: 'Geylang Serai', code: 'GYL001', pallets: 2, vehicle: 'PSM1007', status: 'Pending' },
    { ref: 'DC-TO000809', platform: 'DC60', outlet: 'Boon Lay Way', code: 'BNL221', pallets: 4, vehicle: 'PSM1009', status: 'Pending' }
  ];

  // Orders locked to a truck that is already out: the board lists them but will
  // not let them move.
  var lockedOrders = [
    { ref: 'DC-TO000803', platform: 'DC60', outlet: 'Jurong West St 52', vehicle: 'PSM1012', status: 'Not delivered' },
    { ref: 'DC-TO000791', platform: 'DC60', outlet: 'Woodlands Dr 62', vehicle: 'PSM1004', status: 'Delivered' },
    { ref: 'DC-TO000794', platform: 'DC60', outlet: 'Admiralty Dr', vehicle: 'PSM1004', status: 'Pending' }
  ];

  function place(name) {
    for (var i = 0; i < places.length; i++) {
      if (places[i].name === name) return places[i];
    }
    return null;
  }

  function vehicle(plate) {
    for (var i = 0; i < vehicles.length; i++) {
      if (vehicles[i].plate === plate) return vehicles[i];
    }
    return null;
  }

  // A live route's full stop line: out of the depot, round the outlets.
  function routeLine(route) {
    return [route.depot].concat(route.stops).map(function (n) {
      var p = place(n);
      return [p.lat, p.lng];
    });
  }

  function coords(names) {
    return names.map(function (n) {
      var p = place(n);
      return [p.lat, p.lng];
    });
  }

  var statusLabel = { 1: 'Idle', 2: 'In Transit', 3: 'Unavailable' };
  var statusClass = { 1: 'idle', 2: 'in_transit', 3: 'unavailable' };

  function capacity(v) {
    var bits = [];
    if (v.pallets) bits.push(v.pallets + ' plt');
    if (v.cages) bits.push(v.cages + ' cages');
    if (v.tonnes) bits.push(v.tonnes + ' t');
    return bits.join(' · ');
  }

  // Minutes ago, printed the way the portal's relTime does it.
  function relTime(mins) {
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
    return Math.floor(mins / 1440) + 'd ago';
  }

  return {
    companies: companies, warehouses: warehouses, outlets: outlets, places: places,
    vehicles: vehicles, users: users, roles: roles, incidents: incidents,
    live: live, history: history,
    transferOrders: transferOrders, committedOrders: committedOrders, lockedOrders: lockedOrders,
    polOrders: polOrders, polBatches: polBatches,
    place: place, vehicle: vehicle, coords: coords, routeLine: routeLine,
    statusLabel: statusLabel, statusClass: statusClass, capacity: capacity, relTime: relTime
  };
}());
