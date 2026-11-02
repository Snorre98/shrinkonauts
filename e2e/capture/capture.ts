import { expect, type Page } from "@playwright/test";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { CAPTURE_STATES, type CaptureState } from "./states";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const CAPTURES_DIR = join(ROOT, "gdd-captures");
const MANIFEST_PATH = join(CAPTURES_DIR, "captures.json");

export interface CapturedState extends CaptureState {
  file: string;
  width: number;
  height: number;
  capturedAt: string;
}

export interface CaptureManifest {
  schemaVersion: 1;
  generated: string;
  viewport: { width: number; height: number };
  captures: CapturedState[];
}

interface HubSceneShape {
  drum?: { angle?: number } | null;
  tinyAstronaut?: { visible?: boolean } | null;
}

type WindowWithScene = Window & {
  __shrinkonauts?: {
    game?: {
      scene?: {
        getScene?(key: string): unknown;
      };
      loop?: {
        sleep(): void;
        wake(): void;
      };
    } | null;
  };
};

function emptyManifest(): CaptureManifest {
  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    viewport: { width: 1280, height: 720 },
    captures: [],
  };
}

export function readCaptureManifest(): CaptureManifest {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as CaptureManifest;
  } catch {
    return emptyManifest();
  }
}

function writeCaptureManifest(captures: CapturedState[]): void {
  const manifest: CaptureManifest = {
    ...emptyManifest(),
    captures: [...captures].sort((a, b) => a.order - b.order),
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function resetCaptures(): void {
  rmSync(CAPTURES_DIR, { recursive: true, force: true });
  mkdirSync(CAPTURES_DIR, { recursive: true });
  writeCaptureManifest([]);
}

async function sleepGame(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as WindowWithScene).__shrinkonauts?.game?.loop?.sleep();
  });
}

async function wakeGame(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as WindowWithScene).__shrinkonauts?.game?.loop?.wake();
  });
}

/**
 * Captures a viewport-sized PNG from the current app state. The fixed Step
 * loop is paused for the frame so transient gameplay effects and cinematic
 * tweens do not move between the assertion and the screenshot.
 */
export async function captureShot(page: Page, id: string): Promise<void> {
  const state = CAPTURE_STATES.find((entry) => entry.id === id);
  if (!state) throw new Error(`Unknown capture state: ${id}`);

  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(120);

  const file = `${id}.png`;
  const path = join(CAPTURES_DIR, file);
  await sleepGame(page);
  try {
    await page.screenshot({
      path,
      type: "png",
      animations: "disabled",
      caret: "hide",
      fullPage: false,
    });
  } finally {
    await wakeGame(page);
  }

  const png = PNG.sync.read(readFileSync(path));
  expect(png.width).toBe(1280);
  expect(png.height).toBe(720);

  const current = readCaptureManifest().captures.filter(
    (entry) => entry.id !== id,
  );
  current.push({
    ...state,
    file,
    width: png.width,
    height: png.height,
    capturedAt: new Date().toISOString(),
  });
  writeCaptureManifest(current);
}

export async function withCss<T>(
  page: Page,
  css: string,
  action: () => Promise<T>,
): Promise<T> {
  const style = await page.addStyleTag({ content: css });
  try {
    return await action();
  } finally {
    await style.evaluate((node) => (node as Element).remove());
  }
}

export async function withHiddenHud<T>(
  page: Page,
  action: () => Promise<T>,
): Promise<T> {
  return withCss(
    page,
    `
      .hud,
      .surface-layer,
      .overlay-root,
      .hub-skip,
      .hub-transition {
        display: none !important;
      }
    `,
    action,
  );
}

/**
 * Polls the actual HubScene objects rather than sleeping for a guessed
 * duration. The drum angle proves the spin has started; the tiny astronaut
 * proves the shrink/arrival frame is on screen.
 */
export async function waitForLaunchPhase(
  page: Page,
  phase: "spin" | "shrink",
): Promise<void> {
  await page.waitForFunction(
    (wanted) => {
      const app = (window as WindowWithScene).__shrinkonauts;
      const scene = app?.game?.scene?.getScene?.("hub") as
        | HubSceneShape
        | null
        | undefined;
      if (!scene) return false;
      if (wanted === "spin") {
        return (
          Boolean(scene.drum) &&
          Math.abs(scene.drum?.angle ?? 0) > 45
        );
      }
      return Boolean(scene.tinyAstronaut?.visible);
    },
    phase,
    { timeout: 20_000 },
  );
  // Let the scene publish the frame after the polling condition.
  await page.waitForTimeout(80);
}

export function missingCaptureIds(): string[] {
  const captured = new Set(
    readCaptureManifest().captures.map((entry) => entry.id),
  );
  return CAPTURE_STATES.filter((state) => !captured.has(state.id)).map(
    (state) => state.id,
  );
}
