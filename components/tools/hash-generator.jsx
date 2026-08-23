"use client";

import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Inline, dependency-free MD5. Operates on a Uint8Array of UTF-8 bytes so it
// matches what crypto.subtle.digest hashes for SHA-1/256/512. Returns lowercase
// hex. Correct for empty input and multi-byte (UTF-8 / emoji) content.
// ---------------------------------------------------------------------------
function md5(bytes) {
  const HEX = "0123456789abcdef";

  const add32 = (a, b) => (a + b) | 0;
  const rol = (x, c) => (x << c) | (x >>> (32 - c));

  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32(rol(a, s), b);
  }
  const ff = (a, b, c, d, x, s, t) => cmn((b & c) | (~b & d), a, b, x, s, t);
  const gg = (a, b, c, d, x, s, t) => cmn((b & d) | (c & ~d), a, b, x, s, t);
  const hh = (a, b, c, d, x, s, t) => cmn(b ^ c ^ d, a, b, x, s, t);
  const ii = (a, b, c, d, x, s, t) => cmn(c ^ (b | ~d), a, b, x, s, t);

  const len = bytes.length;
  const nBlocks = ((len + 8) >> 6) + 1;
  const words = new Int32Array(nBlocks * 16);

  for (let i = 0; i < len; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  // Append the mandatory 0x80 byte, then the 64-bit little-endian bit length.
  words[len >> 2] |= 0x80 << ((len % 4) * 8);
  const bitLen = len * 8;
  words[nBlocks * 16 - 2] = bitLen & 0xffffffff;
  words[nBlocks * 16 - 1] = Math.floor(len / 0x20000000) & 0xffffffff;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < words.length; i += 16) {
    const oa = a;
    const ob = b;
    const oc = c;
    const od = d;
    const x = words.subarray(i, i + 16);

    a = ff(a, b, c, d, x[0], 7, -680876936);
    d = ff(d, a, b, c, x[1], 12, -389564586);
    c = ff(c, d, a, b, x[2], 17, 606105819);
    b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897);
    d = ff(d, a, b, c, x[5], 12, 1200080426);
    c = ff(c, d, a, b, x[6], 17, -1473231341);
    b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416);
    d = ff(d, a, b, c, x[9], 12, -1958414417);
    c = ff(c, d, a, b, x[10], 17, -42063);
    b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682);
    d = ff(d, a, b, c, x[13], 12, -40341101);
    c = ff(c, d, a, b, x[14], 17, -1502002290);
    b = ff(b, c, d, a, x[15], 22, 1236535329);

    a = gg(a, b, c, d, x[1], 5, -165796510);
    d = gg(d, a, b, c, x[6], 9, -1069501632);
    c = gg(c, d, a, b, x[11], 14, 643717713);
    b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691);
    d = gg(d, a, b, c, x[10], 9, 38016083);
    c = gg(c, d, a, b, x[15], 14, -660478335);
    b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438);
    d = gg(d, a, b, c, x[14], 9, -1019803690);
    c = gg(c, d, a, b, x[3], 14, -187363961);
    b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467);
    d = gg(d, a, b, c, x[2], 9, -51403784);
    c = gg(c, d, a, b, x[7], 14, 1735328473);
    b = gg(b, c, d, a, x[12], 20, -1926607734);

    a = hh(a, b, c, d, x[5], 4, -378558);
    d = hh(d, a, b, c, x[8], 11, -2022574463);
    c = hh(c, d, a, b, x[11], 16, 1839030562);
    b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060);
    d = hh(d, a, b, c, x[4], 11, 1272893353);
    c = hh(c, d, a, b, x[7], 16, -155497632);
    b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174);
    d = hh(d, a, b, c, x[0], 11, -358537222);
    c = hh(c, d, a, b, x[3], 16, -722521979);
    b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487);
    d = hh(d, a, b, c, x[12], 11, -421815835);
    c = hh(c, d, a, b, x[15], 16, 530742520);
    b = hh(b, c, d, a, x[2], 23, -995338651);

    a = ii(a, b, c, d, x[0], 6, -198630844);
    d = ii(d, a, b, c, x[7], 10, 1126891415);
    c = ii(c, d, a, b, x[14], 15, -1416354905);
    b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571);
    d = ii(d, a, b, c, x[3], 10, -1894986606);
    c = ii(c, d, a, b, x[10], 15, -1051523);
    b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359);
    d = ii(d, a, b, c, x[15], 10, -30611744);
    c = ii(c, d, a, b, x[6], 15, -1560198380);
    b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070);
    d = ii(d, a, b, c, x[11], 10, -1120210379);
    c = ii(c, d, a, b, x[2], 15, 718787259);
    b = ii(b, c, d, a, x[9], 21, -343485551);

    a = add32(a, oa);
    b = add32(b, ob);
    c = add32(c, oc);
    d = add32(d, od);
  }

  // Emit each 32-bit word as 4 little-endian bytes in hex.
  let hex = "";
  const outWords = [a, b, c, d];
  for (let w = 0; w < 4; w++) {
    const word = outWords[w];
    for (let j = 0; j < 4; j++) {
      const byte = (word >>> (j * 8)) & 0xff;
      hex += HEX[(byte >> 4) & 0xf] + HEX[byte & 0xf];
    }
  }
  return hex;
}

