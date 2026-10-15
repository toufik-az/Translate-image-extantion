// Generate the translation mark as valid PNGs without external dependencies.
// Coordinates use a 96px canvas; supersampling keeps the small toolbar icons clear.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const strokes = [
  [[34, 24], [37, 29]],
  [[19, 34], [53, 34]],
  [[28, 34], [31, 43], [36, 50], [43, 56], [54, 62]],
  [[47, 34], [44, 43], [38, 51], [30, 58], [20, 63]],
  [[57, 64], [69, 31], [81, 64]],
  [[62, 52], [76, 52]]
];
function distance(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
function colorAt(x, y) {
  const cx = Math.max(26, Math.min(70, x)), cy = Math.max(26, Math.min(70, y));
  if (Math.hypot(x - cx, y - cy) > 19) return null;
  for (const points of strokes) for (let i = 1; i < points.length; i++) {
    if (distance(x, y, points[i - 1], points[i]) <= 2.3) return [255, 255, 255];
  }
  const t = Math.max(0, Math.min(1, (x + y - 14) / 164));
  return [26 + 28 * t, 115 + 47 * t, 232 + 23 * t];
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type), payload = Buffer.concat([name, data]);
  let crc = 0xffffffff;
  for (const byte of payload) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  const header = Buffer.alloc(4), footer = Buffer.alloc(4);
  header.writeUInt32BE(data.length); footer.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, payload, footer]);
}
function png(size) {
  const samples = 4, raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const rgb = [0, 0, 0]; let covered = 0;
    for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) {
      const color = colorAt((x + (sx + .5) / samples) * 96 / size, (y + (sy + .5) / samples) * 96 / size);
      if (color) { covered++; for (let c = 0; c < 3; c++) rgb[c] += color[c]; }
    }
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    for (let c = 0; c < 3; c++) raw[offset + c] = covered ? Math.round(rgb[c] / covered) : 0;
    raw[offset + 3] = Math.round(255 * covered / (samples * samples));
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const size of [16, 32, 48, 96, 128]) {
  fs.writeFileSync(path.join(__dirname, `icon-${size}.png`), png(size));
  console.log(`Created icon-${size}.png`);
}
