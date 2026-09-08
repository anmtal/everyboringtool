"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// Tokenize a curl command line the way a POSIX shell would: honor single and
// double quotes, backslash escapes, and treat backslash-newline (and a trailing
// ^ on Windows-style multi-line commands) as line continuations. Returns an
// array of argument tokens with the surrounding quotes removed.
function tokenize(input) {
  // Normalize line continuations: "\" or "^" at end of a line joins to next.
  let src = input.replace(/\\\r?\n/g, " ").replace(/\^\r?\n/g, " ");
  const tokens = [];
  let cur = "";
  let has = false; // whether the current token has started (allows empty "")
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    if (ch === "'") {
      // Single quotes: everything literal until the next single quote.
      has = true;
      i += 1;
      while (i < n && src[i] !== "'") {
        cur += src[i];
        i += 1;
      }
      i += 1; // skip closing quote (if present)
      continue;
    }

    if (ch === '"') {
      // Double quotes: allow backslash escapes for " \ $ ` and newline.
      has = true;
      i += 1;
      while (i < n && src[i] !== '"') {
        if (src[i] === "\\" && i + 1 < n && '"\\$`\n'.includes(src[i + 1])) {
          cur += src[i + 1];
          i += 2;
          continue;
        }
        cur += src[i];
        i += 1;
      }
      i += 1;
      continue;
    }

    if (ch === "\\") {
      // Backslash escapes the next character outside quotes.
      if (i + 1 < n) {
        cur += src[i + 1];
        has = true;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (has) {
        tokens.push(cur);
        cur = "";
        has = false;
      }
      i += 1;
      continue;
    }

    cur += ch;
    has = true;
    i += 1;
  }

  if (has) tokens.push(cur);
  return tokens;
}

// Options that take a value (long and short forms curl users commonly paste).
const VALUE_FLAGS = new Set([
  "-X", "--request",
  "-H", "--header",
  "-d", "--data", "--data-raw", "--data-ascii", "--data-binary", "--data-urlencode",
  "-F", "--form",
  "-u", "--user",
  "-b", "--cookie",
  "-e", "--referer",
  "-A", "--user-agent",
  "--url",
  "-o", "--output",
  "-m", "--max-time",
  "--connect-timeout",
]);

// Boolean flags we recognize (so we can skip them without eating the next token).
const BOOL_FLAGS = new Set([
  "--compressed", "-L", "--location", "-k", "--insecure", "-s", "--silent",
  "-S", "--show-error", "-v", "--verbose", "-i", "--include", "-g", "--globoff",
  "-#", "--progress-bar", "--fail", "-f",
]);

function parseCurl(tokens) {
  const result = {
    url: "",
    method: "",
    headers: [], // { name, value }
    dataParts: [],
    dataMode: "", // "raw" | "urlencode" | "form"
    formParts: [], // { name, value, isFile }
    user: "",
    error: "",
  };

  let i = 0;
  // The first token is usually "curl"; skip it if so.
  if (tokens.length && /^curl(\.exe)?$/i.test(tokens[0])) i = 1;

  while (i < tokens.length) {
    let tok = tokens[i];

    // Support "--flag=value" form.
    let inlineValue = null;
    if (tok.startsWith("--") && tok.includes("=")) {
      const eq = tok.indexOf("=");
      inlineValue = tok.slice(eq + 1);
      tok = tok.slice(0, eq);
    }

    const takeValue = () => {
      if (inlineValue !== null) return inlineValue;
      i += 1;
      return i < tokens.length ? tokens[i] : "";
    };

    if (tok === "-X" || tok === "--request") {
      result.method = takeValue().toUpperCase();
    } else if (tok === "-H" || tok === "--header") {
      const raw = takeValue();
      const idx = raw.indexOf(":");
      if (idx >= 0) {
        const name = raw.slice(0, idx).trim();
        const value = raw.slice(idx + 1).trim();
        if (name) result.headers.push({ name, value });
      }
    } else if (
      tok === "-d" || tok === "--data" || tok === "--data-raw" ||
      tok === "--data-ascii" || tok === "--data-binary"
    ) {
      result.dataParts.push(takeValue());
      if (result.dataMode !== "urlencode" && result.dataMode !== "form") {
        result.dataMode = "raw";
      }
    } else if (tok === "--data-urlencode") {
      result.dataParts.push(takeValue());
      result.dataMode = "urlencode";
    } else if (tok === "-F" || tok === "--form") {
      const raw = takeValue();
      const idx = raw.indexOf("=");
      if (idx >= 0) {
        const name = raw.slice(0, idx);
        let value = raw.slice(idx + 1);
        const isFile = value.startsWith("@");
        if (isFile) value = value.slice(1);
        result.formParts.push({ name, value, isFile });
      }
      result.dataMode = "form";
    } else if (tok === "-u" || tok === "--user") {
      result.user = takeValue();
    } else if (tok === "-b" || tok === "--cookie") {
      const raw = takeValue();
      // Only inline cookie strings (name=value) map to a header; a filename does not.
      if (raw.includes("=")) result.headers.push({ name: "Cookie", value: raw });
    } else if (tok === "-e" || tok === "--referer") {
      const raw = takeValue().replace(/;auto$/, "");
      if (raw) result.headers.push({ name: "Referer", value: raw });
    } else if (tok === "-A" || tok === "--user-agent") {
      result.headers.push({ name: "User-Agent", value: takeValue() });
    } else if (tok === "--url") {
      result.url = takeValue();
    } else if (VALUE_FLAGS.has(tok)) {
      // Recognized value-flag we don't otherwise map — consume its value.
      takeValue();
    } else if (BOOL_FLAGS.has(tok)) {
      // Recognized boolean flag with no value.
    } else if (tok.startsWith("-") && tok !== "-") {
      // Unknown flag. If it looks long, it might carry a value we should not
      // treat as the URL; but to stay safe we just skip the flag token itself.
    } else {
      // A bare (non-flag) token is the URL.
      if (!result.url) result.url = tok;
    }

    i += 1;
  }

  if (!result.url) {
    result.error = "No URL found in the curl command.";
  }
  return result;
}

