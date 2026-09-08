"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

export default function EphemeralNotepad() {
  const [text, setText] = useState(
    "Scratch notepad. Nothing here is saved.\n\nType, paste, or draft anything — it lives only in this tab and vanishes the moment you close or refresh it.\n\nUse Download to keep a copy on your device, or Copy to move it somewhere else."
  );
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(true);

  const stats = useMemo(() => {
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const lines = text === "" ? 0 : text.split(/\r\n|\r|\n/).length;
    return { characters, charactersNoSpaces, words, lines };
  }, [text]);

  const fmt = (n) => n.toLocaleString("en-US");

  const handleCopy = async () => {
    if (text === "") return;
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (text === "") return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `notepad-${stamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => setText("");

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="en-text">
            Notepad
          </label>
          <textarea
            className="tool-textarea"
            id="en-text"
            rows={14}
            placeholder="Start typing... nothing you write is saved or uploaded."
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={true}
            wrap={wrap ? "soft" : "off"}
            style={wrap ? undefined : { whiteSpace: "pre", overflowX: "auto" }}
          />
        </div>

        <div className="tool-actions">
          <button
            type="button"
            className={copied ? "btn btn-success" : "btn btn-primary"}
            onClick={handleCopy}
            disabled={text === ""}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleDownload}
            disabled={text === ""}
          >
            Download .txt
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setWrap((w) => !w)}
          >
            {wrap ? "Word wrap: on" : "Word wrap: off"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleClear}
            disabled={text === ""}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.characters)}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.charactersNoSpaces)}</div>
          <div className="tool-stat-label">No spaces</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.lines)}</div>
          <div className="tool-stat-label">Lines</div>
        </div>
      </div>

      {text === "" && (
        <p className="tool-note">
          Your notepad is empty. Start typing above — the counts and buttons
          update as you go.
        </p>
      )}

      <p className="tool-note">
        This is a throwaway scratchpad: your text stays only in this browser tab
        and is never saved or uploaded. Closing or refreshing the tab clears it
        for good, so use Download or Copy first if you want to keep anything.
      </p>
    </div>
  );
}
