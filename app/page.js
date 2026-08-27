import Link from "next/link";
import { categories, SITE } from "../lib/tools";
import { toolContent } from "../lib/toolContent";
import ToolSearch from "../components/ToolSearch";

export const metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  // Link the homepage DIRECTLY to the most popular individual tools (not just
  // category hubs), so the highest-value pages get internal-link equity and
  // aren't buried two clicks deep.
  const popular = categories
    .flatMap((c) => c.tools.filter((t) => t.popular && toolContent[t.slug]).map((t) => ({ t, cat: c.slug })))
    .slice(0, 12);
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Every boring tool.<br />One simple place.</h1>
        <p className="hero-sub">{SITE.description}</p>
        <ToolSearch />
        {/* Keep these literally true. "Runs in your browser" was too broad as a
            site-wide claim — the word-game tools look words up on the server. The
            file claim is precise and verifiable: no tool uploads a file. */}
        <ul className="trust">
          <li>Free forever</li>
          <li>No sign-up</li>
          <li>No usage limits</li>
          <li>
            <Link href="/privacy">Your files never leave your device</Link>
          </li>
        </ul>
      </section>

      {popular.length > 0 && (
        <section className="block">
          <h2 className="section-title">Popular tools</h2>
          <div className="grid">
            {popular.map(({ t, cat }) => (
              <Link key={`${cat}-${t.slug}`} href={`/${cat}/${t.slug}`} className="card cat-card">
                <span className="cat-emoji" aria-hidden="true">⭐</span>
                <span className="cat-name">{t.name}</span>
                <span className="cat-desc">{t.description}</span>
                <span className="cat-meta"><span className="badge badge-live">Open →</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <h2 className="section-title"><span aria-hidden="true">🔤</span> Word Games</h2>
        <div className="grid">
          {[
            { href: "/unscramble", emoji: "🔤", name: "Word Unscrambler", desc: "Unscramble letters into words for Scrabble & Words With Friends." },
            { href: "/anagram", emoji: "🔀", name: "Anagram Solver", desc: "Find every anagram of your letters." },
            { href: "/wordle-solver", emoji: "🟩", name: "Wordle Solver", desc: "Enter your clues, see every possible answer." },
            { href: "/words-starting-with", emoji: "🔠", name: "Words Starting With", desc: "Every word that starts with your letters." },
            { href: "/words-ending-with", emoji: "🔡", name: "Words Ending With", desc: "Words ending in -ing, -ed and more." },
            { href: "/words-containing", emoji: "🔍", name: "Words Containing", desc: "Words with a letter sequence inside." },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="card cat-card">
              <span className="cat-emoji" aria-hidden="true">{t.emoji}</span>
              <span className="cat-name">{t.name}</span>
              <span className="cat-desc">{t.desc}</span>
              <span className="cat-meta"><span className="badge badge-live">Play →</span></span>
            </Link>
          ))}
        </div>
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
