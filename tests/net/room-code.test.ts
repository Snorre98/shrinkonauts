import { describe, expect, it } from "vitest";
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  buildControllerUrl,
  buildRoomSocketUrl,
  generateRoomCode,
  normalizeRoomCode,
  parseControllerUrl,
} from "../../src/net/room-code";

describe("room codes and controller URLs", () => {
  it("normalizes case and surrounding whitespace", () => {
    expect(normalizeRoomCode("  abc234 ")).toEqual({
      ok: true,
      value: "ABC234",
    });
  });

  it("rejects wrong lengths and ambiguous characters", () => {
    expect(normalizeRoomCode("ABC23")).toMatchObject({
      ok: false,
      error: { code: "ROOM_INVALID" },
    });
    expect(normalizeRoomCode("ABC230")).toMatchObject({
      ok: false,
      error: { code: "ROOM_INVALID" },
    });
    expect(normalizeRoomCode("ABC23I")).toMatchObject({
      ok: false,
      error: { code: "ROOM_INVALID" },
    });
  });

  it("generates unambiguous codes from injected randomness", () => {
    const values = [0, 0.1, 0.25, 0.5, 0.75, 0.999];
    let index = 0;
    const code = generateRoomCode(() => values[index++] ?? 0);

    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    for (const character of code) {
      expect(ROOM_CODE_ALPHABET).toContain(character);
    }
    expect(code).not.toMatch(/[IO01]/);
    expect(generateRoomCode()).toHaveLength(ROOM_CODE_LENGTH);
  });

  it("rejects out-of-range randomness", () => {
    expect(() => generateRoomCode(() => 1)).toThrow("ROOM_CODE_RANDOM");
    expect(() => generateRoomCode(() => Number.NaN)).toThrow(
      "ROOM_CODE_RANDOM",
    );
  });

  it("builds and parses a controller URL fragment", () => {
    const url = buildControllerUrl(
      "https://example.test/controller.html",
      "abc234",
      "p2",
    );
    expect(url).toBe(
      "https://example.test/controller.html#room=ABC234&slot=p2",
    );
    expect(parseControllerUrl(url)).toEqual({
      ok: true,
      value: { room: "ABC234", slot: "p2" },
    });
  });

  it("round-trips a signed controller ticket in the URL fragment", () => {
    const ticket = "v1.ABC234.1999999999999.signature";
    const url = buildControllerUrl(
      "https://example.test/controller.html",
      "ABC234",
      "p1",
      ticket,
    );
    expect(url).toContain(`ticket=${encodeURIComponent(ticket)}`);
    expect(parseControllerUrl(url)).toEqual({
      ok: true,
      value: { room: "ABC234", slot: "p1", ticket },
    });
  });

  it("adds slot, ticket, and device to socket URLs", () => {
    const url = buildRoomSocketUrl(
      "wss://relay.example.test",
      "ABC234",
      "controller",
      {
        slot: "p2",
        ticket: "v1.ABC234.1999999999999.signature",
        device: "device-token",
      },
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("room")).toBe("ABC234");
    expect(parsed.searchParams.get("role")).toBe("controller");
    expect(parsed.searchParams.get("slot")).toBe("p2");
    expect(parsed.searchParams.get("ticket")).toBe(
      "v1.ABC234.1999999999999.signature",
    );
    expect(parsed.searchParams.get("device")).toBe("device-token");
  });

  it("builds a host WebSocket URL and preserves an explicit /ws path", () => {
    expect(
      buildRoomSocketUrl("ws://relay.example.test", "abc234", "host"),
    ).toBe("ws://relay.example.test/ws?room=ABC234&role=host");
    expect(
      buildRoomSocketUrl(
        "wss://relay.example.test/custom/ws",
        "ABC234",
        "controller",
      ),
    ).toBe(
      "wss://relay.example.test/custom/ws?room=ABC234&role=controller",
    );
  });

  it("rejects malformed controller URLs and invalid slots", () => {
    expect(parseControllerUrl("not a url")).toMatchObject({
      ok: false,
      error: { code: "ROOM_INVALID" },
    });
    expect(
      parseControllerUrl("https://example.test/controller.html#room=ABC234"),
    ).toMatchObject({
      ok: false,
      error: { code: "ROOM_INVALID" },
    });
    expect(
      parseControllerUrl(
        "https://example.test/controller.html#room=ABC234&slot=p3",
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "ROOM_INVALID" },
    });
  });

  it("refuses to build URLs with invalid input", () => {
    expect(() =>
      buildControllerUrl(
        "https://example.test/controller.html",
        "short",
        "p1",
      ),
    ).toThrow("Room code");
    expect(() =>
      buildControllerUrl(
        "https://example.test/controller.html",
        "ABC234",
        "p3" as never,
      ),
    ).toThrow("CONTROLLER_URL_SLOT");
  });
});
