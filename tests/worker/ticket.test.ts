import { describe, expect, it } from "vitest";
import {
  newDeviceId,
  signDeviceToken,
  signRoomTicket,
  verifyDeviceToken,
  verifyRoomTicket,
} from "../../worker/src/ticket";

const SECRET = "test-signing-secret";
const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);
const EXPIRY = NOW + 300_000;

describe("room tickets", () => {
  it("round-trips a signed room ticket", async () => {
    const ticket = await signRoomTicket(SECRET, "abc234", EXPIRY);
    expect(await verifyRoomTicket(SECRET, ticket, NOW)).toEqual({
      room: "ABC234",
      expiresAt: EXPIRY,
    });
  });

  it("rejects expired, tampered, wrong-room, and wrong-secret tickets", async () => {
    const ticket = await signRoomTicket(SECRET, "ABC234", EXPIRY);
    expect(await verifyRoomTicket(SECRET, ticket, EXPIRY)).toBeNull();

    const tampered = ticket.replace("ABC234", "XYZ234");
    expect(await verifyRoomTicket(SECRET, tampered, NOW)).toBeNull();
    expect(await verifyRoomTicket("other-secret", ticket, NOW)).toBeNull();

    const otherRoom = await signRoomTicket(SECRET, "XYZ234", EXPIRY);
    expect(await verifyRoomTicket(SECRET, otherRoom, NOW)).toEqual({
      room: "XYZ234",
      expiresAt: EXPIRY,
    });
  });

  it("rejects malformed ticket values", async () => {
    expect(await verifyRoomTicket(SECRET, "", NOW)).toBeNull();
    expect(await verifyRoomTicket(SECRET, "v1.ABC234", NOW)).toBeNull();
    expect(await verifyRoomTicket(SECRET, "v2.ABC234.1.x", NOW)).toBeNull();
    expect(
      await verifyRoomTicket(SECRET, "v1.ABC.1.x", NOW),
    ).toBeNull();
  });
});

describe("device tokens", () => {
  it("issues random device IDs and round-trips a signed token", async () => {
    const first = newDeviceId();
    const second = newDeviceId();
    expect(first).toHaveLength(22);
    expect(first).not.toBe(second);

    const token = await signDeviceToken(SECRET, first, EXPIRY);
    expect(await verifyDeviceToken(SECRET, token, NOW)).toEqual({
      deviceId: first,
      expiresAt: EXPIRY,
    });
  });

  it("rejects expired, tampered, and wrong-secret device tokens", async () => {
    const deviceId = newDeviceId();
    const token = await signDeviceToken(SECRET, deviceId, EXPIRY);
    expect(await verifyDeviceToken(SECRET, token, EXPIRY)).toBeNull();
    expect(await verifyDeviceToken("other-secret", token, NOW)).toBeNull();

    const tampered = token.replace(deviceId, newDeviceId());
    expect(await verifyDeviceToken(SECRET, tampered, NOW)).toBeNull();
  });

  it("rejects malformed device IDs and tokens", async () => {
    await expect(signDeviceToken(SECRET, "short", EXPIRY)).rejects.toThrow(
      "DEVICE_ID",
    );
    expect(await verifyDeviceToken(SECRET, "d1.bad.1.x", NOW)).toBeNull();
    expect(await verifyDeviceToken(SECRET, "", NOW)).toBeNull();
  });
});
