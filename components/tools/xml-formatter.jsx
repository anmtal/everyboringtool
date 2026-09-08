"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE =
  '<?xml version="1.0" encoding="UTF-8"?><note importance="high"><to>Team</to><from>Ada</from><!-- reminder --><body>Ship the <b>release</b> today.</body><tags><tag>work</tag><tag>urgent</tag></tags></note>';

const INDENTS = {
  "2": { label: "2 spaces", unit: "  " },
  "4": { label: "4 spaces", unit: "    " },
  tab: { label: "Tab", unit: "\t" },
};

function lineOf(xml, pos) {
  let line = 1;
  for (let i = 0; i < pos && i < xml.length; i++) {
    if (xml[i] === "\n") line++;
  }
  return line;
}

// Break XML into a flat list of tokens, preserving comments, CDATA,
// processing instructions, DOCTYPE, tags and text exactly as written.
// Throws { message } (with a line number) on malformed markup.
function tokenize(xml) {
  const tokens = [];
  const n = xml.length;
  let i = 0;

  while (i < n) {
    if (xml[i] === "<") {
      if (xml.startsWith("<!--", i)) {
        const end = xml.indexOf("-->", i + 4);
        if (end === -1)
          throw { message: `Unterminated comment (line ${lineOf(xml, i)}).` };
        tokens.push({ type: "comment", text: xml.slice(i, end + 3) });
        i = end + 3;
      } else if (xml.startsWith("<![CDATA[", i)) {
        const end = xml.indexOf("]]>", i + 9);
        if (end === -1)
          throw {
            message: `Unterminated CDATA section (line ${lineOf(xml, i)}).`,
          };
        tokens.push({ type: "cdata", text: xml.slice(i, end + 3) });
        i = end + 3;
      } else if (xml.startsWith("<?", i)) {
        const end = xml.indexOf("?>", i + 2);
        if (end === -1)
          throw {
            message: `Unterminated processing instruction (line ${lineOf(
              xml,
              i
            )}).`,
          };
        tokens.push({ type: "pi", text: xml.slice(i, end + 2) });
        i = end + 2;
      } else if (xml.startsWith("<!", i)) {
        // DOCTYPE / declaration — allow an internal subset in [ ... ].
        let j = i + 2;
        let depth = 0;
        while (j < n) {
          const c = xml[j];
          if (c === "[") depth++;
          else if (c === "]") depth--;
          else if (c === ">" && depth <= 0) break;
          j++;
        }
        if (j >= n)
          throw {
            message: `Unterminated declaration (line ${lineOf(xml, i)}).`,
          };
        tokens.push({ type: "decl", text: xml.slice(i, j + 1) });
        i = j + 1;
      } else if (xml[i + 1] === "/") {
        const end = xml.indexOf(">", i);
        if (end === -1)
          throw {
            message: `Unterminated closing tag (line ${lineOf(xml, i)}).`,
          };
        const raw = xml.slice(i, end + 1);
        const name = raw.slice(2, -1).trim();
        if (!name)
          throw {
            message: `Empty closing tag </> (line ${lineOf(xml, i)}).`,
          };
        tokens.push({ type: "close", name, text: raw });
        i = end + 1;
      } else {
        // Opening or self-closing tag. Find the closing '>' that is not
        // inside a quoted attribute value.
        let j = i + 1;
        let quote = null;
        while (j < n) {
          const c = xml[j];
          if (quote) {
            if (c === quote) quote = null;
          } else if (c === '"' || c === "'") {
            quote = c;
          } else if (c === ">") {
            break;
          }
          j++;
        }
        if (j >= n)
          throw { message: `Unterminated tag (line ${lineOf(xml, i)}).` };
        const raw = xml.slice(i, j + 1);
        const selfClose = /\/\s*>$/.test(raw);
        const inner = raw.slice(1, selfClose ? raw.lastIndexOf("/") : -1).trim();
        const m = inner.match(/^[^\s/>]+/);
        const name = m ? m[0] : "";
        if (!name)
          throw { message: `Tag with no name (line ${lineOf(xml, i)}).` };
        tokens.push({ type: selfClose ? "selfclose" : "open", name, text: raw });
        i = j + 1;
      }
    } else {
      const next = xml.indexOf("<", i);
      const end = next === -1 ? n : next;
      tokens.push({ type: "text", text: xml.slice(i, end) });
      i = end;
    }
  }

  return tokens;
}

