/*
 * "기록이 완료되었습니다" dialog (node 150:636): shown when the chart
 * finishes playing on its own (js/record-motion.js's record:finished
 * event — natural completion only, not a manual reset or pause).
 *
 * Unlike the other dialogs on this page, clicking the scrim does NOT
 * close this one — acknowledging it is only possible via the button.
 */
(function () {
  var scrim = document.getElementById('completeScrim');
  var dialog = document.getElementById('completeDialog');
  var goBtn = document.getElementById('completeGoBtn');
  if (!scrim || !dialog || !goBtn) return;

  function open() {
    scrim.classList.add('is-open');
    dialog.classList.add('is-open');
  }

  function close() {
    scrim.classList.remove('is-open');
    dialog.classList.remove('is-open');
  }

  document.addEventListener('record:finished', open);

  goBtn.addEventListener('click', function () {
    close();
    window.location.href = 'today.html';
  });
})();
