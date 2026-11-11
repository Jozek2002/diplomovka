#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ESPmDNS.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <time.h>
#include <sys/time.h>

#include "config.h"

// Inštancia servera a WebSocket rozhrania
AsyncWebServer server(SERVER_PORT);
AsyncWebSocket ws("/ws");

// Spoločný stav uzla (zhodný s Node.js simulátorom)
bool outputEnabled = false;
uint32_t sequence = 0;
float temperature = 22.0f;
float humidity = 45.0f;
unsigned long lastTelemetryTime = 0;

/**
 * Získa aktuálnu časovú značku v milisekundách (Unix timestamp).
 * Ak je čas synchronizovaný cez NTP, vráti reálny čas.
 * Inak použije syntetický odhad odvodený od millis().
 */
uint64_t currentTimestampMs() {
    struct timeval tv;
    gettimeofday(&tv, nullptr);
    if (tv.tv_sec > 1000000000ULL) {
        return (uint64_t)tv.tv_sec * 1000ULL + (uint64_t)(tv.tv_usec / 1000);
    }
    return 1740000000000ULL + (uint64_t)millis();
}

/**
 * JSON reprezentácia telemetrie pre HTTP GET /telemetry
 */
String getTelemetryPayloadJson() {
    JsonDocument doc;
    doc["deviceId"] = DEVICE_ID;
    doc["simulated"] = false;
    doc["sequence"] = sequence;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["generatedAt"] = currentTimestampMs();

    String out;
    serializeJson(doc, out);
    return out;
}

/**
 * JSON správa telemetrie pre WebSocket broadcast
 */
String getTelemetryMessageJson() {
    JsonDocument doc;
    doc["type"] = "telemetry";
    JsonObject data = doc["data"].to<JsonObject>();
    data["deviceId"] = DEVICE_ID;
    data["simulated"] = false;
    data["sequence"] = sequence;
    data["temperature"] = temperature;
    data["humidity"] = humidity;
    data["generatedAt"] = currentTimestampMs();

    String out;
    serializeJson(doc, out);
    return out;
}

/**
 * JSON správa stavu výstupu pre WebSocket klientov
 */
String getOutputMessageJson() {
    JsonDocument doc;
    doc["type"] = "output";
    JsonObject data = doc["data"].to<JsonObject>();
    data["outputEnabled"] = outputEnabled;

    String out;
    serializeJson(doc, out);
    return out;
}

/**
 * Nastaví stav digitálneho výstupu a vstavanej LED diódy.
 * Zároveň odošle informáciu o zmene všetkým pripojeným WebSocket klientom.
 */
void setOutputState(bool state, const char *source) {
    outputEnabled = state;
    digitalWrite(LED_PIN, outputEnabled ? HIGH : LOW);

    Serial.printf("[%s] Výstup: %s (LED GPIO %d: %s)\n",
                  source,
                  outputEnabled ? "Zapnutý" : "Vypnutý",
                  LED_PIN,
                  outputEnabled ? "HIGH" : "LOW");

    // Broadcast zmeny stavu cez WebSocket
    ws.textAll(getOutputMessageJson());
}

/**
 * Generuje vzorku telemetrie v rovnakých rozsahoch ako simulátor.
 */
void generateTelemetry() {
    sequence++;

    // Generovanie ukážkového payloadu (teplota 22.0 - 26.0 °C, vlhkosť 40.0 - 55.0 %)
    temperature = roundf((22.0f + ((float)random(0, 401) / 100.0f)) * 10.0f) / 10.0f;
    humidity = roundf((40.0f + ((float)random(0, 1501) / 100.0f)) * 10.0f) / 10.0f;

    if (ws.count() > 0) {
        ws.textAll(getTelemetryMessageJson());
    }
}

/**
 * Odošle chybovú správu konkrétnemu WebSocket klientovi
 */
void sendWsError(AsyncWebSocketClient *client, const char *msg) {
    JsonDocument doc;
    doc["type"] = "error";
    doc["message"] = msg;

    String out;
    serializeJson(doc, out);
    client->text(out);
}

/**
 * Spracovanie prichádzajúcej WebSocket správy od klienta
 */
