"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

let nextId = 4;

const EXAMPLE = [
  { id: 1, name: "Home", url: "https://example.com/" },
  { id: 2, name: "Blog", url: "https://example.com/blog/" },
  {
    id: 3,
    name: "How to bake sourdough",
    url: "https://example.com/blog/how-to-bake-sourdough/",
  },
];

// Turn a full page URL into a best-guess breadcrumb trail from its path
// segments. This is a starting point the user edits — it can't know your real
// page titles, so it title-cases the slug.
function trailFromUrl(raw) {
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const origin = u.origin;
  const segments = u.pathname.split("/").filter(Boolean);
  const items = [{ name: "Home", url: origin + "/" }];
  let path = "";
  segments.forEach((seg) => {
    path += "/" + seg;
    const label = decodeURIComponent(seg)
      .replace(/\.(html?|php|aspx?)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({ name: label || seg, url: origin + path + "/" });
  });
  return items;
}

// JSON.stringify handles all escaping, so we build the object then stringify.
// position is 1-indexed per schema.org. `item` (the URL) is optional on the
// last crumb — Google treats an item without a URL as the current page.
function buildSchema(items, pretty, dropLastUrl) {
  const clean = items
    .map((it) => ({ name: it.name.trim(), url: it.url.trim() }))
    .filter((it) => it.name);

  if (clean.length === 0) return "";

  const listItems = clean.map((it, i) => {
    const entry = {
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
    };
    const isLast = i === clean.length - 1;
    if (it.url && !(isLast && dropLastUrl)) {
      entry.item = it.url;
    }
    return entry;
  });

  const obj = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: listItems,
  };

  const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  return '<script type="application/ld+json">\n' + json + "\n</script>";
}

