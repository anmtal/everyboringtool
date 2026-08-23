import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, getTool } from "../../../lib/tools";
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

export function generateMetadata({ params }) {
  const t = getTool(params.category, params.tool);
  if (!t) return {};
  const built = !!toolContent[params.tool];
  return {
    title: t.name,
    description: t.description,
    // Coming-soon stubs stay out of the index until the tool actually works.
    robots: built ? { index: true, follow: true } : { index: false, follow: true },
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

  const faqSchema =
    content.faq && content.faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: content.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

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

      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
    </>
  );
}
