import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory } from "../../lib/tools";
import { toolContent } from "../../lib/toolContent";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }) {
  const c = getCategory(params.category);
  if (!c) return {};
  return { title: c.name, description: c.description };
}

export default function CategoryPage({ params }) {
  const c = getCategory(params.category);
  if (!c) notFound();

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <span>{c.name}</span>
      </nav>

      <header className="page-head">
        <h1>{c.emoji} {c.name}</h1>
        <p>{c.description}</p>
      </header>

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
            return (
              <Link
                key={t.slug}
                href={`/${c.slug}/${t.slug}`}
                className={`card tool-card ${built ? "" : "is-soon"}`}
              >
                <span className="tool-name">{t.name}</span>
                <span className="tool-desc">{t.description}</span>
                <span className="cat-meta">
                  {built ? (
                    <span className="badge badge-live">Open</span>
                  ) : (
                    <span className="badge">Coming soon</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
