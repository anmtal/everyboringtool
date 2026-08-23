"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { allTools } from "../lib/tools";

export default function ToolSearch() {
  const tools = useMemo(() => allTools(), []);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];
    return tools
      .filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.categoryName.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [query, tools]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function onKeyDown(e) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      const r = results[active];
      if (r) {
        e.preventDefault();
        router.push(r.href);
      }
    }
  }

  return (
    <div className="search">
      <div className="search-box">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search tools — try “merge pdf”"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Search tools"
          autoComplete="off"
          spellCheck="false"
          /* The arrow-key highlight was expressed only as a CSS class, so screen
             readers were never told the list existed or which item was current. */
          role="combobox"
          aria-expanded={!!query}
          aria-controls="tool-search-results"
          aria-autocomplete="list"
          aria-activedescendant={query && results.length > 0 && active >= 0 ? `tool-search-opt-${active}` : undefined}
        />
      </div>

      {query && (
        <div className="search-results" id="tool-search-results" role="listbox" aria-label="Tool search results">
          {results.length === 0 ? (
            <div className="search-empty">
              No tool matches “{q}” yet — more are on the way.
            </div>
          ) : (
            results.map((r, i) => (
              <Link
                key={r.href}
                href={r.href}
                id={`tool-search-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`search-item ${i === active ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
              >
                <span className="search-item-emoji" aria-hidden="true">{r.emoji}</span>
                <span className="search-item-text">
                  <span className="search-item-name">{r.name}</span>
                  <span className="search-item-cat">{r.categoryName}</span>
                </span>
                <span className="search-item-arrow" aria-hidden="true">→</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
