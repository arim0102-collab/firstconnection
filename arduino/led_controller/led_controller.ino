/*
 * led_controller.ino
 *
 * Drives a NeoPixel (WS2812/WS2812B) strip to follow the chart in
 * record.html, over either connection the page offers:
 *   - USB serial (js/led-serial.js)
 *   - classic Bluetooth (SPP) — js/led-serial.js again: once paired in
 *     Windows' own Bluetooth settings (see "Bluetooth pairing" below),
 *     this board shows up as an ordinary COM port in the same Web Serial
 *     picker, wired or not — no separate code path needed
 * Both accept the same line of text, "R,G,B" with each channel 0-255 —
 * whichever sends last wins.
 *
 * The incoming R,G,B is only ever used for brightness/on-off here, not
 * hue: the strip's actual color comes from its own fixed COLOR_SEQUENCE
 * below. Every time the signal goes from fully off back to on, the strip
 * advances to the next color in that list (looping back to the start
 * after the last one) — see parseLine().
 *
 * Wiring (ESP32):
 *   NeoPixel VCC  -> 3V3 or 5V pin (whichever the board exposes; share
 *                    GND with it either way)
 *   NeoPixel GND  -> GND
 *   NeoPixel DIN  -> D2 (GPIO2) (a ~300-500ohm resistor in series is
 *                    recommended)
 *
 * Libraries (Arduino IDE > Tools > Manage Libraries):
 *   - "Adafruit NeoPixel" (Adafruit)
 *   - "BluetoothSerial" is bundled with the ESP32 core, nothing extra to
 *     install.
 *
 * Connecting from record.html:
 *   The page has no separate connect button — open the side menu, tap
 *   "블루투스", then "연결하기" (js/bluetooth-connect.js). That tries USB
 *   serial first (via js/led-serial.js, which also picks up a paired
 *   Bluetooth connection — see "Bluetooth pairing" below — since Windows
 *   exposes both as ordinary COM ports); nothing here needs to change
 *   for either.
 *
 * Bluetooth pairing (wireless, no cable needed):
 *   1. Upload this sketch. On boot it starts classic Bluetooth (SPP)
 *      under the name set by BT_DEVICE_NAME below (default
 *      "LED_Controller").
 *   2. On the PC: Settings > Bluetooth & devices > Add device > Bluetooth
 *      > select "LED_Controller". No PIN should be needed (classic ESP32
 *      BluetoothSerial's default pairing doesn't prompt for one); if
 *      Windows does ask, try "1234" or "0000".
 *   3. Once paired, Windows creates virtual COM ports for it (Device
 *      Manager > Ports, under Bluetooth) — these just show up in the
 *      page's normal Web Serial port picker (js/led-serial.js) alongside
 *      any USB ones.
 *
 * Note: this board used to also run a WiFi hotspot + WebSocket + an
 * onboard HTTP server (so an iPad, which can't do Web Serial or pair
 * classic Bluetooth, could load the whole app from the board itself and
 * control the LED over WiFi). That's been dropped — Bluetooth pairing
 * covers the "no cable" need without juggling WiFi + Bluetooth + two TCP
 * servers on one chip at once. If that's ever needed again, js/led-wifi.js
 * and js/bluetooth-connect.js's WiFi fallback are still in the web app;
 * only this sketch's WiFi/HTTP/LittleFS side was removed.
 */

#include <Adafruit_NeoPixel.h>
#include <BluetoothSerial.h>

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled — pick a board/partition option with Bluetooth on (Tools menu), or a board variant that includes classic BT (plain ESP32; not C3/S3/C6, which only have BLE).
#endif

#define LED_PIN     2   // D2 / GPIO2
#define NUM_PIXELS  7   // 7-pixel strip
#define DEAD_PIXEL  6   // the middle pixel is last in the data chain (0-indexed) — always left off
#define BAUD_RATE   115200
const char *BT_DEVICE_NAME = "LED_Controller"; // shown when pairing in Windows' Bluetooth settings

// How quickly the strip eases toward each new color, per loop() tick.
// 1.0 = snap instantly to the latest value, smaller = smoother/laggier.
#define SMOOTHING   0.35f

// Global brightness cap (0-255). Driving these colors at max brightness
// this close, with no diffuser, can wash them out toward white. Lowering
// this makes the hue read clearly; raise it back toward 255 if the strip
// now looks too dim. Try a diffuser (tape, ping-pong ball, frosted tube)
// too if it's still washed out at a low value.
#define MAX_BRIGHTNESS 90