void handleWsMessage(AsyncWebSocketClient *client, void *arg, uint8_t *data, size_t len) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (!info->final || info->index != 0 || info->len != len) {
        return;
    }

    if (info->opcode != WS_TEXT) {
        sendWsError(client, "Očakáva sa textová JSON správa.");
        return;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, data, len);
    if (err) {
        sendWsError(client, "Neplatný JSON.");
        return;
    }

    if (!doc.is<JsonObject>()) {
        sendWsError(client, "Správa musí byť JSON objekt.");
        return;
    }

    const char *type = doc["type"] | "";
    if (strcmp(type, "setOutput") == 0) {
        const char *reqId = doc["requestId"] | "";
        size_t reqLen = strlen(reqId);
        if (reqLen == 0 || reqLen > 128) {
            sendWsError(client, "Príkaz musí obsahovať platné requestId.");
            return;
        }

        if (!doc["outputEnabled"].is<bool>()) {
            sendWsError(client, "Pole outputEnabled musí byť boolean.");
            return;
        }

        bool nextState = doc["outputEnabled"].as<bool>();
        setOutputState(nextState, "WS");

        // 1. Priama odpoveď outputAck odosielateľovi príkazu s jeho requestId
        JsonDocument ackDoc;
        ackDoc["type"] = "outputAck";
        ackDoc["requestId"] = reqId;
        JsonObject d = ackDoc["data"].to<JsonObject>();
        d["outputEnabled"] = outputEnabled;

        String ackJson;
        serializeJson(ackDoc, ackJson);
        client->text(ackJson);
        return;
    }

    sendWsError(client, "Neznámy typ správy.");
}

/**
 * Spracovanie udalostí WebSocket spojenia
 */
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
               AwsEventType type, void *arg, uint8_t *data, size_t len) {
    switch (type) {
        case WS_EVT_CONNECT: {
            Serial.printf("[WS] Klient #%u pripojený z %s\n",
                          client->id(),
                          client->remoteIP().toString().c_str());
            // Novému klientovi odošleme okamžite aktuálny stav (telemetriu a výstup)
            client->text(getTelemetryMessageJson());
            client->text(getOutputMessageJson());
            break;
        }
        case WS_EVT_DISCONNECT: {
            Serial.printf("[WS] Klient #%u odpojený\n", client->id());
            break;
        }
        case WS_EVT_DATA: {
            handleWsMessage(client, arg, data, len);
            break;
        }
        case WS_EVT_ERROR: {
            Serial.printf("[WS] Chyba klienta #%u\n", client->id());
            break;
        }
        default:
            break;
    }
}

/**
 * Konfigurácia HTTP ciest (kompatibilné so simulátorom) a CORS hlavičiek
 */
void setupHttpRoutes() {
    // Globálne CORS a Cache hlavičky pre browser klienta
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    DefaultHeaders::Instance().addHeader("Cache-Control", "no-store");

    // GET /health
    server.on("/health", HTTP_GET, [](AsyncWebServerRequest *request) {
        JsonDocument doc;
        doc["status"] = "ok";
        doc["deviceId"] = DEVICE_ID;
        doc["simulated"] = false;
        JsonArray protocols = doc["protocols"].to<JsonArray>();
        protocols.add("HTTP/REST");
        protocols.add("WebSocket");

        String res;
        serializeJson(doc, res);
        request->send(200, "application/json", res);
    });

    // GET /telemetry
    server.on("/telemetry", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", getTelemetryPayloadJson());
    });

    // GET /output
    server.on("/output", HTTP_GET, [](AsyncWebServerRequest *request) {
        JsonDocument doc;
        doc["outputEnabled"] = outputEnabled;

        String res;
        serializeJson(doc, res);
        request->send(200, "application/json", res);
    });

    // PUT /output
    server.on("/output", HTTP_PUT,
        [](AsyncWebServerRequest *request) {
            // Ak nebolo telo spracované v onBody (napr. prázdne telo):
            if (!request->_tempObject) {
                request->send(400, "application/json",
                              "{\"error\":\"Chýba telo požiadavky.\"}");
            }
        },
        nullptr,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            if (index == 0) {
                request->_tempObject = (void*)1;
                JsonDocument doc;
                DeserializationError err = deserializeJson(doc, data, len);
                if (err || !doc["outputEnabled"].is<bool>()) {
                    request->send(400, "application/json",
                                  "{\"error\":\"Pole outputEnabled musí byť boolean: true alebo false.\"}");
                    return;
                }

                bool nextState = doc["outputEnabled"].as<bool>();
                setOutputState(nextState, "HTTP");

                JsonDocument resDoc;
                resDoc["outputEnabled"] = outputEnabled;

                String res;
                serializeJson(resDoc, res);
                request->send(200, "application/json", res);
            }
        }
    );

    // OPTIONS prehlidačové preflight požiadavky (CORS)
    server.on("/output", HTTP_OPTIONS, [](AsyncWebServerRequest *request) {
        request->send(204);
    });
    server.on("/telemetry", HTTP_OPTIONS, [](AsyncWebServerRequest *request) {
        request->send(204);
    });
    server.on("/health", HTTP_OPTIONS, [](AsyncWebServerRequest *request) {
        request->send(204);
    });

    // 404 handler
    server.onNotFound([](AsyncWebServerRequest *request) {
        if (request->method() == HTTP_OPTIONS) {
            request->send(204);
            return;
        }
        request->send(404, "application/json", "{\"error\":\"Neznáma cesta.\"}");
    });
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    // Inicializácia pinu LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    Serial.println("\n==================================================");
    Serial.println("  ESP32 IoT Node - Diplomová práca");
    Serial.println("  Protokoly: HTTP/REST, WebSocket");
    Serial.printf("  LED Pin: GPIO %d\n", LED_PIN);
    Serial.println("==================================================");

