"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { categories } from "../lib/tools";

const WORD_GAMES = [
  { href: "/unscramble", name: "Word Unscrambler" },
  { href: "/anagram", name: "Anagram Solver" },
  { href: "/wordle-solver", name: "Wordle Solver" },
  { href: "/words-starting-with", name: "Words Starting With…" },
  { href: "/words-ending-with", name: "Words Ending With…" },
  { href: "/words-containing", name: "Words Containing…" },
  { href: "/crossword-solver", name: "Crossword Solver" },
];

const PANEL_ID = "catnav-panel";

export default function CategoryNav() {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  // The button that opened the current panel, so focus can go back to it when
  // the panel closes instead of being dropped at the top of the document.
  const triggerRef = useRef(null);
  const pathname = usePathname();

  function closePanel(restoreFocus) {
    const trigger = triggerRef.current;
    triggerRef.current = null;
    setOpen(null);
    if (restoreFocus && trigger && document.contains(trigger)) {
      trigger.focus();
    }
  }

  function openPanel(key, trigger) {
    triggerRef.current = trigger;
    setOpen(key);
  }

  // close the menu whenever the route changes
  useEffect(() => {
    // The link that was clicked has just unmounted, so focus has fallen back to
    // the body — hand it to the trigger. If the user moved focus somewhere else
    // in the meantime, leave it alone.
    const active = typeof document !== "undefined" ? document.activeElement : null;
    closePanel(!active || active === document.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // close on outside click or Escape
  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      // Only pull focus back if the click did not deliberately move it
      // elsewhere (e.g. into another control on the page).
      const active = document.activeElement;
      const focusIsLoose =
        !active || active === document.body || ref.current.contains(active);
      closePanel(focusIsLoose);
    }
    function onEsc(e) {
      if (e.key === "Escape") closePanel(true);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = open ? categories.find((c) => c.slug === open) : null;

  // Long tool names wrap to two lines in the panel grid and make their whole row
  // tall, which breaks the alignment. Push the long ones to the END of the list
  // (keeping the rest in their original order) so the earlier rows stay tidy and
  // single-line, and the two-line ones cluster in the last row.
  const PANEL_WRAP = 21; // names longer than this tend to wrap in the ~180px grid cells
  const panelTools = current
    ? current.tools
        .map((t, i) => [t, i])
        .sort(([a, ai], [b, bi]) =>
          ((a.short || a.name).length > PANEL_WRAP ? 1 : 0) -
            ((b.short || b.name).length > PANEL_WRAP ? 1 : 0) || ai - bi
        )
        .map(([t]) => t)
    : [];

  return (
    <nav className="catnav" ref={ref} aria-label="Tool categories">
      <div className="catnav-wrap container">
        <div className="catnav-row">
          <button
            key="__wg"
            type="button"
            className={`catnav-btn ${open === "__wg" ? "is-open" : ""}`}
            aria-expanded={open === "__wg"}
            aria-haspopup="true"
            aria-controls={open === "__wg" ? PANEL_ID : undefined}
            onClick={(e) => {
              if (open === "__wg") closePanel(false);
              else openPanel("__wg", e.currentTarget);
            }}
          >
            <span aria-hidden="true">🔤</span>
            <span>Word Games</span>
            <span className="caret" aria-hidden="true">▾</span>
          </button>
          {categories.map((c) => {
            const isOpen = open === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                className={`catnav-btn ${isOpen ? "is-open" : ""}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-controls={isOpen ? PANEL_ID : undefined}
                onClick={(e) => {
                  if (isOpen) closePanel(false);
                  else openPanel(c.slug, e.currentTarget);
                }}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span>{c.short || c.name}</span>
                <span className="caret" aria-hidden="true">▾</span>
              </button>
            );
          })}
        </div>

        {open === "__wg" && (
          <div className="catnav-panel" id={PANEL_ID}>
            <Link href="/unscramble" className="catnav-panel-head">All Word Games →</Link>
            <div className="catnav-panel-grid">
              {WORD_GAMES.map((l) => (
                <Link key={l.href} href={l.href} className="catnav-panel-link">{l.name}</Link>
              ))}
            </div>
          </div>
        )}

        {current && (
          <div className="catnav-panel" id={PANEL_ID}>
            <Link href={`/${current.slug}`} className="catnav-panel-head">
              All {current.name} →
            </Link>
            {current.tools.length === 0 ? (
              <div className="catnav-panel-empty">Coming soon</div>
            ) : (
              <div className="catnav-panel-grid">
                {panelTools.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/${current.slug}/${t.slug}`}
                    className="catnav-panel-link"
                  >
                    {t.short || t.name}
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
