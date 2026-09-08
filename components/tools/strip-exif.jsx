"use client";

import { useState, useRef, useCallback, useEffect } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const rounded = value >= 100 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

// Minimal EXIF reader for JPEG APP1 segments. It only reads a handful of the
// most revealing tags so the tool can HONESTLY show the user what is stored in
// their photo before it is removed. It never uploads anything.
const IFD_TAGS = {
  0x010f: "Make",
  0x0110: "Model",
  0x0131: "Software",
  0x0132: "DateTime",
  0x0112: "Orientation",
  0x8769: "ExifOffset",
  0x8825: "GPSInfo",
};
const EXIF_TAGS = {
  0x9003: "DateTimeOriginal",
  0x9004: "DateTimeDigitized",
  0xa002: "PixelXDimension",
  0xa003: "PixelYDimension",
  0x927c: "LensModel",
};
const GPS_TAGS = {
  0x0001: "GPSLatitudeRef",
  0x0002: "GPSLatitude",
  0x0003: "GPSLongitudeRef",
  0x0004: "GPSLongitude",
  0x0006: "GPSAltitude",
};

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function readValue(view, entryOffset, tiffStart, little) {
  const type = view.getUint16(entryOffset + 2, little);
  const count = view.getUint32(entryOffset + 4, little);
  const size = TYPE_SIZE[type] || 1;
  const total = size * count;
  let valueOffset = entryOffset + 8;
  if (total > 4) valueOffset = tiffStart + view.getUint32(entryOffset + 8, little);

  if (type === 2) {
    let str = "";
    for (let i = 0; i < count; i++) {
      const c = view.getUint8(valueOffset + i);
      if (c === 0) break;
      str += String.fromCharCode(c);
    }
    return str.trim();
  }
  const nums = [];
  for (let i = 0; i < count; i++) {
    const o = valueOffset + i * size;
    if (type === 3) nums.push(view.getUint16(o, little));
    else if (type === 4 || type === 9) nums.push(view.getUint32(o, little));
    else if (type === 5 || type === 10) {
      const n = view.getUint32(o, little);
      const d = view.getUint32(o + 4, little);
      nums.push(d ? n / d : 0);
    } else nums.push(view.getUint8(o));
  }
  return count === 1 ? nums[0] : nums;
}

function readIFD(view, dirStart, tiffStart, little, tagMap) {
  const out = {};
  const entries = view.getUint16(dirStart, little);
  for (let i = 0; i < entries; i++) {
    const entryOffset = dirStart + 2 + i * 12;
    const tag = view.getUint16(entryOffset, little);
    const name = tagMap[tag];
    if (name) out[name] = readValue(view, entryOffset, tiffStart, little);
    else if (tag === 0x8769) out.ExifOffset = readValue(view, entryOffset, tiffStart, little);
    else if (tag === 0x8825) out.GPSInfo = readValue(view, entryOffset, tiffStart, little);
  }
  return out;
}

function toDecimalGPS(parts, ref) {
  if (!Array.isArray(parts) || parts.length < 3) return null;
  let dec = parts[0] + parts[1] / 60 + parts[2] / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return Math.round(dec * 1e6) / 1e6;
}

