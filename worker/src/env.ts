import type { DemoEnv } from "./demo-config";

export interface RoomStub {
  fetch(request: Request): Promise<Response>;
}

export interface RoomsNamespace {
  getByName(name: string): RoomStub;
}

export interface DemoGateStub {
  fetch(request: Request): Promise<Response>;
}

export interface DemoGateNamespace {
  getByName(name: string): DemoGateStub;
}

export interface WorkerEnv extends DemoEnv {
  ROOMS: RoomsNamespace;
  DEMO_GATE: DemoGateNamespace;
  ALLOWED_ORIGINS: string;
}
