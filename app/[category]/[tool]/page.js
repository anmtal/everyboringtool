import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, getTool } from "../../../lib/tools";

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
  return { title: t.name, description: t.description };
}

export default function ToolPage({ params }) {
  const c = getCategory(params.category);
  const t = getTool(params.category, params.tool);
  if (!c || !t) notFound();

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <Link href={`/${c.slug}`}>{c.name}</Link>
        <span className="sep">/</span>
        <span>{t.name}</span>
      </nav>

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
