// users-list.php: the analytics portal's own user table, filtered by status,
// department and account type the way the PHP query did.
(function () {
  'use strict';
  var W = World;
  var DEPTS = [[2, 'ACC'], [13, 'ADMIN'], [5, 'ANP'], [17, 'CRM'], [3, 'ITD'], [6, 'MDHQ'], [16, 'MGMT'], [4, 'OPS'], [8, 'PGI'], [1, 'PMT']];
  var r = W.rng(515), users = [{ id: 1, username: 'maram.aashna', name: 'Maram Aashna', email: 'maram.aashna@mail.com', dept: 3, outlet: '-', ms: 1, status: 1 }];
  for (var i = 2; i <= 36; i++) {
    var d = DEPTS[Math.floor(r() * DEPTS.length)];
    users.push({ id: i, username: 'guest' + (200 + i), name: 'guest' + (200 + i), email: 'guest' + (200 + i) + '@mail.com', dept: d[0],
      outlet: d[1] === 'OPS' ? W.STORES[Math.floor(r() * W.STORES.length)].code : '-', ms: r() < 0.75 ? 1 : 0, status: r() < 0.88 ? 1 : 0 });
  }
  var status = PM.get('status', '1'), dept = PM.get('department', ''), ms = PM.get('is_microsoft', '');
  var name = {}; DEPTS.forEach(function (x) { name[x[0]] = x[1]; });
  var list = users.filter(function (u) {
    if (status !== '' && String(u.status) !== status) return false;
    if (dept && String(u.dept) !== String(parseInt(dept, 10))) return false;
    if (ms !== '' && String(u.ms) !== ms) return false;
    return true;
  });
  PM.deptOptions = function () {
    return DEPTS.map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) === dept ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('');
  };
  PM.body = function () {
    return list.map(function (u) {
      return '<tr><td>' + PM.esc(u.username) + '</td><td>' + PM.esc(u.name) + '</td><td>' + PM.esc(u.email) + '</td><td>' + PM.esc(name[u.dept] || 'None') + '</td>' +
        '<td>' + u.outlet + '</td><td>' + (u.ms ? 'Microsoft' : 'Non-Microsoft') + '</td><td><span class="badge bg-' + (u.status > 0 ? 'success' : 'danger') + '">' +
        (u.status > 0 ? 'Active' : 'Inactive') + '</span></td><td><a href="edit-user.php?id=' + u.id + '" class="text-decoration-none text-primary"><i class="fas fa-edit"></i></a> | ' +
        '<a href="delete-user.php?id=' + u.id + '" class="text-decoration-none text-primary delete-user" data-id="' + u.id + '"><i class="fas fa-trash-alt"></i></a></td></tr>';
    }).join('');
  };
})();
