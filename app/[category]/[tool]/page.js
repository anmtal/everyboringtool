import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, getTool, SITE } from "../../../lib/tools";
import { toolContent } from "../../../lib/toolContent";
import ToolMount from "../../../components/ToolMount";

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
// description, so Google rewrites them. Prefer the first sentence(s) of the
// tool's About copy, trimmed to a sane length at a word boundary.
function metaDescription(t, content) {
  const about = (content && content.about ? content.about : "").replace(/\s+/g, " ").trim();
  const base = about || `${t.description} Free, no sign-up, and it runs right in your browser.`;
  if (base.length <= 158) return base;
  const cut = base.slice(0, 158).slice(0, base.slice(0, 158).lastIndexOf(" "));
  // If the trim already lands on a sentence end, leave it clean — appending an
  // ellipsis after a period ("NO.…") reads as broken. Otherwise mark the cut.
  return /[.!?]$/.test(cut) ? cut : cut.replace(/[\s,;:]+$/, "") + "…";
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
    <nav className="breadcrumb">
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
  });
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  // Contextual internal links: up to 6 built siblings in the same category.
  const related = c.tools.filter((x) => x.slug !== t.slug && toolContent[x.slug]).slice(0, 6);

  return (
    <>
      {crumb}
      <header className="page-head">
        <h1>{t.name}</h1>
        <p>{t.description}</p>
      </header>

      <ToolMount slug={t.slug} />

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
              <Link key={x.slug} href={`/${c.slug}/${x.slug}`} className="badge" style={{ textDecoration: "none" }} title={x.description}>
                {x.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
