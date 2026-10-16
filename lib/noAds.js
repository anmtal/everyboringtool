// Tool pages that must never render an ad unit, even when ads are switched on
// (NEXT_PUBLIC_ADSENSE_ENABLED=1 + NEXT_PUBLIC_ADSLOT_TOOL).
//
// classroom-timer: made to be projected in front of a class, so its audience
// includes children. AdSense policy and COPPA call for caution with
// child-directed pages; the simple, safe answer is no ads there at all.
//
// (The /embed/* pages need no entry: they render no AdSlot, and the gate in
// app/layout.js pauses ad requests on them.)
export const NO_ADS_SLUGS = new Set(["classroom-timer"]);

export function adsAllowedOn(slug) {
  return !NO_ADS_SLUGS.has(slug);
}
