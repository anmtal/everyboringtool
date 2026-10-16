"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { copyText } from "../../lib/copyText";

const LS_KEY = "ebt-json-formatter";
// Size caps. The page copy (lib/toolContent.js "json-formatter") quotes the
// first two, so keep them in sync if they change.
const HIGHLIGHT_MAX_CHARS = 500000; // colour highlighting off above this output length
const TREE_MAX_NODES = 20000; // tree view off above this many values
const TREE_OPEN_MAX_KIDS = 50; // second level starts open only when the top level has at most this many children
const STATS_MAX_NODES = 1000000; // depth is not counted above this many values
const EXACT_MAX_CHARS = 20000000; // the exact-number reviver slows parsing; skip it above ~20 MB
const MAX_SCAN_DEPTH = 2000; // findJsonError gives up (falls back to the browser message) past this
const SNIPPET_RADIUS = 40; // characters shown either side of the error

const INDENTS = { "2": 2, "4": 4, tab: "\t" };
const INDENT_KEYS = ["2", "4", "tab"];
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SAMPLE =
  '{"id":1024,"name":"Ada Lovelace","email":"ada@example.com","active":true,"roles":["admin","editor"],"address":{"city":"London","zip":null},"lastLogin":"2026-10-15T09:30:00Z"}';

