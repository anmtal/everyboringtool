"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Each detector: a regex plus a label + placeholder token.
// Order matters — more specific patterns run first so a credit card
// is not partially eaten by the phone-number matcher, etc.
const DETECTORS = [
  {
    key: "email",
    label: "Email addresses",
    token: "EMAIL",
    // Standard-ish email; deliberately conservative.
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    key: "creditCard",
    label: "Credit card numbers",
    token: "CREDIT_CARD",
    // 13–16 digits with optional spaces or dashes as separators.
    regex: /\b(?:\d[ -]?){13,16}\b/g,
    // Extra guard: only redact if it passes the Luhn checksum.
    validate: (m) => luhnValid(m.replace(/[^\d]/g, "")),
  },
  {
    key: "ssn",
    label: "US Social Security numbers",
    token: "SSN",
    // 3-2-4 with dashes or spaces (not a bare 9-digit run — too noisy).
    regex: /\b\d{3}[ -]\d{2}[ -]\d{4}\b/g,
  },
  {
    key: "phone",
    label: "Phone numbers",
    token: "PHONE",
    // Handles +1, parens, dots, dashes, spaces. 10+ digits total.
    regex:
      /(?:\+?\d{1,3}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}\b/g,
  },
  {
    key: "ipv4",
    label: "IPv4 addresses",
    token: "IP_ADDRESS",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  },
  {
    key: "ipMac",
    label: "MAC addresses",
    token: "MAC_ADDRESS",
    // Runs before IPv6 — a MAC (6 hex pairs) also fits the IPv6 shape,
    // so the more specific detector must win on a tie.
    regex: /\b(?:[A-Fa-f0-9]{2}[:-]){5}[A-Fa-f0-9]{2}\b/g,
  },
  {
    key: "ipv6",
    label: "IPv6 addresses",
    token: "IPV6_ADDRESS",
    regex: /\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b/g,
  },
  {
    key: "url",
    label: "URLs",
    token: "URL",
    regex: /\bhttps?:\/\/[^\s<>"')]+/gi,
  },
  {
    key: "date",
    label: "Dates (MM/DD/YYYY etc.)",
    token: "DATE",
    regex: /\b\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}\b/g,
  },
];

function luhnValid(digits) {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const SAMPLE = `Hi team, please reach out to Jane at jane.doe@example.com or call
(415) 555-0132. Her backup line is +1 212.555.0199.

Account note: card 4111 1111 1111 1111 was declined; SSN on file is
123-45-6789. Server logged the request from 192.168.1.42 (mac
00:1B:44:11:3A:B7) on 09/07/2026. Docs live at https://internal.example.com/report.`;

const REPLACE_MODES = [
  { value: "token", label: "Labeled token — [EMAIL], [PHONE], …" },
  { value: "block", label: "Block characters — ████" },
  { value: "mask", label: "Mask with asterisks — keep length" },
  { value: "remove", label: "Remove entirely" },
];

export default function PiiScrubber() {
  const [input, setInput] = useState(SAMPLE);
  const [mode, setMode] = useState("token");
  const [enabled, setEnabled] = useState(() => {
    const init = {};
    DETECTORS.forEach((d) => {
      // Dates and URLs off by default — often not sensitive and noisy.
      init[d.key] = d.key !== "date" && d.key !== "url";
    });
    return init;
  });
  const [copied, setCopied] = useState(false);

  const { output, counts, total } = useMemo(() => {
    const counts = {};
    DETECTORS.forEach((d) => (counts[d.key] = 0));

    if (!input) {
      return { output: "", counts, total: 0 };
    }

    // Collect every match across all enabled detectors, then apply
    // non-overlapping replacements from left to right. This avoids one
    // detector clobbering another's span.
    const matches = [];
    for (const det of DETECTORS) {
      if (!enabled[det.key]) continue;
      const re = new RegExp(det.regex.source, det.regex.flags);
      let m;
      while ((m = re.exec(input)) !== null) {
        const value = m[0];
        if (value === "") {
          re.lastIndex++;
          continue;
        }
        if (det.validate && !det.validate(value)) continue;
        matches.push({
          start: m.index,
          end: m.index + value.length,
          value,
          det,
        });
      }
    }

    // Sort by start; on ties prefer the longer (more specific) match.
    matches.sort((a, b) => a.start - b.start || b.end - a.end);

    let result = "";
    let cursor = 0;
    for (const match of matches) {
      if (match.start < cursor) continue; // overlaps an earlier replacement
      result += input.slice(cursor, match.start);
      result += replacement(match.value, match.det, mode);
      counts[match.det.key] += 1;
      cursor = match.end;
    }
    result += input.slice(cursor);

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { output: result, counts, total };
  }, [input, mode, enabled]);

  function replacement(value, det, mode) {
    if (mode === "remove") return "";
    if (mode === "token") return `[${det.token}]`;
    if (mode === "block") return "█".repeat(Math.max(4, Math.min(value.length, 24)));
    // mask: keep non-alphanumeric structure, replace the rest with *
    return value.replace(/[A-Za-z0-9]/g, "*");
  }

  function toggle(key) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
    setCopied(false);
  }

  function selectAll(on) {
    const next = {};
    DETECTORS.forEach((d) => (next[d.key] = on));
    setEnabled(next);
    setCopied(false);
  }

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
    a.download = "scrubbed.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadSample() {
    setInput(SAMPLE);
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
          <label className="tool-label" htmlFor="pii-input">
            Text to scrub
          </label>
          <textarea
            id="pii-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder="Paste logs, transcripts, support tickets, or any text with personal data…"
            rows={9}
            spellCheck={false}
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="pii-mode">
            Replace matches with
          </label>
          <select
            id="pii-mode"
            className="tool-select"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setCopied(false);
            }}
          >
            {REPLACE_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-field">
          <span className="tool-label">What to detect</span>
          <div className="tool-stat-grid">
            {DETECTORS.map((d) => (
              <label
                key={d.key}
                className="tool-stat"
                htmlFor={`pii-${d.key}`}
                style={{ cursor: "pointer" }}
              >
                <input
                  id={`pii-${d.key}`}
                  type="checkbox"
                  checked={enabled[d.key]}
                  onChange={() => toggle(d.key)}
                />
                <span className="tool-stat-label">
                  {d.label}
                  {counts[d.key] ? ` — ${counts[d.key]}` : ""}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={() => selectAll(true)}>
          Select all
        </button>
        <button className="btn" type="button" onClick={() => selectAll(false)}>
          None
        </button>
        <button className="btn" type="button" onClick={loadSample}>
          Load sample
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {output ? (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">
            {total > 0
              ? `${total.toLocaleString("en-US")} item${total === 1 ? "" : "s"} redacted`
              : "No personal data matched the selected types"}
          </div>

          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy scrubbed text"}
            </button>
            <button className="btn" type="button" onClick={handleDownload}>
              Download .txt
            </button>
          </div>

          <label className="tool-label" htmlFor="pii-output">
            Scrubbed text
          </label>
          <pre className="tool-output" id="pii-output">
            {output}
          </pre>
        </div>
      ) : (
        <p className="tool-note">
          Enter or paste text above to redact it. Everything runs locally in your
          browser — nothing is uploaded, so it is safe for sensitive content.
        </p>
      )}

      <p className="tool-note">
        Pattern matching finds structured data (emails, cards, SSNs, phones, IPs)
        reliably, but it cannot recognize free-form names or addresses. Always
        review the output before sharing.
      </p>
    </div>
  );
}
