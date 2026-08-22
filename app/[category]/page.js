import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory } from "../../lib/tools";

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
        <span>/</span>
        <span>{c.name}</span>
      </nav>

      <section className="hero hero-sm">
        <h1 className="hero-title">{c.emoji} {c.name}</h1>
        <p className="hero-sub">{c.description}</p>
      </section>

      {c.tools.length === 0 ? (
        <div className="empty">
          <p>These tools are <strong>coming soon</strong>.</p>
          <p className="muted">We&apos;re building the boring stuff first. Check back shortly.</p>
        </div>
      ) : (
        <div className="grid">
          {c.tools.map((t) => (
            <Link key={t.slug} href={`/${c.slug}/${t.slug}`} className="card tool-card">
              <span className="tool-name">{t.name}</span>
              <span className="tool-desc muted">{t.description}</span>
              <span className="badge">Coming soon</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
