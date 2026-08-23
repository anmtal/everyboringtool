"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function isAcceptedImage(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name || "");
}

// Load a File into an <img> and read its natural pixel dimensions.
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = url;
  });
}

export default function JpgToPdf() {
  const [items, setItems] = useState([]); // { id, file, name, url, width, height, type }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const inputRef = useRef(null);
  const idRef = useRef(0);
  const itemsRef = useRef([]);
  const dlRef = useRef("");

  // Keep refs in sync for unmount cleanup.
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    dlRef.current = downloadUrl;
  }, [downloadUrl]);

  // Revoke every object URL when the component unmounts.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => it.url && URL.revokeObjectURL(it.url));
      if (dlRef.current) URL.revokeObjectURL(dlRef.current);
    };
  }, []);

  const clearDownload = useCallback(() => {
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, []);

  const addFiles = useCallback(
    async (list) => {
      const images = Array.from(list || []).filter(isAcceptedImage);
      if (!images.length) {
        if (list && list.length) setError("Please choose JPG, PNG, or WebP images.");
        return;
      }
      setError("");
      clearDownload();
      const loaded = [];
      for (const file of images) {
        const url = URL.createObjectURL(file);
        try {
          const img = await loadImage(url);
          const width = img.naturalWidth || img.width || 0;
          const height = img.naturalHeight || img.height || 0;
          if (!width || !height) {
            URL.revokeObjectURL(url);
            continue;
          }
          loaded.push({
            id: ++idRef.current,
            file,
            name: file.name || `image-${idRef.current}`,
            url,
            width,
            height,
            type: file.type || "",
          });
        } catch {
          URL.revokeObjectURL(url);
        }
      }
      if (!loaded.length) {
        setError("None of those images could be read.");
        return;
      }
      setItems((prev) => [...prev, ...loaded]);
    },
    [clearDownload]
  );

  function onInput(e) {
    addFiles(e.target.files);
    e.target.value = "";
  }
  function onDrop(e) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }
  function move(i, dir) {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    clearDownload();
  }
  function remove(id) {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target && target.url) URL.revokeObjectURL(target.url);
      return prev.filter((it) => it.id !== id);
    });
    clearDownload();
  }
  function clearAll() {
    setItems((prev) => {
      prev.forEach((it) => it.url && URL.revokeObjectURL(it.url));
      return [];
    });
    clearDownload();
    setError("");
  }

  // Convert any image File to PNG bytes via a canvas (used for webp / unknown types).
  async function toPngBytes(item) {
    const img = await loadImage(item.url);
    const canvas = document.createElement("canvas");
    canvas.width = item.width;
    canvas.height = item.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");
    ctx.drawImage(img, 0, 0, item.width, item.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not convert image.");
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function build() {
    if (!items.length) {
      setError("Add at least one image first.");
      return;
    }
    setBusy(true);
    setError("");
    clearDownload();
    try {
      const pdf = await PDFDocument.create();
      for (const item of items) {
        const type = (item.type || "").toLowerCase();
        const isJpg = type === "image/jpeg" || type === "image/jpg" || /\.jpe?g$/i.test(item.name);
        const isPng = type === "image/png" || /\.png$/i.test(item.name);

        let embedded;
        if (isJpg) {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          embedded = await pdf.embedJpg(bytes);
        } else if (isPng) {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          embedded = await pdf.embedPng(bytes);
        } else {
          // WebP, BMP, GIF, or anything else: rasterize to PNG first.
          const bytes = await toPngBytes(item);
          embedded = await pdf.embedPng(bytes);
        }

        const w = embedded.width;
        const h = embedded.height;
        const page = pdf.addPage([w, h]);
        page.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
      }
      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch {
      setError("Couldn't build the PDF — one of the images may be corrupted or in an unsupported format.");
    } finally {
      setBusy(false);
    }
  }

  const pageLabel = items.length === 1 ? "1 page" : `${items.length} pages`;

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <label className="tool-label" htmlFor="jpg-to-pdf-input" style={{ cursor: "pointer" }}>
          Images to combine
        </label>
        <input
          id="jpg-to-pdf-input"
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",") + ",image/*"}
          multiple
          onChange={onInput}
          hidden
        />
        <p className="dropzone-title">Drop JPG, PNG, or WebP images here, or click to choose</p>
        <p className="dropzone-sub">
          Your images never leave your device — the PDF is built right in your browser.
        </p>
      </div>

      {items.length > 0 && (
        <ul className="filelist">
          {items.map((it, i) => (
            <li className="fileitem" key={it.id}>
              <span className="fileidx">{i + 1}</span>
              <img
                src={it.url}
                alt={it.name}
                width={44}
                height={44}
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid rgba(128,128,128,0.35)",
                  flex: "0 0 auto",
                }}
              />
              <span className="filename">
                {it.name}
                <span className="tool-note" style={{ margin: 0 }}>
                  {it.width} × {it.height} px
                </span>
              </span>
              <span className="fileactions">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${it.name} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  aria-label={`Move ${it.name} down`}
                >
                  ↓
                </button>
                <button type="button" onClick={() => remove(it.id)} aria-label={`Remove ${it.name}`}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{items.length}</div>
            <div className="tool-stat-label">{items.length === 1 ? "Image" : "Images"}</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{pageLabel.split(" ")[0]}</div>
            <div className="tool-stat-label">PDF pages</div>
          </div>
        </div>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={build}
          disabled={busy || items.length === 0}
        >
          {busy ? "Building PDF…" : items.length ? `Create PDF (${pageLabel})` : "Create PDF"}
        </button>
        {items.length > 0 && (
          <button type="button" className="btn" onClick={clearAll} disabled={busy}>
            Clear all
          </button>
        )}
        {downloadUrl && (
          <a className="btn btn-success" href={downloadUrl} download="images.pdf">
            ↓ Download PDF
          </a>
        )}
      </div>

      <p className="tool-note">
        Each image becomes its own page, sized exactly to that image. Reorder with the arrows before
        creating the PDF.
      </p>
    </div>
  );
}
