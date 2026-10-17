(function () {
  var track = document.getElementById('chartTrack');
  var dots = document.querySelectorAll('.today-dot');
  if (!track || !dots.length) return;

  var PAGE_STEP = 797; // page width (700) + track gap (97)

  // Page 2's clock chart (node 206:757) stays paused at scale:0 until this
  // page actually comes into view, then plays its pop-in exactly once (not
  // replayed on later visits) and freezes on the last frame (css/today.css).
  var clockCard = document.querySelector('.today-clock-card');
  var clockVectors = clockCard ? clockCard.querySelectorAll('.today-clock-vector') : [];
  var clockAnimationPlayed = false;

  function playClockAnimation() {
    if (!clockVectors.length || clockAnimationPlayed) return;
    clockAnimationPlayed = true;
    clockVectors.forEach(function (el) {
      el.style.animationPlayState = 'running';
    });
  }

  function goTo(index) {
    track.style.transform = 'translateX(' + (index * -PAGE_STEP) + 'px)';
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
    });
    if (index === 1) playClockAnimation();
  }

  // Clicking a blob (nodes 206:763/764/765/766) darkens it and reveals its
  // dB readout centered in the chart (nodes 221:1101/1102/1106/1110);
  // clicking another blob, or the same one again, clears the previous one.
  if (clockCard) {
    var activeClockIndex = null;

    function clearClock(index) {
      var vector = clockCard.querySelector('.today-clock-vector[data-clock-index="' + index + '"]');
      if (vector) vector.classList.remove('is-active');
      var label = clockCard.querySelector('.today-clock-label[data-clock-label="' + index + '"]');
      if (label) label.classList.remove('is-visible');
    }

    function setClock(index) {
      var vector = clockCard.querySelector('.today-clock-vector[data-clock-index="' + index + '"]');
      if (vector) vector.classList.add('is-active');
      var label = clockCard.querySelector('.today-clock-label[data-clock-label="' + index + '"]');
      if (label) label.classList.add('is-visible');
    }

    clockVectors.forEach(function (el) {
      el.style.cursor = 'pointer';
    });

    clockCard.addEventListener('click', function (e) {
      var vector = e.target.closest('.today-clock-vector');
      var index = vector ? vector.dataset.clockIndex : null;

      if (activeClockIndex !== null) clearClock(activeClockIndex);

      if (index !== null && index !== activeClockIndex) {
        setClock(index);
        activeClockIndex = index;
      } else {
        activeClockIndex = null;
      }
    });
  }

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      goTo(parseInt(dot.dataset.page, 10));
    });
  });

  // Movement Timeline: no wheel/scrollbar scrolling (overflow-y:hidden in
  // css/today.css already blocks that) — drag with the pointer instead.
  var timeline = document.querySelector('.today-timeline');
  if (timeline) {
    var dragging = false;
    var startY = 0;
    var startScrollTop = 0;

    function currentScale() {
      var screen = document.querySelector('.screen');
      return screen ? screen.getBoundingClientRect().width / 1920 : 1;
    }

    timeline.addEventListener('pointerdown', function (e) {
      dragging = true;
      startY = e.clientY;
      startScrollTop = timeline.scrollTop;
      timeline.classList.add('is-dragging');
      timeline.setPointerCapture(e.pointerId);
    });

    timeline.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var deltaViewport = e.clientY - startY;
      timeline.scrollTop = startScrollTop - deltaViewport / currentScale();
    });

    ['pointerup', 'pointercancel'].forEach(function (evt) {
      timeline.addEventListener(evt, function () {
        dragging = false;
        timeline.classList.remove('is-dragging');
      });
    });
  }

  // Bubble chart: clicking a group (pair/trio/single) darkens its bubbles
  // and shows its tooltip above it; clicking it again, or another group,
  // clears the previous one first.
  var bubbleCard = document.querySelector('.today-bubble-card');
  if (bubbleCard) {
    var activeGroup = null;

    function clearGroup(name) {
      var group = bubbleCard.querySelector('.today-bubble-group[data-group="' + name + '"]');
      if (group) group.classList.remove('is-active');
      var tip = bubbleCard.querySelector('.today-bubble-tooltip[data-tooltip-for="' + name + '"]');
      if (tip) tip.classList.remove('is-visible');
    }

    function setGroup(name) {
      var group = bubbleCard.querySelector('.today-bubble-group[data-group="' + name + '"]');
      if (group) group.classList.add('is-active');
      var tip = bubbleCard.querySelector('.today-bubble-tooltip[data-tooltip-for="' + name + '"]');
      if (tip) tip.classList.add('is-visible');
    }

    bubbleCard.addEventListener('click', function (e) {
      var group = e.target.closest('.today-bubble-group');
      var name = group ? group.dataset.group : null;

      if (activeGroup) clearGroup(activeGroup);

      if (name && name !== activeGroup) {
        setGroup(name);
        activeGroup = name;
      } else {
        activeGroup = null;
      }
    });
  }

  // Page 3's waveform (node 206:774) is 7 separate objects laid out along
  // one long image — the prev/next arrows (node 206:770) page through them
  // one object at a time. Every object's own bottom edge already sits flush
  // with the image's bottom (284.242 local, confirmed from node 206:774's
  // metadata: each object's y+height ≈ 284.242) — i.e. they share one
  // ground line — so no vertical translation is needed to bottom-align
  // them against the stage's bottom (node 206:773, node 206:786's
  // divider); only horizontal position changes per object.
  var waveImg = document.getElementById('waveImg');
  var wavePrevBtn = document.getElementById('wavePrevBtn');
  var waveNextBtn = document.getElementById('waveNextBtn');
  if (waveImg && wavePrevBtn && waveNextBtn) {
    var WAVE_STAGE_WIDTH = 700; // today-wave-clip's width (node 206:773)
    var WAVE_OBJECTS = [
      { centerX: 317.121 },  // Vector 33
      { centerX: 1028.667 }, // Vector 34
      { centerX: 1782.636 }, // Vector 35
      { centerX: 2417.818 }, // Vector 36
      { centerX: 2975.576 }, // Vector 37
      { centerX: 3652.950 }, // Group 37
      { centerX: 4416.233 }  // Vector 38
    ];
    var waveTooltips = document.querySelectorAll('.today-wave-tooltip');
    var waveIndex = 0;

    function applyWaveOffset() {
      var obj = WAVE_OBJECTS[waveIndex];
      var tx = WAVE_STAGE_WIDTH / 2 - obj.centerX;
      waveImg.style.transform = 'translate(' + tx + 'px, 1px)';
      wavePrevBtn.disabled = waveIndex <= 0;
      waveNextBtn.disabled = waveIndex >= WAVE_OBJECTS.length - 1;

      waveTooltips.forEach(function (tip) {
        tip.classList.toggle('is-visible', Number(tip.dataset.waveTooltip) === waveIndex);
      });
    }

    wavePrevBtn.addEventListener('click', function () {
      waveIndex = Math.max(0, waveIndex - 1);
      applyWaveOffset();
    });

    waveNextBtn.addEventListener('click', function () {
      waveIndex = Math.min(WAVE_OBJECTS.length - 1, waveIndex + 1);
      applyWaveOffset();
    });

    applyWaveOffset();
  }
})();
