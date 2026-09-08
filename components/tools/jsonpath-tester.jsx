"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// ---------------------------------------------------------------------------
// A self-contained JSONPath evaluator (Goessner-style syntax). No dependencies:
// everything runs on the user's data in their own browser. Supports:
//   $                    root
//   .name / ['name']     child by key
//   ..name               recursive descent
//   *  / [*]             wildcard (all children)
//   [0] / [-1]           array index (negative counts from the end)
//   [0,2] / ['a','b']    union of indexes or keys
//   [start:end:step]     array slice
//   [?(@.price < 10)]    filter expression (see evalFilter for operators)
// The result is a list of nodes: each has the matched value and its concrete
// path, so we can show both the values and their normalized locations.
// ---------------------------------------------------------------------------

function findBracketEnd(str, start) {
  // str[start] === '['. Return index of the matching ']' (or -1).
  let depth = 0;
  let quote = null;
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (quote) {
      if (c === "\\") {
        i++;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
    } else if (c === "[") {
      depth++;
    } else if (c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function interpretBracket(inner) {
  const t = inner.trim();
  if (t === "*") return { type: "wildcard" };
  if (t[0] === "?") return { type: "filter", expr: t.slice(1) };
  // slice: optional -numbers separated by one or two colons, e.g. 1:3, :2, ::2
  if (/^-?\d*:-?\d*(:-?\d*)?$/.test(t) && t.indexOf(":") !== -1) {
    const parts = t.split(":");
    const num = (s) => (s === "" ? null : parseInt(s, 10));
    return {
      type: "slice",
      start: num(parts[0]),
      end: num(parts[1]),
      step: parts.length > 2 ? num(parts[2]) : null,
    };
  }
  // union / single member: split on commas outside quotes
  const members = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quote) {
      if (c === quote) {
        quote = null;
      } else {
        cur += c;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
    } else if (c === ",") {
      members.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim() !== "" || t.slice(-1) === ",") members.push(cur.trim());

  const parsed = members.map((m) => {
    if (/^-?\d+$/.test(m)) return { index: parseInt(m, 10) };
    return { name: m.replace(/^['"]|['"]$/g, "") };
  });
  if (parsed.length === 1) {
    return parsed[0].index !== undefined
      ? { type: "index", index: parsed[0].index }
      : { type: "child", name: parsed[0].name };
  }
  return { type: "union", members: parsed };
}

function parsePath(path) {
  const steps = [];
  let i = 0;
  const len = path.length;
  // skip leading whitespace and the optional root '$'
  while (i < len && /\s/.test(path[i])) i++;
  if (path[i] === "$") i++;
  let descendant = false;
  while (i < len) {
    const c = path[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === ".") {
      if (path[i + 1] === ".") {
        descendant = true;
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (c === "*") {
      steps.push({ descendant, type: "wildcard" });
      descendant = false;
      i++;
      continue;
    }
    if (c === "[") {
      const end = findBracketEnd(path, i);
      if (end === -1) throw new Error("Unclosed '[' in path.");
      const inner = path.slice(i + 1, end);
      steps.push({ descendant, ...interpretBracket(inner) });
      descendant = false;
      i = end + 1;
      continue;
    }
    // bare identifier (child name)
    if (/[^.\[\]*\s]/.test(c)) {
      let name = "";
      while (i < len && /[^.\[\]*\s]/.test(path[i])) {
        name += path[i];
        i++;
      }
      steps.push({ descendant, type: "child", name });
      descendant = false;
      continue;
    }
    i++;
  }
  return steps;
}

// ---- filter expression evaluation ----------------------------------------

function tokenizeExpr(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "@" || c === "$") {
      let raw = c;
      let j = i + 1;
      while (j < s.length) {
        const d = s[j];
        if (d === ".") {
          raw += d;
          j++;
          continue;
        }
        if (d === "[") {
          const end = findBracketEnd(s, j);
          if (end === -1) {
            j = s.length;
            break;
          }
          raw += s.slice(j, end + 1);
          j = end + 1;
          continue;
        }
        if (/[A-Za-z0-9_]/.test(d)) {
          raw += d;
          j++;
          continue;
        }
        break;
      }
      toks.push({ t: "path", v: raw });
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      let j = i + 1;
      let str = "";
      while (j < s.length && s[j] !== q) {
        if (s[j] === "\\") {
          str += s[j + 1];
          j += 2;
        } else {
          str += s[j];
          j++;
        }
      }
      j++;
      toks.push({ t: "lit", v: str });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "-" && /[0-9]/.test(s[i + 1] || ""))) {
      let j = i + 1;
      while (j < s.length && /[0-9.eE]/.test(s[j])) j++;
      toks.push({ t: "lit", v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      let w = "";
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) {
        w += s[j];
        j++;
      }
      if (w === "true") toks.push({ t: "lit", v: true });
      else if (w === "false") toks.push({ t: "lit", v: false });
      else if (w === "null") toks.push({ t: "lit", v: null });
      else toks.push({ t: "lit", v: w });
      i = j;
      continue;
    }
    if (c === "/") {
      // regex literal /pat/flags
      let j = i + 1;
      let pat = "";
      while (j < s.length && s[j] !== "/") {
        if (s[j] === "\\") {
          pat += s[j] + (s[j + 1] || "");
          j += 2;
        } else {
          pat += s[j];
          j++;
        }
      }
      j++;
      let flags = "";
      while (j < s.length && /[a-z]/.test(s[j])) {
        flags += s[j];
        j++;
      }
      toks.push({ t: "regex", v: { pat, flags } });
      i = j;
      continue;
    }
    const three = s.substr(i, 3);
    const two = s.substr(i, 2);
    if (three === "===" || three === "!==") {
      toks.push({ t: "op", v: three });
      i += 3;
      continue;
    }
    if (["==", "!=", "<=", ">=", "&&", "||", "=~"].indexOf(two) !== -1) {
      toks.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("<>!()".indexOf(c) !== -1) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    i++;
  }
  return toks;
}

function resolveRelPath(raw, cur, root) {
  let base = raw[0] === "$" ? root : cur;
  const rest = raw.slice(1);
  const keys = [];
  let i = 0;
  while (i < rest.length) {
    if (rest[i] === ".") {
      i++;
      let k = "";
      while (i < rest.length && /[A-Za-z0-9_$]/.test(rest[i])) {
        k += rest[i];
        i++;
      }
      if (k) keys.push(k);
    } else if (rest[i] === "[") {
      const end = findBracketEnd(rest, i);
      const inner = rest.slice(i + 1, end === -1 ? rest.length : end).trim();
      keys.push(inner.replace(/^['"]|['"]$/g, ""));
      i = end === -1 ? rest.length : end + 1;
    } else {
      i++;
    }
  }
  let v = base;
  let exists = true;
  for (const k of keys) {
    if (v === null || v === undefined) {
      exists = false;
      v = undefined;
      break;
    }
    if (k === "length" && (Array.isArray(v) || typeof v === "string")) {
      v = v.length;
      continue;
    }
    if (Array.isArray(v) && /^-?\d+$/.test(k)) {
      let idx = parseInt(k, 10);
      if (idx < 0) idx += v.length;
      v = v[idx];
      if (v === undefined) exists = false;
    } else if (typeof v === "object" && Object.prototype.hasOwnProperty.call(v, k)) {
      v = v[k];
    } else {
      exists = false;
      v = undefined;
      break;
    }
  }
  return { value: v, exists };
}

function compare(a, op, b) {
  switch (op) {
    case "==":
      return a == b; // eslint-disable-line eqeqeq
    case "===":
      return a === b;
    case "!=":
      return a != b; // eslint-disable-line eqeqeq
    case "!==":
      return a !== b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    default:
      return false;
  }
}

function evalFilter(expr, cur, root) {
  const toks = tokenizeExpr(expr);
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];

  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().t === "op" && peek().v === "||") {
      next();
      const r = parseAnd();
      left = left || r;
    }
    return left;
  }
  function parseAnd() {
    let left = parseNot();
    while (peek() && peek().t === "op" && peek().v === "&&") {
      next();
      const r = parseNot();
      left = left && r;
    }
    return left;
  }
  function parseNot() {
    if (peek() && peek().t === "op" && peek().v === "!") {
      next();
      return !parseNot();
    }
    return parseCmp();
  }
  function parseCmp() {
    const left = parseVal();
    const p = peek();
    if (
      p &&
      p.t === "op" &&
      ["==", "===", "!=", "!==", "<", "<=", ">", ">=", "=~"].indexOf(p.v) !== -1
    ) {
      const op = next().v;
      if (op === "=~") {
        const rt = peek();
        if (rt && rt.t === "regex") {
          next();
          try {
            return new RegExp(rt.v.pat, rt.v.flags).test(String(left.value));
          } catch (e) {
            return false;
          }
        }
        return false;
      }
      const right = parseVal();
      return compare(left.value, op, right.value);
    }
    // no comparison: existence / truthiness
    return left.exists ? !!left.value : false;
  }
  function parseVal() {
    const tk = peek();
    if (tk && tk.t === "op" && tk.v === "(") {
      next();
      const v = parseOr();
      if (peek() && peek().t === "op" && peek().v === ")") next();
      return { value: v, exists: true };
    }
    if (!tk) return { value: undefined, exists: false };
    if (tk.t === "lit") {
      next();
      return { value: tk.v, exists: true };
    }
    if (tk.t === "path") {
      next();
      return resolveRelPath(tk.v, cur, root);
    }
    next();
    return { value: undefined, exists: false };
  }

  return !!parseOr();
}

// ---- node selection -------------------------------------------------------

function descendants(node) {
  const out = [node];
  const v = node.value;
  if (Array.isArray(v)) {
    v.forEach((el, idx) =>
      out.push(...descendants({ value: el, path: node.path.concat(idx) }))
    );
  } else if (v && typeof v === "object") {
    Object.keys(v).forEach((k) =>
      out.push(...descendants({ value: v[k], path: node.path.concat(k) }))
    );
  }
  return out;
}

function selectFrom(node, step, root) {
  const v = node.value;
  const out = [];
  switch (step.type) {
    case "child":
      if (v && typeof v === "object" && !Array.isArray(v) && step.name in v) {
        out.push({ value: v[step.name], path: node.path.concat(step.name) });
      } else if (Array.isArray(v) && /^\d+$/.test(step.name)) {
        const idx = parseInt(step.name, 10);
        if (idx < v.length)
          out.push({ value: v[idx], path: node.path.concat(idx) });
      }
      break;
    case "wildcard":
      if (Array.isArray(v)) {
        v.forEach((el, idx) =>
          out.push({ value: el, path: node.path.concat(idx) })
        );
      } else if (v && typeof v === "object") {
        Object.keys(v).forEach((k) =>
          out.push({ value: v[k], path: node.path.concat(k) })
        );
      }
      break;
    case "index":
      if (Array.isArray(v)) {
        let idx = step.index;
        if (idx < 0) idx += v.length;
        if (idx >= 0 && idx < v.length)
          out.push({ value: v[idx], path: node.path.concat(idx) });
      }
      break;
    case "union":
      step.members.forEach((m) => {
        if (m.index !== undefined && Array.isArray(v)) {
          let idx = m.index;
          if (idx < 0) idx += v.length;
          if (idx >= 0 && idx < v.length)
            out.push({ value: v[idx], path: node.path.concat(idx) });
        } else if (m.name !== undefined && v && typeof v === "object" && m.name in v) {
          out.push({ value: v[m.name], path: node.path.concat(m.name) });
        }
      });
      break;
    case "slice":
      if (Array.isArray(v)) {
        const n = v.length;
        const step2 = step.step || 1;
        let start = step.start === null ? (step2 > 0 ? 0 : n - 1) : step.start;
        let end = step.end === null ? (step2 > 0 ? n : -n - 1) : step.end;
        if (start < 0) start += n;
        if (end < 0) end += n;
        if (step2 > 0) {
          for (let k = Math.max(0, start); k < Math.min(n, end); k += step2)
            out.push({ value: v[k], path: node.path.concat(k) });
        } else {
          for (let k = Math.min(n - 1, start); k > Math.max(-1, end); k += step2)
            out.push({ value: v[k], path: node.path.concat(k) });
        }
      }
      break;
    case "filter":
      if (Array.isArray(v)) {
        v.forEach((el, idx) => {
          if (evalFilter(step.expr, el, root))
            out.push({ value: el, path: node.path.concat(idx) });
        });
      } else if (v && typeof v === "object") {
        Object.keys(v).forEach((k) => {
          if (evalFilter(step.expr, v[k], root))
            out.push({ value: v[k], path: node.path.concat(k) });
        });
      }
      break;
    default:
      break;
  }
  return out;
}

function query(data, pathExpr) {
  const steps = parsePath(pathExpr);
  let nodes = [{ value: data, path: [] }];
  for (const step of steps) {
    const nextNodes = [];
    for (const node of nodes) {
      const candidates = step.descendant ? descendants(node) : [node];
      for (const c of candidates) nextNodes.push(...selectFrom(c, step, data));
    }
    nodes = nextNodes;
  }
  return nodes;
}

function normalizePath(pathArr) {
  let s = "$";
  for (const seg of pathArr) {
    if (typeof seg === "number") s += "[" + seg + "]";
    else s += "['" + seg + "']";
  }
  return s;
}

const EXAMPLE_JSON = `{
  "store": {
    "book": [
      { "category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95 },
      { "category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99 },
      { "category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "isbn": "0-553-21311-3", "price": 8.99 },
      { "category": "fiction", "author": "J. R. R. Tolkien", "title": "The Lord of the Rings", "isbn": "0-395-19395-8", "price": 22.99 }
    ],
    "bicycle": { "color": "red", "price": 19.95 }
  }
}`;

const EXAMPLES = [
  { label: "All authors", path: "$..author" },
  { label: "All prices", path: "$..price" },
  { label: "First book", path: "$.store.book[0]" },
  { label: "Book titles", path: "$.store.book[*].title" },
  { label: "Cheap book titles", path: "$..book[?(@.price < 10)].title" },
  { label: "Books with ISBN", path: "$..book[?(@.isbn)]" },
  { label: "Last book", path: "$..book[-1:]" },
  { label: "Everything", path: "$..*" },
];

export default function JsonpathTester() {
  const [json, setJson] = useState(EXAMPLE_JSON);
  const [path, setPath] = useState("$..book[?(@.price < 10)].title");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    if (!json.trim()) return { ok: false, error: "" };
    try {
      return { ok: true, data: JSON.parse(json) };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : "Invalid JSON" };
    }
  }, [json]);

  const result = useMemo(() => {
    if (!parsed.ok) return null;
    if (!path.trim()) return null;
    try {
      const nodes = query(parsed.data, path);
      return {
        ok: true,
        values: nodes.map((n) => n.value),
        paths: nodes.map((n) => normalizePath(n.path)),
      };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : "Invalid path" };
    }
  }, [parsed, path]);

  const outputText =
    result && result.ok ? JSON.stringify(result.values, null, 2) : "";

  async function handleCopy() {
    if (!outputText) return;
    try {
      await copyText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* ignore */
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="jp-json">
            JSON
          </label>
          <textarea
            className="tool-textarea"
            id="jp-json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder='{"items": [1, 2, 3]}'
            rows={10}
            spellCheck={false}
          />
          {!parsed.ok && parsed.error ? (
            <p className="tool-error" role="alert" style={{ marginTop: 6 }}>
              Invalid JSON: {parsed.error}
            </p>
          ) : null}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="jp-path">
            JSONPath expression
          </label>
          <input
            className="tool-input"
            id="jp-path"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="$..book[?(@.price < 10)].title"
            spellCheck={false}
          />
        </div>

        <div className="tool-field">
          <span className="tool-label">Example queries</span>
          <div className="tool-actions">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.path}
                className="btn"
                type="button"
                onClick={() => setPath(ex.path)}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result && result.ok ? (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <span className="tool-stat-num">{result.values.length}</span>
              <span className="tool-stat-label">
                {result.values.length === 1 ? "match" : "matches"}
              </span>
            </div>
          </div>

          {result.values.length > 0 ? (
            <>
              <div className="tool-actions">
                <button
                  className={copied ? "btn btn-success" : "btn btn-primary"}
                  type="button"
                  onClick={handleCopy}
                >
                  {copied ? "Copied!" : "Copy result"}
                </button>
              </div>
              <span className="tool-result-label">Matched values</span>
              <pre className="tool-output">{outputText}</pre>
              <span className="tool-result-label">Matched paths</span>
              <pre className="tool-output">{result.paths.join("\n")}</pre>
            </>
          ) : (
            <p className="tool-note">
              Valid expression, but nothing in this JSON matched it. Check your
              keys, array indexes, or filter condition.
            </p>
          )}
        </div>
      ) : result && !result.ok ? (
        <p className="tool-error" role="alert">
          Could not evaluate the path: {result.error}
        </p>
      ) : (
        <p className="tool-note">
          Paste JSON above and type a JSONPath expression to see the matching
          values and their paths update live. Start with{" "}
          <code>$</code> for the root, use <code>.key</code> or{" "}
          <code>['key']</code> for children, <code>..</code> for recursive
          search, <code>[*]</code> for all items, and{" "}
          <code>[?(@.price &lt; 10)]</code> to filter.
        </p>
      )}

      <p className="tool-note" style={{ marginTop: 12 }}>
        Supported: <code>$</code> root, <code>.name</code> / <code>['name']</code>{" "}
        child, <code>..name</code> recursive descent, <code>*</code> /{" "}
        <code>[*]</code> wildcard, <code>[0]</code> / <code>[-1]</code> index,{" "}
        <code>[0,2]</code> union, <code>[1:3]</code> slice, and filters like{" "}
        <code>[?(@.price &lt; 10 &amp;&amp; @.inStock)]</code> with{" "}
        <code>== != &lt; &lt;= &gt; &gt;=</code>, <code>&amp;&amp;</code>,{" "}
        <code>||</code>, <code>!</code>, and <code>=~ /regex/</code>.
      </p>
    </div>
  );
}
