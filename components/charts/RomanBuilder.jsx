"use client";

import { useState } from "react";
import Link from "next/link";
import { isRomanRange, romanParts, toRoman } from "../../lib/roman";

const PLACE_LABEL = { thousands: "Thousands", hundreds: "Hundreds", tens: "Tens", ones: "Ones" };

// Inline place-value builder: type a number, see it split into thousands,
// hundreds, tens and ones, each looked up in the building-blocks table.
export default function RomanBuilder({ initial = 1994 }) {
  const [raw, setRaw] = useState(String(initial));
  const t = raw.trim();
  const n = /^\d+$/.test(t) ? parseInt(t, 10) : NaN;
  const ok = isRomanRange(n);
  const parts = ok ? romanParts(n) : [];

  return (
    <div className="rn-builder tool-result">
      <div className="tool-field" style={{ maxWidth: 320 }}>
        <label className="tool-label" htmlFor="rn-build-input">Type a number from 1 to 3999</label>
        <input
          id="rn-build-input"
          className="tool-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>
      <div role="status" aria-live="polite" style={{ marginTop: 14 }}>
        {t === "" ? (
          <p className="tool-note">Enter a whole number to see how it is built.</p>
        ) : !ok ? (
          <p className="tool-error">Standard Roman numerals run from 1 to 3999. Enter a whole number in that range.</p>
        ) : (
          <>
            <div className="rn-build-parts">
              {parts.map((p) => (
                <div className="tool-stat" key={p.place}>
                  <div className="tool-stat-label">{PLACE_LABEL[p.place]}: {p.value.toLocaleString("en-US")}</div>
                  <div className="tool-stat-num rn-numeral">{p.numeral}</div>
                </div>
              ))}
            </div>
            <p className="rn-build-sum">
              {n.toLocaleString("en-US")} = {parts.map((p) => p.numeral).join(" + ")} = <strong className="rn-numeral">{toRoman(n)}</strong>
            </p>
          </>
        )}
      </div>
      <p className="tool-note" style={{ marginTop: 10 }}>
        Need to go the other way, or decode a date?{" "}
        <Link href="/converters/roman-numeral-converter" style={{ textDecoration: "underline" }}>
          Open the two-way Roman Numeral Converter
        </Link>
        .
      </p>
    </div>
  );
}
