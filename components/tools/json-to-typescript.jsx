"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE = `{
  "id": 42,
  "name": "Ada Lovelace",
  "isActive": true,
  "roles": ["admin", "editor"],
  "profile": {
    "age": 36,
    "twitter": null,
    "location": { "city": "London", "lat": 51.5, "lng": -0.12 }
  },
  "posts": [
    { "title": "Notes", "likes": 12, "pinned": true },
    { "title": "More", "likes": 3 }
  ]
}`;

// --- Naming helpers -------------------------------------------------------

// Turn an arbitrary key/name into a valid PascalCase TypeScript identifier.
function toPascalCase(str) {
  const cleaned = String(str)
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();
  if (!cleaned) return "Item";
  const pascal = cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  // Identifiers cannot start with a digit.
  return /^[0-9]/.test(pascal) ? "N" + pascal : pascal;
}

// Naive but correct-for-most-cases singularization for array element names.
function singularize(word) {
  if (/ies$/i.test(word)) return word.replace(/ies$/i, "y");
  if (/(ses|xes|zes|ches|shes)$/i.test(word)) return word.replace(/es$/i, "");
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, "");
  return word;
}

// Is a key a safe bare object-property name, or must it be quoted?
function safeKey(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

// --- Type inference -------------------------------------------------------

function jsType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value; // "string" | "number" | "boolean" | "object"
}

// Merge an array of sample objects into one shape describing every key seen,
// tracking which keys are missing in some samples (=> optional).
function mergeObjectShapes(objects) {
  const keys = [];
  const seen = new Set();
  const presence = {}; // key -> count of objects containing it
  const values = {}; // key -> array of that key's values across samples

  for (const obj of objects) {
    for (const k of Object.keys(obj)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
        presence[k] = 0;
        values[k] = [];
      }
    }
  }
  for (const obj of objects) {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        presence[k] += 1;
        values[k].push(obj[k]);
      }
    }
  }
  return { keys, presence, values, total: objects.length };
}

/**
 * Recursively builds TypeScript type text.
 * Collected interfaces are pushed into `interfaces` (name -> body lines).
 * Returns the inline type string to reference at the call site.
 */
function buildType(value, nameHint, ctx) {
  const t = jsType(value);

  if (t === "null") return "null";
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";

  if (t === "array") {
    if (value.length === 0) return "unknown[]";

    // Collect the type of each element; unify.
    const elemName = singularize(nameHint);
    const objectSamples = value.filter(
      (v) => v !== null && typeof v === "object" && !Array.isArray(v)
    );

    // If every element is a plain object, merge them into one interface.
    if (objectSamples.length === value.length) {
      const iface = emitInterface(objectSamples, elemName, ctx);
      return `${iface}[]`;
    }

    // Mixed array -> union of the distinct element types.
    const parts = new Set();
    for (const el of value) {
      parts.add(buildType(el, elemName, ctx));
    }
    const union = unionString([...parts]);
    return parts.size > 1 ? `(${union})[]` : `${union}[]`;
  }

  // Plain object -> its own interface.
  return emitInterface([value], nameHint, ctx);
}

// Register (or reuse) an interface for the given object samples, returning its name.
function emitInterface(objectSamples, nameHint, ctx) {
  const shape = mergeObjectShapes(objectSamples);

  if (shape.keys.length === 0) {
    // No keys at all -> a generic record.
    return "Record<string, unknown>";
  }

  const name = uniqueName(toPascalCase(nameHint), ctx);
  // Reserve the name immediately so nested types don't collide with it.
  ctx.reserved.add(name);

  const lines = [];
  for (const key of shape.keys) {
    const vals = shape.values[key];
    const optionalByPresence = shape.presence[key] < shape.total;

    // Unify all values seen for this key across samples.
    const typeSet = new Set();
    let sawNull = false;
    for (const v of vals) {
      if (v === null) {
        sawNull = true;
        continue;
      }
      typeSet.add(buildType(v, key, ctx));
    }

    let types = [...typeSet];
    let optional = optionalByPresence;

    if (sawNull) {
      if (ctx.nullMode === "optional") {
        // Treat null as an optional marker instead of a `| null` member.
        optional = true;
        if (types.length === 0) types = ["unknown"];
      } else {
        types.push("null");
        if (types.length === 1 && types[0] === "null") {
          // key was only ever null
        }
      }
    }

    if (types.length === 0) types = ["unknown"];

    const typeText = unionString(types);
    const q = optional ? "?" : "";
    lines.push(`  ${safeKey(key)}${q}: ${typeText};`);
  }

  ctx.interfaces.push({ name, lines });
  return name;
}

function unionString(types) {
  const unique = [...new Set(types)];
  // Keep a stable, readable order: primitives first, then the rest as-is.
  return unique.join(" | ");
}

// Ensure interface names are unique within the document.
function uniqueName(base, ctx) {
  let name = base;
  let n = 2;
  while (ctx.reserved.has(name)) {
    name = base + n;
    n += 1;
  }
  return name;
}

function generate(jsonText, rootName, kind, exportKw, nullMode) {
  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { output: "", error: "", interfaceCount: 0 };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return {
      output: "",
      error: "Invalid JSON: " + (e && e.message ? e.message : "could not parse"),
      interfaceCount: 0,
    };
  }

  const rootHint = rootName.trim() || "Root";
  const ctx = { interfaces: [], reserved: new Set(), nullMode };

  const t = jsType(parsed);
  let rootAlias = null;

  if (t === "object") {
    // Root is an object -> its own interface named after rootName.
    emitInterface([parsed], rootHint, ctx);
  } else {
    // Root is an array or primitive -> emit a type alias.
    const typeText = buildType(parsed, rootHint, ctx);
    rootAlias = { name: toPascalCase(rootHint), typeText };
  }

  const kw = exportKw ? "export " : "";
  const blocks = [];

  // Interfaces were pushed inner-first; reverse so the root reads at the top.
  const ordered = [...ctx.interfaces].reverse();

  for (const iface of ordered) {
    if (kind === "type") {
      blocks.push(
        `${kw}type ${iface.name} = {\n${iface.lines.join("\n")}\n};`
      );
    } else {
      blocks.push(
        `${kw}interface ${iface.name} {\n${iface.lines.join("\n")}\n}`
      );
    }
  }

  if (rootAlias) {
    blocks.unshift(`${kw}type ${rootAlias.name} = ${rootAlias.typeText};`);
  }

  const count = ordered.length + (rootAlias ? 1 : 0);
  return { output: blocks.join("\n\n"), error: "", interfaceCount: count };
}

export default function JsonToTypescript() {
  const [input, setInput] = useState(EXAMPLE);
  const [rootName, setRootName] = useState("Root");
  const [kind, setKind] = useState("interface"); // "interface" | "type"
  const [exportKw, setExportKw] = useState(true);
  const [nullMode, setNullMode] = useState("union"); // "union" | "optional"
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => generate(input, rootName, kind, exportKw, nullMode),
    [input, rootName, kind, exportKw, nullMode]
  );

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

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  function handleExample() {
    setInput(EXAMPLE);
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="jtt-input">
            JSON input
          </label>
          <textarea
            className="tool-textarea"
            id="jtt-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder='{ "id": 1, "name": "Sam", "tags": ["a", "b"] }'
            rows={12}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="jtt-root">
              Root name
            </label>
            <input
              className="tool-input"
              id="jtt-root"
              type="text"
              value={rootName}
              onChange={(e) => {
                setRootName(e.target.value);
                setCopied(false);
              }}
              placeholder="Root"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="jtt-kind">
              Output style
            </label>
            <select
              className="tool-select"
              id="jtt-kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setCopied(false);
              }}
            >
              <option value="interface">interface</option>
              <option value="type">type alias</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="jtt-null">
              Handle null as
            </label>
            <select
              className="tool-select"
              id="jtt-null"
              value={nullMode}
              onChange={(e) => {
                setNullMode(e.target.value);
                setCopied(false);
              }}
            >
              <option value="union">| null (keep null)</option>
              <option value="optional">optional (key?:)</option>
            </select>
          </div>
        </div>

        <div className="tool-field">
          <label
            htmlFor="jtt-export"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minHeight: "2.5rem",
            }}
          >
            <input
              id="jtt-export"
              type="checkbox"
              checked={exportKw}
              onChange={(e) => {
                setExportKw(e.target.checked);
                setCopied(false);
              }}
            />
            <span>Add export keyword</span>
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleExample}>
          Load example
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.error ? <p className="tool-error">{result.error}</p> : null}

      {result.output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.interfaceCount.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">
                {kind === "type" ? "Types generated" : "Interfaces generated"}
              </div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy TypeScript"}
              </button>
            </div>
            <label className="tool-label" htmlFor="jtt-output">
              TypeScript output
            </label>
            <pre className="tool-output" id="jtt-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Paste a JSON object or array above to generate TypeScript interfaces.
          Nested objects become their own interfaces, arrays of objects are
          merged into one shape, keys missing from some items are marked
          optional, and everything runs privately in your browser.
        </p>
      ) : null}
    </div>
  );
}
