"use client";

import { useMemo, useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// MLA abbreviates every month longer than four letters.
const MLA_MONTHS = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
];

// --- name parsing -----------------------------------------------------------

function parseName(token) {
  const t = token.trim();
  if (!t) return null;
  if (t.includes(",")) {
    const idx = t.indexOf(",");
    const last = t.slice(0, idx).trim();
    const given = t.slice(idx + 1).trim();
    return { last, given };
  }
  const bits = t.split(/\s+/).filter(Boolean);
  if (bits.length === 1) return { last: bits[0], given: "" };
  const last = bits[bits.length - 1];
  const given = bits.slice(0, -1).join(" ");
  return { last, given };
}

function splitAuthors(raw) {
  if (!raw || !raw.trim()) return [];
  let parts;
  if (raw.includes(";")) {
    parts = raw.split(";");
  } else if (/\s+&\s+|\s+and\s+/i.test(raw)) {
    parts = raw.split(/\s+&\s+|\s+and\s+/i);
  } else {
    parts = [raw];
  }
  return parts.map(parseName).filter(Boolean);
}

function initials(given) {
  return given
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + ".")
    .join(" ");
}

// --- author strings per style ----------------------------------------------

function apaAuthors(list) {
  if (list.length === 0) return "";
  const fmt = (a) => (a.given ? `${a.last}, ${initials(a.given)}` : a.last);
  if (list.length === 1) return fmt(list[0]);
  if (list.length > 20) {
    const first19 = list.slice(0, 19).map(fmt);
    return `${first19.join(", ")}, … ${fmt(list[list.length - 1])}`;
  }
  const all = list.map(fmt);
  const last = all.pop();
  return `${all.join(", ")}, & ${last}`;
}

function mlaAuthors(list) {
  if (list.length === 0) return "";
  const a = list[0];
  const firstStr = a.given ? `${a.last}, ${a.given}` : a.last;
  if (list.length === 1) return firstStr;
  if (list.length === 2) {
    const b = list[1];
    const bStr = b.given ? `${b.given} ${b.last}` : b.last;
    return `${firstStr}, and ${bStr}`;
  }
  return `${firstStr}, et al.`;
}

function chicagoAuthors(list) {
  if (list.length === 0) return "";
  const a = list[0];
  const firstStr = a.given ? `${a.last}, ${a.given}` : a.last;
  if (list.length === 1) return firstStr;
  const rest = list
    .slice(1)
    .map((x) => (x.given ? `${x.given} ${x.last}` : x.last));
  if (list.length === 2) return `${firstStr}, and ${rest[0]}`;
  const lastR = rest.pop();
  return `${firstStr}, ${rest.join(", ")}, and ${lastR}`;
}

// --- date parsing -----------------------------------------------------------

function parseDateParts(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = +iso[1];
    const m = +iso[2] - 1;
    const d = +iso[3];
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) return { y, m, d };
  }
  const t = new Date(s);
  if (!isNaN(t.getTime()) && /\d/.test(s)) {
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
  }
  return { raw: s };
}

function fmtDate(parts, style) {
  if (!parts) return "";
  if (parts.raw) return parts.raw;
  const { y, m, d } = parts;
  if (style === "mla") return `${d} ${MLA_MONTHS[m]} ${y}`;
  return `${MONTHS[m]} ${d}, ${y}`;
}

// --- output tidy ------------------------------------------------------------

function tidy(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*\.+/g, ".")
    .replace(/,\s*$/, ".")
    .replace(/\s+/g, " ")
    .trim();
}

// --- citation builders ------------------------------------------------------

function buildCitations(d) {
  const {
    type,
    aApa,
    aMla,
    aChi,
    hasAuthor,
    title,
    year,
    third, // publisher / site name / journal name
    url,
    accApa,
    accMla,
    accChi,
  } = d;
  const yr = year || "n.d.";

  const apaLead = () => {
    if (hasAuthor) {
      let s = `${aApa} (${yr}). `;
      if (title) s += `${title}. `;
      return s;
    }
    let s = "";
    if (title) s += `${title}. `;
    s += `(${yr}). `;
    return s;
  };

  let apa = "";
  let mla = "";
  let chi = "";

  if (type === "book") {
    apa = apaLead();
    if (third) apa += `${third}. `;
    if (url) apa += url;

    if (aMla) mla += `${aMla}. `;
    if (title) mla += `${title}. `;
    if (third) mla += `${third}, `;
    if (year) mla += `${year}. `;
    if (url) mla += `${url}.`;

    if (aChi) chi += `${aChi}. `;
    if (title) chi += `${title}. `;
    if (third) chi += `${third}, `;
    if (year) chi += `${year}. `;
    if (url) chi += `${url}.`;
  } else if (type === "journal") {
    apa = apaLead();
    if (third) apa += `${third}. `;
    if (url) apa += url;

    if (aMla) mla += `${aMla}. `;
    if (title) mla += `"${title}." `;
    if (third) mla += `${third}, `;
    if (year) mla += `${year}, `;
    if (url) mla += `${url}. `;
    if (accMla) mla += `Accessed ${accMla}.`;

    if (aChi) chi += `${aChi}. `;
    if (title) chi += `"${title}." `;
    if (third) chi += `${third} `;
    if (year) chi += `(${year}). `;
    if (url) chi += `${url}.`;
  } else {
    // website
    apa = apaLead();
    if (third) apa += `${third}. `;
    if (accApa && url) apa += `Retrieved ${accApa}, from ${url}`;
    else if (url) apa += url;

    if (aMla) mla += `${aMla}. `;
    if (title) mla += `"${title}." `;
    if (third) mla += `${third}, `;
    if (year) mla += `${year}, `;
    if (url) mla += `${url}. `;
    if (accMla) mla += `Accessed ${accMla}.`;

    if (aChi) chi += `${aChi}. `;
    if (title) chi += `"${title}." `;
    if (third) chi += `${third}. `;
    if (year) chi += `${year}. `;
    if (accChi) chi += `Accessed ${accChi}. `;
    if (url) chi += `${url}.`;
  }

  return { apa: tidy(apa), mla: tidy(mla), chicago: tidy(chi) };
}

