import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory } from "../../lib/tools";
import { toolContent } from "../../lib/toolContent";
import { parseWordRoute, wordRouteLabel } from "../../lib/wordRoutes";
import NLetterWordsView, { nLetterWords } from "../../components/NLetterWordsView";
import { wordRobots } from "../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800;

export function generateStaticParams() {
  const cats = categories.map((c) => ({ category: c.slug }));
  const words = [];
  for (let n = 2; n <= 9; n++) words.push({ category: `${n}-letter-words` });
  for (const l of "abcdefghijklmnopqrstuvwxyz".split("")) words.push({ category: `5-letter-words-starting-with-${l}` });
  return [...cats, ...words];
}

export function generateMetadata({ params }) {
  const c = getCategory(params.category);
  if (c) {
    const built = c.tools.filter((t) => toolContent[t.slug]).length;
    const description = `${c.description} ${built} free ${c.name.toLowerCase()} — no sign-up, and they run right in your browser.`;
    return {
      title: c.name,
      description,
      alternates: { canonical: `/${c.slug}` },
      openGraph: { type: "website", url: `/${c.slug}`, title: c.name, description },
    };
  }
  const route = parseWordRoute(params.category);
  if (route) {
    const label = wordRouteLabel(route);
    const count = nLetterWords(route).length;
    return {
      title: `${label} — ${count} words`,
      description: `A full list of ${count} ${label.toLowerCase()}, with Scrabble scores. Free — perfect for Wordle, Scrabble, Words With Friends and crosswords.`,
      robots: wordRobots(count),
      alternates: { canonical: `/${params.category}` },
    };
  }
  return {};
}

export default function CategoryPage({ params }) {
  const c = getCategory(params.category);

  if (!c) {
    const route = parseWordRoute(params.category);
    if (route) return <NLetterWordsView route={route} />;
    notFound();
  }

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
