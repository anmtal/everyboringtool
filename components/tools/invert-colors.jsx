"use client";
import ImageTool from "./_image-tool";

export default function InvertColors() {
  return (
    <ImageTool
      actionLabel="Invert colors"
      draw={(ctx, img, o, c) => {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        // ctx.filter isn't supported everywhere (and fails silently, returning
        // the original image), so invert the pixels by hand instead.
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          px[i] = 255 - px[i];
          px[i + 1] = 255 - px[i + 1];
          px[i + 2] = 255 - px[i + 2];
          // px[i + 3] (alpha) is left as-is.
        }
        ctx.putImageData(data, 0, 0);
      }}
    />
  );
}
