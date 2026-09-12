"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// 100% client-side keyboard tester. We listen on window for keydown/keyup and key
// each key off event.code (physical position, layout-independent) so the on-screen
// board stays reliable on any language layout. Pressed keys highlight live and
// support n-key rollover (a Set of held codes); every code pressed at least once is
// remembered in a "tested" Set so you can confirm the whole board works. Nothing is
// uploaded — only two small toggles are saved to this browser.

const LS_KEY = "ebt-keyboard-tester";

// Keys we never trap, so the page stays escapable (refresh / fullscreen / dev tools).
const NO_TRAP = new Set(["F5", "F11", "F12"]);

const LETTERS_ROW1 = "QWERTYUIOP".split("");
const LETTERS_ROW2 = "ASDFGHJKL".split("");
const LETTERS_ROW3 = "ZXCVBNM".split("");

// ---- static layout description (code, label, width in "units") ----
function letterKeys(letters) {
  return letters.map((ch) => ({ code: "Key" + ch, label: ch, u: 1 }));
}

const FUNCTION_ROW = [
  { code: "Escape", label: "Esc", u: 1 },
  { sp: 0.5 },
  { code: "F1", label: "F1", u: 1 }, { code: "F2", label: "F2", u: 1 },
  { code: "F3", label: "F3", u: 1 }, { code: "F4", label: "F4", u: 1 },
  { sp: 0.5 },
  { code: "F5", label: "F5", u: 1 }, { code: "F6", label: "F6", u: 1 },
  { code: "F7", label: "F7", u: 1 }, { code: "F8", label: "F8", u: 1 },
  { sp: 0.5 },
  { code: "F9", label: "F9", u: 1 }, { code: "F10", label: "F10", u: 1 },
  { code: "F11", label: "F11", u: 1 }, { code: "F12", label: "F12", u: 1 },
  { sp: 0.5 },
];

const NUMBER_ROW = [
  { code: "Backquote", label: "`", u: 1 },
  { code: "Digit1", label: "1", u: 1 }, { code: "Digit2", label: "2", u: 1 },
  { code: "Digit3", label: "3", u: 1 }, { code: "Digit4", label: "4", u: 1 },
  { code: "Digit5", label: "5", u: 1 }, { code: "Digit6", label: "6", u: 1 },
  { code: "Digit7", label: "7", u: 1 }, { code: "Digit8", label: "8", u: 1 },
  { code: "Digit9", label: "9", u: 1 }, { code: "Digit0", label: "0", u: 1 },
  { code: "Minus", label: "-", u: 1 }, { code: "Equal", label: "=", u: 1 },
  { code: "Backspace", label: "Backspace", u: 2, wide: true },
];

const TAB_ROW = [
  { code: "Tab", label: "Tab", u: 1.5, wide: true },
  ...letterKeys(LETTERS_ROW1),
  { code: "BracketLeft", label: "[", u: 1 },
  { code: "BracketRight", label: "]", u: 1 },
  { code: "Backslash", label: "\\", u: 1.5, wide: true },
];

const CAPS_ROW = [
  { code: "CapsLock", label: "Caps", u: 1.75, wide: true },
  ...letterKeys(LETTERS_ROW2),
  { code: "Semicolon", label: ";", u: 1 },
  { code: "Quote", label: "'", u: 1 },
  { code: "Enter", label: "Enter", u: 2.25, wide: true },
];

const SHIFT_ROW = [
  { code: "ShiftLeft", label: "Shift", u: 2.25, wide: true },
  ...letterKeys(LETTERS_ROW3),
  { code: "Comma", label: ",", u: 1 },
  { code: "Period", label: ".", u: 1 },
  { code: "Slash", label: "/", u: 1 },
  { code: "ShiftRight", label: "Shift", u: 2.75, wide: true },
];

