// index.php: welcome card, Total Users, Total Outlets and the User Log In List.
(function () {
  'use strict';
  var esc = Shell.esc;
  var db = IAM.db;

  var users = db.users.filter(function (u) { return u.status_id === 1; }).length;
  var outlets = db.outlets.filter(function (o) { return o.active === 1; }).length;

  function fmt(ts) {
    if (!ts) return 'Never';
    var p = ts.split(/[- :]/);
    return p[2] + '-' + p[1] + '-' + p[0] + ' ' + p[3] + ':' + p[4] + ':' + p[5];
  }

  // ORDER BY u.last_login DESC, u.id ASC LIMIT 5, roles joined on users.role_id.
  var list = db.users.filter(function (u) { return !u.deleted_by; }).slice().sort(function (a, b) {
    if ((a.last_login || '') !== (b.last_login || '')) return (b.last_login || '') < (a.last_login || '') ? -1 : 1;
    return a.id - b.id;
  }).slice(0, 5);

  var rows = list.map(function (u) {
    var role = IAM.find('roles', u.role_id);
    return '<tr>' +
      '<td><div class="d-flex px-2 py-1"><div class="d-flex flex-column justify-content-center"><h6 class="mb-0 text-sm">#' + u.id + '</h6></div></div></td>' +
      '<td><p class="text-xs font-weight-bold mb-0">' + esc(u.name) + '</p></td>' +
      '<td><p class="text-xs font-weight-bold mb-0">' + esc(role ? role.name : 'None') + '</p></td>' +
      '<td><p class="text-xs font-weight-bold mb-0">' + fmt(u.last_login) + '</p></td>' +
      '</tr>';
  }).join('');

  var store = '<svg id="Online_Store_24" width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<g transform="matrix(1 0 0 1 12 12)"><path fill="#ffffffcc" transform="translate(-12, -12)" d="M 5 3 C 4.448 3 4 3.448 4 4 L 4 7 L 2 12 L 2 14 L 3 14 L 3 21 L 13 21 L 13 14 L 19 14 L 19 21 L 21 21 L 21 14 L 22 14 L 22 12 L 20 7 L 20 4 C 20 3.448 19.552 3 19 3 L 5 3 z M 7 5 C 7.552 5 8 5.448 8 6 C 8 6.552 7.552 7 7 7 C 6.448 7 6 6.552 6 6 C 6 5.448 6.448 5 7 5 z M 10 5 C 10.552 5 11 5.448 11 6 C 11 6.552 10.552 7 10 7 C 9.448 7 9 6.552 9 6 C 9 5.448 9.448 5 10 5 z M 5 14 L 11 14 L 11 19 L 5 19 L 5 14 z" /></g></svg>';

  function countCard(label, value, sub, icon) {
    return '<div class="col-xl-4 col-sm-6 mb-xl-0 mb-4"><div class="card"><div class="card-body p-3"><div class="row">' +
      '<div class="col-8"><div class="numbers"><p class="text-sm mb-0 text-uppercase font-weight-bold">' + label + '</p>' +
      '<h2 class="font-weight-bolder">' + value + '</h2><p class="text-xs mb-0">' + sub + '</p></div></div>' +
      '<div class="col-4 d-flex align-items-center justify-content-end">' + icon + '</div>' +
      '</div></div></div></div>';
  }

  Shell.render({
    footer: 'none',
    body:
      '<div class="row"><div class="col-xl-12 col-sm-12 mb-0 mb-md-3"><div class="card"><div class="card-body p-3"><div class="row"><div class="col-12"><div class="numbers">' +
      '<p class="text-sm mb-0 text-uppercase font-weight-bold">Hello <strong>' + esc(Shell.USERNAME) + '</strong>, Welcome to Admin Dashboard</p>' +
      '</div></div></div></div></div></div></div><br>' +
      '<div class="row">' +
      countCard('Total Users', users, 'Active users',
        '<div class="icon icon-shape icon-lg bg-gradient-primary shadow-primary text-center rounded-circle"><i class="fas fa-user"></i></div>') +
      countCard('Total Outlets', outlets, 'Active outlets',
        '<div class="icon icon-shape icon-lg bg-gradient-primary shadow-primary rounded-circle d-flex align-items-center justify-content-center">' + store + '</div>') +
      '<div class="row mt-5"></div>' +
      '</div>' +
      '<div class="row mt-4"><div class="col-12"><div class="card">' +
      '<div class="card-header pb-0 d-flex justify-content-between"><h6 class="mb-4">User Log In List</h6></div>' +
      '<div class="card-body px-0 pt-0 pb-2"><div class="table-responsive p-0"><table class="table align-items-center mb-0">' +
      '<thead><tr>' +
      '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">ID</th>' +
      '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Name</th>' +
      '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Role</th>' +
      '<th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Last Log In</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div></div></div></div>'
  });
})();
