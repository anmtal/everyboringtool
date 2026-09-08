"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// ---------------------------------------------------------------------------
// A tiny deterministic-ish pseudo-random source. We use Math.random for the
// actual values but keep small curated word banks so generated data reads like
// realistic sample data rather than gibberish.
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
  "Linda", "David", "Elizabeth", "Maria", "Ahmed", "Wei", "Priya", "Carlos",
  "Sofia", "Liam", "Olivia", "Noah", "Emma", "Aiden", "Ava", "Yuki", "Ravi",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson",
  "Anderson", "Thomas", "Nguyen", "Patel", "Kim", "Chen", "Khan", "Silva",
];

const DOMAINS = [
  "example.com", "mail.com", "test.org", "sample.net", "demo.io", "acme.co",
];

const CITIES = [
  "London", "New York", "Tokyo", "Paris", "Berlin", "Madrid", "Toronto",
  "Sydney", "Mumbai", "Dubai", "Singapore", "Austin", "Chicago", "Lagos",
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Germany", "France", "Japan",
  "Australia", "India", "Brazil", "Spain", "Nigeria", "Singapore", "Mexico",
];

const COMPANIES = [
  "Acme", "Globex", "Initech", "Umbrella", "Soylent", "Hooli", "Vandelay",
  "Stark", "Wayne", "Wonka", "Cyberdyne", "Tyrell", "Massive Dynamic",
];

const COMPANY_SUFFIX = ["Inc", "LLC", "Group", "Labs", "Systems", "Co", "Ltd"];

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
  "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "labore", "magna",
  "aliqua", "enim", "minim", "veniam", "quis", "nostrud", "aliquip", "commodo",
];

const PRODUCTS = [
  "Widget", "Gadget", "Gizmo", "Sprocket", "Cog", "Module", "Kit", "Bundle",
  "Pro Plan", "Starter Pack", "Toolset", "Adapter", "Console", "Sensor",
];

const STATUSES = ["active", "pending", "inactive", "archived", "trial"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Build a hex string of n bytes (2 hex chars each).
function hex(n) {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }
  return out;
}

// RFC-4122 style v4 UUID using Math.random (fine for sample data).
function uuid() {
  const h = hex(16).split("");
  h[12] = "4"; // version
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16); // variant
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(
    16,
    20
  )}-${s.slice(20, 32)}`;
}

function sentence() {
  const len = randInt(4, 10);
  const words = [];
  for (let i = 0; i < len; i++) words.push(pick(WORDS));
  const s = words.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// A random date within the last ~5 years, returned as an ISO date (YYYY-MM-DD)
// or full ISO datetime.
function randomDate(withTime) {
  const now = Date.now();
  const past = now - randInt(0, 5 * 365) * 24 * 60 * 60 * 1000;
  const d = new Date(past - randInt(0, 24 * 60 * 60 * 1000));
  const datePart = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}`;
  if (!withTime) return datePart;
  return `${datePart}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(
    d.getSeconds()
  )}Z`;
}

