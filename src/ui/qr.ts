import { renderSVG } from "uqr";

/**
 * Pure QR helper for the hub pairing panel. Encoding is delegated to `uqr`;
 * this module only turns the SVG into a data URL safe for an <img> source.
 */
export function qrSvg(value: string): string {
  return renderSVG(value, {
    ecc: "M",
    border: 2,
    pixelSize: 4,
  });
}

export function qrSvgDataUrl(value: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    qrSvg(value),
  )}`;
}
