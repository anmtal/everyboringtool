const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs'), zlib = require('zlib');
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function pngRGBA(rgba, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// 800x600, solid blocks (compresses to a few KB)
const W = 800, H = 600, buf = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; const yellow = y > 200 && y < 400; buf[o] = yellow ? 250 : 20; buf[o + 1] = yellow ? 205 : 30; buf[o + 2] = yellow ? 20 : 60; buf[o + 3] = 255; }
const pngBytes = pngRGBA(buf, W, H);
(async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('Client brand pack — logo attached below', { x: 40, y: 740, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
  const png = await doc.embedPng(pngBytes);
  page.drawImage(png, { x: 66, y: 200, width: 480, height: 360 });
  const out = await doc.save();
  for (const dst of ['C:/Users/anmta/Downloads/logo-in-pdf.pdf', 'C:/Users/anmta/AppData/Local/Temp/claude/C--Users-anmta--claude-New-Business-Idea/ffc0a642-808f-4a01-910c-4f1c1601fdaf/scratchpad/logo-in-pdf.pdf'])
    fs.writeFileSync(dst, out);
  console.log('pdf bytes:', out.length, '| base64 chars:', Buffer.from(out).toString('base64').length, '| embedded image 800x600');
})();
