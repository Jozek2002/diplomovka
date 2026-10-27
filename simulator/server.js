const express = require('express');
const cors = require('cors');
const http = require('node:http');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();

const HOST = '127.0.0.1';
const PORT = 3000;

const allowedOrigins = new Set([
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]);

app.use(
  cors({
    origin: [...allowedOrigins],
    methods: ['GET', 'PUT'],
  })
);

app.use(express.json({ limit: '16kb' }));

app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const server = http.createServer(app);

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 16 * 1024,
});

let outputEnabled = false;
let sequence = 0;
let telemetry;

function sendJson(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(message) {
  for (const client of wss.clients) {
    sendJson(client, message);
  }
}

function generateTelemetry() {
  sequence += 1;

  telemetry = {
    deviceId: 'simulator-01',
    simulated: true,
    sequence,
    temperature: Number((22 + Math.random() * 4).toFixed(1)),
    humidity: Number((40 + Math.random() * 15).toFixed(1)),
    generatedAt: Date.now(),
  };

  broadcast({
    type: 'telemetry',
    data: telemetry,
  });
}

function setOutput(enabled, source) {
  outputEnabled = enabled;

  console.log(
    `[${source}] Výstup: ${outputEnabled ? 'Zapnutý' : 'Vypnutý'}`
  );

  broadcast({
    type: 'output',
    data: { outputEnabled },
  });

  return { outputEnabled };
}

// HTTP rozhranie

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    deviceId: 'simulator-01',
    simulated: true,
    protocols: ['HTTP/REST', 'WebSocket'],
  });
});

app.get('/telemetry', (_req, res) => {
  res.json(telemetry);
});

app.get('/output', (_req, res) => {
  res.json({ outputEnabled });
});

app.put('/output', (req, res) => {
  const requestedState = req.body?.outputEnabled;

  if (typeof requestedState !== 'boolean') {
    return res.status(400).json({
      error: 'Pole outputEnabled musí byť boolean: true alebo false.',
    });
  }

  return res.json(setOutput(requestedState, 'HTTP'));
});

app.use((_req, res) => {
  res.status(404).json({
    error: 'Neznáma cesta.',
  });
});

// WebSocket rozhranie

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(
    request.url,
    `http://${HOST}:${PORT}`
  ).pathname;

  if (pathname !== '/ws') {
    socket.write(
      'HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'
    );
    socket.destroy();
    return;
  }

  const origin = request.headers.origin;

  if (origin && !allowedOrigins.has(origin)) {
    socket.write(
      'HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'
    );
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (client) => {
    wss.emit('connection', client, request);
  });
});

wss.on('connection', (socket) => {
  console.log('[WS] Klient pripojený');

  socket.on('error', (error) => {
    console.error('[WS] Chyba:', error.message);
  });

  // Novému klientovi okamžite pošleme aktuálny stav.
  sendJson(socket, {
    type: 'telemetry',
    data: telemetry,
  });

  sendJson(socket, {
    type: 'output',
    data: { outputEnabled },
  });

  socket.on('message', (raw, isBinary) => {
    if (isBinary) {
      sendJson(socket, {
        type: 'error',
        message: 'Očakáva sa textová JSON správa.',
      });
      return;
    }

    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendJson(socket, {
        type: 'error',
        message: 'Neplatný JSON.',
      });
      return;
    }

    if (
      !message ||
      typeof message !== 'object' ||
      Array.isArray(message)
    ) {
      sendJson(socket, {
        type: 'error',
        message: 'Správa musí byť JSON objekt.',
      });
      return;
    }

    if (message.type === 'setOutput') {
      if (typeof message.outputEnabled !== 'boolean') {
        sendJson(socket, {
          type: 'error',
          message: 'Pole outputEnabled musí byť boolean.',
        });
        return;
      }

      setOutput(message.outputEnabled, 'WS');
      return;
    }

    sendJson(socket, {
      type: 'error',
      message: 'Neznámy typ správy.',
    });
  });

  socket.on('close', () => {
    console.log('[WS] Klient odpojený');
  });
});

// Generátor je spoločný pre oba protokoly.
generateTelemetry();
setInterval(generateTelemetry, 1000);

server.listen(PORT, HOST, () => {
  console.log(`HTTP: http://${HOST}:${PORT}`);
  console.log(`WebSocket: ws://${HOST}:${PORT}/ws`);
  console.log('Simulátor je pripravený.');
});