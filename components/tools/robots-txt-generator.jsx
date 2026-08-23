"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

function normalizePath(raw) {
  const p = String(raw).trim();
  if (!p) return "";
  // Robots.txt paths are relative to the root and must start with "/".
  // Leave wildcard-first patterns (e.g. "*.pdf") untouched.
  if (p.startsWith("/") || p.startsWith("*")) return p;
  return "/" + p;
}

export default function RobotsTxtGenerator() {
  const [preset, setPreset] = useState("allow-all");
  const [userAgent, setUserAgent] = useState("*");
  const [disallowPaths, setDisallowPaths] = useState(["/admin/"]);
  const [allowPaths, setAllowPaths] = useState([""]);
  const [crawlDelay, setCrawlDelay] = useState("");
  const [sitemap, setSitemap] = useState("");
  const [copied, setCopied] = useState(false);

  const isCustom = preset === "custom";

  const { output, disallowCount, allowCount, lineCount } = useMemo(() => {
    const lines = [];

    if (preset === "allow-all") {
      lines.push("User-agent: *");
      lines.push("Disallow:");
    } else if (preset === "block-all") {
      lines.push("User-agent: *");
      lines.push("Disallow: /");
    } else {
      const ua = userAgent.trim() || "*";
      lines.push("User-agent: " + ua);

      const cleanDisallow = disallowPaths
        .map(normalizePath)
        .filter((p) => p !== "");
      const cleanAllow = allowPaths
        .map(normalizePath)
        .filter((p) => p !== "");

      cleanDisallow.forEach((p) => lines.push("Disallow: " + p));
      cleanAllow.forEach((p) => lines.push("Allow: " + p));

      // If no directives were given, emit an explicit "allow everything" line
      // so the group is still valid rather than empty.
      if (cleanDisallow.length === 0 && cleanAllow.length === 0) {
        lines.push("Disallow:");
      }

      const delayNum = Number(String(crawlDelay).trim());
      if (
        String(crawlDelay).trim() !== "" &&
        Number.isFinite(delayNum) &&
        delayNum >= 0
      ) {
        // Drop a trailing ".0"-style zero fraction for tidiness.
        const delayStr = Number.isInteger(delayNum)
          ? String(delayNum)
          : String(delayNum);
        lines.push("Crawl-delay: " + delayStr);
      }
    }

    const sm = sitemap.trim();
    if (sm) {
      lines.push("");
      lines.push("Sitemap: " + sm);
    }

    const text = lines.join("\n") + "\n";
    const dCount = lines.filter((l) => l.startsWith("Disallow: /")).length;
    const aCount = lines.filter((l) => l.startsWith("Allow: ")).length;

    return {
      output: text,
      disallowCount: dCount,
      allowCount: aCount,
      lineCount: lines.filter((l) => l.trim() !== "").length,
    };
  }, [preset, userAgent, disallowPaths, allowPaths, crawlDelay, sitemap]);

  const sitemapWarn =
    sitemap.trim() !== "" && !/^https?:\/\//i.test(sitemap.trim());

  function updatePath(list, setList, index, value) {
    const next = list.slice();
    next[index] = value;
    setList(next);
  }

  function addPath(list, setList) {
    setList(list.concat(""));
  }

  function removePath(list, setList, index) {
    const next = list.filter((_, i) => i !== index);
    setList(next.length ? next : [""]);
  }

  async function handleCopy() {
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "robots.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setPreset("allow-all");
    setUserAgent("*");
    setDisallowPaths(["/admin/"]);
    setAllowPaths([""]);
    setCrawlDelay("");
    setSitemap("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rtg-preset">
            Preset
          </label>
          <select
            className="tool-select"
            id="rtg-preset"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            <option value="allow-all">Allow all crawlers</option>
            <option value="block-all">Block all crawlers</option>
            <option value="custom">Custom rules</option>
          </select>
          <p className="tool-note">
            {preset === "allow-all"
              ? "Every crawler is welcome to index your whole site."
              : preset === "block-all"
              ? "Every compliant crawler is asked to skip your entire site."
              : "Set your own user-agent, block or allow specific paths, and add a crawl delay."}
          </p>
        </div>

        {isCustom ? (
          <>
            <div className="tool-field">
              <label className="tool-label" htmlFor="rtg-ua">
                User-agent
              </label>
              <input
                className="tool-input"
                id="rtg-ua"
                type="text"
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                placeholder="* (all crawlers)"
              />
              <p className="tool-note">
                Use <code>*</code> for all crawlers, or target one such as{" "}
                <code>Googlebot</code> or <code>Bingbot</code>.
              </p>
            </div>

            <div className="tool-field">
              <label className="tool-label">Disallow paths</label>
              {disallowPaths.map((path, i) => (
                <div className="tool-row" key={"dis-" + i}>
                  <div className="tool-field">
                    <input
                      className="tool-input"
                      type="text"
                      value={path}
                      aria-label={"Disallow path " + (i + 1)}
                      onChange={(e) =>
                        updatePath(
                          disallowPaths,
                          setDisallowPaths,
                          i,
                          e.target.value
                        )
                      }
                      placeholder="/private/"
                    />
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      removePath(disallowPaths, setDisallowPaths, i)
                    }
                    aria-label={"Remove disallow path " + (i + 1)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="tool-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => addPath(disallowPaths, setDisallowPaths)}
                >
                  + Add disallow path
                </button>
              </div>
            </div>

            <div className="tool-field">
              <label className="tool-label">Allow paths</label>
              {allowPaths.map((path, i) => (
                <div className="tool-row" key={"allow-" + i}>
                  <div className="tool-field">
                    <input
                      className="tool-input"
                      type="text"
                      value={path}
                      aria-label={"Allow path " + (i + 1)}
                      onChange={(e) =>
                        updatePath(allowPaths, setAllowPaths, i, e.target.value)
                      }
                      placeholder="/private/public-file.html"
                    />
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => removePath(allowPaths, setAllowPaths, i)}
                    aria-label={"Remove allow path " + (i + 1)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="tool-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => addPath(allowPaths, setAllowPaths)}
                >
                  + Add allow path
                </button>
              </div>
              <p className="tool-note">
                Allow rules let you carve exceptions out of a broader Disallow.
              </p>
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor="rtg-delay">
                Crawl-delay (optional, seconds)
              </label>
              <input
                className="tool-input"
                id="rtg-delay"
                type="number"
                min="0"
                step="1"
                value={crawlDelay}
                onChange={(e) => setCrawlDelay(e.target.value)}
                placeholder="e.g. 10"
              />
              <p className="tool-note">
                A hint some crawlers honor for the seconds to wait between
                requests. Googlebot ignores it; Bing and others may respect it.
              </p>
            </div>
          </>
        ) : null}

        <div className="tool-field">
          <label className="tool-label" htmlFor="rtg-sitemap">
            Sitemap URL (optional)
          </label>
          <input
            className="tool-input"
            id="rtg-sitemap"
            type="text"
            value={sitemap}
            onChange={(e) => setSitemap(e.target.value)}
            placeholder="https://example.com/sitemap.xml"
          />
          {sitemapWarn ? (
            <p className="tool-error">
              Sitemap should be an absolute URL starting with http:// or
              https://
            </p>
          ) : (
            <p className="tool-note">
              Point crawlers at your sitemap. Use the full absolute URL.
            </p>
          )}
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{disallowCount}</div>
          <div className="tool-stat-label">disallow rules</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{allowCount}</div>
          <div className="tool-stat-label">allow rules</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{lineCount}</div>
          <div className="tool-stat-label">directives</div>
        </div>
      </div>

      <div className="tool-field">
        <div className="tool-actions">
          <button
            className={copied ? "btn btn-success" : "btn btn-primary"}
            type="button"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy robots.txt"}
          </button>
          <button className="btn btn-success" type="button" onClick={handleDownload}>
            Download robots.txt
          </button>
          <button className="btn" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
        <label className="tool-label" htmlFor="rtg-output">
          Generated robots.txt
        </label>
        <pre className="tool-output" id="rtg-output">
          {output}
        </pre>
        <p className="tool-note">
          Save this as <code>robots.txt</code> in the root of your domain so it
          resolves at <code>https://yoursite.com/robots.txt</code>. It is a
          public, advisory file: well-behaved crawlers follow it, but it is not
          a security control.
        </p>
      </div>
    </div>
  );
}
