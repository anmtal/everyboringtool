import Link from "next/link";
import { SITE } from "../lib/tools";
import ToolMount from "./ToolMount";
import AdSlot from "./AdSlot";

// Generic renderer for a tool's long-tail landing page. Each landing page embeds
// the SAME tool engine (preset via cfg.toolProps) but carries its own unique copy
// (cfg), so pages are genuinely distinct, not templated duplicates. Reusable
// across tools — the flagship is named in cfg (flagshipName / flagshipUrl).
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function formatUpdated(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${MONTHS[month - 1]} ${Number(m[3])}, ${m[1]}`;
}

export default function ToolLandingPage({ cfg }) {
  const abs = (p) => `${SITE.url}${p}`;
  const updated = cfg.updated;
  const updatedLabel = formatUpdated(updated);
  const flagshipUrl = cfg.flagshipUrl;
  const flagshipName = cfg.flagshipName;

  const graph = [];
  if (cfg.faq && cfg.faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: cfg.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }
  graph.push({
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: flagshipName, item: abs(flagshipUrl) },
      { "@type": "ListItem", position: 3, name: cfg.crumbName, item: abs(cfg.url) },
    ],
  });
  graph.push({
    "@type": "WebApplication",
    name: cfg.h1,
    url: abs(cfg.url),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    dateModified: updated,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE.url}/#website` },
    publisher: { "@id": `${SITE.url}/#org` },
  });
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };
  const siblings = (cfg.siblings || []).filter(Boolean);

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <Link href={flagshipUrl}>{flagshipName}</Link>
        <span className="sep">/</span>
        <span>{cfg.crumbName}</span>
      </nav>

      <header className="page-head">
        <h1>{cfg.h1}</h1>
        <p>{cfg.lede}</p>
        {updatedLabel && (
          <div className="tool-note tool-updated" style={{ marginTop: 10 }}>
            Updated <time dateTime={updated}>{updatedLabel}</time>
          </div>
        )}
      </header>

      <ToolMount slug={cfg.toolSlug} props={cfg.toolProps} />

      {cfg.howto && cfg.howto.length > 0 && (
        <section className="tool-howto">
          <h2 className="tool-h2">How to use the {cfg.crumbName.toLowerCase()}</h2>
          <ol>{cfg.howto.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </section>
      )}

      <Link href={flagshipUrl} className="tool-next">
        <span className="tool-next-eyebrow">Try next →</span>
        <span className="tool-next-name">{flagshipName}</span>
        <span className="tool-next-desc">{cfg.flagshipDesc || "The full tool."}</span>
      </Link>

      {cfg.about && (
        <section className="tool-about">
          <h2 className="tool-h2">About the {cfg.crumbName.toLowerCase()}</h2>
          {cfg.about.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
        </section>
      )}

      {cfg.faq && cfg.faq.length > 0 && (
        <section className="tool-faq">
          <h2 className="tool-h2">Frequently asked questions</h2>
          <dl>
            {cfg.faq.map((f, i) => (
              <div className="faq-item" key={i}><dt>{f.q}</dt><dd>{f.a}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {siblings.length > 0 && (
        <section className="tool-related">
          <h2 className="tool-h2">More {cfg.clusterLabel || "versions"}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link href={flagshipUrl} className="badge" style={{ textDecoration: "none" }}>{flagshipName}</Link>
            {siblings.map((s) => (
              <Link key={s.url} href={s.url} className="badge" style={{ textDecoration: "none" }}>{s.name}</Link>
            ))}
          </div>
        </section>
      )}

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSLOT_TOOL} minHeight={280} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
