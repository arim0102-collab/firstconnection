(function () {
  var STAGE_WIDTH = 1920;
  var STAGE_HEIGHT = 1080;
  var screen = document.querySelector('.screen');
  if (!screen) return;

  function applyScale() {
    var scale = Math.min(
      window.innerWidth / STAGE_WIDTH,
      window.innerHeight / STAGE_HEIGHT
    );
    screen.style.transform = 'scale(' + scale + ')';
  }

  applyScale();
  window.addEventListener('resize', applyScale);
})();
