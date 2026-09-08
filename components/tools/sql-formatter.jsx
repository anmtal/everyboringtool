"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Top-level clause keywords that begin a new line at the base indent level.
const NEWLINE_KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "FETCH",
  "UNION",
  "UNION ALL",
  "INTERSECT",
  "EXCEPT",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "RETURNING",
  "WITH",
]);

// JOIN-family keywords each start a new line, one step in from the clause.
const JOIN_KEYWORDS = new Set([
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "LEFT OUTER JOIN",
  "RIGHT OUTER JOIN",
  "FULL OUTER JOIN",
  "CROSS JOIN",
  "ON",
]);

// Boolean connectors that break onto a new indented line inside WHERE / ON.
const BOOL_KEYWORDS = new Set(["AND", "OR"]);

// Reserved words that are function names: they hug their "(" like count(x),
// even though they are also recognized keywords for casing.
const FUNCTIONS = new Set([
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "CAST", "ROW_NUMBER",
  "RANK", "DENSE_RANK", "NULLIF", "GREATEST", "LEAST", "ROUND", "ABS",
  "LENGTH", "LOWER", "UPPER", "TRIM", "SUBSTRING", "CONCAT", "NOW",
]);

// Words recognised as reserved for case handling.
const RESERVED = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "IS", "NULL", "AS",
  "ON", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "USING",
  "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET", "FETCH", "NEXT",
  "ROWS", "ONLY", "UNION", "ALL", "INTERSECT", "EXCEPT", "DISTINCT",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "RETURNING",
  "WITH", "CASE", "WHEN", "THEN", "ELSE", "END", "LIKE", "ILIKE", "BETWEEN",
  "EXISTS", "ASC", "DESC", "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE",
  "CAST", "CREATE", "TABLE", "PRIMARY", "KEY", "FOREIGN", "REFERENCES",
  "DEFAULT", "UNIQUE", "INDEX", "VIEW", "DROP", "ALTER", "ADD", "COLUMN",
  "INT", "INTEGER", "VARCHAR", "TEXT", "BOOLEAN", "DATE", "TIMESTAMP",
  "NUMERIC", "DECIMAL", "TRUE", "FALSE", "IF", "TRUNCATE", "OVER",
  "PARTITION", "ROW_NUMBER", "RANK", "DENSE_RANK", "TO",
]);

// Multi-word keyword phrases, longest first so the longest match wins.
const PHRASES = [
  "LEFT OUTER JOIN",
  "RIGHT OUTER JOIN",
  "FULL OUTER JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "CROSS JOIN",
  "UNION ALL",
  "GROUP BY",
  "ORDER BY",
  "INSERT INTO",
  "DELETE FROM",
  "IS NOT",
  "NOT IN",
  "NOT NULL",
  "NOT LIKE",
];

