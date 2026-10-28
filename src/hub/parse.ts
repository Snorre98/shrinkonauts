import { err, ok, type Result } from "../core/result";
import { parseBackgroundLayer } from "../pack";
import {
  isRecord,
  isSchemaVersionSupported,
  readAssetId,
  readInteger,
  readNonEmptyString,
  readNumber,
} from "../pack/parse-common";
import type { RoomBackgroundLayer } from "../pack";
import type {
  HubAudio,
  HubDocument,
  HubIntro,
  HubMachine,
  HubPlayer,
  HubPoint,
  HubRect,
} from "./types";

const HUB_CODE = "HUB_SCHEMA_INVALID";

function readPoint(
  value: unknown,
  label: string,
): Result<HubPoint> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: ${label} must be an object with x/y`);
  }
  if (
    typeof value.x !== "number" ||
    !Number.isFinite(value.x) ||
    typeof value.y !== "number" ||
    !Number.isFinite(value.y)
  ) {
    return err(`${HUB_CODE}: ${label} needs finite x/y`);
  }
  return ok({ x: value.x, y: value.y });
}

function readRect(value: unknown, label: string): Result<HubRect> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: ${label} must be an object`);
  }
  const x = readNumber(value, "x", HUB_CODE, `${label}.x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", HUB_CODE, `${label}.y`);
  if (!y.ok) return err(y.error);
  const width = readNumber(value, "width", HUB_CODE, `${label}.width`);
  if (!width.ok) return err(width.error);
  const height = readNumber(value, "height", HUB_CODE, `${label}.height`);
  if (!height.ok) return err(height.error);
  if (width.value <= 0 || height.value <= 0) {
    return err(`${HUB_CODE}: ${label} must have positive width/height`);
  }
  return ok({ x: x.value, y: y.value, width: width.value, height: height.value });
}

function parseMachine(value: unknown): Result<HubMachine> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: machine must be an object`);
  }
  const body = readAssetId(value, "body", HUB_CODE, "machine.body");
  if (!body.ok) return err(body.error);
  const door = readAssetId(value, "door", HUB_CODE, "machine.door");
  if (!door.ok) return err(door.error);
  const drum = readAssetId(value, "drum", HUB_CODE, "machine.drum");
  if (!drum.ok) return err(drum.error);
  const x = readNumber(value, "x", HUB_CODE, "machine.x");
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", HUB_CODE, "machine.y");
  if (!y.ok) return err(y.error);
  const scale = value.scale === undefined
    ? ok(1)
    : readNumber(value, "scale", HUB_CODE, "machine.scale");
  if (!scale.ok) return err(scale.error);
  if (scale.value <= 0) {
    return err(`${HUB_CODE}: machine.scale must be positive`);
  }
  const screen = readRect(value.screen, "machine.screen");
  if (!screen.ok) return err(screen.error);
  const doorAnchor = readPoint(value.doorAnchor, "machine.doorAnchor");
  if (!doorAnchor.ok) return err(doorAnchor.error);
  const drumAnchor = readPoint(value.drumAnchor, "machine.drumAnchor");
  if (!drumAnchor.ok) return err(drumAnchor.error);
  return ok({
    body: body.value,
    door: door.value,
    drum: drum.value,
    x: x.value,
    y: y.value,
    scale: scale.value,
    screen: screen.value,
    doorAnchor: doorAnchor.value,
    drumAnchor: drumAnchor.value,
  });
}

function parsePlayer(value: unknown): Result<HubPlayer> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: player must be an object`);
  }
  const civilian = readAssetId(value, "civilian", HUB_CODE, "player.civilian");
  if (!civilian.ok) return err(civilian.error);
  const astronaut = readAssetId(value, "astronaut", HUB_CODE, "player.astronaut");
  if (!astronaut.ok) return err(astronaut.error);
  const idle = readPoint(value.idle, "player.idle");
  if (!idle.ok) return err(idle.error);
  const entry = readPoint(value.entry, "player.entry");
  if (!entry.ok) return err(entry.error);
  const exit = readPoint(value.exit, "player.exit");
  if (!exit.ok) return err(exit.error);
  const scale = value.scale === undefined
    ? ok(1)
    : readNumber(value, "scale", HUB_CODE, "player.scale");
  if (!scale.ok) return err(scale.error);
  const tinyScale = value.tinyScale === undefined
    ? ok(0.35)
    : readNumber(value, "tinyScale", HUB_CODE, "player.tinyScale");
  if (!tinyScale.ok) return err(tinyScale.error);
  if (scale.value <= 0 || tinyScale.value <= 0) {
    return err(`${HUB_CODE}: player scales must be positive`);
  }
  return ok({
    civilian: civilian.value,
    astronaut: astronaut.value,
    idle: idle.value,
    entry: entry.value,
    exit: exit.value,
    scale: scale.value,
    tinyScale: tinyScale.value,
  });
}

function parseAudio(value: unknown): Result<HubAudio> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: audio must be an object`);
  }
  const read = (key: keyof HubAudio, required: boolean) => {
    if (!required && value[key] === undefined) return ok(undefined);
    return readAssetId(value, key, HUB_CODE, `audio.${key}`);
  };
  const click = read("click", true);
  if (!click.ok) return err(click.error);
  const door = read("door", true);
  if (!door.ok) return err(door.error);
  const spin = read("spin", true);
  if (!spin.ok) return err(spin.error);
  const shrink = read("shrink", true);
  if (!shrink.ok) return err(shrink.error);
  const arrive = read("arrive", true);
  if (!arrive.ok) return err(arrive.error);
  const hum = read("hum", false);
  if (!hum.ok) return err(hum.error);
  return ok({
    click: click.value!,
    door: door.value!,
    spin: spin.value!,
    shrink: shrink.value!,
    arrive: arrive.value!,
    hum: hum.value,
  });
}