// Returns a friendly list of metadata fields found, or [] if none/unsupported.
function parseExifFields(buffer) {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return []; // not a JPEG
    let offset = 2;
    const len = view.byteLength;
    while (offset < len - 1) {
      const marker = view.getUint16(offset);
      // Stop at the start-of-scan marker; no metadata segments follow it.
      if (marker === 0xffda) break;
      // Only an APP1 segment carrying the "Exif" header holds EXIF. A non-EXIF
      // APP1 (e.g. XMP) is skipped so a real EXIF block later is still found.
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
        const tiffStart = offset + 10;
        const endian = view.getUint16(tiffStart);
        const little = endian === 0x4949;
        const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, little);
        const ifd0 = readIFD(view, ifd0Offset, tiffStart, little, IFD_TAGS);

        let exif = {};
        if (ifd0.ExifOffset) {
          exif = readIFD(view, tiffStart + ifd0.ExifOffset, tiffStart, little, EXIF_TAGS);
        }
        let gps = {};
        if (ifd0.GPSInfo) {
          gps = readIFD(view, tiffStart + ifd0.GPSInfo, tiffStart, little, GPS_TAGS);
        }

        const fields = [];
        const camera = [ifd0.Make, ifd0.Model].filter(Boolean).join(" ").trim();
        if (camera) fields.push({ label: "Camera / device", value: camera });
        if (exif.LensModel) fields.push({ label: "Lens", value: String(exif.LensModel) });
        if (ifd0.Software) fields.push({ label: "Software", value: String(ifd0.Software) });
        const taken = exif.DateTimeOriginal || ifd0.DateTime || exif.DateTimeDigitized;
        if (taken) fields.push({ label: "Date taken", value: String(taken) });
        if (ifd0.Orientation != null)
          fields.push({ label: "Orientation", value: String(ifd0.Orientation) });

        const lat = toDecimalGPS(gps.GPSLatitude, gps.GPSLatitudeRef);
        const lon = toDecimalGPS(gps.GPSLongitude, gps.GPSLongitudeRef);
        if (lat != null && lon != null) {
          fields.push({ label: "GPS location", value: `${lat}, ${lon}`, sensitive: true });
        }
        return fields;
      }
      // Advance to the next marker segment.
      if (view.getUint8(offset) !== 0xff) break;
      const size = view.getUint16(offset + 2);
      if (size < 2) break;
      offset += 2 + size;
    }
    return [];
  } catch {
    return [];
  }
}

