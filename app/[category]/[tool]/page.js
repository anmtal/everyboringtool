import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, getTool, getToolBySlug, SITE, LAST_UPDATED } from "../../../lib/tools";
import { toolContent } from "../../../lib/toolContent";
import { toolHowto } from "../../../lib/toolHowto";
import { relatedSlugs } from "../../../lib/related";
import ToolMount from "../../../components/ToolMount";
import AdSlot from "../../../components/AdSlot";
import { ymylNote } from "../../../lib/ymyl";

// The tool list is a closed set defined in lib/tools — every valid URL is
// enumerated below, so unknown slugs 404 instead of rendering an empty shell.
export const dynamicParams = false;

export function generateStaticParams() {
  const params = [];
  for (const c of categories) {
    for (const t of c.tools) {
      params.push({ category: c.slug, tool: t.slug });
    }
  }
  return params;
}

// tools.js descriptions are ~23 chars on average — far too short for a meta
// description, so Google rewrites them. Prefer a hand-written metaDescription
// when the tool has one; otherwise fall back to the tool's About copy, cut at a
// real sentence boundary so the snippet never ends mid-thought.
function metaDescription(t, content) {
  const hand = content && content.metaDescription ? String(content.metaDescription).replace(/\s+/g, " ").trim() : "";
  if (hand) return hand;
  const about = (content && content.about ? content.about : "").replace(/\s+/g, " ").trim();
  const base = about || `${t.description} Free, no sign-up, and it runs right in your browser.`;
  if (base.length <= 155) return base;
  // Longest prefix (<= 155 chars) that ends on a sentence terminator followed by
  // whitespace. The 156-char window lets a terminator at index 154 still count.
  const m = base.slice(0, 156).match(/^[\s\S]*[.!?](?=\s)/);
  if (m && m[0].trim().length >= 60) return m[0].trim();
  // No usable sentence break: cut at the last word boundary <= 152 and close the
  // sentence with a period rather than a mid-sentence ellipsis.
  let cut = base.slice(0, 152);
  const sp = cut.lastIndexOf(" ");
  if (sp >= 60) cut = cut.slice(0, sp);
  return cut.replace(/[\s,;:.!?–—-]+$/, "") + ".";
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2026-08-26" -> "August 26, 2026". Parsed by hand so a timezone offset can't
// shift the rendered day off the date we actually claim in the JSON-LD.
function formatUpdated(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${MONTHS[month - 1]} ${Number(m[3])}, ${m[1]}`;
}

export function generateMetadata({ params }) {
  const t = getTool(params.category, params.tool);
  if (!t) return {};
  const content = toolContent[params.tool];
  const built = !!content;
  const url = `/${params.category}/${params.tool}`;
  const description = metaDescription(t, content);
  // Optional per-tool SEO title (lib/toolContent seoTitle) for pages where the
  // bare tool name leaves search intent on the table; falls back to the name.
  const title = content && content.seoTitle ? content.seoTitle : t.name;
  // Nested route segments do NOT inherit the root app/opengraph-image.js card,
  // so tool shares rendered as blank cards. Point them at the generated card
  // explicitly (metadataBase resolves it to an absolute URL).
  const ogImage = "/opengraph-image";
  return {
    title,
    description,
    // Coming-soon stubs stay out of the index until the tool actually works.
    robots: built ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default function ToolPage({ params }) {
  const c = getCategory(params.category);
  const t = getTool(params.category, params.tool);
  if (!c || !t) notFound();

  const content = toolContent[t.slug];

  const crumb = (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span className="sep">/</span>
      <Link href={`/${c.slug}`}>{c.name}</Link>
      <span className="sep">/</span>
      <span>{t.name}</span>
    </nav>
  );

  if (!content) {
    return (
      <>
        {crumb}
        <header className="page-head">
          <h1>{t.name}</h1>
          <p>{t.description}</p>
        </header>
        <div className="empty tool-stub">
          <span className="stub-badge">Coming soon</span>
          <p style={{ margin: 0 }}>The shell is live — this tool is next on the build list.</p>
          <Link href={`/${c.slug}`} className="btn">← Back to {c.name}</Link>
        </div>
      </>
    );
  }

  // One @graph carrying every JSON-LD type for the page: FAQPage (when present),
  // BreadcrumbList (mirrors the visible breadcrumb) and a minimal WebApplication
  // node describing the free browser tool. No aggregateRating without real data.
  // One honest "last reviewed" date, shown on the page and claimed in the
  // JSON-LD, so the two can never drift apart.
  const updated = content.updated || LAST_UPDATED;
  const updatedLabel = formatUpdated(updated);

  const abs = (p) => `${SITE.url}${p}`;
  const graph = [];
  if (content.faq && content.faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: content.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  graph.push({
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: c.name, item: abs(`/${c.slug}`) },
      { "@type": "ListItem", position: 3, name: t.name, item: abs(`/${c.slug}/${t.slug}`) },
    ],
  });
  graph.push({
    "@type": "WebApplication",
    name: t.name,
    url: abs(`/${c.slug}/${t.slug}`),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    // Freshness + attribution signals for AI engines: an honest last-reviewed
    // date and a publisher pointing at the site-wide Organization entity defined
    // in the root layout's JSON-LD (@id "/#org"), plus membership of the WebSite.
    dateModified: updated,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE.url}/#website` },
    publisher: { "@id": `${SITE.url}/#org` },
  });
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  // Contextual internal links: genuinely related tools from the same topical
  // cluster (often cross-category, e.g. cake-pan -> yeast), filtered to built
  // tools. Falls back to same-category siblings if the tool isn't clustered.
  let related = relatedSlugs(t.slug)
    .map((s) => getToolBySlug(s))
    .filter((r) => r && toolContent[r.tool.slug])
    .map((r) => ({ slug: r.tool.slug, name: r.tool.name, description: r.tool.description, cat: r.category.slug }))
    .slice(0, 6);
  if (related.length === 0) {
    related = c.tools
      .filter((x) => x.slug !== t.slug && toolContent[x.slug])
      .slice(0, 6)
      .map((x) => ({ slug: x.slug, name: x.name, description: x.description, cat: c.slug }));
  }
  // On-page YMYL trust note for finance/tax/health calculators (null otherwise).
  const disclaimer = ymylNote(t.slug);

  return (
    <>
      {crumb}
      <header className="page-head">
        <h1>{t.name}</h1>
        <p>{content.lede || t.description}</p>
        {updatedLabel && (
          <div className="tool-note tool-updated" style={{ marginTop: 10 }}>
            Updated <time dateTime={updated}>{updatedLabel}</time>
          </div>
        )}
      </header>

      <ToolMount slug={t.slug} />

      {disclaimer && (
        <p className="tool-note tool-disclaimer" role="note">{disclaimer}</p>
      )}

      {toolHowto[t.slug] && toolHowto[t.slug].length > 0 && (
        <section className="tool-howto">
          <h2 className="tool-h2">How to use {t.name}</h2>
          <ol>
            {toolHowto[t.slug].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {related[0] && (
        <Link href={`/${related[0].cat}/${related[0].slug}`} className="tool-next">
          <span className="tool-next-eyebrow">Try next →</span>
          <span className="tool-next-name">{related[0].name}</span>
          <span className="tool-next-desc">{related[0].description}</span>
        </Link>
      )}

      {content.about && (
        <section className="tool-about">
          <h2 className="tool-h2">About {t.name}</h2>
          {content.about.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </section>
      )}

      {content.faq && content.faq.length > 0 && (
        <section className="tool-faq">
          <h2 className="tool-h2">Frequently asked questions</h2>
          <dl>
            {content.faq.map((f, i) => (
              <div className="faq-item" key={i}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {related.length > 0 && (
        <section className="tool-related">
          <h2 className="tool-h2">Related tools</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {related.map((x) => (
              <Link key={x.slug} href={`/${x.cat}/${x.slug}`} className="badge" style={{ textDecoration: "none" }} title={x.description}>
                {x.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSLOT_TOOL} minHeight={280} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
