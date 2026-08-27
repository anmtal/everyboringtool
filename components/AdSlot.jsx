"use client";

import { useEffect, useRef } from "react";

// A single MANUAL AdSense unit in a fixed, height-reserved box — deliberately NOT
// Auto Ads (which inject anchor/vignette/interstitial units and cause layout
// shift on short utility pages, the exact "ads get in the way" pattern the site
// promises to avoid). Renders NOTHING until a real slot id is supplied, so it is
// safe to place now and dormant until ads go live:
//
//   1. In the AdSense dashboard turn Auto ads OFF for the site.
//   2. Create a display ad unit -> copy its data-ad-slot id.
//   3. Set NEXT_PUBLIC_ADSLOT_TOOL=<that id> in Vercel and redeploy.
//
// The reserved min-height keeps Core Web Vitals (CLS) clean when the ad loads.
const CLIENT = "ca-pub-8757202685549420";

export default function AdSlot({ slot, minHeight = 100, className = "" }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* adsbygoogle not ready / blocked — ignore */
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div
      className={`ad-slot ${className}`.trim()}
      style={{ minHeight, margin: "20px 0", textAlign: "center", overflow: "hidden" }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