function isValidUrl(v) {
  if (!v.trim()) return true; // empty is allowed (optional on last item)
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SchemaBreadcrumbGenerator() {
  const [items, setItems] = useState(EXAMPLE);
  const [pretty, setPretty] = useState(true);
  const [dropLastUrl, setDropLastUrl] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () => buildSchema(items, pretty, dropLastUrl),
    [items, pretty, dropLastUrl]
  );

  const validItems = useMemo(
    () => items.filter((it) => it.name.trim()),
    [items]
  );

  const warnings = useMemo(() => {
    const w = [];
    items.forEach((it, i) => {
      const name = it.name.trim();
      const url = it.url.trim();
      const isLast = i === items.length - 1;
      if (!name && url) {
        w.push(`Item ${i + 1} has a URL but no name — it was skipped.`);
      }
      if (url && !isValidUrl(url)) {
        w.push(
          `Item ${i + 1} URL is not a valid http(s) address. Use the full absolute URL.`
        );
      }
      if (name && !url && !(isLast && dropLastUrl)) {
        w.push(
          `Item ${i + 1} has no URL. Every crumb except the current page should link to an absolute URL.`
        );
      }
    });
    if (validItems.length === 1) {
      w.push(
        "A breadcrumb trail usually has 2 or more levels — a single item adds little for Google."
      );
    }
    return w;
  }, [items, validItems.length, dropLastUrl]);

  function updateItem(id, field, value) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
    setCopied(false);
  }

  function addItem() {
    setItems((prev) => [...prev, { id: nextId++, name: "", url: "" }]);
    setCopied(false);
  }

  function removeItem(id) {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((it) => it.id !== id) : prev
    );
    setCopied(false);
  }

  function moveItem(index, dir) {
    setItems((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const copy = prev.slice();
      const [row] = copy.splice(index, 1);
      copy.splice(to, 0, row);
      return copy;
    });
    setCopied(false);
  }

  function handleImport() {
    const trail = trailFromUrl(importUrl);
    if (!trail) {
      setImportError("Enter a full URL, e.g. https://example.com/blog/post/");
      return;
    }
    setImportError("");
    setItems(trail.map((it) => ({ id: nextId++, name: it.name, url: it.url })));
    setCopied(false);
  }

  function loadExample() {
    setItems(EXAMPLE.map((it) => ({ id: nextId++, name: it.name, url: it.url })));
    setCopied(false);
  }

  function clearAll() {
    setItems([{ id: nextId++, name: "", url: "" }]);
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "breadcrumb-schema.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bc-import">
            Auto-fill from a page URL (optional)
          </label>
          <div className="tool-row">
            <input
              className="tool-input"
              id="bc-import"
              type="url"
              value={importUrl}
              onChange={(e) => {
                setImportUrl(e.target.value);
                setImportError("");
              }}
              placeholder="https://example.com/blog/how-to-bake-sourdough/"
              autoComplete="off"
            />
            <button className="btn" type="button" onClick={handleImport}>
              Build trail
            </button>
          </div>
          {importError ? (
            <p className="tool-error" role="status" aria-live="polite">
              {importError}
            </p>
          ) : (
            <p className="tool-note">
              Splits the URL path into crumbs and title-cases each slug. Always
              review the generated names — they should match your real page
              titles.
            </p>
          )}
        </div>

        {items.map((it, i) => (
          <div className="tool-field" key={it.id}>
            <label className="tool-label" htmlFor={`bc-name-${it.id}`}>
              Level {i + 1} name
            </label>
            <input
              className="tool-input"
              id={`bc-name-${it.id}`}
              type="text"
              value={it.name}
              onChange={(e) => updateItem(it.id, "name", e.target.value)}
              placeholder="e.g. Blog"
              autoComplete="off"
            />
            <label
              className="tool-label"
              htmlFor={`bc-url-${it.id}`}
              style={{ marginTop: 8 }}
            >
              Level {i + 1} URL
              {i === items.length - 1 ? " (optional for current page)" : ""}
            </label>
            <input
              className="tool-input"
              id={`bc-url-${it.id}`}
              type="url"
              value={it.url}
              onChange={(e) => updateItem(it.id, "url", e.target.value)}
              placeholder="https://example.com/blog/"
              autoComplete="off"
            />
            <div className="tool-actions">
              <button
                className="btn"
                type="button"
                onClick={() => moveItem(i, -1)}
                disabled={i === 0}
              >
                ↑ Up
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => moveItem(i, 1)}
                disabled={i === items.length - 1}
              >
                ↓ Down
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => removeItem(it.id)}
                disabled={items.length <= 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="tool-actions">
          <button className="btn btn-primary" type="button" onClick={addItem}>
            + Add level
          </button>
          <button className="btn" type="button" onClick={loadExample}>
            Load example
          </button>
          <button className="btn" type="button" onClick={clearAll}>
            Clear all
          </button>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="bc-pretty">
            <input
              id="bc-pretty"
              type="checkbox"
              checked={pretty}
              onChange={(e) => {
                setPretty(e.target.checked);
                setCopied(false);
              }}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Pretty-print (indented) JSON
          </label>
          <label className="tool-label" htmlFor="bc-droplast" style={{ marginTop: 8 }}>
            <input
              id="bc-droplast"
              type="checkbox"
              checked={dropLastUrl}
              onChange={(e) => {
                setDropLastUrl(e.target.checked);
                setCopied(false);
              }}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Omit the URL on the last crumb (marks it as the current page)
          </label>
        </div>
      </div>

      {output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{validItems.length}</div>
              <div className="tool-stat-label">
                level{validItems.length === 1 ? "" : "s"} in trail
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{output.length}</div>
              <div className="tool-stat-label">characters of code</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .html
              </button>
            </div>
            <label className="tool-label" htmlFor="bc-output">
              BreadcrumbList JSON-LD
            </label>
            <pre className="tool-output" id="bc-output">
              {output}
            </pre>
          </div>

          {warnings.length ? (
            <div className="tool-note">
              {warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          <p className="tool-note">
            Paste this block into the page whose breadcrumb trail it describes.
            The order and names should mirror the breadcrumb navigation your
            visitors actually see, and each URL should be the full absolute
            address. Check it with Google&apos;s Rich Results Test after
            publishing.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Add at least one level with a name above to generate valid
          BreadcrumbList schema. Everything runs in your browser — nothing is
          uploaded.
        </p>
      )}
    </div>
  );
}
