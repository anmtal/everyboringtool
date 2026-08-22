import Link from "next/link";
import { categories, SITE } from "../lib/tools";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Every boring tool.<br />One simple place.</h1>
        <p className="hero-sub">{SITE.description}</p>
        <p className="hero-note">No sign-up. No clutter. Just tools that work.</p>
      </section>

      <section>
        <h2 className="section-title">Categories</h2>
        <div className="grid">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className={`card cat-card ${c.status === "soon" ? "is-soon" : ""}`}
            >
              <span className="cat-emoji" aria-hidden="true">{c.emoji}</span>
              <span className="cat-name">{c.name}</span>
              <span className="cat-desc muted">{c.description}</span>
              <span className="cat-meta">
                {c.status === "soon" ? (
                  <span className="badge">Coming soon</span>
                ) : (
                  <span className="badge badge-live">{c.tools.length} tools</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
