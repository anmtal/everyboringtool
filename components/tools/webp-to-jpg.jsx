"use client";
import ImageTool from "./_image-tool";

export default function WebpToJpg() {
  return (
    <ImageTool
      fileLabel="Choose a WebP image"
      actionLabel="Convert to JPG"
      outType="image/jpeg"
      outQuality={0.92}
      outExt="jpg"
      draw={(ctx, img, o, c) => {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        // JPG has no transparency — flatten onto white so transparent areas
        // don't turn black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
      }}
    />
  );
}
