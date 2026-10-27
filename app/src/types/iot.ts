export type Protocol = 'HTTP/REST' | 'WebSocket';

export type Status =
  | 'disconnected'
  | 'connecting'
  | 'connected';

export type Telemetry = {
  deviceId: string;
  simulated: boolean;
  sequence: number;
  temperature: number;
  humidity: number;
  generatedAt: number;
};

export type OutputState = {
  outputEnabled: boolean;
};

export type OutputAck = {
  type: 'outputAck';
  requestId: string;
  data: OutputState;
};

export type ServerMessage =
  | {
      type: 'telemetry';  
      data: Telemetry;
    }
  | {
      type: 'output';
      data: OutputState;
    }
  | OutputAck
  | {
      type: 'error';
      message: string;
    };