/*
 * Patch pairing flow: 블루투스 nav item -> confirm dialog (node 164:1111)
 * -> success dialog (node 164:1279). Framed as "블루투스" for the UI, but
 * the actual link it makes on record.html is the LED's USB-serial or
 * WiFi connection (js/led-serial.js / js/led-wifi.js via
 * js/led-transport.js) — real Web Bluetooth isn't used, since this is
 * just that pairing dialog's visual concept reused for the real device
 * link. On pages without the LED scripts (index.html, calendar.html)
 * "연결하기" just shows the success state — there's nothing to connect
 * to there.
 */
(function () {
  var DEFAULT_WIFI_IP = '192.168.4.1'; // the board's own WiFi AP address

  var trigger = document.querySelector('.bt-connect-trigger');
  var scrim = document.getElementById('btScrim');
  var confirmDialog = document.getElementById('btConfirmDialog');
  var successDialog = document.getElementById('btSuccessDialog');
  var confirmTitle = document.getElementById('btConfirmTitle');
  var cancelBtn = document.getElementById('btCancelBtn');
  var connectBtn = document.getElementById('btConnectBtn');
  var closeBtn = document.getElementById('btCloseBtn');
  if (!trigger || !scrim || !confirmDialog || !successDialog) return;

  var DEFAULT_CONFIRM_TITLE = confirmTitle ? confirmTitle.textContent : '';
  var connected = false;

  function openScrim() {
    scrim.classList.add('is-open');
  }

  function closeScrim() {
    scrim.classList.remove('is-open');
  }

  function showConfirm() {
    if (confirmTitle) confirmTitle.textContent = DEFAULT_CONFIRM_TITLE;
    successDialog.classList.remove('is-open');
    openScrim();
    confirmDialog.classList.add('is-open');
  }

  function closeConfirm() {
    confirmDialog.classList.remove('is-open');
    closeScrim();
    if (window.SideMenu) window.SideMenu.close();
  }

  function showSuccess() {
    confirmDialog.classList.remove('is-open');
    openScrim();
    successDialog.classList.add('is-open');
  }

  function closeSuccess() {
    successDialog.classList.remove('is-open');
    closeScrim();
  }

  trigger.addEventListener('click', showConfirm);
  cancelBtn.addEventListener('click', closeConfirm);
  closeBtn.addEventListener('click', closeSuccess);

  scrim.addEventListener('click', function () {
    closeConfirm();
    closeSuccess();
  });

  // Tries the board's WiFi link first — it's silent (just a WebSocket
  // connect attempt) and succeeds immediately if the PC is already on the
  // board's WiFi, so a wireless setup never has to deal with the USB
  // picker at all. Only if that fails (board's on USB instead, or not on
  // WiFi) do we fall back to USB serial, which needs an explicit user
  // gesture and pops the OS port picker.
  async function connectDevice() {
    if (!window.LedTransport) {
      return true; // no LED integration on this page — just a themed dialog
    }
    if (window.LedWifi) {
      if (await LedWifi.connect(DEFAULT_WIFI_IP)) return true;
    }
    if (window.LedSerial && 'serial' in navigator) {
      if (await LedSerial.connect()) return true;
    }
    return false;
  }

  connectBtn.addEventListener('click', async function () {
    connectBtn.disabled = true;
    if (confirmTitle) confirmTitle.textContent = '연결 중...';
    var ok = await connectDevice();
    connectBtn.disabled = false;
    if (ok) {
      connected = true;
      showSuccess();
      // The dialog opened from the side drawer, but there's nothing left
      // to do there once connected — retract it so it's not left hanging
      // open behind the success dialog.
      if (window.SideMenu) window.SideMenu.close();
      // If the chart is already mid-playback when the device connects,
      // start driving the LED immediately instead of waiting for the
      // next play click.
      if (window.RecordMotion && window.RecordMotion.isRunning() && window.LedSync) {
        window.LedSync.start();
      }
    } else {
      connected = false;
      if (confirmTitle) {
        confirmTitle.textContent = '연결에 실패했어요. 다시 시도해 주세요.';
        setTimeout(function () {
          if (confirmTitle.textContent !== DEFAULT_CONFIRM_TITLE) {
            confirmTitle.textContent = DEFAULT_CONFIRM_TITLE;
          }
        }, 2500);
      }
    }
  });

  window.PatchBluetooth = {
    isConnected: function () {
      return window.LedTransport ? window.LedTransport.isConnected() : connected;
    }
  };
})();
