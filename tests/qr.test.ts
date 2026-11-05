import { describe, expect, it } from "vitest";
import { qrSvg, qrSvgDataUrl } from "../src/ui/qr";

describe("hub QR renderer", () => {
  it("renders a deterministic SVG data URL", () => {
    const url =
      "https://example.test/controller.html#room=ABC234&slot=p1";
    const decoded = decodeURIComponent(qrSvgDataUrl(url));
    expect(qrSvgDataUrl(url).startsWith("data:image/svg+xml")).toBe(true);
    expect(qrSvg(url)).toContain("<svg");
    expect(decoded).toContain("<svg");
  });

  it("encodes each slot and room independently", () => {
    const p1 = qrSvg(
      "https://example.test/controller.html#room=ABC234&slot=p1",
    );
    const p2 = qrSvg(
      "https://example.test/controller.html#room=ABC234&slot=p2",
    );
    expect(p1).not.toBe(p2);
  });
});
