const express = require('express');
const cors = require('cors');

const app = express();

const HOST = '127.0.0.1';
const PORT = 3000;

app.use(
  cors({
    origin: [
      'http://localhost:8081',
      'http://127.0.0.1:8081',
    ],
    methods: ['GET', 'PUT'],
  })
);

app.use(express.json({ limit: '16kb' }));

// Odpovede chceme načítať nanovo, nie z vyrovnávacej pamäte.
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

let outputEnabled = false;
let sequence = 0;
let telemetry;

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
}

// Simulátor vytvára vzorky nezávisle od požiadaviek aplikácie.
generateTelemetry();
setInterval(generateTelemetry, 1000);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    deviceId: 'simulator-01',
    simulated: true,
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

  outputEnabled = requestedState;

  console.log(
    `[OUTPUT] ${outputEnabled ? 'Zapnutý' : 'Vypnutý'}`
  );

  return res.json({ outputEnabled });
});

app.use((_req, res) => {
  res.status(404).json({
    error: 'Neznáma cesta.',
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Simulátor beží na http://${HOST}:${PORT}`);
  console.log('Telemetria: GET /telemetry');
  console.log('Stav výstupu: GET /output');
  console.log('Ovládanie výstupu: PUT /output');
});