"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// A compact, non-exhaustive list of common ISO 639-1 language codes.
const LANGUAGES = [
  ["", "— language —"],
  ["en", "en — English"],
  ["es", "es — Spanish"],
  ["fr", "fr — French"],
  ["de", "de — German"],
  ["it", "it — Italian"],
  ["pt", "pt — Portuguese"],
  ["nl", "nl — Dutch"],
  ["ru", "ru — Russian"],
  ["pl", "pl — Polish"],
  ["sv", "sv — Swedish"],
  ["da", "da — Danish"],
  ["no", "no — Norwegian"],
  ["fi", "fi — Finnish"],
  ["tr", "tr — Turkish"],
  ["ar", "ar — Arabic"],
  ["he", "he — Hebrew"],
  ["hi", "hi — Hindi"],
  ["zh", "zh — Chinese"],
  ["ja", "ja — Japanese"],
  ["ko", "ko — Korean"],
  ["th", "th — Thai"],
  ["vi", "vi — Vietnamese"],
  ["id", "id — Indonesian"],
  ["ms", "ms — Malay"],
  ["cs", "cs — Czech"],
  ["sk", "sk — Slovak"],
  ["hu", "hu — Hungarian"],
  ["ro", "ro — Romanian"],
  ["el", "el — Greek"],
  ["uk", "uk — Ukrainian"],
];

// Common ISO 3166-1 alpha-2 region codes (optional per row).
const REGIONS = [
  ["", "— any region —"],
  ["US", "US — United States"],
  ["GB", "GB — United Kingdom"],
  ["CA", "CA — Canada"],
  ["AU", "AU — Australia"],
  ["IE", "IE — Ireland"],
  ["ES", "ES — Spain"],
  ["MX", "MX — Mexico"],
  ["AR", "AR — Argentina"],
  ["FR", "FR — France"],
  ["BE", "BE — Belgium"],
  ["CH", "CH — Switzerland"],
  ["DE", "DE — Germany"],
  ["AT", "AT — Austria"],
  ["IT", "IT — Italy"],
  ["PT", "PT — Portugal"],
  ["BR", "BR — Brazil"],
  ["NL", "NL — Netherlands"],
  ["SE", "SE — Sweden"],
  ["DK", "DK — Denmark"],
  ["NO", "NO — Norway"],
  ["FI", "FI — Finland"],
  ["PL", "PL — Poland"],
  ["RU", "RU — Russia"],
  ["TR", "TR — Turkey"],
  ["CN", "CN — China"],
  ["TW", "TW — Taiwan"],
  ["HK", "HK — Hong Kong"],
  ["JP", "JP — Japan"],
  ["KR", "KR — South Korea"],
  ["IN", "IN — India"],
  ["ID", "ID — Indonesia"],
  ["SG", "SG — Singapore"],
  ["AE", "AE — U.A.E."],
];

const VALID_LANG = new RegExp("^[a-z]{2,3}$");
const VALID_REGION = new RegExp("^[A-Z]{2}$");

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Normalize a URL. Returns { url, ok }.
function normalizeUrl(raw) {
  const input = String(raw || "").trim();
  if (!input) return { url: "", ok: false };
  let candidate = input;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = "https://" + candidate;
  }
  try {
    const parsed = new URL(candidate);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return { url: "", ok: false };
    }
    if (!parsed.hostname || parsed.hostname.indexOf(".") === -1) {
      return { url: "", ok: false };
    }
    return { url: parsed.href, ok: true };
  } catch (e) {
    return { url: "", ok: false };
  }
}

// Build the hreflang value from a row.
function hreflangValue(row) {
  if (row.xDefault) return "x-default";
  const lang = (row.lang || "").trim().toLowerCase();
  const region = (row.region || "").trim().toUpperCase();
  if (!lang) return "";
  return region ? lang + "-" + region : lang;
}

let ROW_ID = 0;
function makeRow(lang, region, url, xDefault) {
  ROW_ID += 1;
  return {
    id: "r" + ROW_ID,
    lang: lang || "",
    region: region || "",
    url: url || "",
    xDefault: !!xDefault,
  };
}

