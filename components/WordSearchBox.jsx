"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WordSearchBox({ basePath = "/unscramble", placeholder = "Enter letters", buttonLabel = "Search", initial = "", allowWild = true, pattern = false, min = 1 }) {
  const [v, setV] = useState(initial);
  const router = useRouter();

  function go(e) {
    e.preventDefault();
    if (pattern) {
      const l = v.toLowerCase().replace(/[_.?\s]/g, "-").replace(/[^a-z-]/g, "").slice(0, 15);
      if (l.length >= 2 && /[a-z]/.test(l)) router.push(`${basePath}/${l}`);
      return;
    }
    const re = allowWild ? /[^a-z?]/g : /[^a-z]/g;
    const l = v.toLowerCase().replace(re, "").slice(0, 15);
    // encode so a "?" wildcard isn't parsed as the URL query delimiter
    if (l.replace(/\?/g, "").length >= min) router.push(`${basePath}/${encodeURIComponent(l)}`);
  }

  return (
    <form onSubmit={go} className="tool-actions" style={{ gap: 8 }}>
      <input
        className="tool-input"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={15}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        style={{ flex: 1, minWidth: 0 }}
      />
      <button className="btn btn-primary" type="submit">{buttonLabel}</button>
    </form>
  );
}
