import { ImageResponse } from "next/og";

// Site-wide social preview card. Without this, every link shared to Instagram,
// WhatsApp, X or Slack rendered with no image at all.
export const runtime = "edge";
export const alt = "Every Boring Tool — every boring tool you need, in one simple place";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#f7f6f3",
          color: "#14130f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, color: "#6a6862", letterSpacing: "-0.01em" }}>
          everyboringtool.com
        </div>
        <div
          style={{
            fontSize: 82,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            marginTop: 20,
          }}
        >
          Every boring tool
          <br />
          you need. One place.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 44, flexWrap: "wrap" }}>
          {["Free forever", "No sign-up", "Runs in your browser"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 26,
                color: "#14130f",
                border: "2px solid #d6d2c8",
                borderRadius: 999,
                padding: "10px 24px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
