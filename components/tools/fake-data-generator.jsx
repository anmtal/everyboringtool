"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// Small, fast, seedable PRNG (mulberry32) so a given seed reproduces the same
// dataset. Everything below draws from a single generator instance.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn an arbitrary string seed into a 32-bit integer.
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
  "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan",
  "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher",
  "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Sandra", "Mark",
  "Ashley", "Donald", "Kimberly", "Steven", "Emily", "Paul", "Donna", "Andrew",
  "Michelle", "Joshua", "Carol", "Kenneth", "Amanda", "Kevin", "Melissa",
  "Brian", "Deborah", "George", "Stephanie", "Timothy", "Rebecca", "Priya",
  "Wei", "Fatima", "Diego", "Aisha", "Hiroshi", "Olga", "Mateo", "Nadia",
  "Kwame",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson",
  "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
  "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez",
  "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott",
  "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker",
  "Patel", "Kim", "Cohen", "Rossi", "Yamamoto", "Okafor",
];

const DOMAINS = [
  "example.com", "test.com", "mail.com", "demo.org", "sample.net",
  "acme.co", "inbox.dev", "email.io",
];

const STREETS = [
  "Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine St", "Elm St",
  "Washington Ave", "Lake Rd", "Hill St", "Park Ave", "Sunset Blvd",
  "River Rd", "Church St", "Highland Ave", "Franklin St", "Union St",
];

const CITIES = [
  ["New York", "NY"], ["Los Angeles", "CA"], ["Chicago", "IL"],
  ["Houston", "TX"], ["Phoenix", "AZ"], ["Philadelphia", "PA"],
  ["San Antonio", "TX"], ["San Diego", "CA"], ["Dallas", "TX"],
  ["Austin", "TX"], ["Seattle", "WA"], ["Denver", "CO"], ["Boston", "MA"],
  ["Portland", "OR"], ["Miami", "FL"], ["Atlanta", "GA"],
];

const COMPANY_A = [
  "Global", "Prime", "Nova", "Peak", "Blue", "Bright", "Vertex", "Apex",
  "North", "Quantum", "Silver", "Summit", "Core", "Union", "Pioneer", "Delta",
];
const COMPANY_B = [
  "Systems", "Solutions", "Labs", "Group", "Industries", "Digital",
  "Dynamics", "Works", "Partners", "Technologies", "Ventures", "Networks",
  "Logistics", "Media", "Analytics", "Holdings",
];

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
  "elit", "sed", "eiusmod", "tempor", "labore", "magna", "aliqua", "enim",
  "minim", "veniam", "quis", "nostrud", "aliquip", "commodo", "duis", "aute",
  "irure", "voluptate", "velit", "esse", "cillum", "fugiat", "nulla",
];

// Every available field: a key (used as column/property name) and a
// generator that receives the shared random function and the row's context.
const FIELD_DEFS = [
  { key: "id", label: "ID (sequential)" },
  { key: "uuid", label: "UUID (v4)" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "username", label: "Username" },
  { key: "phone", label: "Phone (US)" },
  { key: "street", label: "Street address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip code" },
  { key: "country", label: "Country" },
  { key: "company", label: "Company" },
  { key: "job_title", label: "Job title" },
  { key: "age", label: "Age" },
  { key: "birthdate", label: "Birth date" },
  { key: "price", label: "Price" },
  { key: "boolean", label: "Boolean" },
  { key: "color", label: "Color (hex)" },
  { key: "ip", label: "IP address" },
  { key: "sentence", label: "Sentence" },
  { key: "created_at", label: "Timestamp (ISO)" },
];

const JOB_TITLES = [
  "Software Engineer", "Product Manager", "Designer", "Data Analyst",
  "Marketing Manager", "Sales Representative", "Accountant", "Nurse",
  "Teacher", "Consultant", "Operations Lead", "Support Specialist",
  "Recruiter", "Project Manager", "Writer", "Architect",
];

const pad = (n, len) => String(n).padStart(len, "0");

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function intBetween(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function uuidv4(rng) {
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += "-";
    } else if (i === 14) {
      out += "4";
    } else if (i === 19) {
      out += hex[(Math.floor(rng() * 4) + 8) & 0xf];
    } else {
      out += hex[Math.floor(rng() * 16)];
    }
  }
  return out;
}

