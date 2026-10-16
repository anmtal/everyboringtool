import Link from "next/link";
import { SITE } from "../../lib/tools";
import { charts, chartUrl, CHARTS_UPDATED } from "../../lib/charts";

const DESCRIPTION =
  "Free printable reference charts you can print, photocopy and link to: clear tables, one-page print layouts and no sign-up.";

export const metadata = {
  title: "Printable Reference Charts",
  description: DESCRIPTION,
  alternates: { canonical: "/charts" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/charts",
    title: `Printable Reference Charts — ${SITE.name}`,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function ChartsHub() {
  const abs = (p) => `${SITE.url}${p}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Printable Charts", item: abs("/charts") },
        ],
      },
      {
        "@type": "CollectionPage",
        name: "Printable Reference Charts",
        url: abs("/charts"),
        description: DESCRIPTION,
        dateModified: CHARTS_UPDATED,
        inLanguage: "en",
        isPartOf: { "@id": `${SITE.url}/#website` },
        publisher: { "@id": `${SITE.url}/#org` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: charts.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.title,
            url: abs(chartUrl(c.slug)),
          })),
        },
      },
    ],
  };

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <span>Printable Charts</span>
      </nav>

      <header className="page-head">
        <h1>Printable Reference Charts</h1>
        <p>
          Reference tables you can read on screen, print on a single sheet, photocopy for a class
          and link to. Every value is generated and checked by code, not typed in by hand.
        </p>
      </header>

      <section className="block" aria-labelledby="charts-list">
        <h2 className="section-title" id="charts-list">All charts</h2>
        <div className="grid">
          {charts.map((c) => (
            <Link key={c.slug} href={chartUrl(c.slug)} className="card">
              <span className="tool-name">{c.title}</span>
              <span className="tool-desc">{c.description}</span>
              {c.tool ? <span className="cat-meta"><span className="badge">Pairs with the {c.tool.name}</span></span> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="block">
        <h2 className="section-title">Free to print and copy</h2>
        <p className="muted" style={{ maxWidth: "64ch" }}>
          Each chart has print buttons that send just that chart to your printer in black and white,
          sized to fit US Letter or A4, with the source address in the footer. You are welcome to
          print and photocopy them for classroom, library and personal use. If a chart helps you,
          a link back is the nicest way to say thanks.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
