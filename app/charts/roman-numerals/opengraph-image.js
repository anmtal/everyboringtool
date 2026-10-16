import { ImageResponse } from "next/og";
import { toRoman } from "../../../lib/roman";

// Social / link preview for the Roman numerals chart: the 1-100 chart itself,
// drawn from lib/roman.js like everything else on the page, with next/og's
// bundled font (no font fetch). Edge runtime, like the site-wide app/opengraph-image.js.
export const runtime = "edge";
export const alt = "Roman numerals chart from 1 to 100: every number with its numeral in a 10 by 10 grid";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const rows = Array.from({ length: 10 }, (_, r) => Array.from({ length: 10 }, (_, c) => r * 10 + c + 1));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f7f6f3", color: "#14130f", fontFamily: "sans-serif", padding: 30 }}>
        <div style={{ width: 330, display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 26 }}>
          <div style={{ display: "flex", fontSize: 22, color: "#6a6862" }}>everyboringtool.com</div>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em", marginTop: 14 }}>Roman Numerals Chart</div>
          <div style={{ display: "flex", fontSize: 24, color: "#14130f", marginTop: 18, lineHeight: 1.3 }}>1–100 · 1–1000 · Years</div>
          <div style={{ display: "flex", fontSize: 22, color: "#6a6862", marginTop: 10, lineHeight: 1.3 }}>Free printable charts and worksheets</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ffffff", border: "2px solid #d6d2c8", borderRadius: 16, padding: 8 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", flex: 1 }}>
              {row.map((n) => (
                <div key={n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderTop: i ? "1px solid #e6e3dc" : "none" }}>
                  <div style={{ display: "flex", fontSize: 12, color: "#6f6c64" }}>{n}</div>
                  <div style={{ display: "flex", fontSize: 16, color: "#14130f" }}>{toRoman(n)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
