// Embed program: tools that other sites may show in an iframe from
// /embed/<slug> (app/embed/[slug]/page.js). Adding a slug here
//   - builds its /embed page (static, noindex, no site header/footer),
//   - shows the "Embed this tool" box with a copy-paste snippet on its tool page.
// /embed/* pages are ad-free and analytics-free (the gate in app/layout.js) and
// are the only pages other sites may frame (the /embed headers in next.config.mjs).
// Add the slug to lib/embedSlugs.mjs too: next.config.mjs builds the framing
// headers from that list, and the check below fails the build if they differ.
//
// Fields:
//   title  - the tool's name (iframe title and credit line)
//   path   - the canonical tool page the credit links to (checked at build time)
//   credit - the credit line shown under the embedded tool
//   height - iframe height in px used in the snippet
import { SITE } from "./tools";
import { EMBED_SLUGS } from "./embedSlugs.mjs";

export const EMBEDS = {
  "classroom-timer": {
    title: "Classroom Timer",
    path: "/datetime/classroom-timer",
    credit: "Classroom Timer by Every Boring Tool",
    // Fits with the credit line from 320px to 720px wide (the compact embed
    // rules in app/globals.css take over below 720px).
    height: 460,
  },
  "wheel-of-names": {
    title: "Wheel of Names",
    path: "/games/wheel-of-names",
    credit: "Wheel of Names by Every Boring Tool",
    // Tall enough at 720px wide to show the winner card under the wheel.
    height: 880,
  },
};

{
  const keys = Object.keys(EMBEDS).sort().join(",");
  const listed = [...EMBED_SLUGS].sort().join(",");
  if (keys !== listed) {
    throw new Error(`lib/embeds.js lists [${keys}] but lib/embedSlugs.mjs (the framing headers) lists [${listed}]`);
  }
}

export function getEmbed(slug) {
  return Object.prototype.hasOwnProperty.call(EMBEDS, slug) ? EMBEDS[slug] : null;
}

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The HTML a site owner pastes in: the iframe plus a plain credit line.
export function embedSnippet(slug) {
  const e = getEmbed(slug);
  if (!e) return "";
  const base = SITE.url;
  return [
    `<iframe src="${base}/embed/${slug}" title="${escAttr(e.title)}" width="100%" height="${e.height}" style="border:0;max-width:720px" allow="fullscreen" loading="lazy"></iframe>`,
    `<p style="font:13px/1.4 sans-serif;margin:4px 0 0">${escText(e.title)} by <a href="${base}${e.path}" rel="nofollow">Every Boring Tool</a></p>`,
  ].join("\n");
}