const BOTTOM_ROW = [
  { code: "ControlLeft", label: "Ctrl", u: 1.25, wide: true },
  { code: "MetaLeft", label: "Win", u: 1.25, wide: true },
  { code: "AltLeft", label: "Alt", u: 1.25, wide: true },
  { code: "Space", label: "Space", u: 6.25, wide: true },
  { code: "AltRight", label: "Alt", u: 1.25, wide: true },
  { code: "MetaRight", label: "Win", u: 1.25, wide: true },
  { code: "ContextMenu", label: "Menu", u: 1.25, wide: true },
  { code: "ControlRight", label: "Ctrl", u: 1.25, wide: true },
];

const MAIN_ROWS = [FUNCTION_ROW, NUMBER_ROW, TAB_ROW, CAPS_ROW, SHIFT_ROW, BOTTOM_ROW];

// Editing / navigation cluster (optional — laptops often drop these)
const NAV_KEYS = [
  { code: "PrintScreen", label: "PrtSc" }, { code: "ScrollLock", label: "ScrLk" }, { code: "Pause", label: "Pause" },
  { code: "Insert", label: "Ins" }, { code: "Home", label: "Home" }, { code: "PageUp", label: "PgUp" },
  { code: "Delete", label: "Del" }, { code: "End", label: "End" }, { code: "PageDown", label: "PgDn" },
];

const ARROW_KEYS = [
  { code: "ArrowUp", label: "↑" },
  { code: "ArrowLeft", label: "←" },
  { code: "ArrowDown", label: "↓" },
  { code: "ArrowRight", label: "→" },
];

// Numpad (optional). Each key carries its grid position; the tall +/Enter span two
// rows and 0 spans two columns.
const NUMPAD_KEYS = [
  { code: "NumLock", label: "Num", c: 1, r: 1 }, { code: "NumpadDivide", label: "/", c: 2, r: 1 },
  { code: "NumpadMultiply", label: "*", c: 3, r: 1 }, { code: "NumpadSubtract", label: "−", c: 4, r: 1 },
  { code: "Numpad7", label: "7", c: 1, r: 2 }, { code: "Numpad8", label: "8", c: 2, r: 2 },
  { code: "Numpad9", label: "9", c: 3, r: 2 }, { code: "NumpadAdd", label: "+", c: 4, r: 2, rs: 2 },
  { code: "Numpad4", label: "4", c: 1, r: 3 }, { code: "Numpad5", label: "5", c: 2, r: 3 }, { code: "Numpad6", label: "6", c: 3, r: 3 },
  { code: "Numpad1", label: "1", c: 1, r: 4 }, { code: "Numpad2", label: "2", c: 2, r: 4 },
  { code: "Numpad3", label: "3", c: 3, r: 4 }, { code: "NumpadEnter", label: "Enter", c: 4, r: 4, rs: 2 },
  { code: "Numpad0", label: "0", c: 1, r: 5, cs: 2 }, { code: "NumpadDecimal", label: ".", c: 3, r: 5 },
];

