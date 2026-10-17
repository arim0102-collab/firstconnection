/*
 * led_controller.ino
 *
 * Drives a NeoPixel (WS2812/WS2812B) strip to follow the chart in
 * record.html, over either connection the page offers:
 *   - USB serial (js/led-serial.js)
 *   - the board's own WiFi hotspot, over a WebSocket (js/led-wifi.js)
 * Both accept the same line of text, "R,G,B" with each channel 0-255 —
 * whichever one sends last wins.
 *
 * The incoming R,G,B is only ever used for brightness/on-off here, not
 * hue: the strip's actual color comes from its own fixed COLOR_SEQUENCE
 * below. Every time the signal goes from fully off back to on, the strip
 * advances to the next color in that list (looping back to the start
 * after the last one) — see parseLine().
 *
 * Wiring (ESP32 / ESP32-C3 Super Mini):
 *   NeoPixel VCC  -> 3V3 or 5V pin (whichever the board exposes; share
 *                    GND with it either way)
 *   NeoPixel GND  -> GND
 *   NeoPixel DIN  -> D2 (GPIO2) (a ~300-500ohm resistor in series is
 *                    recommended)
 *
 * Libraries (Arduino IDE > Tools > Manage Libraries):
 *   - "Adafruit NeoPixel" (Adafruit)
 *   - "WebSockets" by Markus Sattler / Links2004 — used for the WiFi path
 *
 * Connecting from record.html:
 *   The page has no separate connect button — open the side menu, tap
 *   "블루투스", then "연결하기" (js/bluetooth-connect.js). That single
 *   action tries USB serial first (via js/led-serial.js) and, if that
 *   isn't available, falls back to this board's WiFi WebSocket (via
 *   js/led-wifi.js) automatically — nothing here needs to change for
 *   either path.
 *
 *   To make the WiFi path reachable:
 *   1. Upload this sketch. On boot it starts its own WiFi hotspot named
 *      by WIFI_AP_SSID below (default "LED_Controller").
 *   2. On the PC, connect to that WiFi network like any other
 *      (password is WIFI_AP_PASSWORD below, default "ledcontrol123").
 *      This replaces your normal WiFi connection while it's active — no
 *      internet is needed for the LED link itself.
 *   3. The page tries 192.168.4.1 (this board's default AP address) —
 *      no address entry needed on the page.
 */

#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <WebSocketsServer.h>

#define LED_PIN     2   // D2 / GPIO2
#define NUM_PIXELS  7   // 7-pixel strip
#define DEAD_PIXEL  6   // the middle pixel is last in the data chain (0-indexed) — always left off
#define BAUD_RATE   115200

// How quickly the strip eases toward each new color, per loop() tick.
// 1.0 = snap instantly to the latest value, smaller = smoother/laggier.
#define SMOOTHING   0.35f

// Global brightness cap (0-255). Driving these colors at max brightness
// this close, with no diffuser, can wash them out toward white. Lowering
// this makes the hue read clearly; raise it back toward 255 if the strip
// now looks too dim. Try a diffuser (tape, ping-pong ball, frosted tube)
// too if it's still washed out at a low value.
#define MAX_BRIGHTNESS 90

const char *WIFI_AP_SSID = "LED_Controller";
const char *WIFI_AP_PASSWORD = "ledcontrol123"; // WPA2 needs 8+ characters
#define WEBSOCKET_PORT 81

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
WebSocketsServer webSocket(WEBSOCKET_PORT);

float currentR = 0, currentG = 0, currentB = 0;
float targetR = 0, targetG = 0, targetB = 0;

String lineBuffer;

void setup() {
  Serial.begin(BAUD_RATE);
  strip.begin();
  strip.setBrightness(MAX_BRIGHTNESS);
  strip.show(); // all off

  WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASSWORD);
  Serial.print("WiFi AP started: ");
  Serial.print(WIFI_AP_SSID);
  Serial.print(" @ ");
  Serial.println(WiFi.softAPIP()); // normally 192.168.4.1

  webSocket.begin();
  webSocket.onEvent(onWsEvent);
}

void loop() {
  webSocket.loop();
  readSerial();
  stepTowardTarget();
  showColor((uint8_t)currentR, (uint8_t)currentG, (uint8_t)currentB);
  delay(10); // ~100Hz refresh, independent of how often a client sends
}

void onWsEvent(uint8_t clientId, WStype_t type, uint8_t *payload, size_t length) {
  if (type == WStype_TEXT) {
    parseLine(String((char *)payload));
  }
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
