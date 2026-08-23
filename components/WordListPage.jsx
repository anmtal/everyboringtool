import Link from "next/link";
import { scrabbleScore, groupByLength } from "../lib/wordEngine";

const MAX_RENDER = 600;

export default function WordListPage({ crumbs = [], h1, lead, box, words = [], linkBase = "/unscramble", faq = [], related = null, note = null }) {
  const groups = groupByLength(words.slice(0, MAX_RENDER));
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

      {groups.map(({ len, words: ws }) => (
        <section key={len} style={{ marginTop: 18 }}>
          <h2 className="section-title" style={{ fontSize: "1.05rem" }}>{len}-letter words ({ws.length})</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ws.map((w) => (
              <Link key={w} href={`${linkBase}/${w}`} className="badge" style={{ textDecoration: "none", fontSize: 14, padding: "4px 9px" }} title={`${scrabbleScore(w)} points`}>
                {w} <span style={{ opacity: 0.55, fontSize: 11 }}>{scrabbleScore(w)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {words.length > MAX_RENDER && <p className="tool-note" style={{ marginTop: 14 }}>Showing the first {MAX_RENDER} of {words.length} words.</p>}

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
