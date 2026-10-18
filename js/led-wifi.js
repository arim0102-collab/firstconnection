/*
 * WebSocket wrapper for talking to the Arduino over its own WiFi access
 * point — no router or internet connection needed. Protocol: the same
 * "R,G,B" text line as js/led-serial.js, sent as one WebSocket text
 * message instead of a serial line — see
 * arduino/led_controller/led_controller.ino for the matching listener.
 *
 * Before connecting, join the ESP32's WiFi network from the PC's own
 * WiFi settings (default SSID "LED_Controller", password "ledcontrol123"),
 * then connect here to its default AP address, 192.168.4.1.
 */
(function () {
  var CONNECT_TIMEOUT_MS = 15000; // the board's TCP sockets can still be busy right after the page itself finished loading from it, so give a connection attempt more room than a plain dead-host timeout would need

  var socket = null;
  var statusEls = [];
  var connected = false;

  function setStatus(text, isError) {
    statusEls.forEach(function (el) {
      el.textContent = text;
      el.classList.toggle('led-status--error', !!isError);
      el.classList.toggle('led-status--connected', !isError && connected);
    });
  }

  function connect(ip) {
    return new Promise(function (resolve) {
      if (!('WebSocket' in window)) {
        setStatus('이 브라우저는 WebSocket을 지원하지 않아요', true);
        resolve(false);
        return;
      }
      // A page served over https (e.g. the published GitHub Pages site)
      // can never open a plain ws:// socket — browsers block it outright
      // as mixed content, with no way around it short of the board
      // speaking wss:// with a cert the browser trusts. Fail instantly
      // instead of attempting (and silently losing time/user-activation)
      // so js/bluetooth-connect.js's USB-serial fallback kicks in right
      // away. WiFi mode still works as usual when this page itself is
      // served over plain http (local testing).
      if (window.location.protocol === 'https:') {
        setStatus('HTTPS 페이지에서는 WiFi(ws://) 연결을 사용할 수 없어요 — USB로 연결해 주세요', true);
        resolve(false);
        return;
      }
      var host = (ip || '192.168.4.1').trim() || '192.168.4.1';
      var settled = false;
      var attempt = null;

      function settle(ok) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(ok);
      }

      var timeoutId = setTimeout(function () {
        setStatus(host + '에 연결할 수 없어요 (시간 초과)', true);
        if (attempt) {
          try { attempt.close(); } catch (e) { /* ignore */ }
        }
        settle(false);
      }, CONNECT_TIMEOUT_MS);

      try {
        attempt = new WebSocket('ws://' + host + ':81');
        socket = attempt;
      } catch (err) {
        setStatus('연결 실패: ' + err.message, true);
        settle(false);
        return;
      }

      attempt.addEventListener('open', function () {
        connected = true;
        setStatus('LED 연결됨 (WiFi)');
        settle(true);
      });

      attempt.addEventListener('close', function () {
        if (socket === attempt) socket = null;
        connected = false;
        setStatus('LED 연결 끊김', true);
        settle(false);
      });

      attempt.addEventListener('error', function () {
        setStatus(host + '에 연결할 수 없어요', true);
        settle(false);
      });
    });
  }

  function disconnect() {
    if (socket) {
      try { socket.close(); } catch (e) { /* ignore */ }
    }
    socket = null;
    connected = false;
    setStatus('연결 해제됨');
  }

  var sending = false;
  var pending = null;

  function flush() {
    if (sending || !pending) return;
    sending = true;
    var rgb = pending;
    pending = null;
    var line = Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]);
    try {
      socket.send(line);
    } catch (err) {
      setStatus('전송 실패: ' + err.message, true);
    }
    sending = false;
    if (pending) flush(); // a newer value arrived while sending; coalesce to it
  }

  function send(r, g, b) {
    if (!connected || !socket || socket.readyState !== WebSocket.OPEN) return;
    pending = [r, g, b];
    flush();
  }

  window.LedWifi = {
    connect: connect,
    disconnect: disconnect,
    send: send,
    isConnected: function () { return connected; },
    registerStatusEl: function (el) { statusEls.push(el); }
  };
})();
