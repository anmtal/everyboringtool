"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/copyText";
import { trackEvent } from "../lib/analytics";

// "Embed this tool" box on the tool pages listed in lib/embeds.js: the
// copy-paste iframe snippet (built on the server by embedSnippet) and a Copy
// button.
export default function EmbedBox({ slug, title, snippet }) {
  const [state, setState] = useState(""); // "" | "copied" | "failed"
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let next = "copied";
    try {
      await copyText(snippet);
      trackEvent("embed_copy", { tool_slug: slug });
    } catch (e) {
      next = "failed";
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(""), next === "copied" ? 2500 : 6000);
  }

  const headingId = `embed-${slug}-h`;

  return (
    <section className="tool-embed" aria-labelledby={headingId}>
      <h2 className="tool-h2" id={headingId}>
        Embed this tool
      </h2>
      <textarea
        className="tool-textarea tool-output"
        readOnly
        rows={4}
        spellCheck={false}
        value={snippet}
        aria-label={`Embed code for ${title}`}
        onFocus={(e) => e.target.select()}
      />
      <div className="tool-actions">
        <button type="button" className={state === "copied" ? "btn btn-success" : "btn"} onClick={copy}>
          {state === "copied" ? "Copied!" : "Copy embed code"}
        </button>
        <span className="tool-note" role="status" aria-live="polite">
          {state === "failed" ? "Couldn't copy automatically. Select the code above and copy it." : ""}
        </span>
      </div>
      <p className="tool-note">Works on any site or learning platform that allows iframes.</p>
    </section>
  );
}
