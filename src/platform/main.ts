import "../ui/styles.css";
import { bootApp, type AppController } from "../game/boot";
import { createHostRunFactory } from "../net";

declare global {
  interface Window {
    __shrinkonauts?: AppController;
  }
}

bootApp({
  buildId: import.meta.env.VITE_BUILD_ID ?? "dev",
  hostRunFactory: createHostRunFactory({
    netUrl: import.meta.env.VITE_NET_URL,
  }),
})
  .then((app) => {
    window.__shrinkonauts = app;
  })
  .catch((error: unknown) => {
    console.error("[shrinkonauts] boot failed", error);
  });
