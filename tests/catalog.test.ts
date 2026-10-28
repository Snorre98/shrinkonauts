import { describe, expect, it } from "vitest";
import { catalogEntry, parsePackCatalog } from "../src/pack";

const VALID = {
  schemaVersion: "1.0",
  packs: [
    {
      id: "anatomy-reflex",
      path: "anatomy-reflex/",
      status: "available",
      online: true,
      order: 10,
      title: "Anatomy: The Reflex Arc",
      subtitle: "Nervous system",
    },
    {
      id: "silicon-reflex",
      path: "silicon-reflex/",
      status: "coming-soon",
      online: false,
      order: 20,
      title: "Silicon: Interrupt Loop",
    },
  ],
};

describe("pack catalog", () => {
  it("parses and orders available and coming-soon cycles", () => {
    const result = parsePackCatalog(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.packs.map((entry) => entry.id)).toEqual([
      "anatomy-reflex",
      "silicon-reflex",
    ]);
    expect(catalogEntry(result.value, "silicon-reflex")?.status).toBe(
      "coming-soon",
    );
  });

  it("sorts by order and then id", () => {
    const result = parsePackCatalog({
      ...VALID,
      packs: [
        { ...VALID.packs[1], order: 1 },
        { ...VALID.packs[0], order: 1, id: "zzz-reflex" },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.packs.map((entry) => entry.id)).toEqual([
        "silicon-reflex",
        "zzz-reflex",
      ]);
    }
  });

  it("rejects duplicate ids, bad paths, and unknown statuses", () => {
    expect(
      parsePackCatalog({
        ...VALID,
        packs: [VALID.packs[0], VALID.packs[0]],
      }),
    ).toMatchObject({ ok: false });
    expect(
      parsePackCatalog({
        ...VALID,
        packs: [{ ...VALID.packs[0], path: "../secret/" }],
      }),
    ).toMatchObject({ ok: false });
    expect(
      parsePackCatalog({
        ...VALID,
        packs: [{ ...VALID.packs[0], status: "ready" }],
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects unsupported schema versions and empty catalogs", () => {
    expect(
      parsePackCatalog({ ...VALID, schemaVersion: "2.0" }),
    ).toMatchObject({ ok: false });
    expect(parsePackCatalog({ ...VALID, packs: [] })).toMatchObject({
      ok: false,
    });
  });
});