// Tokenize SQL, keeping strings, comments and identifiers intact so
// formatting never rewrites the inside of a literal.
function tokenize(sql) {
  const tokens = [];
  const len = sql.length;
  let i = 0;

  while (i < len) {
    const c = sql[i];
    const next = sql[i + 1];

    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < len && /\s/.test(sql[j])) j += 1;
      tokens.push({ type: "ws", value: " " });
      i = j;
      continue;
    }

    // Line comment: -- ... to end of line.
    if (c === "-" && next === "-") {
      let j = i + 2;
      while (j < len && sql[j] !== "\n") j += 1;
      tokens.push({ type: "comment", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Block comment.
    if (c === "/" && next === "*") {
      let j = i + 2;
      while (j < len && !(sql[j] === "*" && sql[j + 1] === "/")) j += 1;
      j = j < len ? j + 2 : len;
      tokens.push({ type: "blockcomment", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Strings and quoted identifiers, honoring doubled-quote escapes.
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      let value = c;
      while (j < len) {
        const cc = sql[j];
        value += cc;
        if (cc === c) {
          if (sql[j + 1] === c) {
            value += c;
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push({ type: "string", value });
      i = j;
      continue;
    }

    // Structural punctuation.
    if (c === "(" || c === ")" || c === "," || c === ";") {
      tokens.push({ type: c, value: c });
      i += 1;
      continue;
    }

    // Operators, grouping two-char forms like <=, >=, <>, !=, ||.
    if ("=<>!+-*/%|".includes(c)) {
      let op = c;
      if ("<>=!|".includes(c) && next && "=<>|".includes(next)) {
        op += next;
        i += 2;
      } else {
        i += 1;
      }
      tokens.push({ type: "operator", value: op });
      continue;
    }

    // Word: identifier, keyword, number, or qualified name (schema.table).
    if (/[A-Za-z0-9_$.]/.test(c)) {
      let j = i + 1;
      while (j < len && /[A-Za-z0-9_$.]/.test(sql[j])) j += 1;
      tokens.push({ type: "word", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    tokens.push({ type: "other", value: c });
    i += 1;
  }

  return tokens;
}

// Merge adjacent word tokens into known multi-word keyword phrases.
function mergePhrases(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "word") {
      let matched = null;
      for (const phrase of PHRASES) {
        const parts = phrase.split(" ");
        const collected = [];
        let k = i;
        let ok = true;
        for (let p = 0; p < parts.length; p += 1) {
          while (k < tokens.length && tokens[k].type === "ws") k += 1;
          if (
            k < tokens.length &&
            tokens[k].type === "word" &&
            tokens[k].value.toUpperCase() === parts[p]
          ) {
            collected.push(k);
            k += 1;
          } else {
            ok = false;
            break;
          }
        }
        if (ok) {
          matched = { phrase, endIndex: collected[collected.length - 1] + 1 };
          break;
        }
      }
      if (matched) {
        out.push({ type: "keyword", value: matched.phrase });
        i = matched.endIndex;
        continue;
      }
    }
    out.push(tok);
    i += 1;
  }
  return out;
}

function applyCase(word, keywordCase) {
  const upper = word.toUpperCase();
  if (!RESERVED.has(upper)) return word;
  if (keywordCase === "upper") return upper;
  if (keywordCase === "lower") return word.toLowerCase();
  return word;
}

function applyPhraseCase(phrase, keywordCase) {
  if (keywordCase === "upper") return phrase.toUpperCase();
  if (keywordCase === "lower") return phrase.toLowerCase();
  return phrase;
}

function format(sql, options) {
  const { keywordCase, indent } = options;
  const tokens = mergePhrases(tokenize(sql)).filter((t) => t.type !== "ws");

  // Build a list of { depth, text } lines, then render at the end.
  const lines = [];
  let depth = 0; // subquery nesting depth
  let cur = { depth: 0, text: "" };
  const parenStack = []; // "sub" for subquery parens, "call" otherwise

  const rtrim = (s) => s.replace(/\s+$/, "");

  const commit = () => {
    if (cur.text.trim().length) {
      lines.push({ depth: cur.depth, text: rtrim(cur.text) });
    }
    cur = { depth: cur.depth, text: "" };
  };
  const newline = (d) => {
    commit();
    cur = { depth: d, text: "" };
  };

  for (let idx = 0; idx < tokens.length; idx += 1) {
    const tok = tokens[idx];
    const prevTok = tokens[idx - 1];
    const nextTok = tokens[idx + 1];
    const val = tok.value;
    const upper = typeof val === "string" ? val.toUpperCase() : "";

    if (tok.type === "comment" || tok.type === "blockcomment") {
      commit();
      lines.push({ depth, text: val });
      cur = { depth, text: "" };
      continue;
    }

    if (tok.type === ";") {
      cur.text = rtrim(cur.text) + ";";
      commit();
      lines.push({ blank: true });
      depth = 0;
      cur = { depth: 0, text: "" };
      continue;
    }

    if (tok.type === "(") {
      const following = nextTok ? nextTok.value.toUpperCase() : "";
      const isSubquery = following === "SELECT" || following === "WITH";
      if (isSubquery) {
        cur.text = cur.text.trim() ? rtrim(cur.text) + " (" : "(";
        parenStack.push("sub");
        depth += 1;
        newline(depth);
      } else {
        // Function call: an identifier (not a reserved word) directly before
        // "(" hugs the paren, e.g. count(x). Keywords like VALUES / IN keep a
        // space before the paren.
        const prevUpper =
          prevTok && prevTok.type === "word"
            ? prevTok.value.toUpperCase()
            : "";
        const isCall =
          prevTok &&
          prevTok.type === "word" &&
          (!RESERVED.has(prevUpper) || FUNCTIONS.has(prevUpper));
        cur.text = isCall ? rtrim(cur.text) + "(" : cur.text + "(";
        parenStack.push("call");
      }
      continue;
    }

    if (tok.type === ")") {
      const kind = parenStack.pop();
      if (kind === "sub") {
        depth = Math.max(0, depth - 1);
        newline(depth);
        cur.text = ") ";
      } else {
        cur.text = rtrim(cur.text) + ") ";
      }
      continue;
    }

    if (tok.type === ",") {
      cur.text = rtrim(cur.text) + ",";
      const top = parenStack[parenStack.length - 1];
      if (top === "call") {
        cur.text += " ";
      } else {
        newline(depth + 1);
      }
      continue;
    }

    if (tok.type === "keyword" || tok.type === "word") {
      const cased =
        tok.type === "keyword"
          ? applyPhraseCase(val, keywordCase)
          : applyCase(val, keywordCase);

      const inSubOrTop =
        parenStack.length === 0 ||
        parenStack[parenStack.length - 1] === "sub";
      if (inSubOrTop && NEWLINE_KEYWORDS.has(upper)) {
        newline(depth);
        cur.text = cased + " ";
        continue;
      }
      if (JOIN_KEYWORDS.has(upper)) {
        newline(depth + 1);
        cur.text = cased + " ";
        continue;
      }
      if (BOOL_KEYWORDS.has(upper)) {
        newline(depth + 1);
        cur.text = cased + " ";
        continue;
      }
      cur.text += cased + " ";
      continue;
    }

    if (tok.type === "operator") {
      cur.text = rtrim(cur.text) + " " + val + " ";
      continue;
    }

    // string / other
    cur.text += val + " ";
  }

  commit();

  const rendered = lines
    .map((l) =>
      l.blank ? "" : indent.repeat(Math.max(0, l.depth)) + rtrim(l.text)
    )
    .join("\n");

  return rendered
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const EXAMPLE =
  "select u.id, u.name, count(o.id) as order_count from users u " +
  "left join orders o on o.user_id = u.id " +
  "where u.active = true and u.created_at > '2024-01-01' " +
  "group by u.id, u.name having count(o.id) > 3 order by order_count desc limit 10;";

const INDENT_OPTIONS = {
  "2 spaces": "  ",
  "4 spaces": "    ",
  Tab: "\t",
};

export default function SqlFormatter() {
  const [input, setInput] = useState(EXAMPLE);
  const [keywordCase, setKeywordCase] = useState("upper");
  const [indentLabel, setIndentLabel] = useState("2 spaces");
  const [copied, setCopied] = useState(false);

  const error = useMemo(() => {
    if (!input.trim()) return "";
    const toks = tokenize(input);
    let bal = 0;
    for (const t of toks) {
      if (t.type === "(") bal += 1;
      if (t.type === ")") bal -= 1;
      if (bal < 0) return "Unbalanced parentheses: a ) has no matching (.";
    }
    if (bal > 0) return "Unbalanced parentheses: a ( is never closed.";
    return "";
  }, [input]);

  const output = useMemo(() => {
    if (!input.trim()) return "";
    try {
      return format(input, {
        keywordCase,
        indent: INDENT_OPTIONS[indentLabel] || "  ",
      });
    } catch (e) {
      return "";
    }
  }, [input, keywordCase, indentLabel]);

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.sql";
    a.click();
    URL.revokeObjectURL(url);
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
          <label className="tool-label" htmlFor="sql-input">
            SQL query
          </label>
          <textarea
            id="sql-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder="Paste your SQL query here..."
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sql-case">
              Keyword case
            </label>
            <select
              id="sql-case"
              className="tool-select"
              value={keywordCase}
              onChange={(e) => setKeywordCase(e.target.value)}
            >
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="preserve">Preserve</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sql-indent">
              Indentation
            </label>
            <select
              id="sql-indent"
              className="tool-select"
              value={indentLabel}
              onChange={(e) => setIndentLabel(e.target.value)}
            >
              {Object.keys(INDENT_OPTIONS).map((k) => (
                <option key={k} value={k}>
                  {k}
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

      {error ? <p className="tool-error">{error}</p> : null}

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy SQL"}
            </button>
            <button className="btn" type="button" onClick={handleDownload}>
              Download .sql
            </button>
          </div>
          <label className="tool-label" htmlFor="sql-output">
            Formatted SQL
          </label>
          <pre
            className="tool-output"
            id="sql-output"
            role="status"
            aria-live="polite"
          >
            {output}
          </pre>
        </div>
      ) : (
        <p className="tool-note">
          Paste a SQL query above to beautify it. Clauses like SELECT, FROM,
          WHERE and JOIN move to their own lines, columns break after commas,
          and keywords are cased to your choice. Strings, quoted identifiers and
          comments are preserved exactly. Everything runs in your browser.
        </p>
      )}
    </div>
  );
}
