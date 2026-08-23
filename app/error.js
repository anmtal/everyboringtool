"use client";

import Link from "next/link";

// Route-level error boundary. Without this, any thrown render error shows Next's
// bare default page. Note: the error message itself is deliberately NOT rendered —
// it can contain internals that shouldn't be shown to the public.
export default function Error({ reset }) {
  return (
    <>
      <header className="page-head">
        <h1>Something went wrong</h1>
        <p>
          This page hit an unexpected error. Nothing you uploaded was sent anywhere — all
          processing happens on your device, so simply trying again usually fixes it.
        </p>
      </header>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <Link href="/" className="btn">Back to all tools</Link>
      </div>
    </>
  );
}
