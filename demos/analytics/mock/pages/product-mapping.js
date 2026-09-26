// product-mapping.php: the success message PHP printed after a mapping post.
(function () {
  'use strict';
  var msg = PM.get('mapping_success', '');
  PM.alert = function () {
    if (!msg) return '';
    return '<div class="alert alert-success alert-dismissible fade show" role="alert"><span class="alert-icon"><i class="fas fa-check-circle"></i></span>' +
      '<span class="alert-text">' + PM.esc(msg) + '</span><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>';
  };
})();
