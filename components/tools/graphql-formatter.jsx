"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// Keywords that begin a top-level definition. Used to put a blank line
// between definitions without splitting a definition's own header
// (e.g. "query Foo" or "type User" must stay on one line).
const TOP_KEYWORDS = new Set([
  "query",
  "mutation",
  "subscription",
  "fragment",
  "type",
  "input",
  "enum",
  "interface",
  "scalar",
  "union",
  "schema",
  "directive",
  "extend",
]);

const SAMPLE = `query GetUser($id:ID!,$withPosts:Boolean=true){user(id:$id){id name ...UserFields posts @include(if:$withPosts){title tags}}}
fragment UserFields on User{email role avatar{url}}`;

// --- Tokenizer -------------------------------------------------------------

// Break a GraphQL document into tokens. Whitespace and commas are
// insignificant in GraphQL, so they are dropped here and re-inserted by the
// printer. Strings, block strings ("""..."""), and # comments are preserved
// verbatim so their contents are never altered.
function tokenize(src) {
  const toks = [];
  const n = src.length;
  let i = 0;
  let line = 1;
  const isNameStart = (c) => c === "_" || (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
  const isName = (c) => isNameStart(c) || (c >= "0" && c <= "9");
  const isDigit = (c) => c >= "0" && c <= "9";

  while (i < n) {
    const c = src[i];

    if (c === "\n") {
      line += 1;
      i += 1;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === ",") {
      i += 1;
      continue;
    }

    // Comment: # to end of line.
    if (c === "#") {
      let j = i + 1;
      while (j < n && src[j] !== "\n") j += 1;
      toks.push({ type: "COMMENT", value: src.slice(i, j).replace(/\s+$/, ""), line });
      i = j;
      continue;
    }

    // Block string """ ... """
    if (c === '"' && src[i + 1] === '"' && src[i + 2] === '"') {
      let j = i + 3;
      let closed = false;
      while (j < n) {
        if (src[j] === "\\" && src[j + 1] === '"') {
          j += 2;
          continue;
        }
        if (src[j] === '"' && src[j + 1] === '"' && src[j + 2] === '"') {
          j += 3;
          closed = true;
          break;
        }
        if (src[j] === "\n") line += 1;
        j += 1;
      }
      if (!closed) throw new Error("Unterminated block string (missing closing \"\"\").");
      toks.push({ type: "BLOCK_STRING", value: src.slice(i, j), line });
      i = j;
      continue;
    }

    // Regular string
    if (c === '"') {
      let j = i + 1;
      let val = '"';
      let closed = false;
      while (j < n) {
        const cc = src[j];
        if (cc === "\\") {
          val += cc + (src[j + 1] || "");
          j += 2;
          continue;
        }
        if (cc === "\n") break;
        val += cc;
        j += 1;
        if (cc === '"') {
          closed = true;
          break;
        }
      }
      if (!closed) throw new Error("Unterminated string (missing closing quote).");
      toks.push({ type: "STRING", value: val, line });
      i = j;
      continue;
    }

    // Spread
    if (c === "." && src[i + 1] === "." && src[i + 2] === ".") {
      toks.push({ type: "PUNCT", value: "...", line });
      i += 3;
      continue;
    }

    // Single-character punctuators
    if ("{}()[]!:=@$|&".indexOf(c) !== -1) {
      toks.push({ type: "PUNCT", value: c, line });
      i += 1;
      continue;
    }

    // Number (int or float, optional leading minus)
    if (isDigit(c) || (c === "-" && isDigit(src[i + 1]))) {
      let j = i;
      if (src[j] === "-") j += 1;
      while (j < n && isDigit(src[j])) j += 1;
      let isFloat = false;
      if (src[j] === ".") {
        isFloat = true;
        j += 1;
        while (j < n && isDigit(src[j])) j += 1;
      }
      if (src[j] === "e" || src[j] === "E") {
        isFloat = true;
        j += 1;
        if (src[j] === "+" || src[j] === "-") j += 1;
        while (j < n && isDigit(src[j])) j += 1;
      }
      toks.push({ type: isFloat ? "FLOAT" : "INT", value: src.slice(i, j), line });
      i = j;
      continue;
    }

    // Name
    if (isNameStart(c)) {
      let j = i + 1;
      while (j < n && isName(src[j])) j += 1;
      toks.push({ type: "NAME", value: src.slice(i, j), line });
      i = j;
      continue;
    }

    throw new Error("Unexpected character '" + c + "' in the document.");
  }

  return toks;
}

// A token that completes a value / field (so the next item begins after it).
function isValueEnd(t) {
  if (!t) return false;
  if (
    t.type === "NAME" ||
    t.type === "INT" ||
    t.type === "FLOAT" ||
    t.type === "STRING" ||
    t.type === "BLOCK_STRING"
  ) {
    return true;
  }
  return t.value === ")" || t.value === "]" || t.value === "}" || t.value === "!";
}

// Decide whether a single space belongs between two adjacent tokens on the
// same line (used only when not breaking and not inserting a comma).
function needSpace(p, c) {
  if (!p) return false;
  const pv = p.value;
  const cv = c.value;

  // After "..." : no space before a fragment name, space before on/@/{ etc.
  if (pv === "...") {
    return !(c.type === "NAME" && c.value !== "on");
  }

  if (pv === "(" || pv === "[" || pv === "@" || pv === "$") return false;
  if (cv === ")" || cv === "]" || cv === "}" || cv === "!" || cv === ":" || cv === "(") return false;

  // Space after "{" only for inline input objects ("{ a: 1 }").
  return true;
}

// Determine what separates the current token from the previous one, given the
// enclosing context frame.
function boundaryKind(ctx, cur, prev, atStart) {
  if (atStart || !prev) return null;
  if (prev.value === "on") return null; // "... on Type" stays together

  if (ctx === "SEL") {
    const startsItem =
      cur.type === "NAME" ||
      cur.type === "STRING" ||
      cur.type === "BLOCK_STRING" ||
      cur.value === "...";
    return startsItem && isValueEnd(prev) ? "nl" : null;
  }
  if (ctx === "ARGS") {
    const startsItem = cur.type === "NAME" || cur.value === "$";
    return startsItem && isValueEnd(prev) ? "comma" : null;
  }
  if (ctx === "LIST" || ctx === "OBJ") {
    const startsItem =
      cur.type === "NAME" ||
      cur.type === "INT" ||
      cur.type === "FLOAT" ||
      cur.type === "STRING" ||
      cur.type === "BLOCK_STRING" ||
      cur.value === "$" ||
      cur.value === "[" ||
      cur.value === "{";
    return startsItem && isValueEnd(prev) ? "comma" : null;
  }
  return null;
}

// --- Pretty printer --------------------------------------------------------

function beautify(toks, unit) {
  let out = "";
  let atLineStart = true;
  let indent = 0;
  let pendingBreak = false;
  const frames = ["ROOT"];
  let prev = null;

  const cur = () => frames[frames.length - 1];
  const write = (s) => {
    out += s;
    atLineStart = false;
  };
  const nl = (blank) => {
    out = out.replace(/[ \t]+$/, "");
    out += blank ? "\n\n" : "\n";
    out += unit.repeat(indent);
    atLineStart = true;
  };

  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];

    if (t.type === "COMMENT") {
      if (!atLineStart && prev && t.line === prev.line) {
        write(" " + t.value);
      } else {
        if (!atLineStart) nl(false);
        write(t.value);
      }
      pendingBreak = true;
      continue;
    }

    const ctx = cur();

    // Force a break carried over from a preceding comment line.
    if (pendingBreak && !atLineStart) nl(false);
    pendingBreak = false;

    // Blank line between top-level definitions.
    if (
      ctx === "ROOT" &&
      !atLineStart &&
      t.type === "NAME" &&
      TOP_KEYWORDS.has(t.value) &&
      prev &&
      prev.value !== "extend"
    ) {
      nl(true);
    } else if (!atLineStart) {
      const b = boundaryKind(ctx, t, prev, atLineStart);
      if (b === "nl") nl(false);
      else if (b === "comma") write(", ");
      else if (needSpace(prev, t)) write(" ");
    }

    // Structural handling.
    if (t.value === "}") {
      const closed = frames.length > 1 ? frames.pop() : "SEL";
      if (closed === "OBJ") {
        if (out.endsWith("{")) write("}");
        else write(" }");
      } else {
        indent = Math.max(0, indent - 1);
        nl(false);
        write("}");
      }
    } else if (t.value === "{") {
      const block = ctx === "SEL" || ctx === "ROOT";
      write("{");
      if (block) {
        indent += 1;
        frames.push("SEL");
        nl(false);
      } else {
        frames.push("OBJ");
      }
    } else if (t.value === "(") {
      write("(");
      frames.push("ARGS");
    } else if (t.value === ")") {
      if (frames.length > 1) frames.pop();
      write(")");
    } else if (t.value === "[") {
      write("[");
      frames.push("LIST");
    } else if (t.value === "]") {
      if (frames.length > 1) frames.pop();
      write("]");
    } else {
      write(t.value);
    }

    prev = t;
  }

  return out.replace(/\s+$/, "");
}

