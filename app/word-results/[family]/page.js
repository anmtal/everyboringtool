import { cache } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import UnscrambleBox from "../../../components/UnscrambleBox";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";
import { WORD_FAMILIES } from "../../../lib/wordFamilies";
import { wordHref } from "../../../lib/wordQuery";

// Result views for the word hubs. next.config.mjs rewrites /unscramble?q=…
// (and the other five hubs) here, so the visitor keeps the hub URL while the
// plain hubs stay static. One page per query is the unbounded thin-page
// pattern the old /unscramble/<letters> pages were retired for, so every view
// is noindexed and canonicalised to its hub.
export const dynamic = "force-dynamic";

const find = cache((family, q) => WORD_FAMILIES[family].find(q));

function resolve(params, searchParams) {
  const f = WORD_FAMILIES[params.family];
  if (!f) notFound();
  if (searchParams.q === undefined) redirect(f.base);
  const q = f.parse(searchParams.q);
  return { f, q, words: q ? find(params.family, q) : [] };
}

export function generateMetadata({ params, searchParams }) {
  const { f, q, words } = resolve(params, searchParams);
  return {
    title: { absolute: words.length ? f.title(f.show(q), words.length) : `${f.crumb} — no results` },
    alternates: { canonical: f.base },
    robots: { index: false, follow: true },
  };
}

function SearchBox({ f, q }) {
  const initial = q ? (f.boxInitial ? f.boxInitial(q) : q) : "";
  return f.box
    ? <WordSearchBox key={q || ""} basePath={f.base} {...f.box} initial={initial} />
    : <UnscrambleBox key={q || ""} initial={initial} />;
}

export default function WordResults({ params, searchParams }) {
  const { f, q, words } = resolve(params, searchParams);

  if (!words.length) {
    return (
      <>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span className="sep">/</span><Link href={f.base}>{f.crumb}</Link>
        </nav>
        <header className="page-head">
          <h1>No results{q ? <> for “{f.show(q)}”</> : null}</h1>
          <p>{f.empty}</p>
        </header>
        <div className="block" style={{ marginTop: 0 }}><SearchBox f={f} q={q} /></div>
      </>
    );
  }

  const up = f.show(q);
  return (
    <WordListPage
      queryKey={`${params.family}:${q}`}
      crumbs={[{ label: "Home", href: "/" }, { label: f.crumb, href: f.base }, { label: up }]}
      h1={f.h1(up)}
      lead={f.lead(up, words.length, q)}
      box={<SearchBox f={f} q={q} />}
      words={words}
      faq={f.faq(up, words)}
      related={f.related ? (
        <section className="block">
          <h2 className="section-title">{f.related.length > 1 ? "Related" : "Also try"}</h2>
          <p>
            {f.related.map((r, i) => (
              <span key={r.base}>
                {i > 0 && " · "}
                <Link href={wordHref(r.base, q)} prefetch={false} rel="nofollow">{r.label(up)}</Link>
                {r.note || null}
              </span>
            ))}
          </p>
        </section>
      ) : null}
    />
  );
}
