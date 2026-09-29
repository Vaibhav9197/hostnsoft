import qrcode from "qrcode-generator";

/**
 * A QR code as a grid of dark/light modules, row by row. Drawing is left to
 * the caller (the poster, the QR download), so each can place and scale the
 * modules itself.
 *
 * Error correction M: survives a creased or partly covered print without
 * making the code so dense that a phone struggles with it across a room.
 * Byte mode with the library's default encoder, which is fine for the ASCII
 * URLs this is used for.
 */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const rows: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    rows.push(row);
  }
  return rows;
}
