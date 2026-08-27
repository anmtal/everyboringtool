"use client";
import ImageTool from "./_image-tool";

export default function RoundImage() {
  return (
    <ImageTool
      actionLabel="Make round"
      outType="image/png"
      outExt="png"
      note={<p className="tool-note">Exported as a PNG with a transparent background, ideal for a round profile picture.</p>}
      draw={(ctx, img, o, c) => {
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        c.width = s; c.height = s;
        ctx.save();
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const sx = (img.naturalWidth - s) / 2;
        const sy = (img.naturalHeight - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, s, s);
        ctx.restore();
      }}
    />
  );
}
