export interface RoomStub {
  fetch(request: Request): Promise<Response>;
}

export interface RoomsNamespace {
  getByName(name: string): RoomStub;
}

export interface WorkerEnv {
  ROOMS: RoomsNamespace;
  ALLOWED_ORIGINS: string;
}