// Determine the effective HTTP method.
function effectiveMethod(parsed) {
  if (parsed.method) return parsed.method;
  if (parsed.dataParts.length || parsed.formParts.length) return "POST";
  return "GET";
}

function jsString(s) {
  return JSON.stringify(s);
}

// Build a body expression + any headers needed, plus notes.
function buildBody(parsed, method) {
  const notes = [];
  const hasBody = parsed.dataParts.length || parsed.formParts.length;
  if (!hasBody) return { bodyLine: null, extraHeaders: [], notes };

  if (parsed.dataMode === "form") {
    // multipart/form-data via FormData. Do NOT set Content-Type manually —
    // the browser adds the multipart boundary automatically.
    const lines = ["  const form = new FormData();"];
    for (const p of parsed.formParts) {
      if (p.isFile) {
        lines.push(
          `  // form.append(${jsString(p.name)}, fileInput.files[0]); // "@${p.value}" was a file upload`
        );
        notes.push(
          `The -F field "${p.name}" uploaded the file "${p.value}". In a browser, supply a File/Blob from an <input type="file"> instead.`
        );
      } else {
        lines.push(`  form.append(${jsString(p.name)}, ${jsString(p.value)});`);
      }
    }
    return { bodyPre: lines.join("\n"), bodyValue: "form", extraHeaders: [], notes };
  }

  if (parsed.dataMode === "urlencode") {
    // Each --data-urlencode part may be "name=value", "name@file", or "value".
    const lines = ["  const params = new URLSearchParams();"];
    for (const part of parsed.dataParts) {
      const eq = part.indexOf("=");
      if (eq >= 0) {
        lines.push(
          `  params.append(${jsString(part.slice(0, eq))}, ${jsString(part.slice(eq + 1))});`
        );
      } else {
        lines.push(`  params.append("", ${jsString(part)});`);
      }
    }
    return {
      bodyPre: lines.join("\n"),
      bodyValue: "params",
      extraHeaders: [],
      notes,
    };
  }

  // Raw data. curl joins multiple -d parts with "&".
  const joined = parsed.dataParts.join("&");
  return { bodyValue: jsString(joined), extraHeaders: [], notes };
}

