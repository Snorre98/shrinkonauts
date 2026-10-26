import "../ui/styles.css";
import { bootGame, type BootResult } from "../game/boot";

declare global {
  interface Window {
    __shrinkonauts?: BootResult;
  }
}

bootGame()
  .then((result) => {
    window.__shrinkonauts = result;
  })
  .catch((error: unknown) => {
    console.error("[shrinkonauts] boot failed", error);
  });