export default function KeyboardTester() {
  const [pressed, setPressed] = useState(() => new Set());
  const [tested, setTested] = useState(() => new Set());
  const [last, setLast] = useState(null); // { key, code, keyCode, type }
  const [includeNumpad, setIncludeNumpad] = useState(true);
  const [includeNav, setIncludeNav] = useState(true);
  const [trapKeys, setTrapKeys] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const trapRef = useRef(trapKeys);
  const boardRef = useRef(null);
  useEffect(() => { trapRef.current = trapKeys; }, [trapKeys]);

  // ---- load / save the small preferences ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.includeNumpad === "boolean") setIncludeNumpad(s.includeNumpad);
        if (typeof s.includeNav === "boolean") setIncludeNav(s.includeNav);
        if (typeof s.trapKeys === "boolean") setTrapKeys(s.trapKeys);
      }
    } catch (e) { /* private mode — defaults are fine */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ includeNumpad, includeNav, trapKeys }));
    } catch (e) { /* ignore */ }
  }, [includeNumpad, includeNav, trapKeys, loaded]);

  // ---- the set of codes currently drawn on screen (for the progress readout) ----
  const layoutCodes = useMemo(() => {
    const codes = [];
    MAIN_ROWS.forEach((row) => row.forEach((it) => { if (it.code) codes.push(it.code); }));
    ARROW_KEYS.forEach((k) => codes.push(k.code));
    if (includeNav) NAV_KEYS.forEach((k) => codes.push(k.code));
    if (includeNumpad) NUMPAD_KEYS.forEach((k) => codes.push(k.code));
    return codes;
  }, [includeNumpad, includeNav]);

  const layoutSet = useMemo(() => new Set(layoutCodes), [layoutCodes]);

  // ---- window listeners ----
  useEffect(() => {
    const codeOf = (e) => e.code || ("KEY_" + (e.keyCode || e.which || 0));

    function shouldTrap(e) {
      if (!trapRef.current) return false;
      if (e.ctrlKey || e.metaKey) return false;        // keep browser shortcuts alive
      if (NO_TRAP.has(e.code)) return false;           // F5 / F11 / F12
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "BUTTON" ||
        el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return false;
      return true;                                     // Tab / Space / arrows won't scroll or move focus
    }

    function onKeyDown(e) {
      const code = codeOf(e);
      if (shouldTrap(e)) e.preventDefault();
      setLast({ key: e.key, code, keyCode: e.keyCode || e.which || 0, type: "down" });
      setPressed((prev) => (prev.has(code) ? prev : new Set(prev).add(code)));
      setTested((prev) => (prev.has(code) ? prev : new Set(prev).add(code)));
    }

    function onKeyUp(e) {
      const code = codeOf(e);
      // Some keys (PrintScreen on many browsers) only fire keyup — still mark tested.
      setLast({ key: e.key, code, keyCode: e.keyCode || e.which || 0, type: "up" });
      setTested((prev) => (prev.has(code) ? prev : new Set(prev).add(code)));
      setPressed((prev) => {
        if (!prev.has(code)) return prev;
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }

    // If focus leaves the window, keyup can be lost — clear held keys so nothing
    // shows as stuck by accident. A genuinely stuck key keeps re-firing keydown.
    function clearHeld() { setPressed((prev) => (prev.size ? new Set() : prev)); }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearHeld);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearHeld);
    };
  }, []);

  // ---- fullscreen ----
  const toggleFs = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
      else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } catch (e) { /* fullscreen blocked — inline still works */ }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  const reset = useCallback(() => {
    setTested(new Set());
    setPressed(new Set());
    setLast(null);
  }, []);

  // ---- derived readouts ----
  const testedOnMap = useMemo(
    () => layoutCodes.reduce((n, c) => n + (tested.has(c) ? 1 : 0), 0),
    [layoutCodes, tested]
  );
  const total = layoutCodes.length;
  const pct = total ? Math.round((testedOnMap / total) * 100) : 0;
  const complete = total > 0 && testedOnMap === total;

  const heldList = useMemo(() => Array.from(pressed), [pressed]);
  const lastOffMap = last && !layoutSet.has(last.code);

  // ---- render helpers ----
  const keyClass = (code) => {
    let c = "kb-key";
    if (tested.has(code)) c += " is-tested";
    if (pressed.has(code)) c += " is-pressed";
    return c;
  };

  const renderMainKey = (it, i) => {
    if (it.sp) return <span key={"sp" + i} className="kb-sp" style={{ flex: `0 0 calc(var(--u) * ${it.sp})` }} aria-hidden="true" />;
    return (
      <div
        key={it.code}
        className={keyClass(it.code) + (it.wide ? " kb-wide" : "")}
        style={{ flex: `0 0 calc(var(--u) * ${it.u})` }}
        title={it.code}
      >
        <span className="kb-cap">{it.label}</span>
      </div>
    );
  };

  const renderClusterKey = (k) => (
    <div key={k.code} className={keyClass(k.code)} title={k.code}>
      <span className="kb-cap">{k.label}</span>
    </div>
  );

  return (
    <div className="tool kbt">
      <style>{`
        .kbt .kb-toolbar{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}
        .kbt .kb-check{display:flex;gap:7px;align-items:center;font-size:14px;cursor:pointer;user-select:none;}
        .kbt .kb-scroll{overflow-x:auto;background:#0b0d12;border:1px solid #232838;border-radius:12px;padding:16px;}
        .kbt .kb-scroll:fullscreen{display:flex;align-items:center;justify-content:center;border-radius:0;border:0;}
        .kbt .kb-board{--u:clamp(21px,4.4vw,34px);display:inline-flex;gap:calc(var(--u) * 0.5);align-items:flex-start;
          min-width:min-content;margin:0 auto;}
        .kbt .kb-main{display:flex;flex-direction:column;gap:6px;}
        .kbt .kb-side{display:flex;flex-direction:column;gap:6px;}
        .kbt .kb-row{display:flex;gap:6px;}
        .kbt .kb-sp{height:var(--u);}
        .kbt .kb-key{height:var(--u);display:flex;align-items:center;justify-content:center;box-sizing:border-box;
          background:#171b27;color:#c3cad9;border:1px solid #2b3242;border-bottom:3px solid #202634;border-radius:8px;
          font:600 12px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 2px;overflow:hidden;
          transition:background .04s linear,transform .04s linear;user-select:none;}
        .kbt .kb-key .kb-cap{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
        .kbt .kb-wide{font-size:10.5px;color:#9aa4b8;}
        .kbt .kb-key.is-tested{background:#123528;border-color:#2f7d5b;border-bottom-color:#245f45;color:#79e2ad;}
        .kbt .kb-key.is-pressed{background:#2f6bff;border-color:#6f97ff;border-bottom-color:#2450c8;color:#fff;
          transform:translateY(2px);box-shadow:0 0 0 2px rgba(47,107,255,.35),0 0 16px rgba(47,107,255,.5);}
        .kbt .kb-numpad{display:grid;grid-template-columns:repeat(4,var(--u));grid-auto-rows:var(--u);gap:6px;}
        .kbt .kb-cluster{display:grid;grid-template-columns:repeat(3,var(--u));grid-auto-rows:var(--u);gap:6px;}
        .kbt .kb-cluster.kb-arrows{margin-top:6px;}
        .kbt .kb-readout{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 4px;}
        .kbt .kb-chip{background:var(--surface-2,#f1f3f7);border:1px solid var(--line,#e2e6ee);border-radius:8px;
          padding:8px 12px;font-size:13px;display:flex;flex-direction:column;gap:2px;min-width:90px;}
        .kbt .kb-chip b{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;}
        .kbt .kb-chip span{opacity:.7;font-size:11.5px;text-transform:uppercase;letter-spacing:.4px;}
        .kbt .kb-progress{height:8px;border-radius:5px;background:var(--surface-2,#eef1f6);overflow:hidden;margin:10px 0;}
        .kbt .kb-progress i{display:block;height:100%;background:linear-gradient(90deg,#2f7d5b,#3ecf8e);transition:width .2s ease;}
        .kbt .kb-held{font-size:13.5px;margin:8px 0;}
        .kbt .kb-held code{background:#2f6bff;color:#fff;border-radius:5px;padding:2px 7px;margin:2px 4px 2px 0;
          display:inline-block;font-size:12px;}
        .kbt .kb-done{color:#1f9d63;font-weight:700;}
        @media (prefers-color-scheme:dark){
          .kbt .kb-chip{background:#151924;border-color:#262c3a;}
          .kbt .kb-progress{background:#1b2130;}
        }
      `}</style>

      <div className="kb-toolbar">
        <label className="kb-check">
          <input type="checkbox" checked={trapKeys} onChange={(e) => setTrapKeys(e.target.checked)} />
          Capture keys (stop Tab / Space / arrows scrolling)
        </label>
        <label className="kb-check">
          <input type="checkbox" checked={includeNav} onChange={(e) => setIncludeNav(e.target.checked)} />
          Nav / editing cluster
        </label>
        <label className="kb-check">
          <input type="checkbox" checked={includeNumpad} onChange={(e) => setIncludeNumpad(e.target.checked)} />
          Numpad
        </label>
      </div>

      <div className="kb-scroll" ref={boardRef}>
        <div className="kb-board">
          <div className="kb-main">
            {MAIN_ROWS.map((row, ri) => (
              <div className="kb-row" key={ri}>
                {row.map((it, i) => renderMainKey(it, i))}
              </div>
            ))}
          </div>

          <div className="kb-side">
            {includeNav && (
              <div className="kb-cluster">
                {NAV_KEYS.map(renderClusterKey)}
              </div>
            )}
            <div className="kb-cluster kb-arrows">
              <div className={keyClass("ArrowUp")} title="ArrowUp" style={{ gridColumn: 2, gridRow: 1 }}><span className="kb-cap">{"↑"}</span></div>
              <div className={keyClass("ArrowLeft")} title="ArrowLeft" style={{ gridColumn: 1, gridRow: 2 }}><span className="kb-cap">{"←"}</span></div>
              <div className={keyClass("ArrowDown")} title="ArrowDown" style={{ gridColumn: 2, gridRow: 2 }}><span className="kb-cap">{"↓"}</span></div>
              <div className={keyClass("ArrowRight")} title="ArrowRight" style={{ gridColumn: 3, gridRow: 2 }}><span className="kb-cap">{"→"}</span></div>
            </div>
          </div>

          {includeNumpad && (
            <div className="kb-side">
              <div className="kb-numpad">
                {NUMPAD_KEYS.map((k) => (
                  <div
                    key={k.code}
                    className={keyClass(k.code)}
                    title={k.code}
                    style={{
                      gridColumn: k.cs ? `${k.c} / span ${k.cs}` : k.c,
                      gridRow: k.rs ? `${k.r} / span ${k.rs}` : k.r,
                    }}
                  >
                    <span className="kb-cap">{k.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="kb-progress" aria-hidden="true"><i style={{ width: pct + "%" }} /></div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{testedOnMap}/{total}</div>
          <div className="tool-stat-label">Keys tested</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{pct}%</div>
          <div className="tool-stat-label">Coverage</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{pressed.size}</div>
          <div className="tool-stat-label">Held now</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{last ? last.keyCode : "—"}</div>
          <div className="tool-stat-label">Last keyCode</div>
        </div>
      </div>

      <div className="kb-readout">
        <div className="kb-chip"><b>{last ? last.key === " " ? "Space" : last.key : "—"}</b><span>event.key</span></div>
        <div className="kb-chip"><b>{last ? last.code : "—"}</b><span>event.code</span></div>
        <div className="kb-chip"><b>{last ? last.keyCode : "—"}</b><span>keyCode</span></div>
        <div className="kb-chip"><b>{last ? last.type : "—"}</b><span>last event</span></div>
      </div>

      {lastOffMap && (
        <p className="kb-held">
          <code>{last.code}</code> fired but isn&apos;t drawn on the map above &mdash; it still counts as working.
        </p>
      )}

      <div className="kb-held" role="status" aria-live="polite">
        {heldList.length > 0 ? (
          <>Currently held: {heldList.map((c) => <code key={c}>{c}</code>)}
            <span> &mdash; release them, or if a key stays here on its own it may be stuck.</span>
          </>
        ) : (
          <span style={{ opacity: 0.7 }}>No keys held right now.</span>
        )}
      </div>

      <div className="tool-actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={reset}>Reset tested keys</button>
        <button type="button" className="btn" onClick={toggleFs}>{isFs ? "Exit full screen" : "Full screen"}</button>
      </div>

      {complete && (
        <p className="tool-note kb-done">
          Every key on the current layout has registered at least once &mdash; your keyboard is fully working. Press Reset to run the check again.
        </p>
      )}

      <p className="tool-note" style={{ marginTop: 12 }}>
        Press any key and it lights up on the board. Keys turn green once tested, so you can hit every key to confirm the whole
        board works. Hold several at once to check for ghosting and n-key rollover &mdash; each simultaneous key should stay lit. Keys
        are matched by physical position (<code>event.code</code>), so the map is right on any language layout. Everything runs in
        your browser; nothing is recorded or uploaded.
      </p>
    </div>
  );
}
