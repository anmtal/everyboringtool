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

  return (
    <nav className="catnav" ref={ref} aria-label="Tool categories">
      <div className="container catnav-inner">
        {categories.map((c) => {
          const isOpen = open === c.slug;
          return (
            <div key={c.slug} className={`catnav-item ${isOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="catnav-btn"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setOpen(isOpen ? null : c.slug)}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span>{c.name}</span>
                <span className="caret" aria-hidden="true">▾</span>
              </button>

              {isOpen && (
                <div className="catnav-menu">
                  <Link href={`/${c.slug}`} className="catnav-menu-head">
                    All {c.name} →
                  </Link>
                  {c.tools.length === 0 ? (
                    <span className="catnav-menu-empty">Coming soon</span>
                  ) : (
                    c.tools.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/${c.slug}/${t.slug}`}
                        className="catnav-menu-link"
                      >
                        {t.name}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
