"use client";

import { useEffect, useState } from "react";

function isMarked() {
  return /(?:^|;\s*)ebt_internal=1(?:;|$)/.test(document.cookie || "");
}

export default function InternalToggle() {
  const [marked, setMarked] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMarked(isMarked()); }, []);

  async function set(on) {
    setBusy(true);
    try {
      // The server sets the cookie (see app/internal/mark/route.js).
      await fetch(`/internal/mark?on=${on ? 1 : 0}`, { method: "POST", credentials: "same-origin" });
    } catch (e) { /* the reload below shows the real state */ }
    // Full reload so the layout's gate re-runs: client-side navigation would
    // keep the old GA / ad flags for the rest of this visit.
    window.location.reload();
  }

  if (marked === null) return <p className="tool-note">Checking this browser…</p>;

  return (
    <>
      <p role="status" style={{ margin: "0 0 12px", fontWeight: 600 }}>
        {marked ? "✓ This browser is marked as internal." : "This browser is not marked yet."}
      </p>
      <div className="tool-actions" style={{ gap: 8 }}>
        {marked ? (
          <button type="button" className="btn" disabled={busy} onClick={() => set(false)}>Unmark this browser</button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => set(true)}>Mark this browser as internal</button>
        )}
      </div>
      <p className="tool-note">The mark lasts about a year, and clearing this site&apos;s cookies removes it. If this page ever says &quot;not marked&quot; again, just mark it again.</p>
    </>
  );
}
