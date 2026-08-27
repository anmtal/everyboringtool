// Pure client-side transforms for the data converters. XML parsing uses the
// browser's own DOMParser (no dependency); CSV uses a small RFC-4180-ish parser
// that respects quoted fields. Each throws an Error with a friendly message.

function xesc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function tagName(n) {
  const s = String(n).replace(/[^A-Za-z0-9_.-]/g, "_");
  return /^[A-Za-z_]/.test(s) ? s : "_" + s;
}
function parseXmlDoc(input) {
  const s = (input || "").trim();
  if (!s) throw new Error("Paste some XML to convert.");
  const doc = new DOMParser().parseFromString(s, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("That doesn't look like valid XML — check the tags are balanced.");
  return doc;
}

// ---- XML -> JSON ----
function xmlNodeToValue(el) {
  const obj = {};
  if (el.attributes) for (const a of el.attributes) obj["@" + a.name] = a.value;
  let text = "";
  const childEls = [];
  for (const ch of el.childNodes) {
    if (ch.nodeType === 3 || ch.nodeType === 4) text += ch.nodeValue;
    else if (ch.nodeType === 1) childEls.push(ch);
  }
  for (const ce of childEls) {
    const val = xmlNodeToValue(ce);
    if (obj[ce.nodeName] !== undefined) {
      if (!Array.isArray(obj[ce.nodeName])) obj[ce.nodeName] = [obj[ce.nodeName]];
      obj[ce.nodeName].push(val);
    } else obj[ce.nodeName] = val;
  }
  const t = text.trim();
  if (childEls.length === 0 && Object.keys(obj).length === 0) return t;
  if (t) obj["#text"] = t;
  return obj;
}
export function xmlToJson(input) {
  const doc = parseXmlDoc(input);
  const root = doc.documentElement;
  return JSON.stringify({ [root.nodeName]: xmlNodeToValue(root) }, null, 2);
}

// ---- JSON -> XML ----
function valueToXml(name, val, indent) {
  const pad = "  ".repeat(indent);
  const tn = tagName(name);
  if (Array.isArray(val)) return val.map((v) => valueToXml(name, v, indent)).join("\n");
  if (val && typeof val === "object") {
    const inner = Object.entries(val).map(([k, v]) => valueToXml(k, v, indent + 1)).join("\n");
    return `${pad}<${tn}>\n${inner}\n${pad}</${tn}>`;
  }
  return `${pad}<${tn}>${xesc(val == null ? "" : val)}</${tn}>`;
}
export function jsonToXml(input) {
  const s = (input || "").trim();
  if (!s) throw new Error("Paste some JSON to convert.");
  let data;
  try { data = JSON.parse(s); } catch { throw new Error("That doesn't look like valid JSON."); }
  let body;
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : null;
  if (keys && keys.length === 1 && data[keys[0]] && typeof data[keys[0]] === "object") {
    body = valueToXml(keys[0], data[keys[0]], 0);
  } else {
    const inner = (keys ? Object.entries(data) : (Array.isArray(data) ? data.map((v, i) => ["item", v]) : [["value", data]]))
      .map(([k, v]) => valueToXml(k, v, 1)).join("\n");
    body = `<root>\n${inner}\n</root>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

// ---- CSV parsing ----
export function parseCsv(text) {
  const s = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = []; let row = []; let field = ""; let i = 0; let inq = false;
  while (i < s.length) {
    const ch = s[i];
    if (inq) {
      if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } inq = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { inq = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  row.push(field); rows.push(row);
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}
function csvCell(v) {
  v = v == null ? "" : String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

// ---- CSV -> XML ----
export function csvToXml(input) {
  const rows = parseCsv(input);
  if (rows.length < 2) throw new Error("Paste CSV with a header row and at least one data row.");
  const headers = rows[0].map((h, i) => tagName(h && h.trim() ? h.trim() : "col" + (i + 1)));
  const body = rows.slice(1).map((r) => {
    const cells = headers.map((h, k) => `    <${h}>${xesc(r[k] == null ? "" : r[k])}</${h}>`).join("\n");
    return `  <record>\n${cells}\n  </record>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<records>\n${body}\n</records>`;
}

// ---- XML -> CSV ----
export function xmlToCsv(input) {
  const doc = parseXmlDoc(input);
  const root = doc.documentElement;
  const records = Array.from(root.children);
  if (records.length === 0) throw new Error("No repeated records found — expected a root element containing repeated child records.");
  const cols = []; const seen = new Set();
  for (const rec of records) for (const ch of rec.children) if (!seen.has(ch.nodeName)) { seen.add(ch.nodeName); cols.push(ch.nodeName); }
  if (cols.length === 0) throw new Error("The records have no fields to turn into columns.");
  const lines = [cols.map(csvCell).join(",")];
  for (const rec of records) {
    const kids = Array.from(rec.children);
    const line = cols.map((c) => {
      const el = kids.find((ch) => ch.nodeName === c);
      return csvCell(el ? el.textContent.trim() : "");
    });
    lines.push(line.join(","));
  }
  return lines.join("\n");
}
