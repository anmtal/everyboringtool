"use client";
import ImageTool from "./_image-tool";

export default function BlackAndWhite() {
  return (
    <ImageTool
      actionLabel="Convert to black & white"
      outType="image/png"
      outExt="png"
      draw={(ctx, img, o, c) => {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        ctx.filter = "grayscale(1)";
        ctx.drawImage(img, 0, 0);
      }}
    />
  );
}
