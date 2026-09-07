"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { copyText } from "../../lib/copyText";

// Append/replace UTM params on a URL without touching existing params or the hash.
function buildTaggedUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of params) {
    const v = (value || "").trim();
    if (v) url.searchParams.set(key, v);
  }
  return url.toString();
}

// Naming-convention cleaner: analytics tools treat Facebook and facebook as two
// different sources, so consistent lowercase, separator-joined values are the #1
// UTM hygiene rule. Applied at build time so the inputs stay readable.
function cleanVal(v, clean, sep) {
  const t = String(v || "").trim();
  if (!clean) return t;
  return t.toLowerCase().replace(/\s+/g, sep);
}

// Quick presets for the platforms people tag most — sets source + a sensible
// default medium following common GA4 conventions.
const PRESETS = [
  { label: "Facebook", source: "facebook", medium: "paid_social" },
  { label: "Instagram", source: "instagram", medium: "paid_social" },
  { label: "Google Ads", source: "google", medium: "cpc" },
  { label: "Email", source: "newsletter", medium: "email" },
  { label: "LinkedIn", source: "linkedin", medium: "paid_social" },
  { label: "X / Twitter", source: "twitter", medium: "paid_social" },
  { label: "YouTube", source: "youtube", medium: "video" },
  { label: "TikTok", source: "tiktok", medium: "paid_social" },
];

const PREFS_KEY = "ebt_utm_prefs";