// JSON.parse turns every number into a JS double, so integers past 2^53 come
// back rounded (12345678901234567890 -> 12345678901234567000). Where the browser
// supports JSON.rawJSON we keep the original text instead (parseJson below); on
// the fallback path we can only warn. Scan the raw text, skipping anything
// inside a "..." string literal, and flag runs of 16+ digits.
function hasUnsafeLongNumber(src) {
  if (!src) return false;
  let inString = false;
  let escaped = false;
  let run = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      run = 0;
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      run++;
      if (run >= 16) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

// Strict RFC 8259 scanner, used only after JSON.parse has already rejected the
// input (JSON.parse stays the authority on validity). Browser messages are
// inconsistent: current Chrome/Edge give no position at all for a trailing comma
// in an array, a single-quoted value, NaN or True, and Safari gives none either.
// This walks the grammar and returns { offset, reason, code } for the first
// problem in reading order, or null if it can't tell (then the caller falls back
// to the browser's message). `code` links the error to a row of the
// common-errors table rendered below the tool.
const PYJS_WORDS = new Set(["True", "False", "None", "NaN", "Infinity", "undefined", "TRUE", "FALSE", "NULL", "Null"]);
const NUM_RE = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
const EOF_REASON = "Input ended early: a } or ] is probably missing";
const TOO_DEEP = { tooDeep: true };

function hex4(ch) {
  return ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
}

function findJsonError(src) {
  const n = src.length;
  let i = 0;

  function fail(offset, reason, code) {
    throw { jsonErr: true, offset, reason, code };
  }
  function eofAt() {
    let j = n;
    while (j > 0) {
      const c = src.charCodeAt(j - 1);
      if (c === 32 || c === 9 || c === 10 || c === 13) j--;
      else break;
    }
    return j;
  }
  function skipWs() {
    while (i < n) {
      const c = src.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) i++;
      else break;
    }
    if (src.charCodeAt(i) === 47) {
      const d = src.charCodeAt(i + 1);
      if (d === 47 || d === 42) fail(i, "Comment: JSON doesn't allow comments, so delete it", "comment");
    }
  }
  // Characters that deserve a specific message wherever they turn up.
  function special(at, singleQuoteCode) {
    const c = src[at];
    if (c === "'" && singleQuoteCode) fail(at, "Use double quotes, not single quotes", singleQuoteCode);
    if (c === "\u201c" || c === "\u201d" || c === "\u2018" || c === "\u2019") {
      fail(at, 'Curly quotes: use straight double quotes (")', "curly");
    }
    if (c !== undefined && /\s/.test(c)) {
      fail(at, `Non-standard space character (U+${hex4(c)}): replace it with a normal space`, "space");
    }
  }
  function describe(c) {
    const code = c.charCodeAt(0);
    return code < 32 || code === 127 ? `U+${hex4(c)}` : `"${c}"`;
  }

  function value(depth) {
    if (depth > MAX_SCAN_DEPTH) throw TOO_DEEP;
    skipWs();
    if (i >= n) {
      if (depth === 0) fail(0, "Input is empty", "empty");
      fail(eofAt(), "Input ended early: a value is missing", "eof");
    }
    const c = src[i];
    if (c === "{") return object(depth);
    if (c === "[") return array(depth);
    if (c === '"') return string();
    if (c === "-" || (c >= "0" && c <= "9")) return number();
    if (/[A-Za-z_$]/.test(c)) return word();
    special(i, "single-str");
    if (c === "}" || c === "]" || c === "," || c === ":") fail(i, `Expected a value before ${c}`, "value");
    if (c === "<") fail(i, 'Unexpected character "<": this looks like HTML or XML, not JSON', "char");
    if (c === "`") fail(i, "Unexpected character \"`\": delete the ``` code fence around the JSON (Repair does this)", "char");
    fail(i, `Unexpected character ${describe(c)}`, "char");
  }

  function word() {
    const start = i;
    while (i < n && /[A-Za-z0-9_$]/.test(src[i])) i++;
    const w = src.slice(start, i);
    if (w === "true" || w === "false" || w === "null") return;
    const shown = w.length > 24 ? w.slice(0, 24) + "…" : w;
    if (PYJS_WORDS.has(w)) {
      fail(start, `Unexpected word "${shown}": JSON only allows true, false and null`, "pyjs");
    }
    fail(start, `Unexpected word "${shown}": JSON only allows true, false and null, so put text in double quotes`, "word");
  }

  function number() {
    const start = i;
    NUM_RE.lastIndex = start;
    const m = NUM_RE.exec(src);
    const end = m ? start + m[0].length : start;
    const next = src[end];
    if (m && !(next !== undefined && /[0-9A-Za-z_.+\-]/.test(next))) {
      i = end;
      return;
    }
    if (m && /^-?0$/.test(m[0]) && next >= "0" && next <= "9") {
      fail(start, "Invalid number: no leading zeros (quote it if it's an ID)", "leading-zero");
    }
    fail(start, "Invalid number (no leading zeros, NaN or hex)", "number");
  }

  function string() {
    const start = i;
    i++; // opening quote
    for (;;) {
      if (i >= n) fail(start, 'Unterminated string: the closing " is missing', "unterminated");
      const c = src.charCodeAt(i);
      if (c === 34) {
        i++;
        return;
      }
      if (c === 92) {
        const e = src[i + 1];
        if (e === undefined) fail(start, 'Unterminated string: the closing " is missing', "unterminated");
        if (e === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) {
            fail(i, "Invalid \\u escape: it needs exactly 4 hex digits", "escape");
          }
          i += 6;
          continue;
        }
        if ('"\\/bfnrt'.indexOf(e) !== -1) {
          i += 2;
          continue;
        }
        fail(i, "Invalid escape: write \\\\ for a backslash", "escape");
      }
      if (c < 32) {
        if (c === 10 || c === 13) {
          fail(i, 'Line break inside a string: write \\n, or close the string with "', "ctrl");
        }
        if (c === 9) fail(i, "Tab inside a string: write \\t", "ctrl-tab");
        fail(i, `Control character U+${hex4(src[i])} inside a string: write \\u${hex4(src[i])}`, "ctrl-other");
      }
      i++;
    }
  }

  function keyError() {
    if (i >= n) fail(eofAt(), EOF_REASON, "eof");
    special(i, "single-key");
    if (/[A-Za-z0-9_$]/.test(src[i])) {
      fail(i, "Expected a double-quoted key: put the key in double quotes", "unquoted-key");
    }
    fail(i, "Expected a double-quoted key", "key");
  }

  function object(depth) {
    i++; // {
    skipWs();
    if (src[i] === "}") {
      i++;
      return;
    }
    for (;;) {
      skipWs();
      if (src[i] !== '"') keyError();
      string();
      skipWs();
      if (src[i] !== ":") {
        if (i >= n) fail(eofAt(), EOF_REASON, "eof");
        special(i, null);
        fail(i, "Expected : after the key", "colon");
      }
      i++;
      value(depth + 1);
      skipWs();
      const c = src[i];
      if (c === ",") {
        const comma = i;
        i++;
        skipWs();
        if (src[i] === "}") fail(comma, "Trailing comma: remove the comma before }", "trailing-obj");
        continue;
      }
      if (c === "}") {
        i++;
        return;
      }
      if (i >= n) fail(eofAt(), EOF_REASON, "eof");
      special(i, null);
      if (c === '"') fail(i, "Expected , or } after a value (missing comma?)", "missing-comma");
      fail(i, "Expected , or } after a value", "after-value");
    }
  }

  function array(depth) {
    i++; // [
    skipWs();
    if (src[i] === "]") {
      i++;
      return;
    }
    for (;;) {
      value(depth + 1);
      skipWs();
      const c = src[i];
      if (c === ",") {
        const comma = i;
        i++;
        skipWs();
        if (src[i] === "]") fail(comma, "Trailing comma: remove the comma before ]", "trailing-arr");
        continue;
      }
      if (c === "]") {
        i++;
        return;
      }
      if (i >= n) fail(eofAt(), EOF_REASON, "eof");
      special(i, null);
      if (c === '"' || c === "{" || c === "[" || c === "-" || (c >= "0" && c <= "9")) {
        fail(i, "Expected , or ] after an array item (missing comma?)", "missing-comma");
      }
      fail(i, "Expected , or ] after an array item", "after-item");
    }
  }

  try {
    skipWs();
    value(0);
    skipWs();
    if (i < n) {
      special(i, null);
      fail(i, "Extra content after the JSON value (two documents or NDJSON?)", "extra");
    }
    return null;
  } catch (e) {
    if (e && e.jsonErr) return { offset: e.offset, reason: e.reason, code: e.code };
    return null; // too deep to scan (or the stack ran out): use the browser's message
  }
}

