"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE = `# App configuration
NODE_ENV=production
PORT=3000
APP_NAME="My Boring App"
DEBUG=false

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/db
DB_POOL_SIZE=10

# Feature flags
ENABLE_SIGNUP=true
MAX_UPLOAD_MB=25
export API_KEY='sk_live_abc123'   # inline comment ignored
EMPTY_VALUE=
GREETING="Hello\\nWorld"`;

// Parse a .env / dotenv file into ordered [key, value] pairs.
// Follows the common dotenv conventions:
//  - KEY=VALUE per line; whitespace around key and the = is trimmed
//  - lines starting with # are comments; blank lines ignored
//  - an optional leading "export " is stripped
//  - double-quoted values expand \n, \r, \t, \\, \" escapes and keep spaces
//  - single-quoted values are literal (no escaping, no interpolation)
//  - unquoted values are trimmed and an unquoted "#" starts an inline comment
function parseEnv(text) {
  const pairs = [];
  const errors = [];
  const lines = text.split(/\r\n|\r|\n/);

  lines.forEach((raw, idx) => {
    let line = raw;
    if (line.trim() === "") return;
    if (line.trim().startsWith("#")) return;

    // Strip an optional leading "export ".
    line = line.replace(/^\s*export\s+/, "");

    const eq = line.indexOf("=");
    if (eq === -1) {
      errors.push(`Line ${idx + 1}: no "=" found, skipped.`);
      return;
    }

    const key = line.slice(0, eq).trim();
    if (key === "") {
      errors.push(`Line ${idx + 1}: empty key, skipped.`);
      return;
    }

    let rest = line.slice(eq + 1);
    // Trim only leading whitespace before inspecting quotes.
    rest = rest.replace(/^\s+/, "");

    let value;
    if (rest[0] === '"') {
      // Double-quoted: read until the next unescaped closing quote.
      let out = "";
      let i = 1;
      let closed = false;
      while (i < rest.length) {
        const ch = rest[i];
        if (ch === "\\") {
          const next = rest[i + 1];
          if (next === "n") out += "\n";
          else if (next === "r") out += "\r";
          else if (next === "t") out += "\t";
          else if (next === '"') out += '"';
          else if (next === "\\") out += "\\";
          else out += next === undefined ? "\\" : "\\" + next;
          i += 2;
          continue;
        }
        if (ch === '"') {
          closed = true;
          i += 1;
          break;
        }
        out += ch;
        i += 1;
      }
      if (!closed) errors.push(`Line ${idx + 1}: unterminated double quote.`);
      value = out;
    } else if (rest[0] === "'") {
      // Single-quoted: literal until the next single quote.
      const end = rest.indexOf("'", 1);
      if (end === -1) {
        errors.push(`Line ${idx + 1}: unterminated single quote.`);
        value = rest.slice(1);
      } else {
        value = rest.slice(1, end);
      }
    } else {
      // Unquoted: strip an inline comment (space + #) then trim.
      const hashPos = rest.search(/\s#/);
      if (hashPos !== -1) rest = rest.slice(0, hashPos);
      value = rest.trim();
    }

    pairs.push([key, value]);
  });

  return { pairs, errors };
}

// Optionally coerce string values to booleans, numbers, or null.
function coerce(value) {
  const v = value.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (v !== "" && /^-?\d+(\.\d+)?$/.test(v) && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return value;
}

export default function EnvToJson() {
  const [input, setInput] = useState(EXAMPLE);
  const [coerceTypes, setCoerceTypes] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", count: 0, errors: [], duplicates: [] };
    }

    const { pairs, errors } = parseEnv(input);

    // Later keys win, matching how a process loads env vars; note duplicates.
    const seen = new Set();
    const duplicates = [];
    const obj = {};
    pairs.forEach(([key, value]) => {
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
      obj[key] = coerceTypes ? coerce(value) : value;
    });

    let output = "";
    try {
      output = JSON.stringify(obj, null, 2);
    } catch (e) {
      return {
        output: "",
        count: 0,
        errors: ["Could not convert to JSON."],
        duplicates: [],
      };
    }

    return {
      output,
      count: Object.keys(obj).length,
      errors,
      duplicates: [...new Set(duplicates)],
    };
  }, [input, coerceTypes]);

  async function handleCopy() {
    if (!result.output) return;
    try {
      await copyText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "env.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="env-input">
            .env input
          </label>
          <textarea
            className="tool-textarea"
            id="env-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={"KEY=value\nAPP_NAME=\"My App\"\nDEBUG=false"}
            rows={12}
            spellCheck={false}
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="env-coerce">
            Options
          </label>
          <label
            htmlFor="env-coerce"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minHeight: "2.5rem",
            }}
          >
            <input
              id="env-coerce"
              type="checkbox"
              checked={coerceTypes}
              onChange={(e) => {
                setCoerceTypes(e.target.checked);
                setCopied(false);
              }}
            />
            <span>
              Convert true/false, numbers and null to real JSON types (off keeps
              every value as a string)
            </span>
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.count.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Keys</div>
            </div>
          </div>

          {result.duplicates.length > 0 ? (
            <p className="tool-note">
              Duplicate key{result.duplicates.length > 1 ? "s" : ""} found (last
              value kept, as a process would): {result.duplicates.join(", ")}
            </p>
          ) : null}

          {result.errors.length > 0 ? (
            <p className="tool-error">{result.errors.join(" ")}</p>
          ) : null}

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .json
              </button>
            </div>
            <label className="tool-label" htmlFor="env-output">
              JSON output
            </label>
            <pre className="tool-output" id="env-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Paste the contents of a .env file above to convert it to JSON
          instantly. Comments (#), blank lines, an optional leading "export ",
          and single- or double-quoted values are all handled. Everything runs
          locally in your browser, so your secrets are never uploaded.
        </p>
      )}
    </div>
  );
}
