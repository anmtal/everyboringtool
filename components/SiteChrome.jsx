"use client";

import { usePathname } from "next/navigation";

// Wraps the site chrome in app/layout.js (skip link, header + category nav,
// footer) and leaves it out on /embed/* pages, which other sites show in an
// iframe and which must contain only the tool. Client components add no DOM of
// their own, so every other page's HTML is unchanged; usePathname() is known
// during static rendering, so the embed pages' HTML is built without the chrome.
function isEmbedPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/embed/");
}

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  if (isEmbedPath(pathname)) return null;
  return children;
}