// --- Minifier --------------------------------------------------------------

function minify(toks) {
  let out = "";
  let prev = null;
  const wordish = (t) => t && (t.type === "NAME" || t.type === "INT" || t.type === "FLOAT");
  for (const t of toks) {
    if (t.type === "COMMENT") continue;
    if (wordish(prev) && wordish(t)) out += " ";
    out += t.value;
    prev = t;
  }
  return out.trim();
}

function byteLength(str) {
  try {
    return new TextEncoder().encode(str).length;
  } catch (e) {
    return str.length;
  }
}

const INDENTS = {
  "2": { label: "2 spaces", unit: "  " },
  "4": { label: "4 spaces", unit: "    " },
  tab: { label: "Tab", unit: "\t" },
};

export default function GraphqlFormatter() {
  const [input, setInput] = useState(SAMPLE);
  const [mode, setMode] = useState("beautify");
  const [indentKey, setIndentKey] = useState("2");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", error: "", inChars: 0, outChars: 0 };
    }
    let toks;
    try {
      toks = tokenize(input);
    } catch (e) {
      return { output: "", error: e.message || "Could not parse the document.", inChars: 0, outChars: 0 };
    }
    if (toks.length === 0) {
      return { output: "", error: "", inChars: 0, outChars: 0 };
    }
    let output;
    try {
      output =
        mode === "minify"
          ? minify(toks)
          : beautify(toks, INDENTS[indentKey].unit);
    } catch (e) {
      return { output: "", error: e.message || "Could not format the document.", inChars: 0, outChars: 0 };
    }
    return {
      output,
      error: "",
      inChars: byteLength(input),
      outChars: byteLength(output),
    };
  }, [input, mode, indentKey]);

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
    const blob = new Blob([result.output], { type: "application/graphql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "minify" ? "query.min.graphql" : "query.graphql";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  function handleSample() {
    setInput(SAMPLE);
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="gql-input">
            GraphQL query, mutation, fragment, or schema (SDL)
          </label>
          <textarea
            id="gql-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={"query {\n  me { id name }\n}"}
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="gql-mode">
              Mode
            </label>
            <select
              id="gql-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setCopied(false);
              }}
            >
              <option value="beautify">Beautify (indent)</option>
              <option value="minify">Minify (compact)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="gql-indent">
              Indentation
            </label>
            <select
              id="gql-indent"
              className="tool-select"
              value={indentKey}
              onChange={(e) => {
                setIndentKey(e.target.value);
                setCopied(false);
              }}
              disabled={mode === "minify"}
            >
              {Object.keys(INDENTS).map((key) => (
                <option key={key} value={key}>
                  {INDENTS[key].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSample}>
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
                {result.inChars.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Input bytes</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.outChars.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Output bytes</div>
            </div>
          </div>

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
                Download .graphql
              </button>
            </div>
            <label className="tool-label" htmlFor="gql-output">
              {mode === "minify" ? "Minified GraphQL" : "Formatted GraphQL"}
            </label>
            <pre className="tool-output" id="gql-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Paste a GraphQL query, mutation, fragment, or schema above to format
          it. Beautify re-indents with proper line breaks; minify strips
          comments and collapses it to a single compact line. Everything runs in
          your browser and nothing is uploaded.
        </p>
      ) : null}
    </div>
  );
}