// 1-based line and column for an offset, plus the offending line clipped to
// SNIPPET_RADIUS characters either side (minified input is one huge line) and a
// caret line underneath. Tabs are copied into the caret line so it lines up.
function locate(src, offset) {
  const off = Math.max(0, Math.min(offset, src.length));
  let line = 1;
  let lastNl = -1;
  let p = src.indexOf("\n");
  while (p !== -1 && p < off) {
    line++;
    lastNl = p;
    p = src.indexOf("\n", p + 1);
  }
  const col = off - lastNl;
  const lineStart = lastNl + 1;
  let lineEnd = p === -1 ? src.length : p;
  if (lineEnd > lineStart && src[lineEnd - 1] === "\r") lineEnd--;
  const from = Math.max(lineStart, off - SNIPPET_RADIUS);
  const to = Math.min(lineEnd, off + SNIPPET_RADIUS + 1);
  const head = from > lineStart ? "…" : "";
  const tail = to < lineEnd ? "…" : "";
  const snippet = head + src.slice(from, to) + tail;
  const caret = (head ? " " : "") + src.slice(from, Math.max(from, Math.min(off, to))).replace(/[^\t]/g, " ") + "^";
  return { offset: off, line, col, snippet, caret };
}

function offsetFromLineCol(src, line, col) {
  let start = 0;
  for (let l = 1; l < line; l++) {
    const p = src.indexOf("\n", start);
    if (p === -1) return src.length;
    start = p + 1;
  }
  return Math.min(src.length, start + Math.max(0, col - 1));
}

// Turn a JSON.parse failure into what the error box shows.
function describeParseError(src, e) {
  const browser = e && e.message ? String(e.message) : "";
  const found = findJsonError(src);
  if (found) {
    return { parse: true, ...locate(src, found.offset), reason: found.reason, code: found.code, browser };
  }
  const lc = /line (\d+) column (\d+)/.exec(browser);
  const pos = /position (\d+)/.exec(browser);
  let offset = null;
  if (lc) offset = offsetFromLineCol(src, Number(lc[1]), Number(lc[2]));
  else if (pos) offset = Math.min(Number(pos[1]), src.length);
  const where = offset === null ? { offset: null } : locate(src, offset);
  return { parse: true, ...where, reason: browser || "The browser's JSON parser rejected this input", code: null, browser: "" };
}

// Keep numbers exactly as written where the browser supports JSON.rawJSON and
// the reviver's source text (Chromium, recent Firefox): only numbers whose text
// would change (19-digit IDs, 1.0, 1e400, -0) are swapped for raw JSON, which
// JSON.stringify writes back verbatim. Feature-detected, never version-sniffed.
const canRaw = typeof JSON.rawJSON === "function" && typeof JSON.isRawJSON === "function";

function exactReviver(key, v, ctx) {
  if (typeof v === "number" && ctx && typeof ctx.source === "string" && String(v) !== ctx.source) {
    return JSON.rawJSON(ctx.source);
  }
  return v;
}

// The reviver makes parsing roughly ten times slower, so first check whether any
// number token (outside strings) would print differently after a plain parse.
// Most documents have none, and then the plain parse is already exact.
function needsExact(src) {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    if (inString) {
      if (escaped) escaped = false;
      else if (c === 92) escaped = true;
      else if (c === 34) inString = false;
      continue;
    }
    if (c === 34) {
      inString = true;
    } else if (c === 45 || (c >= 48 && c <= 57)) {
      let j = i + 1;
      while (j < src.length) {
        const d = src.charCodeAt(j);
        // digits . + - e E
        if ((d >= 48 && d <= 57) || d === 46 || d === 43 || d === 45 || d === 101 || d === 69) j++;
        else break;
      }
      const tok = src.slice(i, j);
      if (String(Number(tok)) !== tok) return true;
      i = j - 1;
    }
  }
  return false;
}

function parseJson(text) {
  if (!needsExact(text)) return { value: JSON.parse(text), exact: true };
  if (canRaw && text.length <= EXACT_MAX_CHARS) {
    try {
      return { value: JSON.parse(text, exactReviver), exact: true };
    } catch (e) {
      // The reviver walk is recursive, so valid JSON nested deeply enough (about
      // 2,000 levels in Chrome) runs out of stack there although the plain parse
      // is fine. Syntax errors are rethrown for describeParseError.
      if (!(e instanceof RangeError)) throw e;
    }
  }
  return { value: JSON.parse(text), exact: false };
}

function isRaw(v) {
  return canRaw && v !== null && typeof v === "object" && JSON.isRawJSON(v);
}

// Objects get their keys in code-unit order (so capitals sort before lowercase);
// arrays keep their order. Object.fromEntries defines own properties, so a
// "__proto__" key stays an ordinary key.
function sortKeysDeep(v) {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v === null || typeof v !== "object" || isRaw(v)) return v;
  return Object.fromEntries(
    Object.keys(v)
      .sort()
      .map((k) => [k, sortKeysDeep(v[k])])
  );
}

function plural(nr, one, many) {
  return `${nr.toLocaleString("en-US")} ${nr === 1 ? one : many}`;
}