#ifdef WIFI_SSID_OVERRIDE
    Serial.printf("[WiFi] Pripájanie k zadanej sieti: %s\n", WIFI_SSID_OVERRIDE);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID_OVERRIDE, WIFI_PASS_OVERRIDE);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();
#else
    Serial.println("[WiFi] Inicializácia WiFiManager...");
    WiFiManager wm;
    wm.setConfigPortalTimeout(AP_TIMEOUT_SECONDS);

    Serial.printf("[WiFi] Ak nie je sieť uložená, pripoj sa k AP: '%s'\n", AP_SSID);
    bool connected = wm.autoConnect(AP_SSID, AP_PASS);
    if (!connected) {
        Serial.println("[WiFi] Vypršal čas na konfiguráciu Wi-Fi. Reštartujem uzol...");
        delay(3000);
        ESP.restart();
    }
#endif

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[WiFi] Úspešne pripojené k sieti!");
        Serial.printf("[WiFi] IP adresa: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] Sila signálu (RSSI): %d dBm\n", WiFi.RSSI());
    }

    // Synchronizácia času cez NTP server
    configTime(0, 0, "pool.ntp.org", "time.google.com");

    // Inicializácia mDNS
    if (MDNS.begin(MDNS_HOSTNAME)) {
        Serial.printf("[mDNS] Uzol dostupný na: http://%s.local:%d\n", MDNS_HOSTNAME, SERVER_PORT);
        MDNS.addService("http", "tcp", SERVER_PORT);
    }

    // Registrácia WebSocket a HTTP obsluhy
    ws.onEvent(onWsEvent);
    server.addHandler(&ws);
    setupHttpRoutes();

    // Spustenie webového servera
    server.begin();

    Serial.println("--------------------------------------------------");
    Serial.printf("  HTTP API:      http://%s:%d\n", WiFi.localIP().toString().c_str(), SERVER_PORT);
    Serial.printf("  WebSocket:     ws://%s:%d/ws\n", WiFi.localIP().toString().c_str(), SERVER_PORT);
    Serial.println("  ESP32 je pripravené prijímať príkazy.");
    Serial.println("  (Tip: pre vymazanie Wi-Fi údajov odošli do monitora 'r')");
    Serial.println("==================================================");

    // Počiatočná vzorka
    generateTelemetry();
}

void loop() {
    unsigned long now = millis();

    // Periodická telemetria každú sekundu
    if (now - lastTelemetryTime >= 1000) {
        lastTelemetryTime = now;
        generateTelemetry();
    }

    // Odstránenie neaktívnych WS spojení
    ws.cleanupClients();

    // Reset Wi-Fi credentials cez sériový monitor zadaním písmena 'r'
    if (Serial.available()) {
        char c = (char)Serial.read();
        if (c == 'r' || c == 'R') {
            Serial.println("\n[RESET] Vymazávam uložené Wi-Fi údaje a reštartujem...");
            WiFi.disconnect(true, true);
            delay(1000);
            ESP.restart();
        }
    }
}
