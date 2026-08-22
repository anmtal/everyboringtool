"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { categories } from "../lib/tools";

export default function CategoryNav() {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  const pathname = usePathname();

  // close the menu whenever the route changes
  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  // close on outside click or Escape
  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(null);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const current = open ? categories.find((c) => c.slug === open) : null;

  return (
    <nav className="catnav" ref={ref} aria-label="Tool categories">
      <div className="catnav-wrap container">
        <div className="catnav-row">
          {categories.map((c) => {
            const isOpen = open === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                className={`catnav-btn ${isOpen ? "is-open" : ""}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setOpen(isOpen ? null : c.slug)}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span>{c.short || c.name}</span>
                <span className="caret" aria-hidden="true">▾</span>
              </button>
            );
          })}
        </div>

        {current && (
          <div className="catnav-panel">
            <Link href={`/${current.slug}`} className="catnav-panel-head">
              All {current.name} →
            </Link>
            {current.tools.length === 0 ? (
              <div className="catnav-panel-empty">Coming soon</div>
            ) : (
              <div className="catnav-panel-grid">
                {current.tools.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/${current.slug}/${t.slug}`}
                    className="catnav-panel-link"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
