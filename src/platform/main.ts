import "../ui/styles.css";
import { bootApp, type AppController } from "../game/boot";
import { buildControllerUrl, createHostRunFactory } from "../net";

declare global {
  interface Window {
    __shrinkonauts?: AppController;
  }
}

const controllerPageUrl = new URL(
  "controller.html",
  document.baseURI,
).toString();

bootApp({
  buildId: import.meta.env.VITE_BUILD_ID ?? "dev",
  hostRunFactory: createHostRunFactory({
    netUrl: import.meta.env.VITE_NET_URL,
  }),
  controllerUrlFor: (room, slot) =>
    buildControllerUrl(controllerPageUrl, room, slot),
})
  .then((app) => {
    window.__shrinkonauts = app;
  })
  .catch((error: unknown) => {
    console.error("[shrinkonauts] boot failed", error);
  });
