import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLevel } from "../src/pack";
import type { LevelDocument } from "../src/pack";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/",
  import.meta.url,
);

function readLevel(levelId: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL(`${levelId}/level.json`, LEVEL_DIR), "utf8"),
  ) as Record<string, unknown>;
}

function parse(value: unknown): LevelDocument {
  const result = parseLevel(value);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function feedback(raw: Record<string, unknown>) {
  return parse(structuredClone(raw)).feedback;
}

describe("level feedback content", () => {
  it("parses the authored 03 labels, beats, and tile target", () => {
    const parsed = feedback(readLevel("03-nerve-forest"));
    const config = parsed?.puzzles?.["puzzle-node-run"];
    expect(config?.beats?.map((beat) => beat.label)).toEqual([
      "Press a dendrite input",
      "Reach threshold",
      "Run the axon",
      "Reach the terminal",
      "Open the exit",
    ]);
    expect(config?.nodes?.["input-a"]?.label).toBe("Dendrite input A");
    expect(config?.nodes?.["spike-relay"]).toEqual({
      label: "Axon relay",
      effectPreset: "fx.tile.path",
      tileTarget: {
        kind: "tileRegion",
        layer: "tiles",
        x1: 19,
        y1: 16,
        x2: 38,
        y2: 16,
      },
    });
  });

  it("parses the authored 04 labels, beats, and effect preset", () => {
    const parsed = feedback(readLevel("04-muscle-effector"));
    const config = parsed?.puzzles?.["puzzle-endplate-ferry"];
    expect(config?.beats?.map((beat) => beat.id)).toEqual([
      "trigger",
      "release",
      "carry",
      "bind",
      "respond",
      "clear",
    ]);
    expect(config?.nodes?.["muscle-gate"]).toEqual({
      label: "Muscle gate",
      effectPreset: "fx.muscle.wave",
    });
    expect(config?.nodes?.["ach-packet"]?.label).toBe("ACh packet");
  });

  it("parses the authored 03 and 04 blueprints", () => {
    const nodeRun = feedback(readLevel("03-nerve-forest"))?.puzzles?.[
      "puzzle-node-run"
    ]?.blueprint;
    expect(nodeRun?.title).toBe("Signal route");
    expect(nodeRun?.components.map((component) => component.id)).toEqual([
      "inputs",
      "threshold",
      "axon",
      "exit",
    ]);
    expect(nodeRun?.components[0]?.beatIds).toEqual(["input"]);
    expect(nodeRun?.components[3]?.beatIds).toEqual(["terminal", "exit"]);
    expect(nodeRun?.edges?.map((edge) => edge.type)).toEqual([
      "flow",
      "oneWay",
      "oneWay",
    ]);
    expect(nodeRun?.steps).toEqual([
      { componentId: "inputs", actor: "both" },
      { componentId: "threshold", actor: "both" },
      { componentId: "axon", actor: "p1" },
      { componentId: "exit", actor: "shared" },
    ]);

    const ferry = feedback(readLevel("04-muscle-effector"))?.puzzles?.[
      "puzzle-endplate-ferry"
    ]?.blueprint;
    expect(ferry?.title).toBe("Transmission route");
    expect(ferry?.components.map((component) => component.id)).toEqual([
      "trigger",
      "carry",
      "bind",
      "response",
    ]);
    expect(ferry?.components.map((component) => component.symbol)).toEqual([
      "ui.blueprint.symbol.timer",
      "ui.blueprint.symbol.carry",
      "ui.blueprint.symbol.receptor",
      "ui.blueprint.symbol.relay",
    ]);
    expect(ferry?.steps?.map((step) => step.actor)).toEqual([
      "p1",
      "p2",
      "p2",
      "p1",
    ]);
  });

  it("keeps old level documents without feedback valid", () => {
    const raw = readLevel("03-nerve-forest");
    delete raw.feedback;
    expect(parse(raw).feedback).toBeUndefined();
  });

  it("rejects malformed feedback shapes", () => {
    const cases: Array<{ label: string; mutate: (raw: Record<string, unknown>) => void }> = [
      {
        label: "missing beat id",
        mutate: (raw) => {
          const nodes = (raw.feedback as Record<string, any>).puzzles[
            "puzzle-node-run"
          ].beats[0];
          nodes.id = " ";
        },
      },
      {
        label: "empty beat nodes",
        mutate: (raw) => {
          const nodes = (raw.feedback as Record<string, any>).puzzles[
            "puzzle-node-run"
          ].beats[0];
          nodes.nodes = [];
        },
      },
      {
        label: "duplicate beat id",
        mutate: (raw) => {
          const beats = (raw.feedback as Record<string, any>).puzzles[
            "puzzle-node-run"
          ].beats;
          beats[1].id = beats[0].id;
        },
      },
      {
        label: "unknown node override key",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"].nodes[
            "input-a"
          ].colour = "#fff";
        },
      },
      {
        label: "negative tile coordinate",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"].nodes[
            "spike-relay"
          ].tileTarget.x1 = -1;
        },
      },
      {
        label: "unordered tile region",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"].nodes[
            "spike-relay"
          ].tileTarget.x2 = 2;
        },
      },
      {
        label: "unknown top-level feedback key",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).audio = "audio.cue.scan";
        },
      },
      {
        label: "unknown blueprint key",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"].blueprint.goal =
            "exit";
        },
      },
      {
        label: "missing blueprint components",
        mutate: (raw) => {
          delete (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"]
            .blueprint.components;
        },
      },
      {
        label: "empty blueprint beatIds",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"]
            .blueprint.components[0].beatIds = [];
        },
      },
      {
        label: "duplicate blueprint component id",
        mutate: (raw) => {
          const components = (raw.feedback as Record<string, any>).puzzles[
            "puzzle-node-run"
          ].blueprint.components;
          components[1].id = components[0].id;
        },
      },
      {
        label: "invalid blueprint actor",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"]
            .blueprint.steps[0].actor = "p3";
        },
      },
      {
        label: "invalid blueprint edge type",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"]
            .blueprint.edges[0].type = "bind";
        },
      },
      {
        label: "negative blueprint x",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"]
            .blueprint.components[0].x = -1;
        },
      },
      {
        label: "empty blueprint symbol",
        mutate: (raw) => {
          (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"]
            .blueprint.components[0].symbol = " ";
        },
      },
    ];

    for (const entry of cases) {
      const raw = readLevel("03-nerve-forest");
      entry.mutate(raw);
      expect(parseLevel(raw).ok, entry.label).toBe(false);
    }
  });

  it("keeps the authored 03 tile path inside the room bounds", () => {
    const config = feedback(readLevel("03-nerve-forest"))?.puzzles?.[
      "puzzle-node-run"
    ];
    const target = config?.nodes?.["spike-relay"]?.tileTarget;
    expect(target?.kind).toBe("tileRegion");
    if (target?.kind !== "tileRegion") return;

    const room = JSON.parse(
      readFileSync(
        new URL("03-nerve-forest/room.json", LEVEL_DIR),
        "utf8",
      ),
    ) as {
      width: number;
      height: number;
      layers: Record<string, string[]>;
    };
    expect(room.layers[target.layer]).toBeDefined();
    expect(room.layers[target.layer]?.length).toBe(room.height);
    expect(target.x1).toBeGreaterThanOrEqual(0);
    expect(target.y1).toBeGreaterThanOrEqual(0);
    expect(target.x2).toBeLessThan(room.width);
    expect(target.y2).toBeLessThan(room.height);
  });

  it("parses tile and tile-region targets at the shape boundary", () => {
    const raw = readLevel("03-nerve-forest");
    const config = (raw.feedback as Record<string, any>).puzzles["puzzle-node-run"];
    config.nodes["spike-relay"].tileTarget = {
      kind: "tile",
      layer: "tiles",
      x: 4,
      y: 5,
    };
    expect(
      feedback(raw)?.puzzles?.["puzzle-node-run"]?.nodes?.["spike-relay"]
        ?.tileTarget,
    ).toEqual({ kind: "tile", layer: "tiles", x: 4, y: 5 });
  });
});
