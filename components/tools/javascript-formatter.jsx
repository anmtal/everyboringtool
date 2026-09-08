"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Keywords after which a "/" begins a regex literal, not division.
const REGEX_KEYWORDS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "do", "else",
  "delete", "void", "throw", "case", "yield", "await",
]);

// Characters after which a "/" begins a regex literal.
const REGEX_PREV_CHARS = new Set(
  "(,=:[!&|?{};+-*/%<>~^".split("")
);

// Look at what has been emitted so far to decide if a "/" is a regex.
function prevContext(out) {
  const t = out.replace(/\s+$/, "");
  const ch = t.length ? t[t.length - 1] : "";
  const wm = t.match(/[A-Za-z0-9_$]+$/);
  return { ch, word: wm ? wm[0] : "" };
}

function regexAllowed(out) {
  const { ch, word } = prevContext(out);
  if (word) return REGEX_KEYWORDS.has(word);
  if (ch === "") return true;
  return REGEX_PREV_CHARS.has(ch);
}

// --- Literal / comment readers -------------------------------------------
// Each returns the index of the first character AFTER the literal.

function readString(s, i, quote) {
  const len = s.length;
  let j = i + 1;
  while (j < len) {
    const c = s[j];
    if (c === "\\") { j += 2; continue; }
    if (c === quote) return j + 1;
    if (c === "\n") return j; // unterminated single-line string
    j += 1;
  }
  return len;
}

function readTemplate(s, i) {
  const len = s.length;
  let j = i + 1;
  let depth = 0; // inside ${ ... }
  while (j < len) {
    const c = s[j];
    if (c === "\\") { j += 2; continue; }
    if (depth === 0) {
      if (c === "`") return j + 1;
      if (c === "$" && s[j + 1] === "{") { depth = 1; j += 2; continue; }
      j += 1;
    } else {
      if (c === "{") { depth += 1; j += 1; continue; }
      if (c === "}") { depth -= 1; j += 1; continue; }
      if (c === "`") { j = readTemplate(s, j); continue; }
      if (c === '"' || c === "'") { j = readString(s, j, c); continue; }
      j += 1;
    }
  }
  return len;
}

function readLineComment(s, i) {
  const len = s.length;
  let j = i + 2;
  while (j < len && s[j] !== "\n") j += 1;
  return j;
}

function readBlockComment(s, i) {
  const len = s.length;
  let j = i + 2;
  while (j < len && !(s[j] === "*" && s[j + 1] === "/")) j += 1;
  return j < len ? j + 2 : len;
}

function readRegex(s, i) {
  const len = s.length;
  let j = i + 1;
  let inClass = false;
  while (j < len) {
    const c = s[j];
    if (c === "\\") { j += 2; continue; }
    if (c === "\n") return j; // not a real regex; bail
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      j += 1;
      while (j < len && /[a-z]/i.test(s[j])) j += 1; // flags
      return j;
    }
    j += 1;
  }
  return len;
}

// Peek the next non-space, non-newline source character (skips comments too).
function peekNext(s, i) {
  const len = s.length;
  let j = i;
  while (j < len) {
    const c = s[j];
    if (c === " " || c === "\t" || c === "\r" || c === "\n") { j += 1; continue; }
    if (c === "/" && s[j + 1] === "/") { j = readLineComment(s, j); continue; }
    if (c === "/" && s[j + 1] === "*") { j = readBlockComment(s, j); continue; }
    return c;
  }
  return "";
}

function peekWord(s, i) {
  const len = s.length;
  let j = i;
  while (j < len && (s[j] === " " || s[j] === "\t" || s[j] === "\r" || s[j] === "\n")) j += 1;
  const m = s.slice(j, j + 12).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
  return m ? m[0] : "";
}

const CONTINUATION = new Set(["else", "catch", "finally", "while"]);

// Keywords after which a "{" opens an object literal (a value), not a block.
const OBJ_WORDS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
  "throw", "case", "yield", "await", "default",
]);

// Decide whether a "{" begins an object literal (value position) or a block.
function braceIsObject(out) {
  const { ch, word } = prevContext(out);
  if (word) return OBJ_WORDS.has(word);
  return "=([,:?|&".includes(ch);
}

// Control keywords that read better with a space before their "(".
const KW_PAREN = new Set([
  "if", "for", "while", "switch", "catch", "return", "do",
]);

// Keywords that should keep a space before a following value (string, regex,
// template) even when the minified source removed it, e.g. return"x".
const KW_VALUE = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
  "throw", "case", "yield", "await", "else", "do",
]);

// --- Beautifier -----------------------------------------------------------

