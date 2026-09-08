import Link from "next/link";
import { sortedPosts } from "../../lib/blogPosts";

export const metadata = {
  title: "Guides",
  description:
    "Practical how-to guides for images, PDFs, and everyday file jobs. Each answers a real question and links to a free tool that does the job privately in your browser.",
  alternates: { canonical: "/blog" },
};

export default function Blog() {
  const posts = sortedPosts();
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <span>Guides</span>
      </nav>

      <header className="page-head">
        <h1>Guides</h1>
        <p>
          Short, practical how-tos for the file jobs people actually get stuck on — resizing to an
          exact size, converting formats, fixing a PDF. Each one is honest about the limits and links
          to a free tool that does the job right in your browser, with no upload.
        </p>
      </header>

      {posts.length === 0 ? (
        <section className="block">
          <p className="tool-note">New guides are on the way.</p>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {posts.map((p) => (
            <article className="block" key={p.slug}>
              <h2 className="section-title" style={{ marginBottom: 6 }}>
                <Link href={`/blog/${p.slug}`} style={{ textDecoration: "none" }}>
                  {p.title}
                </Link>
              </h2>
              <p style={{ marginTop: 0 }}>{p.excerpt}</p>
              <Link href={`/blog/${p.slug}`} className="btn">
                Read guide →
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
