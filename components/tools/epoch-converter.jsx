"use client";

import { useState } from "react";

export default function EpochConverter() {
  const [epoch, setEpoch] = useState("");
  const [dt, setDt] = useState("");

  let epochOut = null, epochErr = "";
  if (epoch.trim()) {
    const n = Number(epoch.trim());
    if (!Number.isFinite(n)) epochErr = "Enter a number.";
    else {
      const isMs = Math.abs(n) >= 1e12;
      const d = new Date(isMs ? n : n * 1000);
      if (isNaN(d.getTime())) epochErr = "That timestamp is out of range.";
      else epochOut = { utc: d.toUTCString(), local: d.toString(), iso: d.toISOString(), unit: isMs ? "milliseconds" : "seconds" };
    }
  }

  let dateOut = null;
  if (dt) {
    const d = new Date(dt);
    if (!isNaN(d.getTime())) dateOut = { sec: Math.floor(d.getTime() / 1000), ms: d.getTime() };
  }

  function nowEpoch() { setEpoch(String(Math.floor(Date.now() / 1000))); }

  const Row = ({ label, value }) => (
    <div className="stat-row" style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px dashed var(--border)", fontSize: 14 }}>
      <span className="tool-note" style={{ margin: 0 }}>{label}</span>
      <span style={{ fontFamily: "ui-monospace, monospace", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="ec-epoch">Unix timestamp → date</label>
        <input id="ec-epoch" className="tool-input" type="text" inputMode="numeric" value={epoch} onChange={(e) => setEpoch(e.target.value)} placeholder="e.g. 1700000000" />
        <div className="tool-actions" style={{ marginTop: 6 }}>
          <button type="button" className="btn" onClick={nowEpoch}>Use current time</button>
        </div>
        {epochErr && <p className="tool-error" role="alert">{epochErr}</p>}
        {epochOut && (
          <div style={{ marginTop: 8 }}>
            <Row label="UTC" value={epochOut.utc} />
            <Row label="Your local time" value={epochOut.local} />
            <Row label="ISO 8601" value={epochOut.iso} />
            <Row label="Read as" value={epochOut.unit} />
          </div>
        )}
      </div>

      <div className="tool-field" style={{ marginTop: 16 }}>
        <label className="tool-label" htmlFor="ec-dt">Date → Unix timestamp</label>
        <input id="ec-dt" className="tool-input" type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
        {dateOut && (
          <div style={{ marginTop: 8 }}>
            <Row label="Epoch (seconds)" value={dateOut.sec} />
            <Row label="Epoch (milliseconds)" value={dateOut.ms} />
          </div>
        )}
      </div>

      <p className="tool-note">A Unix timestamp counts from 1 Jan 1970 UTC. Values of 13+ digits are read as milliseconds. Everything is computed in your browser.</p>
    </div>
  );
}
