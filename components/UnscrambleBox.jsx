"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnscrambleBox({ initial = "" }) {
  const [v, setV] = useState(initial);
  const router = useRouter();

  function go(e) {
    e.preventDefault();
    const l = v.toLowerCase().replace(/[^a-z?]/g, "").slice(0, 15);
    // encode so a "?" wildcard isn't parsed as the URL query delimiter
    if (l.replace(/\?/g, "").length >= 2) router.push(`/unscramble/${encodeURIComponent(l)}`);
  }

  return (
    <form onSubmit={go} className="tool-actions" style={{ gap: 8 }}>
      <input
        className="tool-input"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Enter your letters"
        aria-label="Letters to unscramble"
        maxLength={15}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        style={{ flex: 1, minWidth: 0 }}
      />
      <button className="btn btn-primary" type="submit">Unscramble</button>
    </form>
  );
}
