"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const DRAFTS = {
  "2020-12": {
    label: "Draft 2020-12 (latest)",
    uri: "https://json-schema.org/draft/2020-12/schema",
  },
  "07": {
    label: "Draft-07",
    uri: "http://json-schema.org/draft-07/schema#",
  },
  "04": {
    label: "Draft-04",
    uri: "http://json-schema.org/draft-04/schema#",
  },
};

const EXAMPLE = `{
  "id": 128,
  "name": "Ada Lovelace",
  "active": true,
  "roles": ["admin", "editor"],
  "address": {
    "street": "12 Analytical Way",
    "city": "London",
    "zip": "EC1A 1BB"
  },
  "projects": [
    { "title": "Engine", "year": 1843, "public": false }
  ],
  "nickname": null
}`;

// Return a compact type name for a JSON value.
function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  if (typeof value === "number") return "number";
  return typeof value; // string, boolean, object
}

// Infer a JSON Schema fragment from a single example value.
function infer(value, opts) {
  const t = typeOf(value);

  if (t === "object") {
    const properties = {};
    const keys = Object.keys(value);
    for (const key of keys) {
      properties[key] = infer(value[key], opts);
    }
    const schema = { type: "object", properties };
    if (opts.requireAll && keys.length > 0) {
      schema.required = keys.slice();
    }
    if (opts.noAdditional) {
      schema.additionalProperties = false;
    }
    return schema;
  }

  if (t === "array") {
    const schema = { type: "array" };
    if (value.length === 0) {
      return schema; // unknown item type
    }
    // Infer each element then merge into one item schema.
    let items = infer(value[0], opts);
    for (let i = 1; i < value.length; i += 1) {
      items = mergeSchemas(items, infer(value[i], opts), opts);
    }
    schema.items = items;
    return schema;
  }

  // Primitive (string, number, integer, boolean, null)
  const schema = { type: t };
  if (opts.includeExamples && t !== "null") {
    schema.examples = [value];
  }
  return schema;
}

// Collect the type field of a schema into a set of strings.
function typeSet(schema) {
  if (!schema || schema.type === undefined) return new Set();
  return new Set(Array.isArray(schema.type) ? schema.type : [schema.type]);
}

// Merge two inferred schemas that describe values in the same position
// (e.g. sibling array elements). Objects merge property-wise; scalars
// union their types.
function mergeSchemas(a, b, opts) {
  if (!a) return b;
  if (!b) return a;

  const aTypes = typeSet(a);
  const bTypes = typeSet(b);
  const bothObjects = aTypes.has("object") && bTypes.has("object") && aTypes.size === 1 && bTypes.size === 1;
  const bothArrays = aTypes.has("array") && bTypes.has("array") && aTypes.size === 1 && bTypes.size === 1;

  if (bothObjects) {
    const props = {};
    const aProps = a.properties || {};
    const bProps = b.properties || {};
    const allKeys = new Set([...Object.keys(aProps), ...Object.keys(bProps)]);
    for (const key of allKeys) {
      if (aProps[key] && bProps[key]) {
        props[key] = mergeSchemas(aProps[key], bProps[key], opts);
      } else {
        props[key] = aProps[key] || bProps[key];
      }
    }
    const merged = { type: "object", properties: props };
    if (opts.requireAll) {
      // Required only where the key is present in BOTH samples.
      const aReq = new Set(a.required || []);
      const bReq = new Set(b.required || []);
      const req = [...aReq].filter((k) => bReq.has(k));
      if (req.length > 0) merged.required = req;
    }
    if (opts.noAdditional) merged.additionalProperties = false;
    return merged;
  }

  if (bothArrays) {
    const merged = { type: "array" };
    if (a.items && b.items) merged.items = mergeSchemas(a.items, b.items, opts);
    else if (a.items || b.items) merged.items = a.items || b.items;
    return merged;
  }

  // Union of scalar (or mixed) types.
  const union = new Set([...aTypes, ...bTypes]);
  union.delete(undefined);
  const typeList = [...union].sort();
  const merged = {};
  merged.type = typeList.length === 1 ? typeList[0] : typeList;
  // Carry examples through if both were scalar and requested.
  const aEx = a.examples || [];
  const bEx = b.examples || [];
  if (aEx.length || bEx.length) {
    merged.examples = [...new Set([...aEx, ...bEx])];
  }
  return merged;
}

