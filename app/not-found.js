import Link from "next/link";
import { categories } from "../lib/tools";

// Without this, Next renders its unstyled default 404, which inherits the
// homepage title and the root layout's `robots: { index: true }`.
export const metadata = {
  title: "Page not found",
  description: "That page doesn't exist. Browse the free tools instead.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <header className="page-head">
        <h1>Page not found</h1>
        <p>
          That page doesn&apos;t exist — it may have moved, or the address might have a typo.
          Everything here is free and needs no sign-up, so try one of these instead.
        </p>
      </header>

      <div className="tool-actions">
        <Link href="/" className="btn btn-primary">← Back to all tools</Link>
        <Link href="/unscramble" className="btn">Word games</Link>
      </div>

      <section className="block">
        <h2 className="section-title">Browse by category</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {categories.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="badge" style={{ textDecoration: "none" }}>
              {c.emoji} {c.short || c.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