export default function UtmBuilder({ initialSource = "", initialMedium = "", initialCampaign = "" } = {}) {
  const [mode, setMode] = useState("single"); // single | bulk
  const [baseUrl, setBaseUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [source, setSource] = useState(initialSource);
  const [medium, setMedium] = useState(initialMedium);
  const [campaign, setCampaign] = useState(initialCampaign);
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [clean, setClean] = useState(true);
  const [sep, setSep] = useState("_");
  const [copied, setCopied] = useState("");
  const savedRef = useRef(false);

  // Load the saved naming convention once (the "saved convention").
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (typeof p.clean === "boolean") setClean(p.clean);
      if (p.sep === "-" || p.sep === "_") setSep(p.sep);
    } catch { /* ignore */ }
    savedRef.current = true;
  }, []);
  useEffect(() => {
    if (!savedRef.current) return;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ clean, sep })); } catch { /* ignore */ }
  }, [clean, sep]);

  const params = useMemo(() => [
    ["utm_source", cleanVal(source, clean, sep)],
    ["utm_medium", cleanVal(medium, clean, sep)],
    ["utm_campaign", cleanVal(campaign, clean, sep)],
    ["utm_term", cleanVal(term, clean, sep)],
    ["utm_content", cleanVal(content, clean, sep)],
  ], [source, medium, campaign, term, content, clean, sep]);

  const appended = params.filter(([, v]) => v.trim()).length;

  // Single-URL result.
  const single = useMemo(() => {
    const b = baseUrl.trim();
    if (!b) return { output: "", error: "" };
    let parsed;
    try { parsed = new URL(b); } catch {
      return { output: "", error: "That doesn't look like a valid URL. Include the scheme, e.g. https://example.com/page." };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { output: "", error: "Please use a full http:// or https:// URL." };
    }
    try { return { output: buildTaggedUrl(b, params), error: "" }; }
    catch { return { output: "", error: "Could not build the tagged URL from that input." }; }
  }, [baseUrl, params]);

  // Bulk: one base URL per line, same UTM params applied to each.
  const bulk = useMemo(() => {
    const lines = bulkUrls.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = []; let bad = 0;
    for (const l of lines) {
      try {
        const u = new URL(l);
        if (u.protocol !== "http:" && u.protocol !== "https:") { bad++; continue; }
        rows.push({ base: l, tagged: buildTaggedUrl(l, params) });
      } catch { bad++; }
    }
    return { rows, bad };
  }, [bulkUrls, params]);

  function copy(text, tag) {
    if (!text) return;
    try { copyText(text); setCopied(tag); setTimeout(() => setCopied(""), 1500); } catch { setCopied(""); }
  }

  function downloadCsv() {
    try {
      const head = "base_url,tagged_url\n";
      const body = bulk.rows.map((r) => `"${r.base.replace(/"/g, '""')}","${r.tagged.replace(/"/g, '""')}"`).join("\n");
      const blob = new Blob([head + body], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "utm-links.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* blocked */ }
  }

  function clearAll() {
    setBaseUrl(""); setBulkUrls(""); setSource(""); setMedium(""); setCampaign(""); setTerm(""); setContent(""); setCopied("");
  }

  const field = (id, label, val, set, ph) => (
    <div className="tool-field">
      <label className="tool-label" htmlFor={id}>{label}</label>
      <input id={id} type="text" className="tool-input" value={val} onChange={(e) => set(e.target.value)}
        placeholder={ph} spellCheck="false" autoComplete="off" />
    </div>
  );

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="Mode" style={{ marginBottom: 12 }}>
        <button type="button" role="tab" aria-selected={mode === "single"} className={`seg-btn ${mode === "single" ? "is-active" : ""}`} onClick={() => setMode("single")}>Single link</button>
        <button type="button" role="tab" aria-selected={mode === "bulk"} className={`seg-btn ${mode === "bulk" ? "is-active" : ""}`} onClick={() => setMode("bulk")}>Bulk (many links)</button>
      </div>

      {/* Platform presets */}
      <div className="tool-field" style={{ marginBottom: 10 }}>
        <span className="tool-label">Quick preset</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn btn-sm"
              onClick={() => { setSource(p.source); setMedium(p.medium); }}
              title={`utm_source=${p.source}, utm_medium=${p.medium}`}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="tool-fields">
        {mode === "single" ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="utm-base">Base URL</label>
            <input id="utm-base" type="url" className="tool-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com/landing-page" spellCheck="false" autoComplete="off" />
          </div>
        ) : (
          <div className="tool-field">
            <label className="tool-label" htmlFor="utm-bulk">Base URLs — one per line</label>
            <textarea id="utm-bulk" className="tool-textarea" rows={4} value={bulkUrls} onChange={(e) => setBulkUrls(e.target.value)}
              placeholder={"https://example.com/page-1\nhttps://example.com/page-2"} spellCheck="false" />
          </div>
        )}

        <div className="tool-row">
          {field("utm-source", "Campaign Source (utm_source)", source, setSource, "google")}
          {field("utm-medium", "Campaign Medium (utm_medium)", medium, setMedium, "cpc")}
        </div>
        {field("utm-campaign", "Campaign Name (utm_campaign)", campaign, setCampaign, "spring_sale")}
        <div className="tool-row">
          {field("utm-term", "Campaign Term (utm_term) — optional", term, setTerm, "running shoes")}
          {field("utm-content", "Campaign Content (utm_content) — optional", content, setContent, "logo_link")}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 4 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} />
            Clean values (lowercase, no spaces)
          </label>
          {clean && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
              Separator
              <select className="tool-select" value={sep} onChange={(e) => setSep(e.target.value)} style={{ width: "auto" }}>
                <option value="_">underscore _</option>
                <option value="-">hyphen -</option>
              </select>
            </label>
          )}
        </div>

        <p className="tool-note">
          Source, medium and campaign are the standard trio analytics tools expect; term and content are optional. Only filled
          fields are added, every value is URL-encoded, and “Clean values” keeps your tags consistent so <code>Facebook</code> and
          <code>facebook</code> never split into two sources. Nothing is uploaded — links are built in your browser.
        </p>

        <div className="tool-actions">
          <button type="button" className="btn" onClick={clearAll}>Clear</button>
        </div>
      </div>

      {/* Single output */}
      {mode === "single" && single.error && <p className="tool-error">{single.error}</p>}
      {mode === "single" && single.output && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <span className="tool-result-label">Tagged URL</span>
            <span className="tool-result-value" style={{ wordBreak: "break-all" }}>{single.output}</span>
          </div>
          <div className="tool-actions">
            <button type="button" className={copied === "single" ? "btn btn-success" : "btn btn-primary"} onClick={() => copy(single.output, "single")}>
              {copied === "single" ? "Copied!" : "Copy tagged URL"}
            </button>
          </div>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat"><span className="tool-stat-num">{appended}</span><span className="tool-stat-label">UTM params added</span></div>
            <div className="tool-stat"><span className="tool-stat-num">{single.output.length}</span><span className="tool-stat-label">URL length</span></div>
          </div>
        </>
      )}

      {/* Bulk output */}
      {mode === "bulk" && bulk.rows.length > 0 && (
        <div className="tool-result" role="status" aria-live="polite" style={{ marginTop: 4 }}>
          <span className="tool-result-label">{bulk.rows.length} tagged link{bulk.rows.length > 1 ? "s" : ""}{bulk.bad ? ` · ${bulk.bad} line${bulk.bad > 1 ? "s" : ""} skipped` : ""}</span>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {bulk.rows.slice(0, 50).map((r, i) => (
              <code key={i} style={{ fontSize: 12.5, wordBreak: "break-all", background: "var(--surface-2, rgba(127,127,127,0.08))", padding: "6px 9px", borderRadius: 6 }}>{r.tagged}</code>
            ))}
          </div>
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <button type="button" className={copied === "bulk" ? "btn btn-success" : "btn btn-primary"} onClick={() => copy(bulk.rows.map((r) => r.tagged).join("\n"), "bulk")}>
              {copied === "bulk" ? "Copied!" : "Copy all"}
            </button>
            <button type="button" className="btn" onClick={downloadCsv}>⬇ Download CSV</button>
          </div>
        </div>
      )}
    </div>
  );
}
