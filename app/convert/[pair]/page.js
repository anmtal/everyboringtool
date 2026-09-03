import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE, LAST_UPDATED } from "../../../lib/tools";
import { getPair, PAIRS, pairName, relatedPairs, buildAbout, buildFaq } from "../../../lib/convertMatrix";
import ConvertMount from "../../../components/ConvertMount";
import AdSlot from "../../../components/AdSlot";

export function generateStaticParams() {
  return PAIRS.map((p) => ({ pair: p.slug }));
}

export function generateMetadata({ params }) {
  const p = getPair(params.pair);
  if (!p) return {};
  const name = pairName(p);
  const title = `${name} Converter — Free & Online`;
  const description = `Convert ${name} free, right in your browser. No sign-up, no watermark, and nothing is uploaded.`;
  return {
    title,
    description,
    robots: { index: false, follow: true }, // noindexed with the word engine (AdSense low-value-content) — the /convert hub stays indexed
    alternates: { canonical: `/convert/${p.slug}` },
    openGraph: { type: "website", url: `/convert/${p.slug}`, title, description, images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default function ConvertPage({ params }) {
  const p = getPair(params.pair);
  if (!p) notFound();

  const name = pairName(p);
  const h1 = `${name} Converter`;
  const about = buildAbout(p);
  const faq = buildFaq(p);
  const related = relatedPairs(p);
  const abs = (x) => `${SITE.url}${x}`;

  const graph = [
    {
      "@type": "FAQPage",
      mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Convert", item: abs("/convert") },
        { "@type": "ListItem", position: 3, name: h1, item: abs(`/convert/${p.slug}`) },
      ],
    },
    {
      "@type": "WebApplication",
      name: h1,
      url: abs(`/convert/${p.slug}`),
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      dateModified: LAST_UPDATED,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE.url}/#website` },
      publisher: { "@id": `${SITE.url}/#org` },
    },
  ];
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <Link href="/convert">Convert</Link>
        <span className="sep">/</span>
        <span>{name}</span>
      </nav>

      <header className="page-head">
        <h1>{h1}</h1>
        <p>Convert {name} free, right in your browser.</p>
      </header>

      <ConvertMount from={p.from} to={p.to} />

      {related[0] && (
        <Link href={`/convert/${related[0].slug}`} className="tool-next">
          <span className="tool-next-eyebrow">Try next →</span>
          <span className="tool-next-name">{pairName(related[0])} Converter</span>
          <span className="tool-next-desc">Convert {pairName(related[0])} free, in your browser.</span>
        </Link>
      )}

      <section className="tool-about">
        <h2 className="tool-h2">About the {name} converter</h2>
        {about.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section className="tool-faq">
        <h2 className="tool-h2">Frequently asked questions</h2>
        <dl>
          {faq.map((x, i) => (
            <div className="faq-item" key={i}>
              <dt>{x.q}</dt>
              <dd>{x.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section className="tool-related">
          <h2 className="tool-h2">Related conversions</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {related.map((q) => (
              <Link key={q.slug} href={`/convert/${q.slug}`} className="badge" style={{ textDecoration: "none" }}>
                {pairName(q)}
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
