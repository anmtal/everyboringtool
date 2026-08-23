"use client";

import { useState, useRef, useEffect } from "react";
import { copyText } from "../../lib/copyText";
import jsQR from "jsqr";

export default function QrCodeScanner() {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => stopCamera(), []);

  function decode(imageData) {
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
    return code ? code.data : null;
  }

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    stopCamera();
    setError("");
    setResult("");
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const text = decode(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (text) setResult(text);
      else setError("No QR code found in that image — try a clearer, closer photo.");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError("Couldn't load that image.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function startCamera() {
    setError("");
    setResult("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      const tick = () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0);
          const text = decode(ctx.getImageData(0, 0, canvas.width, canvas.height));
          if (text) {
            setResult(text);
            stopCamera();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      // If getUserMedia already resolved, the camera is live — tearing it down
      // matters, and blaming "permission" would be wrong (it was granted).
      const gotStream = !!streamRef.current;
      stopCamera();
      setError(
        gotStream
          ? "The camera started but the scanner couldn't run. Try again, or scan an uploaded image instead."
          : "Couldn't access the camera. Allow permission, or scan an uploaded image instead."
      );
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await copyText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const isUrl = /^https?:\/\//i.test(result);

  return (
    <div className="tool">
      <div className="tool-actions">
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          Scan an image
        </button>
        {scanning ? (
          <button type="button" className="btn" onClick={stopCamera}>Stop camera</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={startCamera}>Scan with camera</button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} hidden />
      </div>

      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          display: scanning ? "block" : "none",
          width: "100%",
          maxWidth: 380,
          margin: "4px auto",
          borderRadius: 12,
          background: "#000",
        }}
      />

      {scanning && <p className="tool-note" style={{ textAlign: "center" }}>Point your camera at a QR code…</p>}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Decoded result</p>
            <div className="tool-result-value" style={{ fontSize: 18, wordBreak: "break-all" }}>
              {isUrl ? (
                <a href={result} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                  {result}
                </a>
              ) : (
                result
              )}
            </div>
          </div>
          <div className="tool-actions">
            <button type="button" className={copied ? "btn btn-success" : "btn btn-primary"} onClick={copy}>
              {copied ? "Copied!" : "Copy"}
            </button>
            {isUrl && (
              <a className="btn" href={result} target="_blank" rel="noopener noreferrer">Open link</a>
            )}
          </div>
        </>
      )}

      <p className="tool-note">
        Upload a photo or screenshot of a QR code, or scan live with your camera. Everything runs in your browser —
        images and camera frames are never uploaded.
      </p>
    </div>
  );
}
