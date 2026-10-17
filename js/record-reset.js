/*
 * The circular reset button next to the play controls (node 177:193):
 * press it -> if the chart is mid-playback it's auto-paused -> a confirm
 * dialog (177:194) asks "기록을 초기화하시겠습니까?".
 *   아니오 - just closes the dialog; a video paused above stays paused,
 *            resume manually with the play button.
 *   예     - resets the chart back to before playback (record:reset, see
 *            js/record-motion.js's reset()); the next play press starts
 *            fresh from the beginning.
 * The press-state color swap (icon + border) is handled by js/nav-link.js
 * via this button's .nav-link/data-icon-* wiring.
 */
(function () {
  var btn = document.getElementById('recordResetBtn');
  var scrim = document.getElementById('resetScrim');
  var dialog = document.getElementById('resetConfirmDialog');
  var yesBtn = document.getElementById('resetYesBtn');
  var noBtn = document.getElementById('resetNoBtn');
  if (!btn || !scrim || !dialog || !yesBtn || !noBtn) return;

  function openDialog() {
    scrim.classList.add('is-open');
    dialog.classList.add('is-open');
  }

  function closeDialog() {
    scrim.classList.remove('is-open');
    dialog.classList.remove('is-open');
  }

  btn.addEventListener('click', function () {
    if (window.RecordMotion) window.RecordMotion.pauseIfPlaying();
    openDialog();
  });

  noBtn.addEventListener('click', closeDialog);
  scrim.addEventListener('click', closeDialog);

  yesBtn.addEventListener('click', function () {
    if (window.RecordMotion) window.RecordMotion.reset();
    closeDialog();
  });
})();