// Build one row object containing exactly the selected fields.
function buildRow(rng, index, fields) {
  const first = pick(rng, FIRST_NAMES);
  const last = pick(rng, LAST_NAMES);
  const [cityName, stateAbbr] = pick(rng, CITIES);
  const row = {};

  for (const key of fields) {
    switch (key) {
      case "id":
        row.id = index + 1;
        break;
      case "uuid":
        row.uuid = uuidv4(rng);
        break;
      case "first_name":
        row.first_name = first;
        break;
      case "last_name":
        row.last_name = last;
        break;
      case "full_name":
        row.full_name = `${first} ${last}`;
        break;
      case "email":
        row.email =
          `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") +
          intBetween(rng, 1, 99) +
          "@" +
          pick(rng, DOMAINS);
        break;
      case "username":
        row.username =
          first.toLowerCase().replace(/[^a-z]/g, "") +
          "_" +
          last.toLowerCase().replace(/[^a-z]/g, "").slice(0, 4) +
          intBetween(rng, 10, 999);
        break;
      case "phone":
        row.phone = `(${intBetween(rng, 200, 989)}) ${pad(
          intBetween(rng, 200, 999),
          3
        )}-${pad(intBetween(rng, 0, 9999), 4)}`;
        break;
      case "street":
        row.street = `${intBetween(rng, 1, 9999)} ${pick(rng, STREETS)}`;
        break;
      case "city":
        row.city = cityName;
        break;
      case "state":
        row.state = stateAbbr;
        break;
      case "zip":
        row.zip = pad(intBetween(rng, 1000, 99999), 5);
        break;
      case "country":
        row.country = "United States";
        break;
      case "company":
        row.company = `${pick(rng, COMPANY_A)} ${pick(rng, COMPANY_B)}`;
        break;
      case "job_title":
        row.job_title = pick(rng, JOB_TITLES);
        break;
      case "age":
        row.age = intBetween(rng, 18, 80);
        break;
      case "birthdate": {
        const y = intBetween(rng, 1945, 2006);
        const m = intBetween(rng, 1, 12);
        const d = intBetween(rng, 1, 28);
        row.birthdate = `${y}-${pad(m, 2)}-${pad(d, 2)}`;
        break;
      }
      case "price":
        row.price = (intBetween(rng, 99, 99999) / 100).toFixed(2);
        break;
      case "boolean":
        row.boolean = rng() < 0.5;
        break;
      case "color":
        row.color =
          "#" +
          pad(Math.floor(rng() * 0xffffff).toString(16), 6);
        break;
      case "ip":
        row.ip = `${intBetween(rng, 1, 255)}.${intBetween(
          rng,
          0,
          255
        )}.${intBetween(rng, 0, 255)}.${intBetween(rng, 1, 254)}`;
        break;
      case "sentence": {
        const n = intBetween(rng, 6, 12);
        const words = [];
        for (let i = 0; i < n; i++) words.push(pick(rng, WORDS));
        let s = words.join(" ");
        row.sentence = s.charAt(0).toUpperCase() + s.slice(1) + ".";
        break;
      }
      case "created_at": {
        // A random moment within roughly the last two years.
        const now = Date.now();
        const ms = now - Math.floor(rng() * 63072000000);
        row.created_at = new Date(ms).toISOString();
        break;
      }
      default:
        break;
    }
  }
  return row;
}

function escapeCsv(val) {
  const s = String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function sqlValue(val) {
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

function formatRows(rows, fields, format, tableName) {
  if (rows.length === 0) return "";

  if (format === "json") {
    return JSON.stringify(rows, null, 2);
  }

  if (format === "csv") {
    const header = fields.map(escapeCsv).join(",");
    const body = rows
      .map((r) => fields.map((f) => escapeCsv(r[f])).join(","))
      .join("\n");
    return header + "\n" + body;
  }

  if (format === "sql") {
    const cols = fields.join(", ");
    const safeTable = (tableName || "data").replace(/[^A-Za-z0-9_]/g, "") || "data";
    return rows
      .map(
        (r) =>
          `INSERT INTO ${safeTable} (${cols}) VALUES (${fields
            .map((f) => sqlValue(r[f]))
            .join(", ")});`
      )
      .join("\n");
  }

  return "";
}

const DEFAULT_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "city",
];

export default function FakeDataGenerator() {
  const [selected, setSelected] = useState(DEFAULT_FIELDS);
  const [count, setCount] = useState(10);
  const [format, setFormat] = useState("json");
  const [tableName, setTableName] = useState("users");
  const [seed, setSeed] = useState("");
  const [nonce, setNonce] = useState(0); // bump to reroll when no fixed seed
  const [copied, setCopied] = useState(false);

  function toggleField(key) {
    setCopied(false);
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const safeCount = useMemo(() => {
    const n = Math.floor(Number(count));
    if (!Number.isFinite(n) || n < 1) return 0;
    return Math.min(n, 1000);
  }, [count]);

  // Field order follows FIELD_DEFS so output columns are always in a stable,
  // readable order regardless of the click order.
  const orderedFields = useMemo(
    () => FIELD_DEFS.map((f) => f.key).filter((k) => selected.includes(k)),
    [selected]
  );

  const result = useMemo(() => {
    if (orderedFields.length === 0 || safeCount === 0) {
      return { output: "", rows: [] };
    }
    const seedInt = seed.trim()
      ? hashSeed(seed.trim())
      : hashSeed("ebt-" + nonce);
    const rng = mulberry32(seedInt);
    const rows = [];
    for (let i = 0; i < safeCount; i++) {
      rows.push(buildRow(rng, i, orderedFields));
    }
    const output = formatRows(rows, orderedFields, format, tableName);
    return { output, rows };
  }, [orderedFields, safeCount, format, tableName, seed, nonce]);

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
    const ext = format === "sql" ? "sql" : format;
    const mime =
      format === "json"
        ? "application/json"
        : format === "csv"
        ? "text/csv"
        : "text/plain";
    const blob = new Blob([result.output], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fake-data.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label">Fields to include</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "0.4rem 1rem",
            }}
          >
            {FIELD_DEFS.map((f) => (
              <label
                key={f.key}
                htmlFor={`fdg-${f.key}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <input
                  id={`fdg-${f.key}`}
                  type="checkbox"
                  checked={selected.includes(f.key)}
                  onChange={() => toggleField(f.key)}
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fdg-count">
              Number of rows (max 1000)
            </label>
            <input
              className="tool-input"
              id="fdg-count"
              type="number"
              min="1"
              max="1000"
              value={count}
              onChange={(e) => {
                setCount(e.target.value);
                setCopied(false);
              }}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="fdg-format">
              Output format
            </label>
            <select
              className="tool-select"
              id="fdg-format"
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setCopied(false);
              }}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="sql">SQL INSERT</option>
            </select>
          </div>

          {format === "sql" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="fdg-table">
                Table name
              </label>
              <input
                className="tool-input"
                id="fdg-table"
                type="text"
                value={tableName}
                onChange={(e) => {
                  setTableName(e.target.value);
                  setCopied(false);
                }}
                placeholder="users"
              />
            </div>
          ) : null}
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fdg-seed">
              Seed (optional — same seed reproduces the same data)
            </label>
            <input
              className="tool-input"
              id="fdg-seed"
              type="text"
              value={seed}
              onChange={(e) => {
                setSeed(e.target.value);
                setCopied(false);
              }}
              placeholder="leave blank for random"
            />
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            setNonce((n) => n + 1);
            setCopied(false);
          }}
        >
          Regenerate
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={!result.output}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={handleDownload}
          disabled={!result.output}
        >
          Download
        </button>
      </div>

      {orderedFields.length === 0 ? (
        <p className="tool-note">
          Select at least one field above to generate data.
        </p>
      ) : safeCount === 0 ? (
        <p className="tool-note">Enter a row count of 1 or more to generate data.</p>
      ) : (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.rows.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Rows generated</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{orderedFields.length}</div>
              <div className="tool-stat-label">Fields</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{format.toUpperCase()}</div>
              <div className="tool-stat-label">Format</div>
            </div>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="fdg-output">
              Generated data
            </label>
            <pre className="tool-output" id="fdg-output">
              {result.output}
            </pre>
          </div>
        </>
      )}

      <p className="tool-note">
        All data is randomly invented for testing and demos — names, emails,
        phone numbers and addresses do not refer to real people. Everything is
        generated in your browser; nothing is uploaded.
      </p>
    </div>
  );
}
