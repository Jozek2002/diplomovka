import type {
  OutputAck,
  OutputState,
  ServerMessage,
  Telemetry,
} from '@/types/iot';

export const WS_URL = 'ws://127.0.0.1:3000/ws';

type WebSocketCallbacks = {
  onTelemetry: (data: Telemetry) => void;
  onOutput: (data: OutputState) => void;
  onOutputAck: (message: OutputAck) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onClose: () => void;
};

export function createWebSocketClient(
  callbacks: WebSocketCallbacks
): WebSocket {
  const socket = new WebSocket(WS_URL);

  let receivedTelemetry = false;
  let receivedOutput = false;
  let ready = false;

  function markReady() {
    if (!ready && receivedTelemetry && receivedOutput) {
      ready = true;
      callbacks.onReady();
    }
  }

  socket.onmessage = (event) => {
    let message: ServerMessage;

    try {
      message = JSON.parse(String(event.data)) as ServerMessage;

      if (
        message === null ||
        typeof message !== 'object' ||
        Array.isArray(message)
      ) {
        throw new Error('Správa musí byť objekt.');
      }
    } catch {
      callbacks.onError('Server poslal neplatnú JSON správu.');
      return;
    }

    switch (message.type) {
      case 'telemetry':
        callbacks.onTelemetry(message.data);
        receivedTelemetry = true;
        markReady();
        break;

      case 'output':
        callbacks.onOutput(message.data);
        receivedOutput = true;
        markReady();
        break;

      case 'outputAck':
        if (
          typeof message.requestId !== 'string' ||
          typeof message.data?.outputEnabled !== 'boolean'
        ) {
          callbacks.onError('Server poslal neplatné potvrdenie.');
          return;
        }

        callbacks.onOutputAck(message);
        break;

      case 'error':
        callbacks.onError(message.message);
        break;

      default:
        callbacks.onError('Server poslal neznámy typ správy.');
    }
  };

  socket.onerror = () => {
    callbacks.onError(
      'WebSocket spojenie zlyhalo. Skontroluj simulátor.'
    );
  };

  socket.onclose = () => {
    callbacks.onClose();
  };

  return socket;
}