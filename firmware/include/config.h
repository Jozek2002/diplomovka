#pragma once

#include <Arduino.h>

// =============================================================================
// Hardvérová konfigurácia
// =============================================================================

// Pin vstavanej LED diódy (GPIO 2 na väčšine 30-pinových ESP32-WROOM-32 dosiek)
constexpr uint8_t LED_PIN = 2;

// Identifikátor zariadenia
constexpr const char *DEVICE_ID = "esp32-01";

// Sieťový port pre HTTP a WebSocket server (štandardný port HTTP je 80)
constexpr uint16_t SERVER_PORT = 80;

// Hostname pre mDNS (zariadenie bude v lokálnej sieti dostupné ako http://esp32-node.local)
constexpr const char *MDNS_HOSTNAME = "esp32-node";

// =============================================================================
// Konfigurácia Wi-Fi Manager (AP konfiguračný portál)
// =============================================================================

// Názov Access Pointu, ktorý ESP32 vytvorí, ak nemá uložené platné prihlasovacie údaje
constexpr const char *AP_SSID = "ESP32-IoT-Node";

// Heslo pre AP (nechaj prázdne "" pre otvorenú sieť, alebo zadaj min. 8 znakov)
constexpr const char *AP_PASS = "";

// Timeout konfiguračného portálu v sekundách (po vypršaní reštartuje uzol)
constexpr uint16_t AP_TIMEOUT_SECONDS = 180;

// =============================================================================
// Voliteľný statický prepis Wi-Fi (pre vývoj bez nutnosti prechádzať AP portálom)
// Ak chceš pripojenie natvrdo, odkomentuj a doplň údaje:
// =============================================================================
// #define WIFI_SSID_OVERRIDE "Tvoja_WiFi_Siet"
// #define WIFI_PASS_OVERRIDE "Tvoje_WiFi_Heslo"
