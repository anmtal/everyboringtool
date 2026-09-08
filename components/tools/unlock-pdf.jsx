"use client";

import { useState, useEffect, useRef } from "react";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFString,
  PDFHexString,
  PDFRawStream,
  PDFStream,
  PDFRef,
} from "pdf-lib";

/*
 * Unlock PDF — removes password protection and permission restrictions from a
 * PDF entirely in the browser. This implements the PDF "Standard Security
 * Handler" (ISO 32000) decryption that pdf-lib itself does not provide:
 *   - RC4 (40-bit / 128-bit, revisions 2 & 3)
 *   - AESV2 / AES-128 (revision 4)
 *   - AESV3 / AES-256 (revisions 5 & 6)
 * Crypto primitives (MD5, RC4, AES) are pure JS and were validated against the
 * published test vectors; SHA-256/384/512 (needed only for AES-256) use the
 * browser's WebCrypto. Nothing is uploaded — the file never leaves the device.
 */

/* ------------------------- MD5 (pure JS) ------------------------- */
function md5(bytes) {
  const rl = (x, c) => (x << c) | (x >>> (32 - c));
  const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  let a0 = 1732584193, b0 = -271733879, c0 = -1732584194, d0 = 271733878;
  const ml = bytes.length * 8;
  const withOne = bytes.length + 1;
  const padLen = withOne % 64 <= 56 ? 56 - (withOne % 64) : 120 - (withOne % 64);
  const total = bytes.length + 1 + padLen + 8;
  const m = new Uint8Array(total);
  m.set(bytes, 0);
  m[bytes.length] = 0x80;
  for (let i = 0; i < 8; i++) m[total - 8 + i] = (ml / Math.pow(2, 8 * i)) & 0xff;
  for (let off = 0; off < total; off += 64) {
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) M[i] = m[off + i * 4] | (m[off + i * 4 + 1] << 8) | (m[off + i * 4 + 2] << 16) | (m[off + i * 4 + 3] << 24);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) | 0;
      A = D; D = C; C = B; B = (B + rl(F, s[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  const out = new Uint8Array(16);
  const words = [a0, b0, c0, d0];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out[i * 4 + j] = (words[i] >>> (8 * j)) & 0xff;
  return out;
}

/* ------------------------- RC4 (pure JS) ------------------------- */
function rc4(key, data) {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + S[i] + key[i % key.length]) & 0xff; const t = S[i]; S[i] = S[j]; S[j] = t; }
  const out = new Uint8Array(data.length);
  let a = 0, b = 0;
  for (let k = 0; k < data.length; k++) { a = (a + 1) & 0xff; b = (b + S[a]) & 0xff; const t = S[a]; S[a] = S[b]; S[b] = t; out[k] = data[k] ^ S[(S[a] + S[b]) & 0xff]; }
  return out;
}

