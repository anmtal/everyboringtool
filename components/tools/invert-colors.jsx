"use client";
import ImageTool from "./_image-tool";

export default function InvertColors() {
  return (
    <ImageTool
      actionLabel="Invert colors"
      draw={(ctx, img, o, c) => {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        ctx.filter = "invert(1)";
        ctx.drawImage(img, 0, 0);
      }}
    />
  );
}