function beautify(src, indentUnit) {
  const s = src;
  const len = s.length;
  let out = "";
  let indent = 0;
  let pendingSpace = false;
  let atLineStart = true;
  const stack = []; // "{", "[", "("
  const objStack = []; // per-"{" : { obj: boolean, sawColon: boolean }

  const topFrame = () => objStack[objStack.length - 1];
  const topIsObjectBrace = () => {
    const f = topFrame();
    return stack[stack.length - 1] === "{" && f && f.obj === true;
  };

  const pad = () => indentUnit.repeat(Math.max(0, indent));

  // Keep a space between a keyword and a following literal (return "x").
  function maybeKwSpace() {
    const { ch, word } = prevContext(out);
    if (/[A-Za-z0-9_$]/.test(ch) && KW_VALUE.has(word) && !atLineStart) {
      pendingSpace = true;
    }
  }

  function newline() {
    out = out.replace(/[ \t]+$/, "");
    out += "\n" + pad();
    atLineStart = true;
    pendingSpace = false;
  }

  function push(text) {
    if (pendingSpace && !atLineStart) out += " ";
    pendingSpace = false;
    atLineStart = false;
    out += text;
  }

  let i = 0;
  while (i < len) {
    const c = s[i];

    // Whitespace: remember that a space may be needed, but emit none yet.
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      if (!atLineStart) pendingSpace = true;
      i += 1;
      continue;
    }

    // Comments
    if (c === "/" && s[i + 1] === "/") {
      const end = readLineComment(s, i);
      push(s.slice(i, end));
      newline();
      i = end;
      continue;
    }
    if (c === "/" && s[i + 1] === "*") {
      const end = readBlockComment(s, i);
      push(s.slice(i, end));
      pendingSpace = true;
      i = end;
      continue;
    }

    // Regex literal
    if (c === "/" && regexAllowed(out)) {
      const end = readRegex(s, i);
      maybeKwSpace();
      push(s.slice(i, end));
      i = end;
      continue;
    }

    // Strings
    if (c === '"' || c === "'") {
      const end = readString(s, i, c);
      maybeKwSpace();
      push(s.slice(i, end));
      i = end;
      continue;
    }
    if (c === "`") {
      const end = readTemplate(s, i);
      maybeKwSpace();
      push(s.slice(i, end));
      i = end;
      continue;
    }

    // Structural punctuation
    if (c === "{") {
      const isObj = braceIsObject(out);
      const before = out.replace(/[ \t\n]+$/, "");
      const lastCh = before.length ? before[before.length - 1] : "";
      if (!atLineStart && lastCh && !"([{".includes(lastCh)) {
        if (pendingSpace) { out += " "; pendingSpace = false; }
        else out += " ";
        atLineStart = false;
      } else {
        push("");
      }
      out += "{";
      atLineStart = false;
      pendingSpace = false;
      stack.push("{");
      objStack.push({ obj: isObj, sawColon: false });
      indent += 1;
      // Empty block? collapse on the same line.
      if (peekNext(s, i + 1) === "}") {
        // find and consume the closing brace
        let j = i + 1;
        while (j < len && s[j] !== "}") j += 1;
        indent -= 1;
        stack.pop();
        objStack.pop();
        out += "}";
        pendingSpace = true;
        i = j + 1;
        continue;
      }
      newline();
      i += 1;
      continue;
    }

    if (c === "}") {
      indent = Math.max(0, indent - 1);
      if (stack[stack.length - 1] === "{") { stack.pop(); objStack.pop(); }
      const trimmed = out.replace(/[ \t\n]+$/, "");
      if (trimmed.endsWith("{")) {
        out = trimmed + "}";
      } else {
        newline();
        out += "}";
      }
      atLineStart = false;
      pendingSpace = false;
      i += 1;
      // Decide whether to break the line after the closing brace.
      const nc = peekNext(s, i);
      const nw = peekWord(s, i);
      if (nc === "" ) { /* end of input */ }
      else if (CONTINUATION.has(nw)) {
        pendingSpace = true; // } else, } catch, } while
      } else if (")]},;.:".includes(nc)) {
        // Trailing punctuation hugs the brace: }; }, }) }.foo
      } else {
        newline();
      }
      continue;
    }

    if (c === "[") { push("["); stack.push("["); i += 1; continue; }
    if (c === "]") {
      if (stack[stack.length - 1] === "[") stack.pop();
      push("]");
      i += 1;
      continue;
    }
    if (c === "(") {
      const { word } = prevContext(out);
      if (KW_PAREN.has(word) && !atLineStart) {
        out = out.replace(/[ \t]+$/, "") + " ";
        pendingSpace = false;
      }
      push("(");
      stack.push("(");
      i += 1;
      continue;
    }
    if (c === ")") {
      if (stack[stack.length - 1] === "(") stack.pop();
      push(")");
      i += 1;
      continue;
    }

    if (c === ";") {
      if (stack[stack.length - 1] === "(") {
        // Inside for(...) — keep on the same line.
        push(";");
        pendingSpace = true;
      } else {
        push(";");
        if (peekNext(s, i + 1) !== "") newline();
      }
      i += 1;
      continue;
    }

    if (c === ",") {
      push(",");
      if (topIsObjectBrace()) {
        topFrame().sawColon = false; // next key starts a fresh property
        newline();
      } else {
        pendingSpace = true;
      }
      i += 1;
      continue;
    }

    if (c === ":") {
      push(":");
      if (topIsObjectBrace()) {
        const f = topFrame();
        if (!f.sawColon) {
          // First colon after a key is the property separator.
          f.sawColon = true;
          pendingSpace = true;
        }
        // Later colons at this level belong to a ternary; leave them as-is.
      }
      i += 1;
      continue;
    }

    // Any other character: emit as-is.
    push(c);
    i += 1;
  }

  return out.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