/* ------------------------- AES (pure JS, CBC) ------------------------- */
const AES = (function () {
  const sbox = new Uint8Array(256), inv = new Uint8Array(256);
  (function () {
    const exp = new Uint8Array(256), log = new Uint8Array(256);
    let a = 1;
    for (let i = 0; i < 255; i++) { exp[i] = a; log[a] = i; a ^= (a << 1) ^ ((a & 0x80) ? 0x11b : 0); a &= 0xff; }
    const invb = (x) => (x === 0 ? 0 : exp[(255 - log[x]) % 255]);
    for (let i = 0; i < 256; i++) {
      let sv = invb(i); let xf = sv;
      for (let c = 0; c < 4; c++) { xf = ((xf << 1) | (xf >> 7)) & 0xff; sv ^= xf; }
      sv ^= 0x63; sbox[i] = sv; inv[sv] = i;
    }
  })();
  function mul(a, b) { let r = 0; for (let i = 0; i < 8; i++) { if (b & 1) r ^= a; const hi = a & 0x80; a = (a << 1) & 0xff; if (hi) a ^= 0x1b; b >>= 1; } return r; }
  function expandKey(key) {
    const Nr = key.length / 4 + 6;
    const rcon = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36,0x6c,0xd8,0xab,0x4d];
    const total = 16 * (Nr + 1);
    const w = new Uint8Array(total);
    w.set(key, 0);
    let n = key.length, rc = 0;
    while (n < total) {
      let t = [w[n - 4], w[n - 3], w[n - 2], w[n - 1]];
      if (n % key.length === 0) t = [sbox[t[1]] ^ rcon[rc++], sbox[t[2]], sbox[t[3]], sbox[t[0]]];
      else if (key.length > 24 && n % key.length === 16) t = [sbox[t[0]], sbox[t[1]], sbox[t[2]], sbox[t[3]]];
      for (let i = 0; i < 4; i++) { w[n] = w[n - key.length] ^ t[i]; n++; }
    }
    return { w, Nr };
  }
  const addRK = (s, w, o) => { for (let i = 0; i < 16; i++) s[i] ^= w[o + i]; };
  const subBytes = (s) => { for (let i = 0; i < 16; i++) s[i] = sbox[s[i]]; };
  const invSubBytes = (s) => { for (let i = 0; i < 16; i++) s[i] = inv[s[i]]; };
  const shiftRows = (s) => { const t = s.slice(); for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) s[r + 4 * c] = t[r + 4 * ((c + r) % 4)]; };
  const invShiftRows = (s) => { const t = s.slice(); for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) s[r + 4 * c] = t[r + 4 * ((c - r + 4) % 4)]; };
  const mixCols = (s) => { for (let c = 0; c < 4; c++) { const i = c * 4, a0 = s[i], a1 = s[i + 1], a2 = s[i + 2], a3 = s[i + 3]; s[i] = mul(a0,2) ^ mul(a1,3) ^ a2 ^ a3; s[i+1] = a0 ^ mul(a1,2) ^ mul(a2,3) ^ a3; s[i+2] = a0 ^ a1 ^ mul(a2,2) ^ mul(a3,3); s[i+3] = mul(a0,3) ^ a1 ^ a2 ^ mul(a3,2); } };
  const invMixCols = (s) => { for (let c = 0; c < 4; c++) { const i = c * 4, a0 = s[i], a1 = s[i + 1], a2 = s[i + 2], a3 = s[i + 3]; s[i] = mul(a0,14) ^ mul(a1,11) ^ mul(a2,13) ^ mul(a3,9); s[i+1] = mul(a0,9) ^ mul(a1,14) ^ mul(a2,11) ^ mul(a3,13); s[i+2] = mul(a0,13) ^ mul(a1,9) ^ mul(a2,14) ^ mul(a3,11); s[i+3] = mul(a0,11) ^ mul(a1,13) ^ mul(a2,9) ^ mul(a3,14); } };
  function encBlock(inp, w, Nr) { const s = inp.slice(); addRK(s, w, 0); for (let r = 1; r < Nr; r++) { subBytes(s); shiftRows(s); mixCols(s); addRK(s, w, r * 16); } subBytes(s); shiftRows(s); addRK(s, w, Nr * 16); return s; }
  function decBlock(inp, w, Nr) { const s = inp.slice(); addRK(s, w, Nr * 16); for (let r = Nr - 1; r >= 1; r--) { invShiftRows(s); invSubBytes(s); addRK(s, w, r * 16); invMixCols(s); } invShiftRows(s); invSubBytes(s); addRK(s, w, 0); return s; }
  function cbcDecrypt(key, iv, data, stripPad) {
    const { w, Nr } = expandKey(key);
    const out = new Uint8Array(data.length);
    let prev = iv.slice();
    for (let o = 0; o < data.length; o += 16) {
      const block = data.subarray(o, o + 16);
      const dec = decBlock(block, w, Nr);
      for (let i = 0; i < 16; i++) out[o + i] = dec[i] ^ prev[i];
      prev = block.slice();
    }
    if (stripPad && out.length) { const pad = out[out.length - 1]; if (pad >= 1 && pad <= 16) return out.subarray(0, out.length - pad); }
    return out;
  }
  function cbcEncryptNoPad(key, iv, data) {
    const { w, Nr } = expandKey(key);
    const out = new Uint8Array(data.length);
    let prev = iv.slice();
    for (let o = 0; o < data.length; o += 16) {
      const block = data.subarray(o, o + 16).slice();
      for (let i = 0; i < 16; i++) block[i] ^= prev[i];
      const enc = encBlock(block, w, Nr);
      out.set(enc, o); prev = enc;
    }
    return out;
  }
  return { cbcDecrypt, cbcEncryptNoPad };
})();

