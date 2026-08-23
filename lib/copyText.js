/**
 * Copy text to the clipboard, with a fallback.
 *
 * navigator.clipboard is unavailable on insecure origins, in some in-app
 * browsers (Instagram's especially — a large share of this site's traffic), and
 * whenever the permission is refused. Tools called it directly inside a
 * try/catch whose catch body was empty, so those users clicked "Copy" and
 * nothing happened at all, with no explanation.
 *
 * Tries the async Clipboard API first, then a hidden-textarea execCommand
 * fallback. THROWS if both fail, so existing catch blocks still run and no tool
 * shows a false "Copied!" confirmation.
 */
export async function copyText(text) {
  const value = String(text ?? "");

  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through to the legacy path */
    }
  }

  if (typeof document === "undefined") throw new Error("clipboard-unavailable");

  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "");
  // Keep it off-screen but still focusable, and avoid scrolling the page.
  ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;";
  document.body.appendChild(ta);
  try {
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    if (!ok) throw new Error("clipboard-unavailable");
    return true;
  } finally {
    document.body.removeChild(ta);
  }
}