function bufferToHex(buffer) {
  const view = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, "0");
  }
  return hex;
}

const ALGORITHMS = [
  { key: "md5", label: "MD5", bits: 128 },
  { key: "sha1", label: "SHA-1", bits: 160 },
  { key: "sha256", label: "SHA-256", bits: 256 },
  { key: "sha512", label: "SHA-512", bits: 512 },
];

const EMPTY = { md5: "", sha1: "", sha256: "", sha512: "" };

export default function HashGenerator() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState(EMPTY);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  // UTF-8 byte length, shown alongside character count.
  const byteLength = useMemo(() => {
    if (!input) return 0;
    try {
      return new TextEncoder().encode(input).length;
    } catch (e) {
      return 0;
    }
  }, [input]);

  useEffect(() => {
    let cancelled = false;

    if (!input) {
      setHashes(EMPTY);
      setError("");
      return () => {
        cancelled = true;
      };
    }

    async function compute() {
      try {
        const bytes = new TextEncoder().encode(input);

        // MD5 is synchronous and inline; SHA family uses the Web Crypto API.
        const md5Hex = md5(bytes);

        const subtle =
          typeof crypto !== "undefined" && crypto.subtle ? crypto.subtle : null;

        if (!subtle) {
          if (!cancelled) {
            setHashes({ ...EMPTY, md5: md5Hex });
            setError(
              "SHA hashes need the Web Crypto API, which is only available on secure (https) pages. MD5 is still shown above."
            );
          }
          return;
        }

        const [sha1Buf, sha256Buf, sha512Buf] = await Promise.all([
          subtle.digest("SHA-1", bytes),
          subtle.digest("SHA-256", bytes),
          subtle.digest("SHA-512", bytes),
        ]);

        if (cancelled) return;

        setHashes({
          md5: md5Hex,
          sha1: bufferToHex(sha1Buf),
          sha256: bufferToHex(sha256Buf),
          sha512: bufferToHex(sha512Buf),
        });
        setError("");
      } catch (e) {
        if (!cancelled) {
          setHashes(EMPTY);
          setError("Could not compute hashes for this input.");
        }
      }
    }

    compute();

    return () => {
      cancelled = true;
    };
  }, [input]);

  async function handleCopy(key, value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(
        () => setCopiedKey((current) => (current === key ? "" : current)),
        1500
      );
    } catch (e) {
      setCopiedKey("");
    }
  }

  function handleClear() {
    setInput("");
    setCopiedKey("");
    setError("");
  }

  const hasOutput = Boolean(input) && Boolean(hashes.md5);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="hash-input">
            Text to hash
          </label>
          <textarea
            id="hash-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste any text to hash it…"
            rows={8}
            spellCheck={false}
          />
        </div>
      </div>

      {input ? (
        <div className="tool-actions">
          <button className="btn" type="button" onClick={handleClear}>
            Clear
          </button>
        </div>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}

      {hasOutput ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {input.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Characters</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {byteLength.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">UTF-8 bytes</div>
            </div>
          </div>

          {ALGORITHMS.map(({ key, label, bits }) => {
            const value = hashes[key];
            const copied = copiedKey === key;
            return (
              <div className="tool-field" key={key}>
                <div className="tool-actions">
                  <span className="tool-label">
                    {label} ({bits}-bit)
                  </span>
                  <button
                    className={copied ? "btn btn-success" : "btn btn-primary"}
                    type="button"
                    onClick={() => handleCopy(key, value)}
                    disabled={!value}
                    aria-label={`Copy ${label} hash`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="tool-output">
                  {value || "Computing…"}
                </pre>
              </div>
            );
          })}
        </>
      ) : (
        <p className="tool-note">
          Enter text above to generate MD5, SHA-1, SHA-256, and SHA-512 hashes.
          Everything runs live in your browser — nothing is uploaded.
        </p>
      )}
    </div>
  );
}
