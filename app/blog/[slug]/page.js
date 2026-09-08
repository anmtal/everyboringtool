import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { blogPosts } from "../../../lib/blogPosts";
import { SITE } from "../../../lib/tools";
import AdSlot from "../../../components/AdSlot";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const p = blogPosts[params.slug];
  if (!p) return {};
  const title = p.seoTitle || p.title;
  return {
    title,
    description: p.metaDescription,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      type: "article",
      title,
      description: p.metaDescription,
      url: `${SITE.url}/blog/${params.slug}`,
    },
  };
}

function formatDate(d) {
  try {
    // Parse plain YYYY-MM-DD at local noon so a UTC-behind timezone doesn't roll it back a day.
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(`${d}T12:00:00`) : new Date(d);
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch (e) {
    return d;
  }
}

export default function Post({ params }) {
  const p = blogPosts[params.slug];
  if (!p) notFound();

  const html = marked.parse(p.body || "");
  const abs = (u) => (String(u).startsWith("http") ? u : `${SITE.url}${u}`);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.metaDescription,
    datePublished: p.date,
    dateModified: p.updated || p.date,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` },
    },
    mainEntityOfPage: abs(`/blog/${params.slug}`),
  };
  const crumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Guides", item: abs("/blog") },
      { "@type": "ListItem", position: 3, name: p.title, item: abs(`/blog/${params.slug}`) },
    ],
  };

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <Link href="/blog">Guides</Link>
        <span className="sep">/</span>
        <span>{p.title}</span>
      </nav>

      <header className="page-head">
        <h1>{p.title}</h1>
        <p className="muted">Updated {formatDate(p.updated || p.date)}</p>
      </header>

      {p.tool ? (
        <div
          className="block"
          style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
        >
          <span>Just need the tool?</span>
          <Link href={p.tool} className="btn btn-primary">
            {p.toolName || "Open the tool"} →
          </Link>
        </div>
      ) : null}

      <article className="block blog-body" dangerouslySetInnerHTML={{ __html: html }} />

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSLOT_TOOL} minHeight={280} />

      {p.tool ? (
        <section className="block">
          <h2 className="section-title">Do it now — free and private</h2>
          <p>The tool runs entirely in your browser: nothing you add is uploaded, and there is no sign-up.</p>
          <Link href={p.tool} className="btn btn-primary">
            {p.toolName || "Open the tool"} →
          </Link>
        </section>
      ) : null}

      {Array.isArray(p.related) && p.related.length ? (
        <section className="block">
          <h2 className="section-title">Related tools</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {p.related.map((r) => (
              <Link key={r.url} href={r.url} className="badge" style={{ textDecoration: "none" }}>
                {r.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />
    </>
  );
}
