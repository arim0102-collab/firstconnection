/*
 * Drives the NeoPixel from the SAME live timeline that animates the chart:
 * each frame it reads the dot's current rendered color (which movement
 * type is active) and its current bounce offset (how intense that moment
 * is), turns that into an RGB value, and ships it to the Arduino.
 *
 * Because it reads getComputedStyle() rather than re-deriving the
 * timeline, play/pause/resume just fall out for free: when the WAAPI
 * animations are paused the computed style stops changing, so the loop
 * naturally keeps resending the same frozen color instead of needing its
 * own pause logic.
 */
(function () {
  var IDLE_RGB = [190, 187, 185]; // #BEBBB9 — "no event" gray -> LED off
  var MAX_BOUNCE_PX = 160; // matches the largest |translateY| in dotBounceFrames
  var MIN_BRIGHTNESS = 0.15; // baseline glow while a color is active but calm
  var SEND_INTERVAL_MS = 40; // ~25 updates/sec — plenty smooth, light on serial

  var dot = null;
  var rafId = null;
  var lastSendAt = 0;

  function parseRgb(str) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(str);
    if (!m) return null;
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
  }

  function readTranslateY(transformStr) {
    if (!transformStr || transformStr === 'none') return 0;
    var m = /matrix\(([^)]+)\)/.exec(transformStr);
    if (!m) return 0;
    var parts = m[1].split(',').map(parseFloat);
    return parts.length === 6 ? parts[5] : 0;
  }

  function isIdleColor(rgb) {
    return Math.abs(rgb[0] - IDLE_RGB[0]) < 2 &&
           Math.abs(rgb[1] - IDLE_RGB[1]) < 2 &&
           Math.abs(rgb[2] - IDLE_RGB[2]) < 2;
  }

  function tick(now) {
    if (!dot) return;
    rafId = requestAnimationFrame(tick);
    if (now - lastSendAt < SEND_INTERVAL_MS) return;
    lastSendAt = now;

    var cs = getComputedStyle(dot);
    var rgb = parseRgb(cs.backgroundColor);
    if (!rgb) return;

    if (isIdleColor(rgb)) {
      LedTransport.send(0, 0, 0);
      return;
    }

    var ty = Math.abs(readTranslateY(cs.transform));
    var intensity = Math.min(1, ty / MAX_BOUNCE_PX);
    var brightness = MIN_BRIGHTNESS + (1 - MIN_BRIGHTNESS) * intensity;

    LedTransport.send(rgb[0] * brightness, rgb[1] * brightness, rgb[2] * brightness);
  }

  function start() {
    if (rafId !== null) return;
    if (!window.RecordMotion || !LedTransport.isConnected()) return;
    dot = window.RecordMotion.dotEl;
    lastSendAt = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop(turnOff) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (turnOff && LedTransport.isConnected()) {
      LedTransport.send(0, 0, 0);
    }
  }

  document.addEventListener('record:play', start);
  document.addEventListener('record:pause', function () { stop(false); });
  document.addEventListener('record:finished', function () { stop(true); });
  document.addEventListener('record:reset', function () { stop(true); });

  window.LedSync = { start: start, stop: stop };
})();
