import "./controller.css";
import {
  decodeControllerServerMessage,
  type ControllerClientMessage,
  type ControllerServerMessage,
  type PlayerSlot,
} from "../net/protocol";
import { ensureDeviceToken } from "../net/demo-client";
import {
  buildControllerUrl,
  buildRoomSocketUrl,
  normalizeRoomCode,
  parseControllerUrl,
} from "../net/room-code";
import { WebSocketRoomTransport } from "../net/transport";
import {
  ControllerSession,
  type ControllerSessionView,
} from "./controller-session";
import {
  HAPTICS_STORAGE_KEY,
  mountControllerUi,
  type ControllerUi,
} from "./controller-ui";
import type { DashDirection } from "./touch-gestures";
import { TouchInputModel, type TouchControl } from "./touch-layout";

const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? "dev";
const NET_URL = import.meta.env.VITE_NET_URL?.trim() ?? "";

const root = document.getElementById("controller-root");
if (!root) {
  throw new Error("CONTROLLER_ROOT: #controller-root is missing");
}

const touch = new TouchInputModel();
let ui: ControllerUi;
let session: ControllerSession | null = null;
let ticker: number | null = null;
let currentRoom = "";
let currentSlot: PlayerSlot = "p1";
let lastState: ControllerSessionView["state"] = "idle";
let wakeLock: WakeLockSentinel | null = null;
let requestingWakeLock = false;
let joinGeneration = 0;

function pulse(): void {
  try {
    if (window.localStorage.getItem(HAPTICS_STORAGE_KEY) === "off") return;
    navigator.vibrate?.(8);
  } catch {
    // Haptics are optional and unavailable on many browsers.
  }
}

function sendInputNow(): void {
  session?.sendInput(touch.snapshot());
}

ui = mountControllerUi(root, {
  onJoin: (room, slot) => {
    void startJoin(room, slot);
  },
  onControl: (control: TouchControl, pressed: boolean, pointerId: number) => {
    if (pressed) {
      touch.press(control, pointerId);
      pulse();
    } else {
      touch.release(control, pointerId);
    }
    sendInputNow();
  },
  onDash: (direction: DashDirection) => {
    touch.triggerDash(direction);
    pulse();
    sendInputNow();
  },
  onReload: () => {
    window.location.reload();
  },
});

function endMessage(view: ControllerSessionView): string {
  if (view.error) return view.error.message;
  switch (view.endReason) {
    case "host-left":
      return "The host ended the session.";
    case "slot-closed":
      return "The host switched this player to the keyboard.";
    case "reconnect-timeout":
      return "Could not reconnect within 60 seconds. Check the room code and try again.";
    case "reconnect-exhausted":
      return "Could not reconnect. Check the room code and try again.";
    case "demo-time-limit":
      return "This demo session reached its 20-minute limit.";
    case "demo-message-limit":
      return "This demo session reached its traffic limit.";
    case "join-timeout":
      return "The controller took too long to join. Try again.";
    case "ready-timeout":
      return "The controller took too long to get ready. Try again.";
    default:
      return view.endReason ?? "The session ended.";
  }
}

function handleView(view: ControllerSessionView): void {
  const previous = lastState;
  lastState = view.state;

  if (view.state === "ended") {
    joinGeneration += 1;
    touch.clear();
    const ending = session;
    session = null;
    stopTicker();
    ending?.destroy();
    clearHash();
    ui.showJoin({
      room: currentRoom,
      slot: currentSlot,
      message: endMessage(view),
    });
    lastState = "idle";
    return;
  }

  if (view.state === "error") {
    joinGeneration += 1;
    touch.clear();
    const failed = session;
    session = null;
    stopTicker();
    failed?.destroy();
    ui.showFatal(
      view.error?.message ?? "The controller connection failed.",
    );
    lastState = "idle";
    return;
  }

  if (view.state !== "ready") {
    touch.clear();
  }
  ui.update(view);
  if (view.state === "ready" && previous !== "ready") {
    sendInputNow();
  }
}

