/*
 * Picks whichever LED link (USB serial or WiFi) is currently connected,
 * so js/led-sync.js can drive the LED without knowing which transport is
 * active. If both are connected, both receive every update.
 */
(function () {
  function isConnected() {
    return (window.LedSerial && LedSerial.isConnected()) ||
           (window.LedWifi && LedWifi.isConnected());
  }

  function send(r, g, b) {
    if (window.LedSerial && LedSerial.isConnected()) LedSerial.send(r, g, b);
    if (window.LedWifi && LedWifi.isConnected()) LedWifi.send(r, g, b);
  }

  window.LedTransport = { send: send, isConnected: isConnected };
})();