// Top-level summary, value count and nesting depth (top level = 1), from an
// iterative walk so deep documents can't overflow the stack.
function analyze(v) {
  let top;
  if (Array.isArray(v)) top = `Array · ${plural(v.length, "item", "items")}`;
  else if (isRaw(v)) top = "Number";
  else if (v === null) top = "Null";
  else if (typeof v === "object") top = `Object · ${plural(Object.keys(v).length, "key", "keys")}`;
  else if (typeof v === "string") top = "String";
  else if (typeof v === "number") top = "Number";
  else top = "Boolean";

  const vals = [v];
  const depths = [1];
  let nodes = 0;
  let depth = 1;
  let capped = false;
  let nonFinite = false;
  while (vals.length) {
    const x = vals.pop();
    const d = depths.pop();
    nodes++;
    if (nodes > STATS_MAX_NODES) {
      capped = true;
      break;
    }
    if (x !== null && typeof x === "object" && !isRaw(x)) {
      if (d > depth) depth = d;
      const kids = Array.isArray(x) ? x : Object.values(x);
      for (let k = 0; k < kids.length; k++) {
        vals.push(kids[k]);
        depths.push(d + 1);
      }
    } else if (typeof x === "number" && !Number.isFinite(x)) {
      nonFinite = true;
    }
  }
  return { top, nodes, depth: capped ? null : depth, capped, nonFinite };
}

function byteLength(s) {
  return new TextEncoder().encode(s).length;
}

