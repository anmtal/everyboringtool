import Link from "next/link";
import { notFound } from "next/navigation";
import { unscramble, scrabbleScore, groupByLength, cleanLetters, wordStats, canonicalLettersForm } from "../../../lib/wordEngine";
import { POPULAR } from "../../../lib/wordPopular";
import UnscrambleBox from "../../../components/UnscrambleBox";
import { wordRobots } from "../../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800; // rebuild each page at most weekly (ISR)

export function generateStaticParams() {
  return POPULAR.map((letters) => ({ letters }));
}

export function generateMetadata({ params }) {
  const letters = cleanLetters(decodeURIComponent(params.letters || ""));
  if (letters.replace(/\?/g, "").length < 2) return { title: "Word Unscrambler" };
  const up = letters.toUpperCase();
  const count = unscramble(letters).length;
  return {
    title: `Unscramble ${up} — ${count} words made from these letters`,
    description: `All ${count} words you can make from the letters ${up}, grouped by length with Scrabble scores. Free word unscrambler and anagram solver — no sign-up.`,
    robots: wordRobots(count),
    alternates: { canonical: `/unscramble/${canonicalLettersForm(letters)}` },
  };
}

const MAX_RENDER = 600;

export default function UnscrambleLettersPage({ params }) {
  const letters = cleanLetters(decodeURIComponent(params.letters || ""));
  if (letters.replace(/\?/g, "").length < 2) notFound();

  const words = unscramble(letters);
  const up = letters.toUpperCase();
  const groups = groupByLength(words.slice(0, MAX_RENDER));
  const best = words[0];
  const stats = wordStats(words);

  const faq = [
    { q: `How many words can you make from ${up}?`, a: `You can make ${words.length} valid words from the letters ${up}, ranging from 2 letters up to ${best ? best.length : 0} letters long.` },
    { q: `What is the longest word from ${up}?`, a: best ? `The longest word is "${best}" (${best.length} letters), worth ${scrabbleScore(best)} points in Scrabble.` : `No words could be found from those letters.` },
    { q: `How does the word unscrambler work?`, a: `Type in your jumbled letters and it instantly finds every dictionary word that can be spelled with them — perfect for Scrabble, Words With Friends, anagrams and crosswords. Use a “?” for a blank tile.` },
  ];
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <nav className="breadcrumb">
        <Link href="/">Home</Link><span className="sep">/</span>
        <Link href="/unscramble">Word Unscrambler</Link><span className="sep">/</span>
        <span>{up}</span>
      </nav>

      <header className="page-head">
        <h1>Words made from “{up}”</h1>
        <p>{words.length > 0 ? `We found ${words.length} words you can make from the letters ${up}.` : `No words could be made from ${up}. Try different letters.`}</p>
      </header>

      <div className="block" style={{ marginTop: 0 }}>
        <UnscrambleBox initial={letters} />
      </div>

      {stats && (
        <>
          <p className="tool-note" style={{ marginTop: 6 }}>
            Longest word: <strong>{stats.longest}</strong> ({stats.longestLen} letters) · highest-scoring:{" "}
            <strong>{stats.best}</strong> ({stats.bestScore} points){stats.two > 0 ? <> · {stats.two} two-letter word{stats.two === 1 ? "" : "s"}</> : null}.
          </p>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat"><div className="tool-stat-num">{stats.total}</div><div className="tool-stat-label">words</div></div>
            <div className="tool-stat"><div className="tool-stat-num">{stats.longestLen}</div><div className="tool-stat-label">longest</div></div>
            <div className="tool-stat"><div className="tool-stat-num">{stats.bestScore}</div><div className="tool-stat-label">top Scrabble</div></div>
            <div className="tool-stat"><div className="tool-stat-num">{stats.two}</div><div className="tool-stat-label">2-letter</div></div>
          </div>
        </>
      )}

      {groups.map(({ len, words: ws }) => (
        <section key={len} style={{ marginTop: 18 }}>
          <h2 className="section-title" style={{ fontSize: "1.05rem" }}>{len}-letter words ({ws.length})</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ws.map((w) => (
              <Link key={w} href={`/unscramble/${w}`} prefetch={false} className="badge" style={{ textDecoration: "none", fontSize: 14, padding: "4px 9px" }} title={`${scrabbleScore(w)} points`}>
                {w} <span style={{ opacity: 0.55, fontSize: 11 }}>{scrabbleScore(w)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {words.length > MAX_RENDER && (
        <p className="tool-note" style={{ marginTop: 14 }}>Showing the first {MAX_RENDER} of {words.length} words.</p>
      )}

      {stats && (
        <section className="block">
          <h2 className="section-title">Words from {up}, at a glance</h2>
          <p>
            The letters <strong>{up}</strong> unscramble into <strong>{stats.total}</strong>{" "}
            valid word{stats.total === 1 ? "" : "s"}, from {best ? Math.min(...words.map((w) => w.length)) : 2} up to{" "}
            {stats.longestLen} letters long. The longest is <strong>{stats.longest}</strong>, and the highest-scoring
            play is <strong>{stats.best}</strong> at <strong>{stats.bestScore}</strong> points in Scrabble.
            {stats.two > 0 ? (
              <> There {stats.two === 1 ? "is" : "are"} also <strong>{stats.two}</strong> two-letter word
                {stats.two === 1 ? "" : "s"} — the kind that squeeze into a crowded board.</>
            ) : null}{" "}
            Tap any word above to see what <em>it</em> unscrambles into. It all runs free, in your browser, with no sign-up.
          </p>
        </section>
      )}

      <section className="block">
        <h2 className="section-title">Frequently asked questions</h2>
        {faq.map((f, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p>
            <p className="muted" style={{ margin: 0 }}>{f.a}</p>
          </div>
        ))}
      </section>

      <section className="block">
        <h2 className="section-title">Try other letters</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {POPULAR.slice(0, 24).map((l) => (
            <Link key={l} href={`/unscramble/${l}`} className="badge" style={{ textDecoration: "none" }}>{l.toUpperCase()}</Link>
          ))}
        </div>
      </section>
    </>
  );
}
