import { describe, expect, it } from "vitest";
import {
  parseEntityPresentation,
  parsePackPresentation,
  type PresentationConfig,
} from "../src/pack";
import {
  ENTITY_DISPLAY_SIZE,
  inferEntityRole,
  resolveEntityDisplay,
} from "../src/world/entity-style";

const rolePack: PresentationConfig = {
  roles: {
    npc: { display: { width: 96, height: 96 }, fidelity: "hero-1x" },
    interactable: { display: { width: 64, height: 64 }, fidelity: "hero-1x" },
    prop: { display: { width: 48, height: 48 }, fidelity: "hero-1x" },
    scan: { display: { width: 36, height: 36 }, fidelity: "ui-1x" },
    decor: { display: { width: 36, height: 36 }, fidelity: "world-2x" },
  },
};

describe("entity presentation roles", () => {
  it("keeps the legacy 36×36 fallback when a pack has no role policy", () => {
    const resolved = resolveEntityDisplay({
      entity: { type: "agent" },
    });
    expect(resolved.width).toBe(ENTITY_DISPLAY_SIZE);
    expect(resolved.height).toBe(ENTITY_DISPLAY_SIZE);
  });

  it("uses the pack role for an inferred entity type", () => {
    const resolved = resolveEntityDisplay({
      entity: { type: "agent" },
      presentation: rolePack,
    });
    expect(resolved).toMatchObject({
      width: 96,
      height: 96,
      fidelity: "hero-1x",
      role: "npc",
    });
  });

  it("uses an explicit role even without a pack role policy", () => {
    const resolved = resolveEntityDisplay({
      entity: { type: "decor", presentation: { role: "interactable" } },
    });
    expect(resolved).toMatchObject({
      width: 64,
      height: 64,
      fidelity: "hero-1x",
      role: "interactable",
    });
  });

  it("lets an entity display override a role", () => {
    const resolved = resolveEntityDisplay({
      entity: {
        type: "agent",
        presentation: { role: "npc", display: [80, 80] },
      },
      presentation: rolePack,
    });
    expect(resolved).toMatchObject({
      width: 80,
      height: 80,
      role: "npc",
    });
  });

  it("uses the manifest display when no role applies", () => {
    const resolved = resolveEntityDisplay({
      entity: { type: "decor" },
      asset: { display: { width: 40, height: 40 }, fidelity: "world-2x" },
    });
    expect(resolved).toMatchObject({
      width: 40,
      height: 40,
      fidelity: "world-2x",
    });
  });

  it("prefers a manifest display over the legacy fallback", () => {
    const resolved = resolveEntityDisplay({
      entity: { type: "body" },
      asset: { display: { width: 48, height: 48 }, fidelity: "hero-1x" },
    });
    expect(resolved.width).toBe(48);
    expect(resolved.height).toBe(48);
  });

  it("allows a pack to disable a default role", () => {
    expect(
      inferEntityRole("agent", {
        agent: "none",
      }),
    ).toBeNull();
    const resolved = resolveEntityDisplay({
      entity: { type: "agent" },
      presentation: { ...rolePack, defaultRoles: { agent: "none" } },
    });
    expect(resolved.width).toBe(ENTITY_DISPLAY_SIZE);
    expect(resolved.height).toBe(ENTITY_DISPLAY_SIZE);
  });

  it("maps scan targets to the scan role by default", () => {
    expect(inferEntityRole("scanTarget", undefined)).toBe("scan");
    expect(inferEntityRole("prop", undefined)).toBe("prop");
    expect(inferEntityRole("gate", undefined)).toBe("interactable");
    expect(inferEntityRole("body", undefined)).toBeNull();
  });

  it("parses an entity role and size override", () => {
    const parsed = parseEntityPresentation(
      { role: "interactable", display: [80, 80], depthBias: 0.25 },
      "ROOM",
      "entities[0].presentation",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual({
      role: "interactable",
      display: [80, 80],
      depthBias: 0.25,
    });
  });

  it("rejects an unknown role and a non-integer size", () => {
    expect(
      parseEntityPresentation(
        { role: "boss" },
        "ROOM",
        "entities[0].presentation",
      ).ok,
    ).toBe(false);
    expect(
      parseEntityPresentation(
        { display: [64, 0] },
        "ROOM",
        "entities[0].presentation",
      ).ok,
    ).toBe(false);
  });

  it("parses pack role defaults and default-role overrides", () => {
    const parsed = parsePackPresentation(
      {
        roles: {
          npc: { display: [96, 96], fidelity: "hero-1x" },
          scan: { display: [36, 36], fidelity: "ui-1x" },
        },
        defaultRoles: { agent: "npc", scanTarget: "scan", body: "none" },
      },
      "PACK",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value?.roles?.npc).toEqual({
      display: [96, 96],
      fidelity: "hero-1x",
    });
    expect(parsed.value?.defaultRoles).toEqual({
      agent: "npc",
      scanTarget: "scan",
      body: "none",
    });
  });
});
