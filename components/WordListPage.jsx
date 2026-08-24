import Link from "next/link";
import { wordStats } from "../lib/wordEngine";
import WordBadges from "./WordBadges";

export default function WordListPage({ crumbs = [], h1, lead, box, words = [], linkBase = "/unscramble", faq = [], related = null, note = null }) {
  const stats = wordStats(words);
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      {faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <nav className="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i}>
            {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            {i < crumbs.length - 1 && <span className="sep">/</span>}
          </span>
        ))}
      </nav>

      <header className="page-head"><h1>{h1}</h1><p>{lead}</p></header>

      {box && <div className="block" style={{ marginTop: 0 }}>{box}</div>}
      {note}

      {stats && (
        <>
          <p className="tool-note" style={{ marginTop: 6 }}>
            Longest: <strong>{stats.longest}</strong> ({stats.longestLen} letters) · highest-scoring:{" "}
            <strong>{stats.best}</strong> ({stats.bestScore} pts){stats.two > 0 ? <> · {stats.two} two-letter word{stats.two === 1 ? "" : "s"} for tight spots</> : null}.
          </p>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat"><div className="tool-stat-num">{stats.total}</div><div className="tool-stat-label">words</div></div>
            <div className="tool-stat"><div className="tool-stat-num">{stats.longestLen}</div><div className="tool-stat-label">longest</div></div>
            <div className="tool-stat"><div className="tool-stat-num">{stats.bestScore}</div><div className="tool-stat-label">top Scrabble</div></div>
            <div className="tool-stat"><div className="tool-stat-num">{stats.two}</div><div className="tool-stat-label">2-letter</div></div>
          </div>
        </>
      )}

      <WordBadges words={words} linkBase={linkBase} />

      {faq.length > 0 && (
        <section className="block">
          <h2 className="section-title">Frequently asked questions</h2>
          {faq.map((f, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, margin: "0 0 3px" }}>{f.q}</p>
              <p className="muted" style={{ margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </section>
      )}

      {related}
    </>
  );
}