/* ------------------------- helpers ------------------------- */
const PAD = Uint8Array.from([0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);

function concatBytes(arrs) { let n = 0; for (const a of arrs) n += a.length; const o = new Uint8Array(n); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; }
function strBytes(s) { const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 0xff; return o; }
function bytesToHex(b) { let s = ""; for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0"); return s; }
function padPassword(pw) { const p = new Uint8Array(32); const b = strBytes(pw); const n = Math.min(b.length, 32); p.set(b.subarray(0, n), 0); p.set(PAD.subarray(0, 32 - n), n); return p; }

async function sha(bits, data) {
  const algo = bits === 256 ? "SHA-256" : bits === 384 ? "SHA-384" : "SHA-512";
  const buf = await crypto.subtle.digest(algo, data);
  return new Uint8Array(buf);
}

// Algorithm 2 — file key from password (revisions 2-4, RC4/AESV2)
function computeKeyRC4(pw, O, P, id0, keyLenBytes, R, encryptMeta) {
  const parts = [padPassword(pw), O.subarray(0, 32)];
  const pbuf = new Uint8Array(4);
  new DataView(pbuf.buffer).setInt32(0, P | 0, true);
  parts.push(pbuf, id0);
  if (R >= 4 && !encryptMeta) parts.push(Uint8Array.from([0xff, 0xff, 0xff, 0xff]));
  let h = md5(concatBytes(parts));
  if (R >= 3) for (let i = 0; i < 50; i++) h = md5(h.subarray(0, keyLenBytes));
  return h.subarray(0, keyLenBytes);
}

// Algorithm 4/5 — recompute /U to validate the password (revisions 2-4)
function computeU(key, id0, R) {
  if (R === 2) return rc4(key, PAD);
  let enc = rc4(key, md5(concatBytes([PAD, id0])));
  for (let i = 1; i <= 19; i++) {
    const k = new Uint8Array(key.length);
    for (let j = 0; j < key.length; j++) k[j] = key[j] ^ i;
    enc = rc4(k, enc);
  }
  return enc;
}

// Algorithm 2.B — the AES-256 (rev 6) hardened hash
async function hash2B(pw, salt, udata, R) {
  let K = await sha(256, concatBytes([strBytes(pw), salt, udata]));
  if (R === 5) return K;
  let round = 0;
  while (true) {
    const parts = [];
    for (let i = 0; i < 64; i++) parts.push(strBytes(pw), K, udata);
    const K1 = concatBytes(parts);
    const E = AES.cbcEncryptNoPad(K.subarray(0, 16), K.subarray(16, 32), K1);
    let mod = 0;
    for (let i = 0; i < 16; i++) mod = (mod + E[i]) % 3;
    K = await sha(mod === 0 ? 256 : mod === 1 ? 384 : 512, E);
    round++;
    if (round >= 64 && E[E.length - 1] <= round - 32) break;
  }
  return K.subarray(0, 32);
}

// Algorithm 2.A — file key from password (AES-256, revisions 5-6)
async function computeKeyAESV3(pw, U, UE, R) {
  const valSalt = U.subarray(32, 40), keySalt = U.subarray(40, 48);
  const h = await hash2B(pw, valSalt, new Uint8Array(0), R);
  let ok = true;
  for (let i = 0; i < 32; i++) if (h[i] !== U[i]) { ok = false; break; }
  const ik = await hash2B(pw, keySalt, new Uint8Array(0), R);
  const fileKey = AES.cbcDecrypt(ik, new Uint8Array(16), UE.subarray(0, 32), false);
  return { fileKey, ok };
}

const SCHEME_LABELS = {
  V2: "RC4",
  AESV2: "AES-128",
  AESV3: "AES-256",
};

// Read the security details from a loaded (ignoreEncryption) document.
function readEncryptInfo(doc) {
  const ctx = doc.context;
  const ti = ctx.trailerInfo;
  const encRef = ti.Encrypt;
  const encDict = ctx.lookup(ti.Encrypt);
  if (!encDict) return null;
  const idArr = ctx.lookup(ti.ID);
  let id0 = new Uint8Array(0);
  if (idArr && idArr.get) { const first = idArr.get(0); if (first && first.asBytes) id0 = first.asBytes(); }
  const g = (k) => encDict.get(PDFName.of(k));
  const num = (k, d) => { const v = g(k); return v && v.asNumber ? v.asNumber() : d; };
  const V = num("V", 0);
  const R = num("R", 0);
  const O = g("O").asBytes();
  const U = g("U").asBytes();
  const P = num("P", 0);
  const lenBits = num("Length", 40);
  let encryptMeta = true;
  const em = g("EncryptMetadata");
  if (em && String(em.toString()) === "false") encryptMeta = false;
  let cfm = V === 1 || V === 2 ? "V2" : "Identity";
  if (V >= 4) {
    const cf = encDict.get(PDFName.of("CF"));
    const stmf = g("StmF");
    const stmfName = stmf ? stmf.toString().replace("/", "") : "Identity";
    if (cf && stmfName !== "Identity") {
      const filt = cf.get(PDFName.of(stmfName));
      if (filt) { const m = filt.get(PDFName.of("CFM")); cfm = m ? m.toString().replace("/", "") : "Identity"; }
    }
  }
  let UE = null, OE = null;
  if (V >= 5) { const ue = g("UE"); if (ue) UE = ue.asBytes(); const oe = g("OE"); if (oe) OE = oe.asBytes(); }
  return { encRef, encDict, id0, V, R, O, U, P, lenBits, encryptMeta, cfm, UE, OE };
}

// Derive the file key for a given password; returns { fileKey, ok }.
async function deriveKey(info, password) {
  if (info.V <= 4) {
    const keyLenBytes = info.V === 1 ? 5 : Math.floor(info.lenBits / 8);
    const fileKey = computeKeyRC4(password, info.O, info.P, info.id0, keyLenBytes, info.R, info.encryptMeta);
    const Uc = computeU(fileKey, info.id0, info.R);
    const cmpLen = info.R === 2 ? 32 : 16;
    let ok = true;
    for (let i = 0; i < cmpLen; i++) if (Uc[i] !== info.U[i]) { ok = false; break; }
    return { fileKey, ok };
  }
  if (!info.UE) return { fileKey: null, ok: false };
  return computeKeyAESV3(password, info.U, info.UE, info.R);
}

// Decrypt every string and stream in place, strip /Encrypt, return saved bytes.
async function decryptDocument(doc, info, fileKey) {
  const ctx = doc.context;
  const cfm = info.cfm;
  const encObjNum = info.encRef instanceof PDFRef ? info.encRef.objectNumber : -1;

  let metaNum = -1;
  if (!info.encryptMeta) { const m = doc.catalog.get(PDFName.of("Metadata")); if (m instanceof PDFRef) metaNum = m.objectNumber; }

  const objKey = (numObj, gen, aes) => {
    if (cfm === "AESV3") return fileKey;
    const ext = new Uint8Array(fileKey.length + 5 + (aes ? 4 : 0));
    ext.set(fileKey, 0);
    ext[fileKey.length] = numObj & 0xff;
    ext[fileKey.length + 1] = (numObj >> 8) & 0xff;
    ext[fileKey.length + 2] = (numObj >> 16) & 0xff;
    ext[fileKey.length + 3] = gen & 0xff;
    ext[fileKey.length + 4] = (gen >> 8) & 0xff;
    if (aes) ext.set(strBytes("sAlT"), fileKey.length + 5);
    return md5(ext).subarray(0, Math.min(fileKey.length + 5, 16));
  };
  const decryptBytes = (data, numObj, gen) => {
    if (cfm === "V2") return rc4(objKey(numObj, gen, false), data);
    if (cfm === "AESV2" || cfm === "AESV3") {
      if (data.length < 16) return data;
      const iv = data.subarray(0, 16);
      const ct = data.subarray(16);
      if (ct.length === 0 || ct.length % 16 !== 0) return new Uint8Array(0);
      return AES.cbcDecrypt(objKey(numObj, gen, true), iv, ct, true);
    }
    return data; // Identity — leave untouched
  };

  const replStr = (s, numObj, gen) => PDFHexString.of(bytesToHex(decryptBytes(s.asBytes(), numObj, gen)));
  const walkDict = (d, numObj, gen) => {
    for (const k of d.keys()) {
      const v = d.get(k);
      if (v instanceof PDFString || v instanceof PDFHexString) d.set(k, replStr(v, numObj, gen));
      else if (v instanceof PDFArray) walkArray(v, numObj, gen);
      else if (v instanceof PDFStream) walkDict(v.dict, numObj, gen);
      else if (v instanceof PDFDict) walkDict(v, numObj, gen);
    }
  };
  const walkArray = (a, numObj, gen) => {
    for (let i = 0; i < a.size(); i++) {
      const v = a.get(i);
      if (v instanceof PDFString || v instanceof PDFHexString) a.set(i, replStr(v, numObj, gen));
      else if (v instanceof PDFArray) walkArray(v, numObj, gen);
      else if (v instanceof PDFStream) walkDict(v.dict, numObj, gen);
      else if (v instanceof PDFDict) walkDict(v, numObj, gen);
    }
  };

  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    const numObj = ref.objectNumber, gen = ref.generationNumber;
    if (numObj === encObjNum) continue; // never touch the /Encrypt dictionary
    if (obj instanceof PDFRawStream) { if (numObj !== metaNum) obj.contents = decryptBytes(obj.contents, numObj, gen); walkDict(obj.dict, numObj, gen); }
    else if (obj instanceof PDFStream) walkDict(obj.dict, numObj, gen);
    else if (obj instanceof PDFDict) walkDict(obj, numObj, gen);
    else if (obj instanceof PDFArray) walkArray(obj, numObj, gen);
  }

  delete ctx.trailerInfo.Encrypt;
  if (info.encRef instanceof PDFRef) ctx.delete(info.encRef);
  doc.isEncrypted = false;
  return doc.save({ useObjectStreams: false });
}

// Decode the permission (/P) flags into a plain list.
function readPermissions(P) {
  const bit = (n) => (P & (1 << (n - 1))) !== 0;
  return {
    print: bit(3),
    modify: bit(4),
    copy: bit(5),
    annotate: bit(6),
  };
}

const FALLBACK_MSG =
  "This PDF uses an encryption scheme this tool can't process (or the file structure is unusual). If you can open it in a PDF reader with the password, choose Print → Save as PDF to make an unlocked copy.";

export default function UnlockPdf() {
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null); // security info or null
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [scheme, setScheme] = useState("");
  const [perms, setPerms] = useState(null);
  const [state, setState] = useState("idle"); // idle | not-encrypted | ready | unsupported
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url }

  const urlRef = useRef("");
  const bytesRef = useRef(null); // original file bytes

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  function clearResult() {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ""; }
    setResult(null);
  }
  function resetAll() {
    clearResult();
    setFile(null); setInfo(null); setNeedsPassword(false); setPassword("");
    setScheme(""); setPerms(null); setState("idle"); setStatus("");
    bytesRef.current = null;
  }

  async function onFile(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!chosen) return;
    const isPdf = chosen.type === "application/pdf" || chosen.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setError("Please choose a PDF file."); resetAll(); return; }
    setError("");
    resetAll();
    setBusy(true);
    setStatus("Reading PDF…");
    try {
      const bytes = new Uint8Array(await chosen.arrayBuffer());
      bytesRef.current = bytes;
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
      const encInfo = readEncryptInfo(doc);
      setFile(chosen);
      if (!encInfo) { setState("not-encrypted"); setBusy(false); setStatus(""); return; }
      if (encInfo.cfm === "Identity" || (encInfo.V >= 5 && !encInfo.UE)) {
        setState("unsupported"); setBusy(false); setStatus(""); return;
      }
      setInfo(encInfo);
      setScheme(SCHEME_LABELS[encInfo.cfm] || "encrypted");
      setPerms(readPermissions(encInfo.P));
      // Try an empty password — restriction-only PDFs unlock with no password.
      const probe = await deriveKey(encInfo, "");
      setNeedsPassword(!probe.ok);
      setState("ready");
    } catch (err) {
      setState("unsupported");
      setInfo(null);
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function unlock() {
    if (!info || !bytesRef.current) return;
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Unlocking…");
    try {
      const derived = await deriveKey(info, password);
      if (!derived.ok) {
        setError(needsPassword ? "That password didn't work. Check it and try again." : "Couldn't unlock this PDF with an empty password — it may need an open password.");
        setBusy(false); setStatus("");
        return;
      }
      // Re-load a fresh copy so a retry with a different password starts clean.
      const doc = await PDFDocument.load(bytesRef.current, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
      const freshInfo = readEncryptInfo(doc);
      const outBytes = await decryptDocument(doc, freshInfo, derived.fileKey);

      // Verify: the output must load WITHOUT ignoreEncryption and have pages.
      let verified = false;
      try {
        const check = await PDFDocument.load(outBytes);
        verified = check.getPageCount() > 0;
      } catch { verified = false; }
      if (!verified) { setError(FALLBACK_MSG); setBusy(false); setStatus(""); return; }

      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setResult({ url });
    } catch (err) {
      setError(FALLBACK_MSG);
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="up-file">Choose a PDF</label>
            <input className="tool-input" id="up-file" type="file" accept="application/pdf" onChange={onFile} />
          </div>
        </div>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}
      {busy && status && <p className="tool-note" role="status" aria-live="polite">{status}</p>}

      {!file && !busy && (
        <p className="tool-note">
          Pick a password-protected PDF to remove its password and restrictions.
          If the file needs a password to open, you'll be asked for it. Everything
          happens in your browser — the file is never uploaded.
        </p>
      )}

      {state === "not-encrypted" && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">Nothing to unlock</div>
          <div className="tool-result-value">
            This PDF isn't password-protected or restricted, so there's nothing to remove.
          </div>
        </div>
      )}

      {state === "unsupported" && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">Can't unlock this file here</div>
          <div className="tool-result-value">{FALLBACK_MSG}</div>
        </div>
      )}

      {state === "ready" && info && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{scheme}</div>
              <div className="tool-stat-label">Encryption</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{needsPassword ? "Yes" : "No"}</div>
              <div className="tool-stat-label">Password to open</div>
            </div>
          </div>

          {perms && (
            <p className="tool-note">
              Current restrictions —{" "}
              Printing: {perms.print ? "allowed" : "blocked"}; Copying text:{" "}
              {perms.copy ? "allowed" : "blocked"}; Editing:{" "}
              {perms.modify ? "allowed" : "blocked"}. Unlocking removes all of these.
            </p>
          )}

          {needsPassword && (
            <div className="tool-fields">
              <div className="tool-row">
                <div className="tool-field">
                  <label className="tool-label" htmlFor="up-pass">Password to open this PDF</label>
                  <input
                    className="tool-input"
                    id="up-pass"
                    type="password"
                    value={password}
                    placeholder="Enter the PDF's open password"
                    autoComplete="off"
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(""); clearResult(); }}
                  />
                </div>
              </div>
            </div>
          )}

          <p className="tool-note">
            Only unlock PDFs you own or are authorized to change. Removing
            protection from someone else's document may be against the law.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={unlock}
              disabled={busy || (needsPassword && !password)}
            >
              {busy ? "Working…" : "Unlock PDF"}
            </button>
            {result && (
              <a className="btn btn-success" href={result.url} download={`${baseName}-unlocked.pdf`}>
                ↓ Download unlocked PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Unlocked</div>
              <div className="tool-result-value">
                Password and restrictions removed. The downloaded copy opens
                without a password and allows printing, copying, and editing.
              </div>
            </div>
          )}
        </>
      )}

      <p className="tool-note">
        100% private: decryption runs entirely on your device using the PDF's
        standard security handler. Nothing is uploaded to a server.
      </p>
    </div>
  );
}