// Field type registry. Each type knows how to generate one value. Some read
// a per-field context object (`ctx`) so that, e.g., email can reuse the same
// first/last name from the same row where useful — kept simple and independent
// here so each field is self-contained.
const FIELD_TYPES = {
  id: {
    label: "ID (auto-increment)",
    gen: (ctx) => ctx.index + 1,
  },
  uuid: { label: "UUID", gen: () => uuid() },
  firstName: { label: "First name", gen: () => pick(FIRST_NAMES) },
  lastName: { label: "Last name", gen: () => pick(LAST_NAMES) },
  fullName: {
    label: "Full name",
    gen: () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
  },
  email: {
    label: "Email",
    gen: () =>
      `${slug(pick(FIRST_NAMES))}.${slug(pick(LAST_NAMES))}${randInt(
        1,
        99
      )}@${pick(DOMAINS)}`,
  },
  username: {
    label: "Username",
    gen: () => `${slug(pick(FIRST_NAMES))}_${randInt(1, 999)}`,
  },
  phone: {
    label: "Phone",
    gen: () =>
      `+1-${randInt(200, 999)}-${randInt(200, 999)}-${pad2(
        randInt(0, 99)
      )}${pad2(randInt(0, 99))}`,
  },
  city: { label: "City", gen: () => pick(CITIES) },
  country: { label: "Country", gen: () => pick(COUNTRIES) },
  company: {
    label: "Company",
    gen: () => `${pick(COMPANIES)} ${pick(COMPANY_SUFFIX)}`,
  },
  jobTitle: {
    label: "Product name",
    gen: () => pick(PRODUCTS),
  },
  url: {
    label: "URL",
    gen: () => `https://${pick(DOMAINS)}/${slug(pick(PRODUCTS))}`,
  },
  integer: {
    label: "Integer (0–1000)",
    gen: () => randInt(0, 1000),
  },
  price: {
    label: "Price (decimal)",
    gen: () => Number((randInt(99, 99999) / 100).toFixed(2)),
  },
  boolean: {
    label: "Boolean",
    gen: () => Math.random() < 0.5,
  },
  status: {
    label: "Status (enum)",
    gen: () => pick(STATUSES),
  },
  date: {
    label: "Date (YYYY-MM-DD)",
    gen: () => randomDate(false),
  },
  datetime: {
    label: "Datetime (ISO)",
    gen: () => randomDate(true),
  },
  sentence: {
    label: "Sentence (lorem)",
    gen: () => sentence(),
  },
  color: {
    label: "Hex color",
    gen: () => `#${hex(3)}`,
  },
};

const TYPE_KEYS = Object.keys(FIELD_TYPES);

let uidCounter = 0;
function nextUid() {
  uidCounter += 1;
  return `f${uidCounter}`;
}

function makeField(name, type) {
  return { uid: nextUid(), name, type };
}

const DEFAULT_FIELDS = [
  makeField("id", "id"),
  makeField("name", "fullName"),
  makeField("email", "email"),
  makeField("age", "integer"),
  makeField("active", "boolean"),
  makeField("createdAt", "datetime"),
];

