import "../ui/styles.css";
import {
  bootApp,
  type AppController,
  type BootRoomSession,
} from "../game/boot";
import {
  DemoClientError,
  buildControllerUrl,
  createHostRunFactory,
  createRoomSession,
  ensureDeviceToken,
  generateRoomCode,
  releaseRoomSession,
} from "../net";

declare global {
  interface Window {
    __shrinkonauts?: AppController;
  }
}

const controllerPageUrl = new URL(
  "controller.html",
  document.baseURI,
).toString();
const netUrl = import.meta.env.VITE_NET_URL?.trim() ?? "";

async function createBootSession(
  room?: string,
): Promise<BootRoomSession> {
  if (!netUrl) {
    throw new Error(
      "VITE_NET_URL is required for phone controllers.",
    );
  }
  const device = await ensureDeviceToken({ netUrl });
  let code = room ?? generateRoomCode();
  try {
    const session = await createRoomSession(
      { netUrl },
      code,
      device.token,
    );
    return { ...session, deviceToken: device.token };
  } catch (error) {
    if (
      !room &&
      error instanceof DemoClientError &&
      error.code === "ROOM_TAKEN"
    ) {
      code = generateRoomCode();
      const session = await createRoomSession(
        { netUrl },
        code,
        device.token,
      );
      return { ...session, deviceToken: device.token };
    }
    throw error;
  }
}

bootApp({
  buildId: import.meta.env.VITE_BUILD_ID ?? "dev",
  hostRunFactory: createHostRunFactory({
    netUrl: import.meta.env.VITE_NET_URL,
  }),
  createSession: createBootSession,
  releaseSession: (room, ticket) =>
    releaseRoomSession({ netUrl }, room, ticket),
  controllerUrlFor: (room, slot, ticket) =>
    buildControllerUrl(controllerPageUrl, room, slot, ticket),
})
  .then((app) => {
    window.__shrinkonauts = app;
  })
  .catch((error: unknown) => {
    console.error("[shrinkonauts] boot failed", error);
  });
