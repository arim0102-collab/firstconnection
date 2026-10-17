/*
 * Thin Web Serial wrapper for talking to the Arduino over USB.
 * Protocol: one ASCII line per update, "R,G,B\n" with each channel 0-255 —
 * see arduino/led_controller/led_controller.ino for the matching reader.
 *
 * Web Serial only exists in Chromium browsers (Chrome/Edge/Opera) served
 * over https or http://localhost, and only after a user gesture (a click)
 * calls requestPort(). It is not available in Safari, Firefox, or iOS.
 */
(function () {
  var port = null;
  var writer = null;
  var encoder = new TextEncoder();
  var statusEls = [];
  var connected = false;

  function setStatus(text, isError) {
    statusEls.forEach(function (el) {
      el.textContent = text;
      el.classList.toggle('led-status--error', !!isError);
      el.classList.toggle('led-status--connected', !isError && connected);
    });
  }

  async function connect() {
    if (!('serial' in navigator)) {
      setStatus('이 브라우저는 Web Serial을 지원하지 않아요 (Chrome/Edge 필요)', true);
      return false;
    }
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      writer = port.writable.getWriter();
      connected = true;
      setStatus('LED 연결됨');

      port.addEventListener('disconnect', function () {
        connected = false;
        writer = null;
        port = null;
        setStatus('LED 연결 끊김', true);
      });

      return true;
    } catch (err) {
      connected = false;
      setStatus('연결 실패: ' + err.message, true);
      return false;
    }
  }

  async function disconnect() {
    if (writer) {
      try { await writer.close(); } catch (e) { /* ignore */ }
    }
    if (port) {
      try { await port.close(); } catch (e) { /* ignore */ }
    }
    writer = null;
    port = null;
    connected = false;
    setStatus('연결 해제됨');
  }

  var sending = false;
  var pending = null;

  async function send(r, g, b) {
    if (!connected || !writer) return;
    pending = [r, g, b];
    if (sending) return; // coalesce bursts: only the latest RGB is ever in flight
    sending = true;
    while (pending) {
      var rgb = pending;
      pending = null;
      var line = Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + '\n';
      try {
        await writer.write(encoder.encode(line));
      } catch (err) {
        setStatus('전송 실패: ' + err.message, true);
        break;
      }
    }
    sending = false;
  }

  window.LedSerial = {
    connect: connect,
    disconnect: disconnect,
    send: send,
    isConnected: function () { return connected; },
    registerStatusEl: function (el) { statusEls.push(el); }
  };
})();