function parseIntro(value: unknown): Result<HubIntro> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: intro must be an object`);
  }
  const minDurationMs = readInteger(
    value,
    "minDurationMs",
    HUB_CODE,
    "intro.minDurationMs",
  );
  if (!minDurationMs.ok) return err(minDurationMs.error);
  const reducedMotionMs = readInteger(
    value,
    "reducedMotionMs",
    HUB_CODE,
    "intro.reducedMotionMs",
  );
  if (!reducedMotionMs.ok) return err(reducedMotionMs.error);
  const skipAfterMs = readInteger(
    value,
    "skipAfterMs",
    HUB_CODE,
    "intro.skipAfterMs",
  );
  if (!skipAfterMs.ok) return err(skipAfterMs.error);
  if (
    minDurationMs.value <= 0 ||
    reducedMotionMs.value <= 0 ||
    skipAfterMs.value < 0
  ) {
    return err(`${HUB_CODE}: intro timings must be positive`);
  }
  return ok({
    minDurationMs: minDurationMs.value,
    reducedMotionMs: reducedMotionMs.value,
    skipAfterMs: skipAfterMs.value,
  });
}

function parseAssetManifests(value: unknown): Result<HubDocument["assetManifests"]> {
  if (value === undefined) return ok({});
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: assetManifests must be an object`);
  }
  const result: HubDocument["assetManifests"] = {};
  for (const key of ["placeholder", "final"] as const) {
    const entry = value[key];
    if (entry === undefined) continue;
    if (typeof entry !== "string" || entry.trim() === "") {
      return err(`${HUB_CODE}: assetManifests.${key} must be a file name`);
    }
    result[key] = entry;
  }
  return ok(result);
}

export function parseHubDocument(value: unknown): Result<HubDocument> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: hub must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `${HUB_CODE}: expected schemaVersion 1.x, got ${String(value.schemaVersion)}`,
    );
  }
  const id = readNonEmptyString(value, "id", HUB_CODE);
  if (!id.ok) return err(id.error);
  const title = readNonEmptyString(value, "title", HUB_CODE);
  if (!title.ok) return err(title.error);
  const theme = readNonEmptyString(value, "theme", HUB_CODE);
  if (!theme.ok) return err(theme.error);
  const assetManifests = parseAssetManifests(value.assetManifests);
  if (!assetManifests.ok) return err(assetManifests.error);
  const width = readNumber(value, "width", HUB_CODE);
  if (!width.ok) return err(width.error);
  const height = readNumber(value, "height", HUB_CODE);
  if (!height.ok) return err(height.error);
  if (width.value <= 0 || height.value <= 0) {
    return err(`${HUB_CODE}: width/height must be positive`);
  }

  if (!isRecord(value.background) || !Array.isArray(value.background.layers)) {
    return err(`${HUB_CODE}: background.layers must be an array`);
  }
  const layers: RoomBackgroundLayer[] = [];
  for (const [index, raw] of value.background.layers.entries()) {
    const layer = parseBackgroundLayer(raw, index, HUB_CODE);
    if (!layer.ok) return err(layer.error);
    layers.push(layer.value);
  }
  if (layers.length === 0) {
    return err(`${HUB_CODE}: background.layers must not be empty`);
  }

  const machine = parseMachine(value.machine);
  if (!machine.ok) return err(machine.error);
  const player = parsePlayer(value.player);
  if (!player.ok) return err(player.error);
  const audio = parseAudio(value.audio);
  if (!audio.ok) return err(audio.error);
  const intro = parseIntro(value.intro);
  if (!intro.ok) return err(intro.error);

  return ok({
    schemaVersion: value.schemaVersion,
    id: id.value,
    title: title.value,
    theme: theme.value,
    assetManifests: assetManifests.value,
    width: width.value,
    height: height.value,
    background: { layers },
    machine: machine.value,
    player: player.value,
    audio: audio.value,
    intro: intro.value,
  });
}

export function collectHubAssetIds(hub: HubDocument): string[] {
  const ids = [
    ...hub.background.layers.map((layer) => layer.assetId),
    hub.machine.body,
    hub.machine.door,
    hub.machine.drum,
    hub.player.civilian,
    hub.player.astronaut,
    hub.audio.click,
    hub.audio.door,
    hub.audio.spin,
    hub.audio.shrink,
    hub.audio.arrive,
    ...(hub.audio.hum ? [hub.audio.hum] : []),
  ];
  return [...new Set(ids)];
}
