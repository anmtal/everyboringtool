// Lightweight GA4 event helper. Safe to call anywhere: it no-ops during SSR and
// whenever gtag isn't available (e.g. an ad-blocker), and never throws — analytics
// must never break a tool.
export function trackEvent(name, params) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params || {});
    }
  } catch (e) {
    /* ignore */
  }
}