// 노랑, 분홍, 다홍, 주황, 분홍, 노랑, 다홍 — one color per on-pulse, in order.
const uint8_t COLOR_SEQUENCE[][3] = {
  { 0xFF, 0xD2, 0x56 },
  { 0xFF, 0x59, 0xB5 },
  { 0xFF, 0x66, 0x68 },
  { 0xFF, 0x82, 0x55 },
  { 0xFF, 0x59, 0xB5 },
  { 0xFF, 0xD2, 0x56 },
  { 0xFF, 0x66, 0x68 }
};
const uint8_t COLOR_SEQUENCE_LEN = sizeof(COLOR_SEQUENCE) / sizeof(COLOR_SEQUENCE[0]);

uint8_t nextColorIndex = 0;   // color to use for the next off->on transition
uint8_t activeColorIndex = 0; // color in use while currently on
bool wasOff = true;

Adafruit_NeoPixel strip(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);
BluetoothSerial SerialBT;

float currentR = 0, currentG = 0, currentB = 0;
float targetR = 0, targetG = 0, targetB = 0;

String lineBuffer;
String btLineBuffer;

void setup() {
  Serial.begin(BAUD_RATE);
  strip.begin();
  strip.setBrightness(MAX_BRIGHTNESS);
  strip.show(); // all off

  SerialBT.begin(BT_DEVICE_NAME); // classic Bluetooth (SPP) — see "Bluetooth pairing" in the file header
  Serial.print("Bluetooth SPP started: ");
  Serial.println(BT_DEVICE_NAME);
}

void loop() {
  readSerial();
  readBluetoothSerial();
  stepTowardTarget();
  showColor((uint8_t)currentR, (uint8_t)currentG, (uint8_t)currentB);
  delay(10); // ~100Hz refresh, independent of how often a client sends
}

void readSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      parseLine(lineBuffer);
      lineBuffer = "";
    } else if (c != '\r') {
      lineBuffer += c;
    }
  }
}

// Same line protocol as readSerial(), just over the paired Bluetooth (SPP)
// link instead of the USB-wired one — see "Bluetooth pairing" in the file
// header. js/led-serial.js doesn't know or care which this is; Windows
// exposes both as plain COM ports.
void readBluetoothSerial() {
  while (SerialBT.available() > 0) {
    char c = (char)SerialBT.read();
    if (c == '\n') {
      parseLine(btLineBuffer);
      btLineBuffer = "";
    } else if (c != '\r') {
      btLineBuffer += c;
    }
  }
}

void parseLine(const String &line) {
  int firstComma = line.indexOf(',');
  int secondComma = line.indexOf(',', firstComma + 1);
  if (firstComma < 0 || secondComma < 0) return; // malformed, ignore

  int r = constrain(line.substring(0, firstComma).toInt(), 0, 255);
  int g = constrain(line.substring(firstComma + 1, secondComma).toInt(), 0, 255);
  int b = constrain(line.substring(secondComma + 1).toInt(), 0, 255);

  // Only the brightness (how lit the incoming color is) matters here —
  // the hue always comes from COLOR_SEQUENCE instead.
  int intensity = max(r, max(g, b));
  bool isOn = intensity > 0;

  if (isOn && wasOff) {
    activeColorIndex = nextColorIndex;
    nextColorIndex = (nextColorIndex + 1) % COLOR_SEQUENCE_LEN;
  }
  wasOff = !isOn;

  if (isOn) {
    float scale = intensity / 255.0f;
    targetR = COLOR_SEQUENCE[activeColorIndex][0] * scale;
    targetG = COLOR_SEQUENCE[activeColorIndex][1] * scale;
    targetB = COLOR_SEQUENCE[activeColorIndex][2] * scale;
  } else {
    targetR = 0;
    targetG = 0;
    targetB = 0;
  }
}

void stepTowardTarget() {
  currentR += (targetR - currentR) * SMOOTHING;
  currentG += (targetG - currentG) * SMOOTHING;
  currentB += (targetB - currentB) * SMOOTHING;
}

void showColor(uint8_t r, uint8_t g, uint8_t b) {
  uint32_t color = strip.Color(r, g, b);
  uint32_t off = strip.Color(0, 0, 0);
  for (int i = 0; i < NUM_PIXELS; i++) {
    strip.setPixelColor(i, i == DEAD_PIXEL ? off : color);
  }
  strip.show();
}