// --- Minifier (conservative) ---------------------------------------------

function minify(src) {
  const s = src;
  const len = s.length;
  const parts = []; // { lit: boolean, text }
  let code = "";
  let i = 0;

  const flush = () => {
    if (code) { parts.push({ lit: false, text: code }); code = ""; }
  };

  while (i < len) {
    const c = s[i];
    if (c === "/" && s[i + 1] === "/") { i = readLineComment(s, i); continue; }
    if (c === "/" && s[i + 1] === "*") { i = readBlockComment(s, i); continue; }
    if (c === '"' || c === "'") {
      const end = readString(s, i, c);
      flush();
      parts.push({ lit: true, text: s.slice(i, end) });
      i = end;
      continue;
    }
    if (c === "`") {
      const end = readTemplate(s, i);
      flush();
      parts.push({ lit: true, text: s.slice(i, end) });
      i = end;
      continue;
    }
    if (c === "/" && regexAllowed(code)) {
      const end = readRegex(s, i);
      flush();
      parts.push({ lit: true, text: s.slice(i, end) });
      i = end;
      continue;
    }
    code += c;
    i += 1;
  }
  flush();

  return parts
    .map((p) => {
      if (p.lit) return p.text;
      let t = p.text.replace(/\s+/g, " ");
      t = t.replace(/\s*([{}()\[\];,:])\s*/g, "$1");
      return t;
    })
    .join("")
    .trim();
}

function countLines(str) {
  if (!str) return 0;
  return str.split("\n").length;
}

const SAMPLE =
  'function greet(name,greeting){if(!name){return"Hello, world!"}' +
  'const parts=[greeting||"Hi",name];const message=parts.join(", ")+"!";' +
  "for(let i=0;i<3;i++){console.log(message)}" +
  "return{message:message,length:message.length}}";

export default function JavascriptFormatter() {
  const [input, setInput] = useState(SAMPLE);
  const [indent, setIndent] = useState("2");
  const [copied, setCopied] = useState(false);

  const indentUnit = indent === "tab" ? "\t" : " ".repeat(Number(indent));

  const result = useMemo(() => {
    if (!input.trim()) return { output: "", ok: true };
    try {
      return { output: beautify(input, indentUnit), ok: true };
    } catch (e) {
      return { output: "", ok: false };
    }
  }, [input, indentUnit]);

  const minified = useMemo(() => {
    if (!input.trim()) return "";
    try {
      return minify(input);
    } catch (e) {
      return "";
    }
  }, [input]);

  function handleInput(e) {
    setInput(e.target.value);
    setCopied(false);
  }

  function handleClear() {
    setInput("");
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
    const blob = new Blob([result.output], {
      type: "text/javascript;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.js";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleMinify() {
    if (!minified) return;
    setInput(minified);
    setCopied(false);
  }

  const outBytes = result.output.length;
  const inBytes = input.length;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="js-indent">
              Indent size
            </label>
            <select
              id="js-indent"
              className="tool-select"
              value={indent}
              onChange={(e) => setIndent(e.target.value)}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tabs</option>
            </select>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="js-input">
            JavaScript to format
          </label>
          <textarea
            id="js-input"
            className="tool-textarea"
            value={input}
            onChange={handleInput}
            placeholder="Paste minified or messy JavaScript here..."
            rows={10}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleMinify}>
          Minify instead
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {input.trim() && !result.ok ? (
        <p className="tool-error" role="status" aria-live="polite">
          Could not format this input. Check for unmatched brackets or quotes.
        </p>
      ) : null}

      {result.output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{countLines(result.output)}</div>
              <div className="tool-stat-label">Lines out</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {inBytes.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Input chars</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {outBytes.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Output chars</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy formatted code"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .js
              </button>
            </div>
            <label className="tool-label" htmlFor="js-output">
              Formatted JavaScript
            </label>
            <pre className="tool-output" id="js-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Paste minified or poorly indented JavaScript above to beautify it with
          clean line breaks and indentation. Strings, template literals, regular
          expressions, and comments are preserved exactly. Everything runs
          locally in your browser, so your code never leaves your device.
        </p>
      )}
    </div>
  );
}
