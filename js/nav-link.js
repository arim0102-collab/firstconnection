(function () {
  var links = document.querySelectorAll('.nav-link[data-icon-active]');

  links.forEach(function (link) {
    var icon = link.querySelector('img');
    var defaultSrc = link.dataset.iconDefault;
    var activeSrc = link.dataset.iconActive;

    function press() {
      link.classList.add('is-pressed');
      if (icon && activeSrc) icon.src = activeSrc;
    }

    function release() {
      link.classList.remove('is-pressed');
      if (icon && defaultSrc) icon.src = defaultSrc;
    }

    link.addEventListener('pointerdown', press);
    link.addEventListener('pointerup', release);
    link.addEventListener('pointercancel', release);
    link.addEventListener('pointerleave', release);
    link.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') press();
    });
    link.addEventListener('keyup', release);
    link.addEventListener('blur', release);
  });
})();
