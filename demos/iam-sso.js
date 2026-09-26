// The IAM check every portal makes at sign in, run against the IAM demo's
// database in localStorage: find the user by username or email, check the
// password, then look for an active role on the portal asking. An account
// created and given a role in the IAM demo signs in here; one without a role
// on this portal gets IAM's own refusal.
var IAMSSO = (function () {
  'use strict';

  var KEY = 'iam-demo-db-v2';

  // A one way hash so the stored password is never the password itself.
  function hash(text) {
    var h = 0x811c9dc5;
    text = 'iam:' + text;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return '$fnv$' + ('0000000' + h.toString(16)).slice(-8);
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  // portalName is the name on the IAM portals table: 'Fish Farm', 'HQ',
  // 'Logistics', 'Analytic' or 'IAM'.
  function signIn(portalName, login, password) {
    var db = load();
    if (!db || !db.users) return { ok: false, reason: 'no-user' };
    login = String(login || '').trim().toLowerCase();
    var user = db.users.filter(function (u) {
      return !u.deleted_by && u.status_id === 1 &&
        (String(u.username).toLowerCase() === login || String(u.email || '').toLowerCase() === login);
    })[0];
    // Only accounts given a password in the IAM demo answer here; the seeded
    // rows have none, so each demo's own walkthrough accounts keep working.
    if (!user || !/^\$fnv\$/.test(user.password)) return { ok: false, reason: 'no-user' };
    if (user.password !== hash(String(password || ''))) return { ok: false, reason: 'bad-password', message: 'The password you entered was not valid.' };

    var portal = db.portals.filter(function (p) { return p.name === portalName && !p.deleted_by; })[0];
    if (!portal || portal.status_id !== 1) {
      return { ok: false, reason: 'portal', message: 'This portal is not active on IAM. Please contact your IAM administrator to make this portal active' };
    }
    var role = null;
    db.access.forEach(function (a) {
      if (role || a.user_id !== user.id || a.status_id !== 1 || a.deleted_by) return;
      var r = db.roles.filter(function (x) { return x.id === a.role_id; })[0];
      if (r && r.portal_id === portal.id && r.status_id === 1) role = r;
    });
    if (!role) {
      return { ok: false, reason: 'no-role', message: "You currently don't have any roles assigned. Please contact your IAM administrator to request a role assignment." };
    }
    var dept = db.departments.filter(function (d) { return d.id === user.department_id; })[0];
    return {
      ok: true,
      user: { id: user.id, username: user.username, email: user.email, name: user.name, department: dept ? dept.code : null },
      role: role.name
    };
  }

  return { KEY: KEY, hash: hash, signIn: signIn };
}());
