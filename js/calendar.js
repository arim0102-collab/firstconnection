(function () {
  var scroller = document.getElementById('monthScroll');
  var fixedMonth = document.querySelector('.month-list li[data-month="October"]');
  if (!scroller || !fixedMonth) return;

  // Starting position: October centered in the picker. Nothing pulls the
  // list back there afterward — October just stays colored (see
  // .month-list-item--current in css/calendar.css) wherever it scrolls to.
  fixedMonth.scrollIntoView({ block: 'center' });

  // overflow-y:hidden on .month-scroll blocks wheel/scrollbar scrolling
  // entirely (and hides the scrollbar) — drag the list with the pointer
  // instead; see js/today.js for the same pattern.
  var dragging = false;
  var startY = 0;
  var startScrollTop = 0;

  function currentScale() {
    var screen = document.querySelector('.screen');
    return screen ? screen.getBoundingClientRect().width / 1920 : 1;
  }

  scroller.addEventListener('pointerdown', function (e) {
    dragging = true;
    startY = e.clientY;
    startScrollTop = scroller.scrollTop;
    scroller.classList.add('is-dragging');
    scroller.setPointerCapture(e.pointerId);
  });

  scroller.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var deltaViewport = e.clientY - startY;
    scroller.scrollTop = startScrollTop - deltaViewport / currentScale();
  });

  ['pointerup', 'pointercancel'].forEach(function (evt) {
    scroller.addEventListener(evt, function () {
      dragging = false;
      scroller.classList.remove('is-dragging');
    });
  });
})();