// 1 KB = 1,024 B. The unit is picked after rounding, so 1,048,575 B is
// "1.00 MB", not "1024.0 KB".
function formatBytes(b) {
  if (b < 1024) return `${b.toLocaleString("en-US")} B`;
  const kb = (b / 1024).toFixed(1);
  if (Number(kb) < 1024) return `${kb} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

// Where the caret sits vertically inside a wrapping textarea, measured with a
// hidden mirror element (a line count alone is wrong for wrapped, minified JSON).
function caretTop(ta, offset) {
  if (typeof document === "undefined" || offset > 300000) return null;
  const cs = window.getComputedStyle(ta);
  const div = document.createElement("div");
  const copy = [
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing", "tabSize",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "textIndent",
  ];
  copy.forEach((p) => {
    div.style[p] = cs[p];
  });
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.top = "0";
  div.style.left = "-9999px";
  div.style.boxSizing = "border-box";
  div.style.width = `${ta.clientWidth}px`;
  div.style.border = "0";
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";
  div.textContent = ta.value.slice(0, offset);
  const mark = document.createElement("span");
  mark.textContent = "\u200b";
  div.appendChild(mark);
  document.body.appendChild(div);
  const top = mark.offsetTop;
  document.body.removeChild(div);
  return top;
}

// Reference rows for the "Common JSON errors" table. The messages were checked
// against V8 (Node 24), which is what current Chrome and Edge use.
const ERROR_ROWS = [
  { code: "trailing-obj", mistake: "Trailing comma in an object", example: '{"a": 1,}', says: "Expected double-quoted property name", fix: "Delete the comma after the last pair" },
  { code: "trailing-arr", mistake: "Trailing comma in an array", example: "[1, 2,]", says: "Unexpected token ']'", fix: "Delete the last comma" },
  { code: "unquoted-key", mistake: "Unquoted key", example: "{a: 1}", says: "Expected property name or '}'", fix: 'Quote the key: {"a": 1}' },
  { code: "single-key", mistake: "Single-quoted key", example: "{'a': 1}", says: "Expected property name or '}'", fix: "Use double quotes" },
  { code: "single-str", mistake: "Single-quoted string", example: "{\"a\": 'x'}", says: "Unexpected token '''", fix: 'Use "x"' },
  { code: "missing-comma", mistake: "Missing comma", example: '{"a": 1 "b": 2}', says: "Expected ',' or '}' after property value", fix: "Add a comma between pairs" },
  { code: "comment", mistake: "Comment", example: '{"a": 1 /* note */}', says: "Expected ',' or '}' after property value (varies with where the comment is)", fix: "Delete it; JSON has no comments" },
  { code: "pyjs", mistake: "Python/JS values", example: "True, None, NaN, undefined", says: "Unexpected token 'T' (or 'N', 'u')", fix: "Use true, false or null" },
  { code: "eof", mistake: "Missing bracket or cut-off file", example: '{"a": [1, 2', says: "Expected ',' or ']' after array element", fix: "Add the missing ] and }" },
  { code: "ctrl", mistake: "Real line break inside a string", example: '"line1⏎line2"', says: "Bad control character in string literal", fix: "Write \\n" },
  { code: "escape", mistake: "Lone backslash", example: '"C:\\Users"', says: "Bad escaped character", fix: 'Write "C:\\\\Users"' },
  { code: "leading-zero", mistake: "Leading zero", example: "01", says: "Unexpected number", fix: 'Write 1, or quote it ("01") if it\'s an ID' },
  { code: "extra", mistake: "Two documents / NDJSON", example: '{"a":1}⏎{"b":2}', says: "Unexpected non-whitespace character after JSON", fix: "Wrap them in [ ] with commas (Repair does this)" },
  { code: "empty", mistake: "Empty input", example: "(nothing)", says: "Unexpected end of JSON input", fix: "Paste the full document" },
];

function rowMatches(rowCode, errCode) {
  if (!errCode) return false;
  return rowCode === errCode || (rowCode === "eof" && errCode === "unterminated");
}

// ---- Rendering helpers (JSX) ----

const TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

// Colour the formatted string. React escapes every piece, so no HTML injection.
function highlight(text) {
  const out = [];
  let last = 0;
  let k = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <span key={k++} className={m[2] !== undefined ? "json-key" : "json-str"}>
          {m[1]}
        </span>
      );
      if (m[2] !== undefined) out.push(m[2]);
    } else if (m[3] !== undefined) {
      out.push(
        <span key={k++} className="json-lit">
          {m[3]}
        </span>
      );
    } else {
      out.push(
        <span key={k++} className="json-num">
          {m[4]}
        </span>
      );
    }
    last = TOKEN_RE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function TreeName({ name, isIndex }) {
  if (name === undefined) return null;
  return isIndex ? (
    <>
      <span className="json-meta">{name}</span>:{" "}
    </>
  ) : (
    <>
      <span className="json-key">{JSON.stringify(name)}</span>:{" "}
    </>
  );
}

function TreeLeafValue({ v }) {
  if (isRaw(v)) return <span className="json-num">{v.rawJSON}</span>;
  if (typeof v === "string") return <span className="json-str">{JSON.stringify(v)}</span>;
  // JSON.stringify so a non-finite fallback number shows as the null the output has.
  if (typeof v === "number") return <span className="json-num">{JSON.stringify(v)}</span>;
  return <span className="json-lit">{String(v)}</span>;
}

// Which branches start open. "open" (Expand all) opens everything and "closed"
// (Collapse all) only the root. By default the root is open, and its child
// branches too unless the root has more than TREE_OPEN_MAX_KIDS children:
// opening every element of a wide top-level array took seconds.
function startsOpen(mode, level, siblings) {
  if (mode === "open" || level === 1) return true;
  if (mode === "closed") return false;
  return level === 2 && siblings <= TREE_OPEN_MAX_KIDS;
}

function TreeBranch({ name, isIndex, value, isArr, keys, level, mode, siblings }) {
  const [open, setOpen] = useState(() => startsOpen(mode, level, siblings));
  const count = isArr ? value.length : keys.length;
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <TreeName name={name} isIndex={isIndex} />
        {isArr ? "[…]" : "{…}"}{" "}
        <span className="json-meta">{isArr ? plural(count, "item", "items") : plural(count, "key", "keys")}</span>
      </summary>
      {open
        ? isArr
          ? value.map((item, idx) => (
              <TreeNode key={idx} name={idx} isIndex value={item} level={level + 1} mode={mode} siblings={count} />
            ))
          : keys.map((k) => (
              <TreeNode key={k} name={k} value={value[k]} level={level + 1} mode={mode} siblings={count} />
            ))
        : null}
    </details>
  );
}

// Objects and arrays are <details> whose children render only while open, so
// collapsed branches cost no DOM. Memoized (all props are primitives or the
// parsed values, which never change for a given result), so a re-render of the
// page component, such as every keystroke in the input box, stops at the root
// instead of walking the whole tree.
const TreeNode = memo(function TreeNode({ name, isIndex, value, level, mode, siblings }) {
  const isArr = Array.isArray(value);
  const isObj = !isArr && value !== null && typeof value === "object" && !isRaw(value);
  if (!isArr && !isObj) {
    return (
      <div className="json-leaf">
        <TreeName name={name} isIndex={isIndex} />
        <TreeLeafValue v={value} />
      </div>
    );
  }
  const keys = isArr ? null : Object.keys(value);
  if ((isArr ? value.length : keys.length) === 0) {
    return (
      <div className="json-leaf">
        <TreeName name={name} isIndex={isIndex} />
        {isArr ? "[]" : "{}"}
      </div>
    );
  }
  return (
    <TreeBranch
      name={name}
      isIndex={isIndex}
      value={value}
      isArr={isArr}
      keys={keys}
      level={level}
      mode={mode}
      siblings={siblings}
    />
  );
});

function ErrorTable({ matchCode }) {
  return (
    <section className="tool-about">
      <h2 className="tool-h2">Common JSON errors and how to fix them</h2>
      <div className="csc-table-wrap">
        <table className="csc-table json-err-table">
          <thead>
            <tr>
              <th scope="col">Mistake</th>
              <th scope="col">Example</th>
              <th scope="col">What Chrome/Edge says</th>
              <th scope="col">Fix</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_ROWS.map((r) => (
              <tr key={r.code} className={rowMatches(r.code, matchCode) ? "is-match" : undefined}>
                <td>{r.mistake}</td>
                <td>
                  <code>{r.example}</code>
                </td>
                <td>{r.says}</td>
                <td>{r.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tool-note" style={{ marginTop: 10 }}>
        Wording is from current Chrome and Edge; Firefox and Safari phrase these differently. This tool adds the
        line and column for you, and highlights the matching row when your input has one of these mistakes.
      </p>
    </section>
  );
}

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [err, setErr] = useState(null);
  const [stats, setStats] = useState(null);
  const [treeData, setTreeData] = useState(null); // { value } when the tree view is allowed
  const [tooBigForTree, setTooBigForTree] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [repaired, setRepaired] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [precisionWarning, setPrecisionWarning] = useState(false);
  const [nonFinite, setNonFinite] = useState(false);
  const [bomRemoved, setBomRemoved] = useState(false);
  const [indent, setIndent] = useState("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [view, setView] = useState("code");
  const [treeMode, setTreeMode] = useState("default");
  const [treeKey, setTreeKey] = useState(0);
  const [lastAction, setLastAction] = useState("format");
  const [ranOn, setRanOn] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dlUrl, setDlUrl] = useState("");
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const pasteRef = useRef(false);

  // Remembered indent and sort choice (per-viewer convenience only).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved && INDENT_KEYS.includes(saved.indent)) setIndent(saved.indent);
      if (saved && typeof saved.sort === "boolean") setSortKeys(saved.sort);
    } catch (e) {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!output) {
      setDlUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(new Blob([output], { type: "application/json" }));
    setDlUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [output]);

  function savePrefs(nextIndent, nextSort) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ indent: nextIndent, sort: nextSort }));
    } catch (e) {
      /* storage unavailable */
    }
  }

  function clearResult() {
    setOutput("");
    setStats(null);
    setTreeData(null);
    setTooBigForTree(false);
    setPrecisionWarning(false);
    setNonFinite(false);
    setRepaired(false);
  }

  function finish(parsed, parsedText, inputText, minify, ind, srt, wasRepaired) {
    try {
      const value = srt ? sortKeysDeep(parsed.value) : parsed.value;
      const text = minify ? JSON.stringify(value) : JSON.stringify(value, null, INDENTS[ind]);
      const info = analyze(value);
      setOutput(text);
      setErr(null);
      setStats({ inBytes: byteLength(inputText), outBytes: byteLength(text), top: info.top, depth: info.depth });
      const treeOk = !info.capped && info.nodes <= TREE_MAX_NODES;
      setTreeData(treeOk ? { value } : null);
      setTooBigForTree(!treeOk);
      setTreeMode("default");
      setTreeKey((k) => k + 1);
      setPrecisionWarning(!parsed.exact && hasUnsafeLongNumber(parsedText));
      setNonFinite(!parsed.exact && info.nonFinite);
      setRepaired(wasRepaired);
    } catch (e) {
      clearResult();
      setErr({ message: `Couldn't format this document${e && e.message ? `: ${e.message}` : "."}` });
    }
  }

  async function repair(src, ind, srt) {
    setRepairing(true);
    try {
      const { jsonrepair } = await import("jsonrepair");
      const fixed = jsonrepair(src);
      finish(parseJson(fixed), fixed, src, false, ind, srt, true);
    } catch (e) {
      clearResult();
      let detail = null;
      try {
        JSON.parse(src);
      } catch (pe) {
        detail = describeParseError(src, pe);
      }
      setErr(
        detail
          ? { ...detail, repairFailed: true }
          : { message: "Couldn't auto-repair this. It may be too malformed to guess at." }
      );
    } finally {
      setRepairing(false);
    }
  }

  // action: "format" | "minify" | "repair". opts can override the text and
  // options, for callers that run before React state has caught up (paste, file
  // open, sample, option changes).
  function run(action, opts) {
    const o = opts || {};
    const raw = o.text !== undefined ? o.text : input;
    const ind = o.indent !== undefined ? o.indent : indent;
    const srt = o.sort !== undefined ? o.sort : sortKeys;
    setCopied(false);
    setCopyFailed(false);
    setLastAction(action);
    if (!raw.trim()) {
      clearResult();
      setErr(null);
      setRanOn(null);
      return;
    }
    let src = raw;
    // RFC 8259 §8.1 lets parsers ignore a leading byte-order mark; JSON.parse
    // doesn't, so a BOM-prefixed file would fail on an invisible character.
    if (src.charCodeAt(0) === 0xfeff) {
      src = src.slice(1);
      setInput(src);
      setBomRemoved(true);
    }
    setRanOn(src);
    if (action === "repair") {
      repair(src, ind, srt);
      return;
    }
    let parsed;
    try {
      parsed = parseJson(src);
    } catch (e) {
      clearResult();
      setErr(describeParseError(src, e));
      return;
    }
    finish(parsed, src, src, action === "minify", ind, srt, false);
  }

  function rerun(opts) {
    if (output) run(lastAction, opts);
  }

  function changeIndent(v) {
    setIndent(v);
    savePrefs(v, sortKeys);
    rerun({ indent: v });
  }

  function changeSort(v) {
    setSortKeys(v);
    savePrefs(indent, v);
    rerun({ sort: v });
  }

  function handleInputChange(e) {
    const v = e.target.value;
    setInput(v);
    setBomRemoved(false);
    // Typed or pasted text is no longer the opened file (readFile sets input
    // directly, not through here), so drop its name from the note and download.
    setFileName("");
    if (pasteRef.current) {
      pasteRef.current = false;
      if (v.trim()) run("format", { text: v });
    }
  }

  // Format on paste, but only when the box was empty: never re-format while
  // someone is editing.
  function handlePaste() {
    if (input.trim()) return;
    pasteRef.current = true;
    setTimeout(() => {
      pasteRef.current = false;
    }, 0);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run("format");
    }
  }

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setInput(text);
      setFileName(file.name);
      setBomRemoved(false);
      run("format", { text });
    };
    reader.onerror = () => {
      clearResult();
      setErr({ message: `Couldn't read ${file.name}.` });
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleFileInput(e) {
    const f = e.target.files && e.target.files[0];
    readFile(f);
    e.target.value = "";
  }

  function handleDragOver(e) {
    const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
    if (types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(e) {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) {
      e.preventDefault();
      readFile(f);
    }
  }

  function loadSample() {
    setInput(SAMPLE);
    setFileName("");
    setBomRemoved(false);
    run("format", { text: SAMPLE });
  }

  function handleClear() {
    setInput("");
    clearResult();
    setErr(null);
    setCopied(false);
    setCopyFailed(false);
    setBomRemoved(false);
    setFileName("");
    setRanOn(null);
    setLastAction("format");
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopyFailed(true);
    }
  }

  function goToError() {
    const ta = taRef.current;
    if (!ta || !err || err.offset === null || err.offset === undefined) return;
    const len = ta.value.length;
    const start = Math.min(err.offset, len);
    ta.focus();
    ta.setSelectionRange(start, Math.min(start + 1, len));
    const lh = parseFloat(window.getComputedStyle(ta).lineHeight) || 20;
    const top = caretTop(ta, start);
    const y = top !== null ? top : (err.line - 1) * lh;
    ta.scrollTop = Math.max(0, y - 2 * lh);
  }

  const showTree = view === "tree" && treeData !== null;
  const highlighted = useMemo(
    () => (!showTree && output && output.length <= HIGHLIGHT_MAX_CHARS ? highlight(output) : null),
    [output, showTree]
  );
  // Built once per result: typing in the input box re-renders this component,
  // and an unchanged element lets React skip the whole result box instead of
  // walking every highlighted span or tree row on each keystroke.
  const resultView = useMemo(() => {
    if (!output) return null;
    return showTree ? (
      <div className="json-out json-tree" id="json-output" role="region" aria-labelledby="json-output-label">
        <TreeNode key={treeKey} value={treeData.value} level={1} mode={treeMode} siblings={1} />
      </div>
    ) : (
      <pre className="tool-output json-out" id="json-output" role="region" aria-labelledby="json-output-label">
        {highlighted || output}
      </pre>
    );
  }, [output, showTree, highlighted, treeData, treeKey, treeMode]);
  const stale = ranOn !== null && input !== ranOn;
  const base = fileName ? fileName.replace(/\.(json|geojson|jsonc|txt)$/i, "") : "";
  const dlName =
    lastAction === "minify"
      ? base
        ? `${base}.min.json`
        : "minified.json"
      : base
        ? `${base}.formatted.json`
        : "formatted.json";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="json-input">
            JSON input
          </label>
          <textarea
            ref={taRef}
            className="tool-textarea"
            id="json-input"
            value={input}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            placeholder='{"hello": "world", "items": [1, 2, 3]}'
            rows={14}
            spellCheck={false}
            style={{ fontFamily: MONO, fontSize: 13 }}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".json,.geojson,.jsonc,.txt,application/json"
            hidden
            onChange={handleFileInput}
          />
          {fileName ? <p className="tool-note">Opened {fileName} (read in your browser, not uploaded).</p> : null}
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="json-indent">
              Indent
            </label>
            <select
              className="tool-select"
              id="json-indent"
              value={indent}
              onChange={(e) => changeIndent(e.target.value)}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tab</option>
            </select>
          </div>
          <div className="tool-field">
            <div className="tool-label">Options</div>
            <label
              htmlFor="json-sort"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", minHeight: "2.5rem" }}
            >
              <input
                id="json-sort"
                type="checkbox"
                checked={sortKeys}
                onChange={(e) => changeSort(e.target.checked)}
              />
              <span>Sort keys A→Z</span>
            </label>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={() => run("format")}>
          Format
        </button>
        <button className="btn" type="button" onClick={() => run("minify")}>
          Minify
        </button>
        <button className="btn" type="button" onClick={() => fileRef.current && fileRef.current.click()}>
          Open file
        </button>
        <button className="btn" type="button" onClick={loadSample}>
          Load sample
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>
      <p className="tool-note">
        Shortcut: Ctrl+Enter (⌘+Enter on a Mac) runs Format. Pasting into the empty box formats straight away.
      </p>

      {err ? (
        <div className="tool-error json-err" role="alert">
          {err.parse ? (
            <>
              <p style={{ margin: 0 }}>
                <strong>Invalid JSON</strong>
                {err.offset !== null && err.offset !== undefined ? `: line ${err.line}, column ${err.col}` : ""}:{" "}
                {err.reason}
              </p>
              {err.snippet !== undefined && err.offset !== null ? (
                <pre className="tool-output json-snippet">{`${err.snippet}\n${err.caret}`}</pre>
              ) : null}
              {err.browser ? (
                <p className="tool-note" style={{ marginTop: 6 }}>
                  Your browser says: {err.browser}
                </p>
              ) : null}
              {err.repairFailed ? (
                <p style={{ margin: "8px 0 0" }}>
                  Couldn&rsquo;t auto-repair this; it may be too malformed. Fix the spot above by hand and try Format
                  again.
                </p>
              ) : null}
              <div className="tool-actions" style={{ marginTop: 8 }}>
                {err.offset !== null && err.offset !== undefined ? (
                  <button className="btn btn-sm" type="button" onClick={goToError}>
                    Go to error
                  </button>
                ) : null}
                <button className="btn btn-sm" type="button" onClick={() => run("repair")} disabled={repairing}>
                  {repairing ? "Repairing…" : "🔧 Repair & format"}
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0 }}>{err.message}</p>
          )}
        </div>
      ) : null}

      {output ? (
        <div className="tool-field">
          {stale ? (
            <p className="tool-note" role="status">
              The input has changed since this result. Press Format to check it again.
            </p>
          ) : repaired ? (
            <p className="tool-note json-ok" role="status">
              ✓ Auto-repaired and formatted. Double-check the result matches what you intended.
            </p>
          ) : (
            <p className="json-ok" role="status" style={{ margin: 0 }}>
              ✓ Valid JSON
            </p>
          )}
          {stats ? (
            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{formatBytes(stats.inBytes)}</div>
                <div className="tool-stat-label">Input size</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{formatBytes(stats.outBytes)}</div>
                <div className="tool-stat-label">Output size</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{stats.top}</div>
                <div className="tool-stat-label">Top level</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{stats.depth === null ? "—" : stats.depth}</div>
                <div className="tool-stat-label">
                  {stats.depth === null ? "Nesting depth (too large to count)" : "Nesting depth"}
                </div>
              </div>
            </div>
          ) : null}
          {bomRemoved ? <p className="tool-note">Removed a byte-order mark (BOM) from the start.</p> : null}
          {precisionWarning ? (
            <p className="tool-note json-warn" role="status">
              Heads-up: this browser can&rsquo;t keep very long numbers exact here, so numbers with 16 or more digits
              may have been rounded. Wrap IDs in quotes to keep them exact.
            </p>
          ) : null}
          {nonFinite ? (
            <p className="tool-note json-warn" role="status">
              Heads-up: a number too large to store (such as 1e400) was written as null.
            </p>
          ) : null}

          <div className="tool-actions json-view">
            <button
              className={showTree ? "btn btn-sm" : "btn btn-sm btn-primary"}
              type="button"
              aria-pressed={!showTree}
              onClick={() => setView("code")}
            >
              Code
            </button>
            <button
              className={showTree ? "btn btn-sm btn-primary" : "btn btn-sm"}
              type="button"
              aria-pressed={showTree}
              disabled={!treeData}
              onClick={() => setView("tree")}
            >
              Tree
            </button>
            <button className={copied ? "btn btn-sm btn-success" : "btn btn-sm"} type="button" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
            {dlUrl ? (
              <a className="btn btn-sm" href={dlUrl} download={dlName}>
                ↓ Download .json
              </a>
            ) : null}
            {showTree ? (
              <>
                <button
                  className="btn btn-sm"
                  type="button"
                  onClick={() => {
                    setTreeMode("open");
                    setTreeKey((k) => k + 1);
                  }}
                >
                  Expand all
                </button>
                <button
                  className="btn btn-sm"
                  type="button"
                  onClick={() => {
                    setTreeMode("closed");
                    setTreeKey((k) => k + 1);
                  }}
                >
                  Collapse all
                </button>
              </>
            ) : null}
          </div>
          {copyFailed ? (
            <p className="tool-note json-warn">Couldn&rsquo;t copy automatically. Select the result and copy it by hand.</p>
          ) : null}
          {tooBigForTree ? (
            <p className="tool-note">Tree view is off for documents with more than 20,000 values.</p>
          ) : null}
          {!showTree && output.length > HIGHLIGHT_MAX_CHARS ? (
            <p className="tool-note">Highlighting is off for very large output (over 500,000 characters).</p>
          ) : null}

          <div className="tool-label" id="json-output-label">
            Result
          </div>
          {resultView}
        </div>
      ) : null}

      {!output && !err ? (
        <p className="tool-note">
          Paste JSON above, drop a .json file on the box, or click Load sample. Format indents it with 2 spaces, 4
          spaces or tabs; Minify strips the whitespace. If it&rsquo;s broken you get the line and column of the
          error and a one-click repair.
        </p>
      ) : null}

      <ErrorTable matchCode={err && err.parse ? err.code : null} />
    </div>
  );
}