// Check that every open tag has a correctly nested matching close tag.
function validate(tokens) {
  const stack = [];
  for (const t of tokens) {
    if (t.type === "open") stack.push(t.name);
    else if (t.type === "close") {
      if (stack.length === 0)
        return `Unexpected closing tag </${t.name}> with no matching open tag.`;
      const top = stack.pop();
      if (top !== t.name)
        return `Mismatched tag: expected </${top}> but found </${t.name}>.`;
    }
  }
  if (stack.length > 0) return `Unclosed tag <${stack[stack.length - 1]}>.`;
  return "";
}

function beautify(tokens, unit) {
  const lines = [];
  let depth = 0;
  const pad = (d) => unit.repeat(Math.max(0, d));

  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];

    if (t.type === "text") {
      const trimmed = t.text.trim();
      if (trimmed === "") continue; // whitespace-only between tags
      lines.push(pad(depth) + trimmed);
      continue;
    }

    if (t.type === "open") {
      // Keep an element with only text content on one line:
      // <name>text</name>
      let j = k + 1;
      const parts = [];
      while (j < tokens.length && tokens[j].type === "text") {
        parts.push(tokens[j].text);
        j++;
      }
      if (
        tokens[j] &&
        tokens[j].type === "close" &&
        tokens[j].name === t.name
      ) {
        const content = parts.join("").trim();
        lines.push(pad(depth) + t.text + content + tokens[j].text);
        k = j;
        continue;
      }
      lines.push(pad(depth) + t.text);
      depth++;
      continue;
    }

    if (t.type === "close") {
      depth = Math.max(0, depth - 1);
      lines.push(pad(depth) + t.text);
      continue;
    }

    // selfclose, comment, cdata, pi, decl
    lines.push(pad(depth) + t.text);
  }

  return lines.join("\n");
}

function minify(tokens) {
  let out = "";
  for (const t of tokens) {
    if (t.type === "text") {
      const trimmed = t.text.trim();
      if (trimmed === "") continue;
      out += trimmed;
    } else {
      out += t.text;
    }
  }
  return out;
}

export default function XmlFormatter() {
  const [input, setInput] = useState(EXAMPLE);
  const [mode, setMode] = useState("beautify");
  const [indentKey, setIndentKey] = useState("2");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", error: "", elements: 0, valid: false, lines: 0 };
    }
    let tokens;
    try {
      tokens = tokenize(input);
    } catch (e) {
      return {
        output: "",
        error: e && e.message ? e.message : "Could not parse the XML.",
        elements: 0,
        valid: false,
        lines: 0,
      };
    }

    const validationError = validate(tokens);
    const elements = tokens.filter(
      (t) => t.type === "open" || t.type === "selfclose"
    ).length;

    if (validationError) {
      return {
        output: "",
        error: validationError,
        elements,
        valid: false,
        lines: 0,
      };
    }

    const output =
      mode === "minify"
        ? minify(tokens)
        : beautify(tokens, INDENTS[indentKey].unit);

    return {
      output,
      error: "",
      elements,
      valid: true,
      lines: output ? output.split("\n").length : 0,
    };
  }, [input, mode, indentKey]);

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  function handleExample() {
    setInput(EXAMPLE);
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
      type: "application/xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.xml";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="xml-input">
            XML input
          </label>
          <textarea
            className="tool-textarea"
            id="xml-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={'<root><item id="1">Hello</item></root>'}
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="xml-mode">
              Output
            </label>
            <select
              className="tool-select"
              id="xml-mode"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setCopied(false);
              }}
            >
              <option value="beautify">Beautify (pretty-print)</option>
              <option value="minify">Minify (single line)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="xml-indent">
              Indent
            </label>
            <select
              className="tool-select"
              id="xml-indent"
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
        <button className="btn" type="button" onClick={handleExample}>
          Load example
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.error ? (
        <p className="tool-error" role="status" aria-live="polite">
          {result.error}
        </p>
      ) : null}

      {result.output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">Valid</div>
              <div className="tool-stat-label">Well-formed</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.elements.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Elements</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.lines.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Lines</div>
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
                Download .xml
              </button>
            </div>
            <label className="tool-label" htmlFor="xml-output">
              {mode === "minify" ? "Minified XML" : "Formatted XML"}
            </label>
            <pre className="tool-output" id="xml-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Paste XML above to pretty-print or minify it. The formatter re-indents
          nested tags and reports whether the document is well-formed
          (mismatched or unclosed tags are flagged). Comments, CDATA sections,
          processing instructions and DOCTYPE declarations are preserved.
          Everything runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
