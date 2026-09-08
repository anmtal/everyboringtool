"use client";

import { useState, useRef, useEffect } from "react";

// Container format (all binary, little-endian lengths kept minimal):
//   magic:        8 bytes  "EBTENC01"
//   version:      1 byte   = 1
//   iterations:   4 bytes  big-endian uint32 (PBKDF2 rounds)
//   salt:        16 bytes  (PBKDF2)
//   iv:          12 bytes  (AES-GCM nonce)
//   nameLen:      2 bytes  big-endian uint16 (bytes of UTF-8 original filename)
//   name:         nameLen bytes
//   ciphertext:   rest     (AES-GCM output incl. auth tag)
const MAGIC = new Uint8Array([69, 66, 84, 69, 78, 67, 48, 49]); // "EBTENC01"
const VERSION = 1;
const PBKDF2_ITERATIONS = 250000;
const SALT_LEN = 16;
const IV_LEN = 12;

const NUM_FMT = new Intl.NumberFormat("en-US");

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function deriveKey(password, salt, iterations, usage) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

// Estimate a rough "time to crack" band from password composition. Purely
// informational; brute-force offline at ~1e10 guesses/sec against the KDF.
function passwordFeedback(pw) {
  if (!pw) return null;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const bits = pw.length * (Math.log2(pool || 1));
  let label = "Very weak";
  if (bits >= 100) label = "Excellent";
  else if (bits >= 80) label = "Strong";
  else if (bits >= 60) label = "Good";
  else if (bits >= 40) label = "Fair";
  else if (bits >= 28) label = "Weak";
  return { bits: Math.round(bits), label };
}

