import type { WorkerEnv } from "./env";
import { handleRequest } from "./router";

export { GameRoom } from "./room";

export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<WorkerEnv>;
