# Firmvér pre ESP32 – Diplomová práca

Tento projekt obsahuje firmvér pre 30-pinový modul **ESP32-WROOM-32**, ktorý implementuje zhodné komunikačné rozhranie ako pôvodný Node.js simulátor uzla.

## Vlastnosti firmvéru

- **Riadenie digitálneho výstupu**: Ovláda vstavanú modrú LED na **GPIO 2** (HIGH = zapnuté, LOW = vypnuté).
- **Zber telemetrie**: Každú sekundu generuje ukážkový payload (sekvencia, teplota 22–26 °C, vlhkosť 40–55 %, časová značka).
- **Komunikačné protokoly**:
  - **HTTP/REST API**: `GET /health`, `GET /telemetry`, `GET /output`, `PUT /output` s plnou podporou CORS pre webového klienta.
  - **WebSocket rozhranie**: `/ws` s okamžitým odoslaním počiatočného stavu, periodickým broadcastom telemetrie a potvrdeniami príkazov (`outputAck` s ID požiadavky).
- **Wi-Fi Manager**: Pri prvom štarte alebo nedostupnej sieti vytvorí AP portál (`ESP32-IoT-Node`), kde cez prehliadač jednoducho vyberieš svoju domácu/laboratórnu Wi-Fi.
- **mDNS podpora**: Zariadenie je v lokálnej sieti dostupné aj cez `http://esp32-node.local`.

---

## Požiadavky

1. **Hardvér**:
   - Doska s modulom ESP32-WROOM-32 (30-pinová verzia, napr. DOIT ESP32 DevKit v1).
   - Micro-USB dátový kábel (nie iba nabíjací).
2. **Softvér**:
   - Visual Studio Code s rozšírením **PlatformIO IDE** (alebo samostatné PlatformIO Core CLI).

---

## Štruktúra priečinka firmvéru

```text
firmware/
├── include/
│   └── config.h         # Hardvérové piny, porty, názov AP a voliteľné statické Wi-Fi
├── src/
│   └── main.cpp         # Implementácia HTTP, WebSocket, WiFiManager a logiky riadenia
├── platformio.ini       # Konfigurácia PlatformIO, doska esp32dev a závislosti knižníc
└── README.md            # Tento návod
```

---

## Postup nahratia firmvéru do ESP32

### 1. Otvorenie projektu v PlatformIO
V editore VS Code zvoľ **File -> Open Folder...** a otvor priečinok:
```text
diplomovka/firmware
```
PlatformIO automaticky stiahne potrebné závislosti definované v `platformio.ini` (`ArduinoJson`, `ESPAsyncWebServer`, `AsyncTCP`, `WiFiManager`).

### 2. Zostavenie (Build)
V dolnej lište VS Code (alebo v záložke PlatformIO) klikni na ikonu **Build** (fajočka `✓`), alebo použi skratku `Ctrl + Alt + B`.

### 3. Nahratie do ESP32 (Upload)
1. Pripoj dosku ESP32 cez USB k počítaču.
2. Klikni na ikonu **Upload** (šípka doprava `→`).
3. *(Ak sa nahrávanie zasekne na `Connecting........_____.....`, stlač a podrž tlačidlo `BOOT` na doske ESP32, kým nezačne zápis).*

### 4. Sériový monitor
Klikni na ikonu zásuvky (alebo **PlatformIO: Serial Monitor**) pri rýchlosti **115200 baud**.

---

## Prvé pripojenie k Wi-Fi (WiFiManager)

1. Po zapnutí ESP32 sa pokúsi pripojiť k uloženej sieti. Ak sieť ešte nie je nastavená:
2. ESP32 vytvorí vlastnú Wi-Fi sieť:
   - **SSID**: `ESP32-IoT-Node`
   - **Heslo**: *(otvorená sieť bez hesla)*
3. Na mobile alebo notebooku sa pripoj k sieti `ESP32-IoT-Node`.
4. Automaticky sa otvorí konfiguračný portál (prípadne v prehliadači otvor `http://192.168.4.1`).
5. Klikni na **Configure WiFi**, zvoľ svoju sieť, zadaj heslo a ulož.
6. ESP32 sa reštartuje, pripojí k tvojej Wi-Fi a v sériovom monitore vypíše pridelenú IP adresu:
   ```text
   [WiFi] Úspešne pripojené k sieti!
   [WiFi] IP adresa: 192.168.1.105
   --------------------------------------------------
     HTTP API:      http://192.168.1.105:80
     WebSocket:     ws://192.168.1.105:80/ws
   ==================================================
   ```

> [!TIP]
> **Ako znova vyvolať Wi-Fi portál:**
> Kedykoľvek chceš zmeniť sieť, otvor sériový monitor vo VS Code a odošli znak `r`. ESP32 vymaže uložené Wi-Fi údaje a po reštarte opäť spustí konfiguračný AP portál.

---

## Prepojenie s React Native aplikáciou (`app`)

Predvolene bola aplikácia nastavená na lokálny simulátor (`127.0.0.1:3000`). Pre komunikáciu s reálnym ESP32 vymeň adresu za IP adresu dosky:

1. V súbore `app/src/services/http-client.ts`:
   ```typescript
   export const HTTP_URL = 'http://<IP_ADRESA_ESP32>:80';
   ```
2. V súbore `app/src/services/websocket-client.ts`:
   ```typescript
   export const WS_URL = 'ws://<IP_ADRESA_ESP32>:80/ws';
   ```

*(Alebo v lokálnej sieti podporujúcej mDNS: `http://esp32-node.local:80` a `ws://esp32-node.local:80/ws`).*

---

## Rýchly test cez terminál (cURL)

Stav zariadenia:
```bash
curl http://<IP_ADRESA_ESP32>/health
```

Načítanie telemetrie:
```bash
curl http://<IP_ADRESA_ESP32>/telemetry
```

Zapnutie LED na ESP32:
```bash
curl -X PUT http://<IP_ADRESA_ESP32>/output -H "Content-Type: application/json" -d "{\"outputEnabled\": true}"
```

Vypnutie LED na ESP32:
```bash
curl -X PUT http://<IP_ADRESA_ESP32>/output -H "Content-Type: application/json" -d "{\"outputEnabled\": false}"
```
