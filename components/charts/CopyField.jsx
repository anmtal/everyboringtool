"use client";

import { useState } from "react";
import { copyText } from "../../lib/copyText";

// A read-only, server-rendered snippet (link HTML, citation, embed code) with a
// Copy button. The text is in the HTML, so it can also be selected by hand.
export default function CopyField({ id, label, value, rows = 3 }) {
  const [state, setState] = useState("");

  async function copy() {
    try {
      await copyText(value);
      setState("Copied!");
    } catch {
      setState("Select the text and copy it");
    }
    setTimeout(() => setState(""), 1600);
  }

  return (
    <div className="tool-field rn-copy">
      <label className="tool-label" htmlFor={id}>{label}</label>
      <textarea id={id} className="tool-textarea rn-copy-text" readOnly rows={rows} value={value} onFocus={(e) => e.target.select()} />
      <div>
        <button type="button" className="btn btn-sm" onClick={copy}>{state || "Copy"}</button>
      </div>
    </div>
  );
}
