"use client";
import ImageTool from "./_image-tool";

export default function SepiaImage() {
  return (
    <ImageTool
      actionLabel="Apply sepia"
      draw={(ctx, img, o, c) => {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        ctx.filter = "sepia(1)";
        ctx.drawImage(img, 0, 0);
      }}
    />
  );
}
