"use client";

import { useEffect, useState } from "react";

// Two years: the longest cookie lifetime browsers reliably keep (Safari caps
// script-set cookies at 7 days, so re-visit /internal there now and then).
const MAX_AGE = 60 * 60 * 24 * 730;

function isMarked() {
  return /(?:^|;\s*)ebt_internal=1(?:;|$)/.test(document.cookie || "");
}

export default function InternalToggle() {
  const [marked, setMarked] = useState(null);

  useEffect(() => { setMarked(isMarked()); }, []);

  function set(on) {
    document.cookie = on
      ? `ebt_internal=1; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax; Secure`
      : "ebt_internal=; Max-Age=0; Path=/; SameSite=Lax; Secure";
    setMarked(isMarked());
  }

  if (marked === null) return <p className="tool-note">Checking this browser…</p>;

  return (
    <>
      <p role="status" style={{ margin: "0 0 12px", fontWeight: 600 }}>
        {marked ? "✓ This browser is marked as internal." : "This browser is not marked yet."}
      </p>
      <div className="tool-actions" style={{ gap: 8 }}>
        {marked ? (
          <button type="button" className="btn" onClick={() => set(false)}>Unmark this browser</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => set(true)}>Mark this browser as internal</button>
        )}
      </div>
      <p className="tool-note">Takes effect on the next page you open. Clearing this site&apos;s cookies removes the mark.</p>
    </>
  );
}