function generate(parsed, opts) {
  const method = effectiveMethod(parsed);
  const headers = parsed.headers.slice();

  // Basic auth from -u user:pass -> Authorization header (base64).
  const notes = [];
  if (parsed.user) {
    let b64 = "";
    try {
      b64 = typeof btoa === "function" ? btoa(parsed.user) : "";
    } catch (e) {
      b64 = "";
    }
    if (b64) {
      headers.push({ name: "Authorization", value: `Basic ${b64}` });
      notes.push(
        "The -u credentials were encoded into an Authorization: Basic header. Avoid committing real credentials to client-side code."
      );
    }
  }

  const body = buildBody(parsed, method);
  for (const nt of body.notes) notes.push(nt);

  // A raw string body defaults to Content-Type from any -H; if none present and
  // it's raw data, curl sends application/x-www-form-urlencoded.
  if (
    parsed.dataMode === "raw" &&
    parsed.dataParts.length &&
    !headers.some((h) => h.name.toLowerCase() === "content-type")
  ) {
    headers.push({
      name: "Content-Type",
      value: "application/x-www-form-urlencoded",
    });
  }

  const lines = [];
  const useAwait = opts.style === "await";

  if (useAwait) {
    lines.push(`const response = await fetch(${jsString(parsed.url)}, {`);
  } else {
    lines.push(`fetch(${jsString(parsed.url)}, {`);
  }

  lines.push(`  method: ${jsString(method)},`);

  if (headers.length) {
    lines.push("  headers: {");
    headers.forEach((h, idx) => {
      const comma = idx < headers.length - 1 ? "," : ",";
      lines.push(`    ${jsString(h.name)}: ${jsString(h.value)}${comma}`);
    });
    lines.push("  },");
  }

  if (opts.credentials !== "default") {
    lines.push(`  credentials: ${jsString(opts.credentials)},`);
  }

  // Body handling. For FormData/URLSearchParams we need setup lines before fetch.
  let preLines = "";
  if (body.bodyPre) {
    preLines = body.bodyPre + "\n";
    lines.push(`  body: ${body.bodyValue},`);
  } else if (body.bodyValue) {
    lines.push(`  body: ${body.bodyValue},`);
  }

  lines.push("})");

  let code;
  if (useAwait) {
    code =
      (preLines ? preLines : "") +
      lines.join("\n") +
      ";\n" +
      "const data = await response.json();\n" +
      "console.log(data);";
  } else {
    code =
      (preLines ? preLines : "") +
      lines.join("\n") +
      "\n" +
      "  .then((response) => response.json())\n" +
      "  .then((data) => console.log(data))\n" +
      "  .catch((error) => console.error(error));";
  }

  return { code, notes, method };
}

const EXAMPLE = `curl -X POST https://api.example.com/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN123" \\
  -d '{"name":"Ada","role":"admin"}'`;

export default function CurlToFetch() {
  const [input, setInput] = useState(EXAMPLE);
  const [style, setStyle] = useState("await");
  const [credentials, setCredentials] = useState("default");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { code: "", notes: [], error: "", method: "" };
    }
    let tokens;
    try {
      tokens = tokenize(input);
    } catch (e) {
      return { code: "", notes: [], error: "Could not read the command.", method: "" };
    }
    if (!tokens.length) {
      return { code: "", notes: [], error: "", method: "" };
    }
    const parsed = parseCurl(tokens);
    if (parsed.error) {
      return { code: "", notes: [], error: parsed.error, method: "" };
    }
    try {
      const gen = generate(parsed, { style, credentials });
      return { code: gen.code, notes: gen.notes, error: "", method: gen.method };
    } catch (e) {
      return { code: "", notes: [], error: "Could not build the fetch code.", method: "" };
    }
  }, [input, style, credentials]);

  async function handleCopy() {
    if (!result.code) return;
    try {
      await copyText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="curl-input">
            curl command
          </label>
          <textarea
            className="tool-textarea"
            id="curl-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={EXAMPLE}
            rows={8}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="curl-style">
              Output style
            </label>
            <select
              className="tool-select"
              id="curl-style"
              value={style}
              onChange={(e) => {
                setStyle(e.target.value);
                setCopied(false);
              }}
            >
              <option value="await">async / await</option>
              <option value="then">.then() promise chain</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="curl-credentials">
              credentials
            </label>
            <select
              className="tool-select"
              id="curl-credentials"
              value={credentials}
              onChange={(e) => {
                setCredentials(e.target.value);
                setCopied(false);
              }}
            >
              <option value="default">omit (default)</option>
              <option value="include">include (send cookies)</option>
              <option value="same-origin">same-origin</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.error ? <p className="tool-error">{result.error}</p> : null}

      {result.code ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.method}</div>
              <div className="tool-stat-label">HTTP method</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>
            <label className="tool-label" htmlFor="curl-output">
              JavaScript fetch()
            </label>
            <pre className="tool-output" id="curl-output">
              {result.code}
            </pre>
          </div>

          {result.notes.length ? (
            <div className="tool-field">
              {result.notes.map((note, idx) => (
                <p className="tool-note" key={idx}>
                  {note}
                </p>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {!result.code && !result.error ? (
        <p className="tool-note">
          Paste a curl command above to convert it into a JavaScript fetch()
          call. Method, headers, JSON and form bodies, basic auth (-u), and
          multi-line commands are all handled. Everything runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