export default function FileEncryptor() {
  const [mode, setMode] = useState("encrypt"); // "encrypt" | "decrypt"
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, name, size, mode }

  const urlRef = useRef("");

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function clearResult() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
    setResult(null);
  }

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setFile(null);
    setPassword("");
    setConfirm("");
    setError("");
    setStatus("");
    clearResult();
  }

  function onFile(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!chosen) return;
    setError("");
    clearResult();
    setFile(chosen);
  }

  function triggerDownload(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  async function run() {
    setError("");
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (!password) {
      setError("Enter a password.");
      return;
    }
    if (mode === "encrypt" && password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    clearResult();
    setBusy(true);
    try {
      if (mode === "encrypt") {
        setStatus("Deriving key and encrypting…");
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
        const key = await deriveKey(password, salt, PBKDF2_ITERATIONS, "encrypt");

        const plaintext = new Uint8Array(await file.arrayBuffer());
        const cipherBuf = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          plaintext
        );
        const ciphertext = new Uint8Array(cipherBuf);

        const nameBytes = new TextEncoder().encode(file.name);
        if (nameBytes.length > 65535) throw new Error("Filename too long.");

        const iterBuf = new Uint8Array(4);
        new DataView(iterBuf.buffer).setUint32(0, PBKDF2_ITERATIONS, false);
        const nameLenBuf = new Uint8Array(2);
        new DataView(nameLenBuf.buffer).setUint16(0, nameBytes.length, false);

        const parts = [
          MAGIC,
          new Uint8Array([VERSION]),
          iterBuf,
          salt,
          iv,
          nameLenBuf,
          nameBytes,
          ciphertext,
        ];
        const blob = new Blob(parts, { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const outName = `${file.name}.ebtenc`;
        setResult({ url, name: outName, size: blob.size, mode: "encrypt" });
        triggerDownload(url, outName);
      } else {
        setStatus("Deriving key and decrypting…");
        const buf = new Uint8Array(await file.arrayBuffer());
        let off = 0;
        const need = (n) => {
          if (off + n > buf.length) throw new Error("truncated");
          const slice = buf.subarray(off, off + n);
          off += n;
          return slice;
        };
        let magic, version, iterations, salt, iv, nameLen, nameBytes;
        try {
          magic = need(8);
          if (!bytesEqual(magic, MAGIC)) throw new Error("badmagic");
          version = need(1)[0];
          if (version !== VERSION) throw new Error("badversion");
          iterations = new DataView(need(4).slice().buffer).getUint32(0, false);
          salt = need(SALT_LEN).slice();
          iv = need(IV_LEN).slice();
          nameLen = new DataView(need(2).slice().buffer).getUint16(0, false);
          nameBytes = need(nameLen).slice();
        } catch (headerErr) {
          throw new Error(
            "This file wasn't encrypted with this tool, or it's corrupted. Pick a .ebtenc file created here."
          );
        }
        const ciphertext = buf.subarray(off);
        if (iterations < 1 || iterations > 5000000) {
          throw new Error("This file wasn't encrypted with this tool, or it's corrupted.");
        }

        const key = await deriveKey(password, salt, iterations, "decrypt");
        let plainBuf;
        try {
          plainBuf = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
          );
        } catch (decErr) {
          throw new Error(
            "Wrong password, or the file was altered. Decryption failed — check the password and try again."
          );
        }

        const origName =
          new TextDecoder().decode(nameBytes) || "decrypted-file";
        const blob = new Blob([new Uint8Array(plainBuf)], {
          type: "application/octet-stream",
        });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setResult({ url, name: origName, size: blob.size, mode: "decrypt" });
        triggerDownload(url, origName);
      }
    } catch (e) {
      setError(e && e.message ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const pwInfo = mode === "encrypt" ? passwordFeedback(password) : null;
  const canRun = !busy && file && password;

  return (
    <div className="tool">
      <div className="tool-actions">
        <button
          type="button"
          className={mode === "encrypt" ? "btn btn-primary" : "btn"}
          onClick={() => switchMode("encrypt")}
        >
          Encrypt a file
        </button>
        <button
          type="button"
          className={mode === "decrypt" ? "btn btn-primary" : "btn"}
          onClick={() => switchMode("decrypt")}
        >
          Decrypt a file
        </button>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fe-file">
              {mode === "encrypt"
                ? "Choose any file to encrypt"
                : "Choose a .ebtenc file to decrypt"}
            </label>
            <input
              className="tool-input"
              id="fe-file"
              type="file"
              accept={mode === "decrypt" ? ".ebtenc" : undefined}
              onChange={onFile}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fe-password">
              Password
            </label>
            <input
              className="tool-input"
              id="fe-password"
              type={showPw ? "text" : "password"}
              value={password}
              autoComplete="off"
              placeholder="Enter a strong password"
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
                clearResult();
              }}
            />
          </div>
          {mode === "encrypt" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="fe-confirm">
                Confirm password
              </label>
              <input
                className="tool-input"
                id="fe-confirm"
                type={showPw ? "text" : "password"}
                value={confirm}
                autoComplete="off"
                placeholder="Re-enter the password"
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (error) setError("");
                  clearResult();
                }}
              />
            </div>
          )}
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fe-show">
              <input
                id="fe-show"
                type="checkbox"
                checked={showPw}
                onChange={(e) => setShowPw(e.target.checked)}
              />{" "}
              Show password
            </label>
          </div>
        </div>
      </div>

      {mode === "encrypt" && pwInfo && (
        <p className="tool-note" role="status" aria-live="polite">
          Password strength: <strong>{pwInfo.label}</strong> (~{pwInfo.bits} bits
          of entropy). There is no password recovery — if you forget it, the file
          cannot be opened.
        </p>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {busy && status && (
        <p className="tool-note" role="status" aria-live="polite">
          {status}
        </p>
      )}

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={run}
          disabled={!canRun}
        >
          {busy
            ? "Working…"
            : mode === "encrypt"
            ? "Encrypt & download"
            : "Decrypt & download"}
        </button>
        {result && (
          <a className="btn btn-success" href={result.url} download={result.name}>
            ↓ Download {result.name}
          </a>
        )}
      </div>

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">
            {result.mode === "encrypt" ? "Encrypted" : "Decrypted"}
          </div>
          <div className="tool-result-value">
            {result.mode === "encrypt"
              ? `Saved ${result.name} (${fmtBytes(result.size)}). Keep your password safe — you'll need it to decrypt.`
              : `Recovered ${result.name} (${fmtBytes(result.size)}).`}
          </div>
        </div>
      )}

      {!file && (
        <p className="tool-note">
          {mode === "encrypt"
            ? "Pick any file — a document, image, ZIP, spreadsheet, anything — set a password, and get back a locked .ebtenc file only that password can open."
            : "Pick a .ebtenc file you created here and enter the same password you used to encrypt it."}
        </p>
      )}

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">AES-256</div>
          <div className="tool-stat-label">GCM cipher</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">PBKDF2</div>
          <div className="tool-stat-label">
            {NUM_FMT.format(PBKDF2_ITERATIONS)} rounds
          </div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">0</div>
          <div className="tool-stat-label">Uploads</div>
        </div>
      </div>

      <p className="tool-note">
        Everything runs in your browser using the built-in Web Crypto API. Your
        file and password never leave your device — nothing is uploaded to any
        server.
      </p>
    </div>
  );
}
