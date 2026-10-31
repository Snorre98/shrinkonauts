import type {
  TileVisualOp,
  TileVisualPort,
  TileVisualValue,
  WorldTileTarget,
} from "./effect-types";

export interface TileKey {
  layer: string;
  x: number;
  y: number;
}

export interface TileVisualRecord {
  id: string;
  op: TileVisualOp;
  tiles: readonly TileKey[];
}

export interface TileVisualState extends TileVisualPort {
  valueAt(layer: string, x: number, y: number): TileVisualValue | undefined;
  record(opId: string): TileVisualRecord | undefined;
  entries(): readonly TileVisualRecord[];
  readonly size: number;
}

interface TileEntry {
  opId: string;
  value: TileVisualValue;
}

function keyOf(layer: string, x: number, y: number): string {
  return `${layer}/${x}/${y}`;
}

function tileKeys(target: WorldTileTarget): TileKey[] {
  if (target.kind === "tile") {
    return [{ layer: target.layer, x: target.x, y: target.y }];
  }

  const x1 = Math.min(target.x1, target.x2);
  const x2 = Math.max(target.x1, target.x2);
  const y1 = Math.min(target.y1, target.y2);
  const y2 = Math.max(target.y1, target.y2);
  const keys: TileKey[] = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      keys.push({ layer: target.layer, x, y });
    }
  }
  return keys;
}

function valueOf(op: TileVisualOp): TileVisualValue {
  switch (op.op) {
    case "swap":
      return { kind: "swap", tile: String(op.value) };
    case "tint":
      return { kind: "tint", color: String(op.value) };
    case "alpha":
      return { kind: "alpha", alpha: Number(op.value) };
    case "overlay":
      return { kind: "overlay", assetId: String(op.value) };
    case "sequence":
      return {
        kind: "sequence",
        frames: String(op.value)
          .split("|")
          .map((frame) => frame.trim())
          .filter((frame) => frame.length > 0),
      };
  }
}

export interface TileBaseVisual {
  textureKey: string;
  frame?: string;
  tint: number;
  alpha: number;
}

export interface TileVisualComposition extends TileBaseVisual {
  swapAssetId?: string;
  tintColor?: string;
  overlayAssetId?: string;
  sequenceAssetId?: string;
}

/**
 * Pure composition of a material/tileset base with an ADR-0013 cosmetic
 * override. It never reads or writes collision or puzzle state.
 */
export function composeTileVisual(
  base: TileBaseVisual,
  value: TileVisualValue | undefined,
): TileVisualComposition {
  const result: TileVisualComposition = { ...base };
  if (!value) return result;

  switch (value.kind) {
    case "swap":
      result.swapAssetId = value.tile;
      break;
    case "tint":
      result.tintColor = value.color;
      break;
    case "alpha":
      result.alpha = Math.max(0, Math.min(1, value.alpha));
      break;
    case "overlay":
      result.overlayAssetId = value.assetId;
      break;
    case "sequence": {
      const frame = value.frames[0];
      if (frame) result.sequenceAssetId = frame;
      break;
    }
  }

  return result;
}

/**
 * Headless tile appearance store. It never reads or writes collision, physics,
 * or puzzle state; `RoomScene` applies the resulting values to tile images.
 */
export function createTileVisualState(): TileVisualState {
  const records = new Map<string, TileVisualRecord>();
  const stacks = new Map<string, TileEntry[]>();
  let nextId = 1;

  const state: TileVisualState = {
    get size() {
      return records.size;
    },

    apply(op) {
      const id = `tilefx:${nextId}`;
      nextId += 1;
      const tiles = tileKeys(op.target);
      const value = valueOf(op);
      for (const tile of tiles) {
        const key = keyOf(tile.layer, tile.x, tile.y);
        const stack = stacks.get(key) ?? [];
        stack.push({ opId: id, value });
        stacks.set(key, stack);
      }
      records.set(id, { id, op, tiles });
      return id;
    },

    revert(opId) {
      const record = records.get(opId);
      if (!record) return;
      for (const tile of record.tiles) {
        const key = keyOf(tile.layer, tile.x, tile.y);
        const stack = stacks.get(key);
        if (!stack) continue;
        let index = -1;
        for (let cursor = stack.length - 1; cursor >= 0; cursor -= 1) {
          if (stack[cursor]?.opId === opId) {
            index = cursor;
            break;
          }
        }
        if (index >= 0) stack.splice(index, 1);
        if (stack.length === 0) stacks.delete(key);
      }
      records.delete(opId);
    },

    valueAt(layer, x, y) {
      const stack = stacks.get(keyOf(layer, x, y));
      return stack?.[stack.length - 1]?.value;
    },

    record(opId) {
      return records.get(opId);
    },

    entries() {
      return [...records.values()];
    },
  };

  return state;
}
