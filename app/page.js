import Link from "next/link";
import { categories, SITE } from "../lib/tools";
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
        <h2 className="section-title">Browse by category</h2>
        <div className="grid">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className={`card cat-card ${c.status === "soon" ? "is-soon" : ""}`}
            >
              <span className="cat-emoji" aria-hidden="true">{c.emoji}</span>
              <span className="cat-name">{c.name}</span>
              <span className="cat-desc">{c.description}</span>
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
