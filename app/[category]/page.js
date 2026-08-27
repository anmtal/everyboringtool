import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, SITE } from "../../lib/tools";
import { toolContent } from "../../lib/toolContent";
import { categoryContent } from "../../lib/categoryContent";

export const dynamicParams = true;
export const revalidate = 604800;

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }) {
  const c = getCategory(params.category);
  if (!c) return {};
  const built = c.tools.filter((t) => toolContent[t.slug]).length;
  const description = `${c.description} ${built} free ${c.name.toLowerCase()} — no sign-up, and they run right in your browser.`;
  return {
    title: c.name,
    description,
    alternates: { canonical: `/${c.slug}` },
    openGraph: { type: "website", url: `/${c.slug}`, title: c.name, description },
  };
}

export default function CategoryPage({ params }) {
  const c = getCategory(params.category);
  if (!c) notFound();

  const cc = categoryContent[c.slug];
  const builtTools = c.tools.filter((t) => toolContent[t.slug]);
  const abs = (p) => `${SITE.url}${p}`;

  // JSON-LD: a breadcrumb, an ItemList enumerating the live tools (so an AI can
  // answer "which free X tools does this site have"), and a category-level
  // FAQPage when hub copy exists. Attributed to the site-wide Organization/WebSite
  // entities from the root layout.
  const graph = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: c.name, item: abs(`/${c.slug}`) },
      ],
    },
  ];
  if (builtTools.length) {
    graph.push({
      "@type": "ItemList",
      name: `${c.name} — free online tools`,
      numberOfItems: builtTools.length,
      itemListElement: builtTools.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        url: abs(`/${c.slug}/${t.slug}`),
      })),
    });
  }
  if (cc && cc.faq && cc.faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: cc.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <span>{c.name}</span>
      </nav>

      <header className="page-head">
        <h1><span aria-hidden="true">{c.emoji}</span> {c.name}</h1>
        <p>{c.description}</p>
      </header>

      {cc && cc.intro && (
        <section className="cat-intro">
          <p>{cc.intro}</p>
        </section>
      )}

      {c.tools.length === 0 ? (
        <div className="empty">
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>These tools are coming soon.</p>
          <p className="muted" style={{ margin: 0 }}>
            We&apos;re building the boring stuff first. Check back shortly.
          </p>
        </div>
      ) : (
        <div className="grid">
          {c.tools.map((t) => {
            const built = !!toolContent[t.slug];
            const inner = (
              <>
                <span className="tool-name">{t.name}</span>
                <span className="tool-desc">{t.description}</span>
                <span className="cat-meta">
                  {built ? (
                    <span className="badge badge-live">Open</span>
                  ) : (
                    <span className="badge">Coming soon</span>
                  )}
                </span>
              </>
            );
            // Built tools link to their page; "coming soon" stubs render as a
            // non-clickable card so they're not crawlable dead-ends that look live.
            return built ? (
              <Link key={t.slug} href={`/${c.slug}/${t.slug}`} className="card tool-card">
                {inner}
              </Link>
            ) : (
              <div key={t.slug} className="card tool-card is-soon" aria-disabled="true">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {cc && cc.faq && cc.faq.length > 0 && (
        <section className="tool-faq">
          <h2 className="tool-h2">Frequently asked questions</h2>
          <dl>
            {cc.faq.map((f, i) => (
              <div className="faq-item" key={i}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
