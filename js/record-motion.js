(function () {
  var DURATION = 82467.344; // ms, from Figma's prototype timeline (node 150:277)
  // All visible activity (last bounce, waveform scroll) is done by ~50s;
  // the "기록이 완료되었습니다" dialog fires here instead of waiting out
  // the rest of DURATION's idle tail.
  var COMPLETE_AT_MS = 50000;

  var card = document.getElementById('recordCard');
  var playBtn = document.getElementById('recordPlayBtn');
  var waveform = document.getElementById('recordWaveform');
  var line = document.querySelector('.record-baseline--left');
  var dot = document.querySelector('.record-dot');
  var timerEl = document.querySelector('.record-timer');
  var legendNumberEls = Array.prototype.map.call(
    document.querySelectorAll('.record-legend-row'),
    function (row) { return row.querySelector('.record-legend-count span'); }
  );
  if (!card || !playBtn || !waveform || !line || !dot) return;

  // offsets are 0..1 fractions of DURATION, matching the Figma percentages
  // exactly (divided by 100). `easing` on a keyframe applies to the segment
  // from that keyframe to the next, same as CSS animation-timing-function.
  var EASE = 'cubic-bezier(0.5, 0, 0.5, 1)';

  var lineColorFrames = [
    { offset: 0, backgroundColor: '#BEBBB9' },
    { offset: 0.03757, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.03958, backgroundColor: '#FFE7A6' },
    { offset: 0.0884, backgroundColor: '#FFE7A6', easing: EASE },
    { offset: 0.09099, backgroundColor: '#BEBBB9' },
    { offset: 0.12248, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.12536, backgroundColor: '#FF92CE' },
    { offset: 0.17272, backgroundColor: '#FF92CE', easing: EASE },
    { offset: 0.17562, backgroundColor: '#BEBBB9' },
    { offset: 0.20854, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.21145, backgroundColor: '#FF9294' },
    { offset: 0.26383, backgroundColor: '#FF9294', easing: EASE },
    { offset: 0.267, backgroundColor: '#BEBBB9' },
    { offset: 0.30075, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.30128, backgroundColor: '#FFA382' },
    { offset: 0.33051, backgroundColor: '#FFA382', easing: EASE },
    { offset: 0.3331, backgroundColor: '#BEBBB9' },
    { offset: 0.36834, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.36917, backgroundColor: '#FF92CE' },
    { offset: 0.40968, backgroundColor: '#FF92CE', easing: EASE },
    { offset: 0.41229, backgroundColor: '#BEBBB9' },
    { offset: 0.4426, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.44596, backgroundColor: '#FFE7A6' },
    { offset: 0.49507, backgroundColor: '#FFE7A6', easing: EASE },
    { offset: 0.49853, backgroundColor: '#BEBBB9' },
    { offset: 0.52885, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.53203, backgroundColor: '#FF9294' },
    { offset: 0.58662, backgroundColor: '#FF9294', easing: EASE },
    { offset: 0.5898, backgroundColor: '#BEBBB9' },
    { offset: 1, backgroundColor: '#BEBBB9' }
  ];

  var dotColorFrames = [
    { offset: 0, backgroundColor: '#BEBBB9' },
    { offset: 0.03757, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.03958, backgroundColor: '#FFE7A6' },
    { offset: 0.0884, backgroundColor: '#FFE7A6', easing: EASE },
    { offset: 0.09099, backgroundColor: '#BEBBB9' },
    { offset: 0.12248, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.12536, backgroundColor: '#FF92CE' },
    { offset: 0.17272, backgroundColor: '#FF92CE', easing: EASE },
    { offset: 0.17562, backgroundColor: '#BEBBB9' },
    { offset: 0.20854, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.2104, backgroundColor: '#FF9294' },
    { offset: 0.26383, backgroundColor: '#FF9294', easing: EASE },
    { offset: 0.267, backgroundColor: '#BEBBB9' },
    { offset: 0.29762, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.30075, backgroundColor: '#FFA382' },
    { offset: 0.33051, backgroundColor: '#FFA382', easing: EASE },
    { offset: 0.3331, backgroundColor: '#BEBBB9' },
    { offset: 0.3652, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.36834, backgroundColor: '#FF92CE' },
    { offset: 0.40968, backgroundColor: '#FF92CE', easing: EASE },
    { offset: 0.41229, backgroundColor: '#BEBBB9' },
    { offset: 0.4426, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.44596, backgroundColor: '#FFE7A6' },
    { offset: 0.49507, backgroundColor: '#FFE7A6', easing: EASE },
    { offset: 0.49853, backgroundColor: '#BEBBB9' },
    { offset: 0.52885, backgroundColor: '#BEBBB9', easing: EASE },
    { offset: 0.53203, backgroundColor: '#FF9294' },
    { offset: 0.58662, backgroundColor: '#FF9294', easing: EASE },
    { offset: 0.5898, backgroundColor: '#BEBBB9' },
    { offset: 1, backgroundColor: '#BEBBB9' }
  ];

  function t(y) { return 'translate(0px, ' + y + 'px)'; }

  var dotBounceFrames = [
    { offset: 0, transform: t(0) },
    { offset: 0.03958, transform: t(0), easing: 'cubic-bezier(0.431, 0, 0.483, 1)' },
    { offset: 0.05605, transform: t(-56), easing: 'cubic-bezier(0.629, 0, 0.586, 1)' },
    { offset: 0.07193, transform: t(-12) },
    { offset: 0.07887, transform: t(-19), easing: 'cubic-bezier(0.371, 0, 0.569, 1)' },
    { offset: 0.0884, transform: t(0) },
    { offset: 0.12536, transform: t(0), easing: 'cubic-bezier(0.362, 0, 0.69, 1)' },
    { offset: 0.13518, transform: t(-62), easing: 'cubic-bezier(0.293, 0, 0.612, 1)' },
    { offset: 0.14183, transform: t(-19), easing: 'cubic-bezier(0.44, 0, 0.517, 1)' },
    { offset: 0.14876, transform: t(-62), easing: 'cubic-bezier(0.621, 0, 0.457, 1)' },
    { offset: 0.15512, transform: t(-19), easing: 'cubic-bezier(0.509, 0, 0.474, 1)' },
    { offset: 0.16175, transform: t(-62), easing: 'cubic-bezier(0.414, 0, 0.466, 1)' },
    { offset: 0.17272, transform: t(0) },
    { offset: 0.20854, transform: t(0), easing: 'cubic-bezier(0.345, 0, 1, 1)' },
    { offset: 0.22211, transform: t(-29), easing: 'cubic-bezier(0.362, 0, 0.698, 1)' },
    { offset: 0.23164, transform: t(-150), easing: 'cubic-bezier(0.31, 0, 0.483, 1)' },
    { offset: 0.2354, transform: t(-160), easing: 'cubic-bezier(0.672, 0, 1, 1)' },
    { offset: 0.23887, transform: t(-150), easing: 'cubic-bezier(0.405, 0, 0.733, 1)' },
    { offset: 0.24702, transform: t(-38), easing: 'cubic-bezier(0, 0, 0.414, 1)' },
    { offset: 0.26383, transform: t(0) },
    { offset: 0.30075, transform: t(0), easing: 'cubic-bezier(0.216, 0, 1, 1)' },
    { offset: 0.30638, transform: t(-59), easing: 'cubic-bezier(0, 0, 0.25, 1)' },
    { offset: 0.31541, transform: t(-78), easing: 'cubic-bezier(0.655, 0, 1, 1)' },
    { offset: 0.32362, transform: t(-59), easing: 'cubic-bezier(0, 0, 0.724, 1)' },
    { offset: 0.33051, transform: t(0) },
    { offset: 0.3652, transform: t(0), easing: 'cubic-bezier(0.664, 0, 1, 1)' },
    { offset: 0.37172, transform: t(-14) },
    { offset: 0.37404, transform: t(-4) },
    { offset: 0.37634, transform: t(-14) },
    { offset: 0.37895, transform: t(-4) },
    { offset: 0.38155, transform: t(-14) },
    { offset: 0.38385, transform: t(-4) },
    { offset: 0.38646, transform: t(-14) },
    { offset: 0.38876, transform: t(-4) },
    { offset: 0.39108, transform: t(-14) },
    { offset: 0.39338, transform: t(-4) },
    { offset: 0.39599, transform: t(-14) },
    { offset: 0.39858, transform: t(-4) },
    { offset: 0.4009, transform: t(-14) },
    { offset: 0.4032, transform: t(-4) },
    { offset: 0.40581, transform: t(-14), easing: 'cubic-bezier(0, 0, 0.491, 1)' },
    { offset: 0.40968, transform: t(0) },
    { offset: 0.44596, transform: t(0) },
    { offset: 0.44875, transform: t(-21) },
    { offset: 0.45163, transform: t(0) },
    { offset: 0.47185, transform: t(0) },
    { offset: 0.47416, transform: t(-21) },
    { offset: 0.47734, transform: t(0) },
    { offset: 0.48052, transform: t(-21) },
    { offset: 0.4837, transform: t(0) },
    { offset: 0.49005, transform: t(0) },
    { offset: 0.49178, transform: t(-21) },
    { offset: 0.49507, transform: t(0) },
    { offset: 0.53203, transform: t(0), easing: 'cubic-bezier(0.336, 0, 1, 1)' },
    { offset: 0.54345, transform: t(-27), easing: 'cubic-bezier(0.121, 0, 0.698, 1)' },
    { offset: 0.5634, transform: t(-115), easing: 'cubic-bezier(0.922, 0, 1, 1)' },
    { offset: 0.56889, transform: t(-84), easing: 'cubic-bezier(0, 0, 0.448, 1)' },
    { offset: 0.57178, transform: t(-30), easing: 'cubic-bezier(0, 0, 0.397, 1)' },
    { offset: 0.58662, transform: t(0) },
    { offset: 1, transform: t(0) }
  ];

  var waveformFrames = [
    { offset: 0, transform: 'translate(0px, 0px)' },
    { offset: 0.01213, transform: 'translate(0px, 0px)' },
    { offset: 0.6063, transform: 'translate(-4465px, 0px)' },
    { offset: 1, transform: 'translate(-4465px, 0px)' }
  ];

  function tooltipFrames(hideStart, showStart, showEnd, hideEnd) {
    return [
      { offset: 0, opacity: 0 },
      { offset: hideStart, opacity: 0, easing: EASE },
      { offset: showStart, opacity: 1 },
      { offset: showEnd, opacity: 1, easing: EASE },
      { offset: hideEnd, opacity: 0 },
      { offset: 1, opacity: 0 }
    ];
  }

  var tooltipWindows = [
    [0.02859, 0.03814, 0.07741, 0.08723],
    [0.10773, 0.11755, 0.15509, 0.16956],
    [0.20419, 0.21218, 0.25592, 0.26777],
    [0.27949, 0.28796, 0.32178, 0.33333],
    [0.34427, 0.34951, 0.40092, 0.41162],
    [0.42129, 0.42953, 0.48903, 0.49856],
    [0.52253, 0.53495, 0.57597, 0.5898]
  ];

  var tooltips = [1, 2, 3, 4, 5, 6, 7].map(function (n) {
    return document.querySelector('.record-tooltip--' + n);
  });

  // One entry per local peak in dotBounceFrames — every point where the
  // bounce rises then immediately falls again, not just each color
  // segment's single biggest bump (a segment like 손가락 꼼지락거림 has
  // several quick rise-falls in a row, and each should count). `row`
  // is the legend row it matches (0 고요한/yellow, 1 안정적/orange, 2
  // 활발한/coral, 3 리듬있는/pink — see assets/icons/record-divider.svg
  // for that color<->row mapping). Must stay sorted by offset.
  var PEAK_EVENTS = [
    { offset: 0.05605, row: 0 },
    { offset: 0.07887, row: 0 },
    { offset: 0.13518, row: 3 },
    { offset: 0.14876, row: 3 },
    { offset: 0.16175, row: 3 },
    { offset: 0.2354, row: 2 },
    { offset: 0.31541, row: 1 },
    { offset: 0.37172, row: 3 },
    { offset: 0.37634, row: 3 },
    { offset: 0.38155, row: 3 },
    { offset: 0.38646, row: 3 },
    { offset: 0.39108, row: 3 },
    { offset: 0.39599, row: 3 },
    { offset: 0.4009, row: 3 },
    { offset: 0.40581, row: 3 },
    { offset: 0.44875, row: 0 },
    { offset: 0.47416, row: 0 },
    { offset: 0.48052, row: 0 },
    { offset: 0.49178, row: 0 },
    { offset: 0.5634, row: 2 }
  ];
  var legendCounts = [0, 0, 0, 0];
  var nextPeakIndex = 0;

  function resetLegendCounts() {
    legendCounts = [0, 0, 0, 0];
    nextPeakIndex = 0;
    legendNumberEls.forEach(function (el) { if (el) el.textContent = '00'; });
  }

  function checkPeaks(currentTime) {
    while (nextPeakIndex < PEAK_EVENTS.length &&
           currentTime >= PEAK_EVENTS[nextPeakIndex].offset * DURATION) {
      var row = PEAK_EVENTS[nextPeakIndex].row;
      legendCounts[row]++;
      var el = legendNumberEls[row];
      if (el) el.textContent = (legendCounts[row] < 10 ? '0' : '') + legendCounts[row];
      nextPeakIndex++;
    }
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var opts = {
    duration: reduceMotion ? 1 : DURATION,
    fill: 'forwards',
    iterations: 1,
    easing: 'linear'
  };
  var activeAnimations = [];
  var playIcon = document.getElementById('recordPlayIcon');
  var pauseIcon = document.getElementById('recordPauseIcon');
  // 'idle' (never started / finished) | 'playing' | 'paused'
  var state = 'idle';

  function showPauseIcon() {
    playIcon.classList.add('is-icon-hidden');
    pauseIcon.classList.remove('is-icon-hidden');
    playBtn.setAttribute('aria-label', '일시정지');
  }

  function showPlayIcon() {
    pauseIcon.classList.add('is-icon-hidden');
    playIcon.classList.remove('is-icon-hidden');
    playBtn.setAttribute('aria-label', '무빙 재생');
  }

  var timerRaf = null;

  function formatTimer(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return pad(h) + ' : ' + pad(m) + ' : ' + pad(s);
  }

  function finish() {
    if (state !== 'playing') return;
    state = 'idle';
    stopTimerLoop();
    if (timerEl) timerEl.textContent = formatTimer(COMPLETE_AT_MS);
    showPlayIcon();
    document.dispatchEvent(new CustomEvent('record:finished'));
  }

  function tickTimer() {
    // All tracks share one synchronized timeline, so any one of them
    // reflects the true elapsed playback time, paused or not.
    var current = activeAnimations[0] && activeAnimations[0].currentTime;
    if (typeof current === 'number') {
      if (current >= COMPLETE_AT_MS) {
        finish();
        return; // finish() already stopped this loop
      }
      if (timerEl) timerEl.textContent = formatTimer(current);
      checkPeaks(current);
    }
    timerRaf = requestAnimationFrame(tickTimer);
  }

  function startTimerLoop() {
    if (timerRaf === null) timerRaf = requestAnimationFrame(tickTimer);
  }

  function stopTimerLoop() {
    if (timerRaf !== null) {
      cancelAnimationFrame(timerRaf);
      timerRaf = null;
    }
  }

  function startFresh() {
    // Cancel anything mid-flight so a fresh play always restarts from 0%.
    activeAnimations.forEach(function (a) { a.cancel(); });
    activeAnimations = [];
    if (timerEl) timerEl.textContent = formatTimer(0);
    resetLegendCounts();

    activeAnimations.push(waveform.animate(waveformFrames, opts));
    activeAnimations.push(line.animate(lineColorFrames, opts));
    activeAnimations.push(dot.animate(dotColorFrames, opts));
    activeAnimations.push(dot.animate(dotBounceFrames, opts));

    tooltips.forEach(function (el, i) {
      var w = tooltipWindows[i];
      activeAnimations.push(el.animate(tooltipFrames(w[0], w[1], w[2], w[3]), opts));
    });

    // Normally the tick loop below calls finish() once COMPLETE_AT_MS is
    // reached; this is just the fallback for prefers-reduced-motion, where
    // opts.duration is compressed to 1ms and playback finishes long before
    // that tick ever fires.
    Promise.all(activeAnimations.map(function (a) { return a.finished; }))
      .then(finish)
      .catch(function () { /* cancelled by a fresh replay; ignore */ });
  }

  playBtn.addEventListener('pointerdown', function () {
    playBtn.classList.add('is-pressed');
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
    playBtn.addEventListener(evt, function () {
      playBtn.classList.remove('is-pressed');
    });
  });

  function pause() {
    activeAnimations.forEach(function (a) { a.pause(); });
    state = 'paused';
    stopTimerLoop();
    showPlayIcon();
    document.dispatchEvent(new CustomEvent('record:pause'));
  }

  // Cancelling (rather than pausing) snaps every track back to its
  // pre-animation style, so this doubles as "return to before playback".
  function reset() {
    activeAnimations.forEach(function (a) { a.cancel(); });
    activeAnimations = [];
    state = 'idle';
    stopTimerLoop();
    if (timerEl) timerEl.textContent = formatTimer(0);
    resetLegendCounts();
    showPlayIcon();
    document.dispatchEvent(new CustomEvent('record:reset'));
  }

  playBtn.addEventListener('click', function () {
    if (state === 'playing') {
      pause();
      return;
    }

    if (state === 'paused') {
      activeAnimations.forEach(function (a) { a.play(); });
      state = 'playing';
      startTimerLoop();
      showPauseIcon();
      document.dispatchEvent(new CustomEvent('record:play'));
      return;
    }

    startFresh();
    state = 'playing';
    startTimerLoop();
    showPauseIcon();
    document.dispatchEvent(new CustomEvent('record:play'));
  });

  // Exposed so other modules (e.g. the Arduino LED sync, the reset-confirm
  // dialog) can read/drive the same live-animated timeline instead of
  // re-deriving it independently.
  window.RecordMotion = {
    dotEl: dot,
    isRunning: function () { return state === 'playing'; },
    pauseIfPlaying: function () { if (state === 'playing') pause(); },
    reset: reset
  };
})();
