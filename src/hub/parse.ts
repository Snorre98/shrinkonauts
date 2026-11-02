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
  HubCartridgeSlot,
  HubDocument,
  HubDressing,
  HubDressingEntry,
  HubIntro,
  HubMachine,
  HubOrigin,
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

const HUB_ORIGINS: readonly HubOrigin[] = [
  "top-left",
  "top-center",
  "center",
  "bottom-left",
  "bottom-center",
];

function readOrigin(value: unknown, label: string): Result<HubOrigin> {
  if (value === undefined) return ok("center");
  if (
    typeof value !== "string" ||
    !HUB_ORIGINS.includes(value as HubOrigin)
  ) {
    return err(`${HUB_CODE}: ${label} must be one of ${HUB_ORIGINS.join(", ")}`);
  }
  return ok(value as HubOrigin);
}

function readOptionalScale(
  record: Record<string, unknown>,
  key: string,
  label: string,
): Result<number | undefined> {
  if (record[key] === undefined) return ok(undefined);
  const scale = readNumber(record, key, HUB_CODE, label);
  if (!scale.ok) return err(scale.error);
  if (scale.value <= 0) {
    return err(`${HUB_CODE}: ${label} must be positive`);
  }
  return ok(scale.value);
}

function readOptionalDepth(
  record: Record<string, unknown>,
  key: string,
  label: string,
): Result<number | undefined> {
  if (record[key] === undefined) return ok(undefined);
  const depth = readNumber(record, key, HUB_CODE, label);
  if (!depth.ok) return err(depth.error);
  return ok(depth.value);
}

function parseDressingEntry(
  value: unknown,
  label: string,
): Result<HubDressingEntry> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: ${label} must be an object`);
  }
  const assetId = readAssetId(value, "assetId", HUB_CODE, `${label}.assetId`);
  if (!assetId.ok) return err(assetId.error);
  const x = readNumber(value, "x", HUB_CODE, `${label}.x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", HUB_CODE, `${label}.y`);
  if (!y.ok) return err(y.error);
  const scale = readOptionalScale(value, "scale", `${label}.scale`);
  if (!scale.ok) return err(scale.error);
  const origin = readOrigin(value.origin, `${label}.origin`);
  if (!origin.ok) return err(origin.error);
  const depth = readOptionalDepth(value, "depth", `${label}.depth`);
  if (!depth.ok) return err(depth.error);
  return ok({
    assetId: assetId.value,
    x: x.value,
    y: y.value,
    ...(scale.value !== undefined ? { scale: scale.value } : {}),
    ...(value.origin !== undefined ? { origin: origin.value } : {}),
    ...(depth.value !== undefined ? { depth: depth.value } : {}),
  });
}

function parseCartridgeSlot(value: unknown): Result<HubCartridgeSlot> {
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: dressing.cartridge must be an object`);
  }
  const anatomy = readAssetId(
    value,
    "anatomy",
    HUB_CODE,
    "dressing.cartridge.anatomy",
  );
  if (!anatomy.ok) return err(anatomy.error);
  const silicon = readAssetId(
    value,
    "silicon",
    HUB_CODE,
    "dressing.cartridge.silicon",
  );
  if (!silicon.ok) return err(silicon.error);
  const x = readNumber(value, "x", HUB_CODE, "dressing.cartridge.x");
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", HUB_CODE, "dressing.cartridge.y");
  if (!y.ok) return err(y.error);
  const scale = readOptionalScale(value, "scale", "dressing.cartridge.scale");
  if (!scale.ok) return err(scale.error);
  const origin = readOrigin(value.origin, "dressing.cartridge.origin");
  if (!origin.ok) return err(origin.error);
  const depth = readOptionalDepth(value, "depth", "dressing.cartridge.depth");
  if (!depth.ok) return err(depth.error);
  return ok({
    anatomy: anatomy.value,
    silicon: silicon.value,
    x: x.value,
    y: y.value,
    ...(scale.value !== undefined ? { scale: scale.value } : {}),
    ...(value.origin !== undefined ? { origin: origin.value } : {}),
    ...(depth.value !== undefined ? { depth: depth.value } : {}),
  });
}

function parseDressing(value: unknown): Result<HubDressing | undefined> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) {
    return err(`${HUB_CODE}: dressing must be an object`);
  }
  const result: HubDressing = {};

  if (value.logo !== undefined) {
    const logo = parseDressingEntry(value.logo, "dressing.logo");
    if (!logo.ok) return err(logo.error);
    result.logo = logo.value;
  }
  if (value.poster !== undefined) {
    const poster = parseDressingEntry(value.poster, "dressing.poster");
    if (!poster.ok) return err(poster.error);
    result.poster = poster.value;
  }
  if (value.props !== undefined) {
    if (!Array.isArray(value.props)) {
      return err(`${HUB_CODE}: dressing.props must be an array`);
    }
    const props: HubDressingEntry[] = [];
    for (const [index, raw] of value.props.entries()) {
      const entry = parseDressingEntry(raw, `dressing.props[${index}]`);
      if (!entry.ok) return err(entry.error);
      props.push(entry.value);
    }
    result.props = props;
  }
  if (value.cartridge !== undefined) {
    const cartridge = parseCartridgeSlot(value.cartridge);
    if (!cartridge.ok) return err(cartridge.error);
    result.cartridge = cartridge.value;
  }
  return ok(result);
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
  let nameplate: HubRect | undefined;
  if (value.nameplate !== undefined) {
    const parsed = readRect(value.nameplate, "machine.nameplate");
    if (!parsed.ok) return err(parsed.error);
    nameplate = parsed.value;
  }
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
    ...(nameplate ? { nameplate } : {}),
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
  const dressing = parseDressing(value.dressing);
  if (!dressing.ok) return err(dressing.error);

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
    ...(dressing.value ? { dressing: dressing.value } : {}),
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

  const dressing = hub.dressing;
  if (dressing) {
    ids.push(
      ...(dressing.logo ? [dressing.logo.assetId] : []),
      ...(dressing.poster ? [dressing.poster.assetId] : []),
      ...(dressing.props ?? []).map((entry) => entry.assetId),
      ...(dressing.cartridge
        ? [dressing.cartridge.anatomy, dressing.cartridge.silicon]
        : []),
    );
  }
  return [...new Set(ids)];
}
