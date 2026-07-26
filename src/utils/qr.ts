import QRCode from "qrcode";

/**
 * Generate a compact QR-code SVG at build time.
 *
 * The output is a single `<path>` using `fill="currentColor"` so the code
 * adapts to light/dark themes via the parent element's `color` CSS property.
 * No background rectangle is emitted — the SVG is transparent.
 *
 * A 2-module quiet zone is included in the viewBox (per ISO/IEC 18004).
 */
export function generateQrSvg(
  text: string,
  options: { title?: string; margin?: number } = {},
): string {
  const { title = "QR code", margin = 2 } = options;

  const qr = QRCode.create(text);
  const { size, data } = qr.modules;

  const total = size + margin * 2;
  let path = "";

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) {
        const px = x + margin;
        const py = y + margin;
        path += `M${px},${py}h1v1h-1z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title><path fill="currentColor" d="${path}"/></svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
