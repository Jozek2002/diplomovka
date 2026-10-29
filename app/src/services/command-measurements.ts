import { useSyncExternalStore } from 'react';

import type { Protocol } from '@/types/iot';

export type MeasurementOutcome =
  | 'confirmed'
  | 'timeout'
  | 'error'
  | 'interrupted';

export type CommandMeasurement = {
  id: string;
  sessionId: string;
  protocol: Protocol;
  endpoint: string;
  environment: 'local-simulator';
  requestId: string;
  requestedOutput: boolean;
  confirmedOutput: boolean | null;
  sentAt: string;
  finishedAt: string;
  outcome: MeasurementOutcome;
  rttMs: number | null;
  elapsedMs: number;
  detail: string;
};

type StartInput = {
  sessionId: string;
  protocol: Protocol;
  endpoint: string;
  requestId: string;
  requestedOutput: boolean;
};

type PendingMeasurement = StartInput & {
  id: string;
  sentAt: string;
  startedAt: number;
};

type FinishInput = {
  outcome: MeasurementOutcome;
  endedAt?: number;
  confirmedOutput?: boolean;
  detail?: string;
};

let counter = 0;

let records: readonly CommandMeasurement[] = [];

const pending = new Map<string, PendingMeasurement>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return records;
}

export function useCommandMeasurements() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
}

export function startMeasurement(
  input: StartInput
): string {
  counter += 1;

  const id = `measurement-${Date.now()}-${counter}`;

  const measurement: PendingMeasurement = {
    ...input,
    id,
    sentAt: new Date().toISOString(),
    startedAt: 0,
  };

  pending.set(id, measurement);

  // Posledná operácia pred návratom k odoslaniu.
  measurement.startedAt = performance.now();

  return id;
}

export function finishMeasurement(
  id: string,
  input: FinishInput
): CommandMeasurement | null {
  const endedAt = input.endedAt ?? performance.now();

  const measurement = pending.get(id);

  if (!measurement) {
    return null;
  }

  // Zamedzí druhému ukončeniu toho istého merania.
  pending.delete(id);

  const elapsedMs = Math.max(
    0,
    endedAt - measurement.startedAt
  );

  const result: CommandMeasurement = {
    id: measurement.id,
    sessionId: measurement.sessionId,
    protocol: measurement.protocol,
    endpoint: measurement.endpoint,
    environment: 'local-simulator',
    requestId: measurement.requestId,
    requestedOutput: measurement.requestedOutput,
    confirmedOutput: input.confirmedOutput ?? null,
    sentAt: measurement.sentAt,
    finishedAt: new Date().toISOString(),
    outcome: input.outcome,
    rttMs:
      input.outcome === 'confirmed'
        ? elapsedMs
        : null,
    elapsedMs,
    detail: input.detail ?? '',
  };

  records = [...records, result];
  notify();

  return result;
}

export function clearCommandMeasurements() {
  // Prebiehajúce meranie sa nevymaže.
  records = [];
  notify();
}

function csvCell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ''
      : String(value);

  // Ochrana textových buniek pred vzorcami v tabuľkovom editore.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function measurementsToCsv(
  data: readonly CommandMeasurement[]
): string {
  const columns: (keyof CommandMeasurement)[] = [
    'id',
    'sessionId',
    'protocol',
    'endpoint',
    'environment',
    'requestId',
    'requestedOutput',
    'confirmedOutput',
    'sentAt',
    'finishedAt',
    'outcome',
    'rttMs',
    'elapsedMs',
    'detail',
  ];

  const header = columns.join(',');

  const rows = data.map((record) =>
    columns
      .map((column) => csvCell(record[column]))
      .join(',')
  );

  return '\uFEFF' + [header, ...rows].join('\r\n');
}