function startTicker(): void {
  stopTicker();
  ticker = window.setInterval(() => {
    const active = session;
    if (!active) return;
    void active.tick(performance.now()).catch(() => {
      // ControllerSession handles transport failures; a rejected tick is
      // allowed to leave the next tick to retry the reconnect.
    });
    if (active.state === "ready" && !document.hidden) {
      active.sendInput(touch.snapshot());
    }
  }, 100);
}

function stopTicker(): void {
  if (ticker !== null) {
    window.clearInterval(ticker);
    ticker = null;
  }
}

function stopSession(): void {
  touch.clear();
  const active = session;
  session = null;
  stopTicker();
  active?.destroy();
}

function setHash(
  room: string,
  slot: PlayerSlot,
  ticket?: string,
): void {
  try {
    history.replaceState(
      null,
      "",
      buildControllerUrl(window.location.href, room, slot, ticket),
    );
  } catch {
    // The page still works when history is unavailable (for example file://).
  }
}

function clearHash(): void {
  try {
    history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  } catch {
    // Best-effort cleanup only.
  }
}

async function startJoin(
  rawRoom: string,
  slot: PlayerSlot,
  ticket?: string,
): Promise<void> {
  const generation = ++joinGeneration;
  const room = normalizeRoomCode(rawRoom);
  if (!room.ok) {
    ui.showJoin({
      room: rawRoom.toUpperCase(),
      slot,
      message: room.error.message,
    });
    return;
  }
  if (!NET_URL) {
    ui.showFatal(
      "This controller build is missing VITE_NET_URL, so it cannot reach the room relay.",
    );
    return;
  }

  let deviceToken: string;
  try {
    const device = await ensureDeviceToken({ netUrl: NET_URL });
    deviceToken = device.token;
  } catch (error) {
    if (generation !== joinGeneration) return;
    ui.showJoin({
      room: room.value,
      slot,
      message:
        error instanceof Error
          ? error.message
          : "The demo relay could not issue a device token.",
    });
    return;
  }
  if (generation !== joinGeneration) return;

  stopSession();
  currentRoom = room.value;
  currentSlot = slot;
  lastState = "idle";
  ui.showBoard(currentRoom, currentSlot);
  setHash(currentRoom, currentSlot, ticket);

  let next: ControllerSession | null = null;
  next = new ControllerSession({
    room: currentRoom,
    slot: currentSlot,
    buildId: BUILD_ID,
    createTransport: () =>
      new WebSocketRoomTransport<
        ControllerClientMessage,
        ControllerServerMessage
      >({
        url: buildRoomSocketUrl(NET_URL, currentRoom, "controller", {
          slot: currentSlot,
          ...(ticket ? { ticket } : {}),
          device: deviceToken,
        }),
        decode: decodeControllerServerMessage,
        onProtocolError: (error) => {
          next?.reportProtocolError(error);
        },
      }),
    onChange: (view) => {
      if (session === next) handleView(view);
    },
  });

  session = next;
  next.markUiReady();
  startTicker();
  void next.connect().catch((error: unknown) => {
    ui.showFatal(
      error instanceof Error ? error.message : String(error),
    );
  });
}

async function requestWakeLock(): Promise<void> {
  if (!navigator.wakeLock || wakeLock || requestingWakeLock) return;
  requestingWakeLock = true;
  try {
    const lock = await navigator.wakeLock.request("screen");
    wakeLock = lock;
    lock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  } finally {
    requestingWakeLock = false;
  }
}

window.addEventListener(
  "pointerdown",
  () => {
    void requestWakeLock();
  },
  { passive: true },
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    touch.clear();
    sendInputNow();
    return;
  }
  if (session?.state === "ready") {
    void requestWakeLock();
  }
});
window.addEventListener("pagehide", () => {
  void wakeLock?.release();
  wakeLock = null;
});

const initial = parseControllerUrl(window.location.href);
if (initial.ok) {
  void startJoin(
    initial.value.room,
    initial.value.slot,
    initial.value.ticket,
  );
} else {
  ui.showJoin({
    slot: "p1",
    message: window.location.hash.length > 1 ? initial.error.message : null,
  });
}
