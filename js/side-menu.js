(function () {
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('sideMenu');
  var scrim = document.getElementById('menuScrim');
  if (!toggle || !menu || !scrim) return;

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!menu.classList.contains('is-open'));
  });

  scrim.addEventListener('click', function () {
    setOpen(false);
  });

  window.SideMenu = {
    close: function () { setOpen(false); },
    isOpen: function () { return menu.classList.contains('is-open'); }
  };
})();
