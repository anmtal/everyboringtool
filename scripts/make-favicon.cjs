// Regenerate the DeadPan-face favicon at Google-compliant raster sizes (multiples of 48px).
// Google shows the generic globe when the raster favicon is < 48px (ours was 32x32).
// Outputs: app/favicon.ico (16/32/48/96 multi-res). Keeps app/icon.svg for browsers.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const APP = path.join(__dirname, '..', 'app');

// ---- minimal RGBA PNG ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const t = Buffer.from(ty, 'ascii'); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, d]))); return Buffer.concat([l, t, d, c]); };
function png(rgba, w, h) { const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; const raw = Buffer.alloc(h * (w * 4 + 1)); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } return Buffer.concat([sig, chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]); }

// ---- geometry from app/icon.svg (100-unit design space) ----
function inRoundRect(px, py, x, y, w, h, r) { if (px < x || px > x + w || py < y || py > y + h) return false; const cx = Math.max(x + r, Math.min(px, x + w - r)), cy = Math.max(y + r, Math.min(py, y + h - r)); const dx = px - cx, dy = py - cy; return dx * dx + dy * dy <= r * r; }
function inCircle(px, py, cx, cy, r) { const dx = px - cx, dy = py - cy; return dx * dx + dy * dy <= r * r; }
const BG = [20, 19, 15], FG = [247, 246, 243]; // #14130f dark square, #f7f6f3 light face

function renderFace(size) {
  const SS = 4, RS = size * SS, SC = RS / 100;
  const big = new Uint8ClampedArray(RS * RS * 4);
  for (let py = 0; py < RS; py++) for (let px = 0; px < RS; px++) {
    const ux = px / SC, uy = py / SC; let r = 0, g = 0, b = 0, a = 0;
    if (inRoundRect(ux, uy, 7, 7, 86, 86, 22)) { r = BG[0]; g = BG[1]; b = BG[2]; a = 255; }
    const feat = inCircle(ux, uy, 35.5, 42, 7.5) || inCircle(ux, uy, 64.5, 42, 7.5) || inRoundRect(ux, uy, 31, 59, 38, 9, 4.5);
    if (feat) { r = FG[0]; g = FG[1]; b = FG[2]; a = 255; }
    const o = (py * RS + px) * 4; big[o] = r; big[o + 1] = g; big[o + 2] = b; big[o + 3] = a;
  }
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let R = 0, G = 0, B = 0, A = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) { const o = ((y * SS + sy) * RS + (x * SS + sx)) * 4; const al = big[o + 3] / 255; R += big[o] * al; G += big[o + 1] * al; B += big[o + 2] * al; A += big[o + 3]; }
    const n = SS * SS, af = A / 255, oo = (y * size + x) * 4;
    out[oo] = af ? R / af : 0; out[oo + 1] = af ? G / af : 0; out[oo + 2] = af ? B / af : 0; out[oo + 3] = A / n;
  }
  return out;
}

// ---- ICO packer (PNG-in-ICO, supported by all modern browsers + Google) ----
function ico(sizes) {
  const imgs = sizes.map((s) => ({ s, data: png(renderFace(s), s, s) }));
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(imgs.length, 4);
  const dir = Buffer.alloc(16 * imgs.length);
  let offset = 6 + 16 * imgs.length;
  imgs.forEach((im, i) => { const b = i * 16; dir[b] = im.s >= 256 ? 0 : im.s; dir[b + 1] = im.s >= 256 ? 0 : im.s; dir.writeUInt16LE(1, b + 4); dir.writeUInt16LE(32, b + 6); dir.writeUInt32LE(im.data.length, b + 8); dir.writeUInt32LE(offset, b + 12); offset += im.data.length; });
  return Buffer.concat([header, dir, ...imgs.map((im) => im.data)]);
}

fs.writeFileSync(path.join(APP, 'favicon.ico'), ico([16, 32, 48, 96]));
console.log('wrote app/favicon.ico (16/32/48/96)');
