import Link from "next/link";
import { categories, SITE } from "../lib/tools";
import { toolContent } from "../lib/toolContent";
import ToolSearch from "../components/ToolSearch";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Every boring tool.<br />One simple place.</h1>
        <p className="hero-sub">{SITE.description}</p>
        <ToolSearch />
        <ul className="trust">
          <li>Free forever</li>
          <li>No sign-up</li>
          <li>Runs in your browser</li>
          <li>Files never leave your device</li>
        </ul>
      </section>

      <section className="block">
        <Link href="/unscramble" className="card cat-card" style={{ borderColor: "var(--accent, #2a7de1)" }}>
          <span className="cat-emoji" aria-hidden="true">🔤</span>
          <span className="cat-name">Word Unscrambler</span>
          <span className="cat-desc">Unscramble letters into words instantly — for Scrabble, Words With Friends, anagrams and crosswords.</span>
          <span className="cat-meta"><span className="badge badge-live">Try it →</span></span>
        </Link>
      </section>

      <section className="block">
        <h2 className="section-title">Browse by category</h2>
        <div className="grid">
          {categories.map((c) => {
            const builtCount = c.tools.filter((t) => toolContent[t.slug]).length;
            const live = builtCount > 0;
            return (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className={`card cat-card ${live ? "" : "is-soon"}`}
              >
                <span className="cat-emoji" aria-hidden="true">{c.emoji}</span>
                <span className="cat-name">{c.name}</span>
                <span className="cat-desc">{c.description}</span>
                <span className="cat-meta">
                  {live ? (
                    <span className="badge badge-live">
                      {builtCount} tool{builtCount === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="badge">Coming soon</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