export default function MockJsonGenerator() {
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState("array"); // array | ndjson
  const [wrapKey, setWrapKey] = useState(""); // optional root key, e.g. "data"
  const [seedTick, setSeedTick] = useState(0); // bump to regenerate
  const [copied, setCopied] = useState(false);

  const safeCount = useMemo(() => {
    const n = Math.floor(Number(count));
    if (!Number.isFinite(n) || n < 1) return 0;
    return Math.min(n, 1000);
  }, [count]);

  const validFields = useMemo(
    () =>
      fields.filter(
        (f) => f.name.trim() !== "" && FIELD_TYPES[f.type] !== undefined
      ),
    [fields]
  );

  const result = useMemo(() => {
    // seedTick is referenced so a "Regenerate" click produces fresh values.
    void seedTick;

    if (validFields.length === 0) {
      return { output: "", error: "Add at least one field with a name." };
    }
    if (safeCount === 0) {
      return { output: "", error: "Set how many records to generate (1–1000)." };
    }

    // Warn about duplicate keys — later fields would overwrite earlier ones.
    const seen = new Set();
    for (const f of validFields) {
      const key = f.name.trim();
      if (seen.has(key)) {
        return {
          output: "",
          error: `Duplicate field name "${key}". Field names must be unique.`,
        };
      }
      seen.add(key);
    }

    const rows = [];
    for (let i = 0; i < safeCount; i++) {
      const ctx = { index: i };
      const obj = {};
      for (const f of validFields) {
        obj[f.name.trim()] = FIELD_TYPES[f.type].gen(ctx);
      }
      rows.push(obj);
    }

    let output;
    try {
      if (format === "ndjson") {
        output = rows.map((r) => JSON.stringify(r)).join("\n");
      } else {
        const payload = wrapKey.trim() ? { [wrapKey.trim()]: rows } : rows;
        output = JSON.stringify(payload, null, 2);
      }
    } catch (e) {
      return { output: "", error: "Could not serialize the generated data." };
    }

    return { output, error: "" };
  }, [validFields, safeCount, format, wrapKey, seedTick]);

  function updateField(uid, patch) {
    setFields((prev) =>
      prev.map((f) => (f.uid === uid ? { ...f, ...patch } : f))
    );
    setCopied(false);
  }

  function addField() {
    setFields((prev) => [...prev, makeField(`field${prev.length + 1}`, "sentence")]);
    setCopied(false);
  }

  function removeField(uid) {
    setFields((prev) => prev.filter((f) => f.uid !== uid));
    setCopied(false);
  }

  function regenerate() {
    setSeedTick((t) => t + 1);
    setCopied(false);
  }

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
    const name = format === "ndjson" ? "mock-data.ndjson" : "mock-data.json";
    const type =
      format === "ndjson" ? "application/x-ndjson" : "application/json";
    const blob = new Blob([result.output], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label">Fields (schema)</label>
          <p className="tool-note">
            Name each field and pick the kind of value it should hold. These
            become the keys of every generated object.
          </p>
        </div>

        {fields.map((f, i) => (
          <div className="tool-row" key={f.uid}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`fname-${f.uid}`}>
                Field name
              </label>
              <input
                className="tool-input"
                id={`fname-${f.uid}`}
                type="text"
                value={f.name}
                onChange={(e) => updateField(f.uid, { name: e.target.value })}
                placeholder="e.g. email"
                spellCheck={false}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`ftype-${f.uid}`}>
                Type
              </label>
              <select
                className="tool-select"
                id={`ftype-${f.uid}`}
                value={f.type}
                onChange={(e) => updateField(f.uid, { type: e.target.value })}
              >
                {TYPE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {FIELD_TYPES[k].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`fdel-${f.uid}`}>
                &nbsp;
              </label>
              <button
                className="btn"
                id={`fdel-${f.uid}`}
                type="button"
                onClick={() => removeField(f.uid)}
                aria-label={`Remove field ${f.name || i + 1}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="tool-actions">
          <button className="btn" type="button" onClick={addField}>
            + Add field
          </button>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mjg-count">
              How many records
            </label>
            <input
              className="tool-input"
              id="mjg-count"
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => {
                setCount(e.target.value);
                setCopied(false);
              }}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mjg-format">
              Output format
            </label>
            <select
              className="tool-select"
              id="mjg-format"
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setCopied(false);
              }}
            >
              <option value="array">JSON array</option>
              <option value="ndjson">NDJSON (one per line)</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mjg-wrap">
              Root key (optional)
            </label>
            <input
              className="tool-input"
              id="mjg-wrap"
              type="text"
              value={wrapKey}
              onChange={(e) => {
                setWrapKey(e.target.value);
                setCopied(false);
              }}
              placeholder="e.g. data"
              spellCheck={false}
              disabled={format === "ndjson"}
            />
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={regenerate}>
          Regenerate
        </button>
        {result.output ? (
          <>
            <button
              className={copied ? "btn btn-success" : "btn"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button className="btn" type="button" onClick={handleDownload}>
              Download
            </button>
          </>
        ) : null}
      </div>

      {result.error ? <p className="tool-error">{result.error}</p> : null}

      {result.output ? (
        <div className="tool-field">
          <label className="tool-label" htmlFor="mjg-output">
            Generated JSON ({safeCount.toLocaleString("en-US")}{" "}
            {safeCount === 1 ? "record" : "records"})
          </label>
          <pre
            className="tool-output"
            id="mjg-output"
            role="status"
            aria-live="polite"
          >
            {result.output}
          </pre>
        </div>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Define your fields above, choose how many records you need, and the
          mock JSON appears here. Everything is generated in your browser — no
          data is sent anywhere.
        </p>
      ) : null}
    </div>
  );
}