const THIRD_LABEL = {
  website: "Site name",
  book: "Publisher",
  journal: "Journal name",
};

const STYLE_META = [
  { key: "apa", label: "APA (7th edition)" },
  { key: "mla", label: "MLA (9th edition)" },
  { key: "chicago", label: "Chicago (17th edition)" },
];

export default function CitationFormatter() {
  const [type, setType] = useState("website");
  const [authors, setAuthors] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [third, setThird] = useState("");
  const [url, setUrl] = useState("");
  const [accessDate, setAccessDate] = useState("");
  const [copied, setCopied] = useState("");

  const list = useMemo(() => splitAuthors(authors), [authors]);

  const citations = useMemo(() => {
    const accParts = parseDateParts(accessDate);
    return buildCitations({
      type,
      aApa: apaAuthors(list),
      aMla: mlaAuthors(list),
      aChi: chicagoAuthors(list),
      hasAuthor: list.length > 0,
      title: title.trim(),
      year: year.trim(),
      third: third.trim(),
      url: url.trim(),
      accApa: fmtDate(accParts, "apa"),
      accMla: fmtDate(accParts, "mla"),
      accChi: fmtDate(accParts, "chicago"),
    });
  }, [type, list, title, year, third, url, accessDate]);

  const hasInput = title.trim() || authors.trim() || url.trim();
  const showAccess = type !== "book";

  async function handleCopy(key, text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {
      setCopied("");
    }
  }

  function handleClear() {
    setAuthors("");
    setTitle("");
    setYear("");
    setThird("");
    setUrl("");
    setAccessDate("");
    setCopied("");
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-type">
              Source type
            </label>
            <select
              className="tool-select"
              id="cf-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="website">Website</option>
              <option value="book">Book</option>
              <option value="journal">Journal article</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-year">
              Year
            </label>
            <input
              className="tool-input"
              id="cf-year"
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="cf-authors">
            Author(s)
          </label>
          <input
            className="tool-input"
            id="cf-authors"
            type="text"
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
            placeholder="Smith, Jane; John Doe"
          />
          <p className="tool-note">
            Separate multiple authors with a semicolon (;). Each name may be
            written &quot;Last, First&quot; or &quot;First Last&quot;. Leave
            blank for an unauthored source.
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="cf-title">
            Title
          </label>
          <input
            className="tool-input"
            id="cf-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "book"
                ? "The Great Book of Everything"
                : type === "journal"
                ? "A study of interesting things"
                : "How to cite a website"
            }
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-third">
              {THIRD_LABEL[type]}
            </label>
            <input
              className="tool-input"
              id="cf-third"
              type="text"
              value={third}
              onChange={(e) => setThird(e.target.value)}
              placeholder={
                type === "book"
                  ? "Penguin Random House"
                  : type === "journal"
                  ? "Journal of Modern Research"
                  : "Wikipedia"
              }
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-url">
              URL {type === "journal" ? "or DOI" : ""}
            </label>
            <input
              className="tool-input"
              id="cf-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
            />
          </div>
        </div>

        {showAccess ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-access">
              Access date
            </label>
            <input
              className="tool-input"
              id="cf-access"
              type="text"
              value={accessDate}
              onChange={(e) => setAccessDate(e.target.value)}
              placeholder="2026-08-22"
            />
            <p className="tool-note">
              Optional. Enter as YYYY-MM-DD (e.g. 2026-08-22) and it will be
              formatted correctly for each style.
            </p>
          </div>
        ) : null}
      </div>

      {hasInput ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{list.length}</div>
              <div className="tool-stat-label">
                author{list.length === 1 ? "" : "s"} detected
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">3</div>
              <div className="tool-stat-label">citation styles</div>
            </div>
          </div>

          <div className="tool-actions">
            <button className="btn" type="button" onClick={handleClear}>
              Clear all fields
            </button>
          </div>

          {STYLE_META.map(({ key, label }) => (
            <div className="tool-field" key={key}>
              <label className="tool-label">{label}</label>
              <pre className="tool-output">{citations[key]}</pre>
              <div className="tool-actions">
                <button
                  className={
                    copied === key ? "btn btn-success" : "btn btn-primary"
                  }
                  type="button"
                  onClick={() => handleCopy(key, citations[key])}
                >
                  {copied === key ? "Copied!" : `Copy ${label.split(" ")[0]}`}
                </button>
              </div>
            </div>
          ))}

          <p className="tool-note">
            Formatting tip: citation styles italicize some elements that plain
            text can&apos;t show. Italicize book titles and journal or website
            names in APA and Chicago; in MLA italicize the container (website or
            journal name) and the book title, and keep article and web-page
            titles in quotation marks. Always double-check against your
            instructor&apos;s or publisher&apos;s guidelines.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter at least a title or an author above and your citation will
          appear instantly in APA, MLA, and Chicago styles, each ready to copy.
        </p>
      )}
    </div>
  );
}
