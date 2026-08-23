"use client";

import { useMemo, useState } from "react";

function parseNum(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[, ]+/g, "").trim();
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "0%";
  return `${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function fmtInt(n) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

function benchmark(rate) {
  if (rate <= 0) return { label: "No data yet", note: "Enter your numbers above to see how you compare." };
  if (rate < 1) return { label: "Below average", note: "Under 1% is common for larger accounts, but there is room to grow." };
  if (rate < 3) return { label: "Typical / healthy", note: "1–3% is the normal range for most accounts." };
  if (rate < 6) return { label: "Strong", note: "3–6% signals an engaged, active audience." };
  return { label: "Excellent", note: "Above 6% is outstanding — your audience is highly engaged." };
}

export default function EngagementRateCalculator() {
  const [followers, setFollowers] = useState("");
  const [reach, setReach] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => {
    const f = parseNum(followers);
    const r = parseNum(reach);
    const l = parseNum(likes);
    const c = parseNum(comments);
    const s = parseNum(shares);
    const interactions = l + c + s;

    const byFollowers = f > 0 ? (interactions / f) * 100 : 0;
    const byReach = r > 0 ? (interactions / r) * 100 : 0;

    return {
      f,
      r,
      interactions,
      byFollowers,
      byReach,
      hasFollowers: f > 0,
      hasReach: r > 0,
    };
  }, [followers, reach, likes, comments, shares]);

  const primaryRate = data.hasFollowers ? data.byFollowers : data.byReach;
  const primaryBasisLabel = data.hasFollowers ? "followers" : "reach";
  const bench = benchmark(primaryRate);

  const canCopy = data.interactions > 0 && (data.hasFollowers || data.hasReach);

  const handleCopy = async () => {
    const lines = [
      `Engagement Rate Report`,
      `Total interactions: ${fmtInt(data.interactions)}`,
      data.hasFollowers ? `By followers (${fmtInt(data.f)}): ${fmtPct(data.byFollowers)}` : null,
      data.hasReach ? `By reach (${fmtInt(data.r)}): ${fmtPct(data.byReach)}` : null,
      `Benchmark: ${bench.label}`,
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  };

  const handleReset = () => {
    setFollowers("");
    setReach("");
    setLikes("");
    setComments("");
    setShares("");
    setCopied(false);
  };

  const showNoBasis = data.interactions > 0 && !data.hasFollowers && !data.hasReach;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="er-followers">
              Followers
            </label>
            <input
              id="er-followers"
              className="tool-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 10000"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="er-reach">
              Reach / impressions (optional)
            </label>
            <input
              id="er-reach"
              className="tool-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 4500"
              value={reach}
              onChange={(e) => setReach(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="er-likes">
              Likes / reactions
            </label>
            <input
              id="er-likes"
              className="tool-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 320"
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="er-comments">
              Comments
            </label>
            <input
              id="er-comments"
              className="tool-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 45"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="er-shares">
              Shares / saves
            </label>
            <input
              id="er-shares"
              className="tool-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 28"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showNoBasis && (
        <div className="tool-error">
          Enter a follower count or reach value to calculate an engagement rate.
        </div>
      )}

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">
          Engagement rate (by {primaryBasisLabel})
        </div>
        <div className="tool-result-value">{fmtPct(primaryRate)}</div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmtInt(data.interactions)}</div>
          <div className="tool-stat-label">Total interactions</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {data.hasFollowers ? fmtPct(data.byFollowers) : "—"}
          </div>
          <div className="tool-stat-label">By followers</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {data.hasReach ? fmtPct(data.byReach) : "—"}
          </div>
          <div className="tool-stat-label">By reach</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{bench.label}</div>
          <div className="tool-stat-label">Benchmark</div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCopy}
          disabled={!canCopy}
        >
          {copied ? "Copied!" : "Copy report"}
        </button>
        <button type="button" className="btn" onClick={handleReset}>
          Reset
        </button>
      </div>

      <p className="tool-note">
        {bench.note} Engagement rate = (likes + comments + shares) ÷{" "}
        {primaryBasisLabel} × 100. Rate by reach is usually higher than rate by
        followers, since reach counts only people who actually saw the post. A
        typical benchmark is 1–3%; anything above 6% is exceptional.
      </p>
    </div>
  );
}
