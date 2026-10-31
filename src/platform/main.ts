import "../ui/styles.css";
import { bootApp, type AppController } from "../game/boot";

declare global {
  interface Window {
    __shrinkonauts?: AppController;
  }
}

bootApp()
  .then((app) => {
    window.__shrinkonauts = app;
  })
  .catch((error: unknown) => {
    console.error("[shrinkonauts] boot failed", error);
  });