export default function StripExif() {
  const [fileName, setFileName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [outputSize, setOutputSize] = useState(0);
  const [dimensions, setDimensions] = useState(null);
  const [outputUrl, setOutputUrl] = useState("");
  const [outputExt, setOutputExt] = useState("jpg");
  const [foundFields, setFoundFields] = useState([]);
  const [scanned, setScanned] = useState(false);
  const [format, setFormat] = useState("original");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const outputUrlRef = useRef("");
  const lastFileRef = useRef(null);

  const revokeOutput = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
  }, []);

  useEffect(() => () => revokeOutput(), [revokeOutput]);

  const encode = useCallback(
    (image, sourceType) => {
      return new Promise((resolve, reject) => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) {
          reject(new Error("This image has no readable dimensions."));
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get a drawing context in this browser."));
          return;
        }

        let outType;
        if (format === "png") outType = "image/png";
        else if (format === "jpeg") outType = "image/jpeg";
        else outType = sourceType === "image/png" ? "image/png" : "image/jpeg";

        // A white matte avoids black backgrounds when a transparent PNG is
        // flattened into an opaque JPEG.
        if (outType === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(image, 0, 0, width, height);

        const q = outType === "image/jpeg" ? Math.min(1, Math.max(0.1, quality / 100)) : undefined;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not export a clean image from this file."));
              return;
            }
            resolve({ blob, ext: outType === "image/png" ? "png" : "jpg" });
          },
          outType,
          q
        );
      });
    },
    [format, quality]
  );

  const process = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        setError("Please choose an image file (JPG, PNG, WebP, HEIC-converted, etc.).");
        return;
      }
      lastFileRef.current = file;
      revokeOutput();
      setOutputUrl("");
      setOutputSize(0);
      setDimensions(null);
      setError("");
      setFileName(file.name || "photo");
      setOriginalSize(file.size || 0);
      setBusy(true);
      setScanned(false);
      setFoundFields([]);

      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result;
        const fields = buffer instanceof ArrayBuffer ? parseExifFields(buffer) : [];
        setFoundFields(fields);
        setScanned(true);

        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = async () => {
          try {
            const { blob, ext } = await encode(image, file.type);
            revokeOutput();
            const url = URL.createObjectURL(blob);
            outputUrlRef.current = url;
            setOutputUrl(url);
            setOutputExt(ext);
            setOutputSize(blob.size);
            setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
          } catch (err) {
            revokeOutput();
            setOutputUrl("");
            setError(err && err.message ? err.message : "Something went wrong while cleaning.");
          } finally {
            URL.revokeObjectURL(objectUrl);
            setBusy(false);
          }
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          setBusy(false);
          setError("This file could not be read as an image. It may be corrupt or unsupported.");
        };
        image.src = objectUrl;
      };
      reader.onerror = () => {
        setBusy(false);
        setError("Could not read this file in your browser.");
      };
      reader.readAsArrayBuffer(file);
    },
    [encode, revokeOutput]
  );

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    process(file);
    e.target.value = "";
  };

  // Re-run with new format/quality settings on the already-chosen file.
  useEffect(() => {
    if (lastFileRef.current && scanned) process(lastFileRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, quality]);

  const downloadName = () => {
    const base = (fileName || "photo").replace(/\.[^./\\]+$/, "");
    return `${base || "photo"}-clean.${outputExt}`;
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="strip-exif-file">
              Photo to clean
            </label>
            <input
              id="strip-exif-file"
              className="tool-input"
              type="file"
              accept="image/*"
              onChange={onInputChange}
            />
            <p className="tool-note">
              The image is re-encoded in your browser, which drops all EXIF, GPS, camera, and
              editing metadata. Nothing is uploaded.
            </p>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="strip-exif-format">
              Output format
            </label>
            <select
              id="strip-exif-format"
              className="tool-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="original">Keep original (JPG stays JPG, PNG stays PNG)</option>
              <option value="jpeg">JPG (smaller)</option>
              <option value="png">PNG (lossless)</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="strip-exif-quality">
              JPG quality: {quality}
            </label>
            <input
              id="strip-exif-quality"
              className="tool-input"
              type="range"
              min="60"
              max="100"
              step="1"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
            <p className="tool-note">Only affects JPG output. 92 keeps near-original quality.</p>
          </div>
        </div>
      </div>

      {error ? <div className="tool-error">{error}</div> : null}

      {scanned && !error ? (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">Metadata found in the original</div>
          <div className="tool-result-value">
            {foundFields.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {foundFields.map((f) => (
                  <li key={f.label}>
                    <strong>{f.label}:</strong> {f.value}
                    {f.sensitive ? " (this reveals where the photo was taken)" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tool-note" style={{ margin: 0 }}>
                No readable EXIF tags were detected in this file (it may be a PNG/WebP, or the
                metadata may already be stripped). The cleaned copy below is still re-encoded so any
                remaining embedded metadata is removed.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {outputUrl && !error ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(originalSize)}</div>
              <div className="tool-stat-label">Original</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(outputSize)}</div>
              <div className="tool-stat-label">Cleaned</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{foundFields.length}</div>
              <div className="tool-stat-label">Tags removed</div>
            </div>
            {dimensions ? (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {dimensions.width} x {dimensions.height}
                </div>
                <div className="tool-stat-label">Pixels (unchanged)</div>
              </div>
            ) : null}
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Cleaned preview</div>
            <div className="tool-result-value">
              <img
                src={outputUrl}
                alt="Cleaned image with metadata removed"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "6px",
                }}
              />
            </div>
          </div>

          <div className="tool-actions">
            <a className="btn btn-success" href={outputUrl} download={downloadName()} role="button">
              Download clean image
            </a>
          </div>
        </>
      ) : null}

      {busy && !error ? <p className="tool-note">Cleaning…</p> : null}

      {!scanned && !busy && !error ? (
        <p className="tool-note">
          Choose a photo above. The tool shows which hidden details (like GPS location and camera
          info) are stored in the file, then gives you a re-encoded copy with all of it removed —
          entirely in your browser.
        </p>
      ) : null}
    </div>
  );
}