// Order keys so the schema reads naturally: $schema, title, type, then the rest.
const KEY_ORDER = [
  "$schema",
  "$id",
  "title",
  "description",
  "type",
  "properties",
  "items",
  "required",
  "additionalProperties",
  "examples",
];

function orderKeys(obj) {
  if (Array.isArray(obj)) return obj.map(orderKeys);
  if (obj && typeof obj === "object") {
    const out = {};
    const keys = Object.keys(obj);
    const ordered = [
      ...KEY_ORDER.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !KEY_ORDER.includes(k)),
    ];
    for (const k of ordered) out[k] = orderKeys(obj[k]);
    return out;
  }
  return obj;
}

export default function JsonSchemaGenerator() {
  const [input, setInput] = useState(EXAMPLE);
  const [draft, setDraft] = useState("2020-12");
  const [title, setTitle] = useState("");
  const [requireAll, setRequireAll] = useState(true);
  const [noAdditional, setNoAdditional] = useState(false);
  const [includeExamples, setIncludeExamples] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", error: "", stats: null };
    }

    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      return {
        output: "",
        error: `Invalid JSON: ${e.message}`,
        stats: null,
      };
    }

    const opts = { requireAll, noAdditional, includeExamples };
    let schema;
    try {
      schema = infer(parsed, opts);
    } catch (e) {
      return { output: "", error: "Could not build a schema from that input.", stats: null };
    }

    const withMeta = { $schema: DRAFTS[draft].uri };
    if (title.trim()) withMeta.title = title.trim();
    Object.assign(withMeta, schema);

    let output;
    try {
      output = JSON.stringify(orderKeys(withMeta), null, 2);
    } catch (e) {
      return { output: "", error: "Could not serialize the schema.", stats: null };
    }

    // Count properties across the whole schema tree.
    let propCount = 0;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.properties) propCount += Object.keys(node.properties).length;
      if (node.properties) Object.values(node.properties).forEach(walk);
      if (node.items) walk(node.items);
    };
    walk(schema);

    return {
      output,
      error: "",
      stats: { rootType: Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type, propCount },
    };
  }, [input, draft, title, requireAll, noAdditional, includeExamples]);

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
    a.download = "schema.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSample() {
    setInput(EXAMPLE);
    setCopied(false);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="jsg-input">
            Sample JSON
          </label>
          <textarea
            className="tool-textarea"
            id="jsg-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder='{ "name": "Ada", "age": 36, "tags": ["a", "b"] }'
            rows={12}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="jsg-draft">
              Schema draft
            </label>
            <select
              className="tool-select"
              id="jsg-draft"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setCopied(false);
              }}
            >
              {Object.keys(DRAFTS).map((key) => (
                <option key={key} value={key}>
                  {DRAFTS[key].label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="jsg-title">
              Title (optional)
            </label>
            <input
              className="tool-input"
              id="jsg-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setCopied(false);
              }}
              placeholder="User"
            />
          </div>
        </div>

        <div className="tool-field">
          <span className="tool-label">Options</span>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", minHeight: "2rem" }}>
            <input
              type="checkbox"
              checked={requireAll}
              onChange={(e) => {
                setRequireAll(e.target.checked);
                setCopied(false);
              }}
            />
            <span>Mark present keys as required</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", minHeight: "2rem" }}>
            <input
              type="checkbox"
              checked={noAdditional}
              onChange={(e) => {
                setNoAdditional(e.target.checked);
                setCopied(false);
              }}
            />
            <span>Set additionalProperties: false on objects</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", minHeight: "2rem" }}>
            <input
              type="checkbox"
              checked={includeExamples}
              onChange={(e) => {
                setIncludeExamples(e.target.checked);
                setCopied(false);
              }}
            />
            <span>Include example values from the sample</span>
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSample}>
          Load sample
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
              <div className="tool-stat-num">{result.stats.rootType}</div>
              <div className="tool-stat-label">Root type</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.stats.propCount.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Properties</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy schema"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .json
              </button>
            </div>
            <label className="tool-label" htmlFor="jsg-output">
              Generated JSON Schema
            </label>
            <pre className="tool-output" id="jsg-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Paste a sample JSON object or array above to generate a JSON Schema
          from it. The tool infers types for every field, walks nested objects
          and arrays, and merges the shapes of array items. Everything runs in
          your browser.
        </p>
      ) : null}
    </div>
  );
}
