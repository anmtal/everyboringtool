"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isEmbedPath } from "../lib/embedSlugs.mjs";

// Wraps the site chrome in app/layout.js (skip link, header + category nav,
// footer) and leaves it out on the /embed/<slug> pages (lib/embedSlugs.mjs),
// which other sites show in an iframe and which must contain only the tool.
// Client components add no DOM of their own, so every other page's HTML is
// unchanged; usePathname() is known during static rendering, so the embed
// pages' HTML is built without the chrome. The match is exact (case included),
// so a 404 under /embed/ keeps the chrome and its way back into the site.
export default function SiteChrome({ children }) {
  const pathname = usePathname();
  if (isEmbedPath(pathname)) return null;
  return children;
}

// The path of the document the browser actually loaded: the one whose framing
// headers (X-Frame-Options, frame-ancestors) it checked. A client-side
// navigation (next/link, router.push) changes the URL without loading a new
// document, so the page it leads to is never checked against its own headers.
const DOC_PATH = typeof window === "undefined" ? null : window.location.pathname;

// True inside a frame whose top page is on another origin. A same-origin parent
// (our own previews and tests) can be read; a cross-origin one throws.
function framedCrossOrigin() {
  if (window.self === window.top) return false;
  try {
    void window.top.location.href;
    return false;
  } catch (e) {
    return true;
  }
}

// Rendered once, in app/layout.js. If a client-side navigation inside another
// site's frame leaves the embed page for any other page (say the Link in
// app/error.js), load that page as a real document instead: the browser then
// applies its X-Frame-Options / frame-ancestors 'self' and blocks it. A page
// whose own document was allowed into a cross-origin frame is never reloaded
// (that would loop); the inline frame guard in app/layout.js hides it instead.
export function FrameGuard() {
  const pathname = usePathname();
  useEffect(() => {
    const path = window.location.pathname;
    if (path === DOC_PATH || isEmbedPath(path) || !framedCrossOrigin()) return;
    window.location.replace(window.location.href);
  }, [pathname]);
  return null;
}