export default function HreflangGenerator() {
  const [rows, setRows] = useState(() => [
    makeRow("en", "US", "https://example.com/", false),
    makeRow("es", "ES", "https://example.com/es/", false),
    makeRow("fr", "FR", "https://example.com/fr/", false),
    makeRow("", "", "https://example.com/", true),
  ]);
  const [format, setFormat] = useState("html"); // "html" | "sitemap"
  const [copied, setCopied] = useState(false);

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setCopied(false);
  }
  function addRow() {
    setRows((prev) => [...prev, makeRow("", "", "", false)]);
    setCopied(false);
  }
  function removeRow(id) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
    setCopied(false);
  }

  // Validate every row and build the list of usable entries.
  const analysis = useMemo(() => {
    const entries = [];
    const errors = [];
    const seenValues = new Map();
    let xDefaultCount = 0;

    rows.forEach((row, idx) => {
      const label = "Row " + (idx + 1);
      const value = hreflangValue(row);
      const norm = normalizeUrl(row.url);

      // Skip fully empty rows silently.
      const isEmpty = !row.url.trim() && !row.lang.trim() && !row.xDefault;
      if (isEmpty) return;

      if (row.xDefault) {
        xDefaultCount += 1;
      } else {
        const lang = (row.lang || "").trim().toLowerCase();
        const region = (row.region || "").trim().toUpperCase();
        if (!lang) {
          errors.push(label + ": choose a language (or mark it x-default).");
        } else if (!VALID_LANG.test(lang)) {
          errors.push(label + ': "' + lang + '" is not a valid language code.');
        }
        if (region && !VALID_REGION.test(region)) {
          errors.push(label + ': "' + region + '" is not a valid region code.');
        }
      }

      if (!row.url.trim()) {
        errors.push(label + ": add the URL for this version.");
      } else if (!norm.ok) {
        errors.push(label + ": that URL doesn't look valid.");
      }

      if (value && norm.ok) {
        if (seenValues.has(value)) {
          errors.push(
            label +
              ': duplicate hreflang "' +
              value +
              '" (already used in row ' +
              (seenValues.get(value) + 1) +
              ").",
          );
        } else {
          seenValues.set(value, idx);
        }
        entries.push({ value, url: norm.url });
      }
    });

    if (xDefaultCount > 1) {
      errors.push("Only one x-default entry is allowed.");
    }

    return { entries, errors };
  }, [rows]);

  const output = useMemo(() => {
    const { entries } = analysis;
    if (!entries.length) return "";
    if (format === "sitemap") {
      // xhtml:link entries for an XML sitemap <url> block.
      return entries
        .map(
          (e) =>
            '<xhtml:link rel="alternate" hreflang="' +
            escapeAttr(e.value) +
            '" href="' +
            escapeAttr(e.url) +
            '" />',
        )
        .join("\n");
    }
    // HTML <head> link tags.
    return entries
      .map(
        (e) =>
          '<link rel="alternate" hreflang="' +
          escapeAttr(e.value) +
          '" href="' +
          escapeAttr(e.url) +
          '" />',
      )
      .join("\n");
  }, [analysis, format]);

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

  const tagCount = analysis.entries.length;
  const hasXDefault = analysis.entries.some((e) => e.value === "x-default");

  return (
    <div className="tool">
      <div className="tool-fields">
        {rows.map((row, idx) => (
          <div className="tool-row" key={row.id}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={row.id + "-lang"}>
                Language
              </label>
              <select
                className="tool-select"
                id={row.id + "-lang"}
                value={row.lang}
                disabled={row.xDefault}
                onChange={(e) => updateRow(row.id, { lang: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l[0]} value={l[0]}>
                    {l[1]}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor={row.id + "-region"}>
                Region
              </label>
              <select
                className="tool-select"
                id={row.id + "-region"}
                value={row.region}
                disabled={row.xDefault}
                onChange={(e) => updateRow(row.id, { region: e.target.value })}
              >
                {REGIONS.map((r) => (
                  <option key={r[0]} value={r[0]}>
                    {r[1]}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor={row.id + "-url"}>
                URL for this version
              </label>
              <input
                className="tool-input"
                id={row.id + "-url"}
                type="text"
                value={row.url}
                onChange={(e) => updateRow(row.id, { url: e.target.value })}
                placeholder="https://example.com/page"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor={row.id + "-xd"}>
                <input
                  id={row.id + "-xd"}
                  type="checkbox"
                  checked={row.xDefault}
                  onChange={(e) =>
                    updateRow(row.id, { xDefault: e.target.checked })
                  }
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                x-default
              </label>
              <div className="tool-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  aria-label={"Remove row " + (idx + 1)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="tool-actions">
          <button className="btn" type="button" onClick={addRow}>
            + Add language
          </button>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="hl-format">
            Output format
          </label>
          <select
            className="tool-select"
            id="hl-format"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value);
              setCopied(false);
            }}
          >
            <option value="html">HTML &lt;head&gt; link tags</option>
            <option value="sitemap">XML sitemap (xhtml:link)</option>
          </select>
        </div>
      </div>

      {analysis.errors.length ? (
        <div className="tool-error" role="status" aria-live="polite">
          {analysis.errors.map((err, i) => (
            <div key={i}>• {err}</div>
          ))}
        </div>
      ) : null}

      {output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{tagCount}</div>
              <div className="tool-stat-label">
                tag{tagCount === 1 ? "" : "s"} generated
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{hasXDefault ? "Yes" : "No"}</div>
              <div className="tool-stat-label">x-default set</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy tags"}
              </button>
            </div>
            <label className="tool-label" htmlFor="hl-output">
              hreflang tags
            </label>
            <pre className="tool-output" id="hl-output">
              {output}
            </pre>
          </div>

          <p className="tool-note">
            {format === "html"
              ? "Paste this whole block inside the <head> of every listed page — each page must list all versions, including itself. The set has to be reciprocal: if page A points to B, B must point back to A, or search engines ignore it."
              : "Add these <xhtml:link> lines inside each <url> entry of your XML sitemap, and declare the namespace xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" on the <urlset> element. Repeat the full set for every localized URL."}
          </p>
          <p className="tool-note">
            An x-default entry tells Google which page to show users whose
            language/region you don&apos;t target. Everything is computed in your
            browser — nothing is uploaded.
          </p>
        </>
      ) : !analysis.errors.length ? (
        <p className="tool-note">
          Add a language, optional region, and the URL for each localized version
          of your page. Your reciprocal &lt;link rel=&quot;alternate&quot;
          hreflang&gt; tags appear here, ready to paste. It all runs in your
          browser — nothing is sent anywhere.
        </p>
      ) : null}
    </div>
  );
}
