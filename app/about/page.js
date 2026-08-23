import Link from "next/link";
import { SITE, categories } from "../../lib/tools";
import { toolContent } from "../../lib/toolContent";

export const metadata = {
  title: "About",
  description:
    "What Every Boring Tool is, why it exists, how it is built, and how it stays free — plus an honest note on what the tools can and cannot do.",
  alternates: { canonical: "/about" },
};

export default function About() {
  const built = Object.keys(toolContent).length;

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link><span className="sep">/</span><span>About</span>
      </nav>

      <header className="page-head">
        <h1>About {SITE.name}</h1>
        <p>{SITE.tagline}</p>
      </header>

      <section className="block">
        <h2 className="section-title">Why this exists</h2>
        <p>
          Most small jobs online are genuinely boring: merge two PDFs, resize an image, work out a
          percentage, count characters for a bio, convert a file. The tools that do them are easy to
          find and unpleasant to use — buried under adverts, gated behind a sign-up, capped at three
          files a day, or quietly uploading your documents to a server you know nothing about.
        </p>
        <p>
          {SITE.name} is the opposite of that. {built} tools, no account, no upsell, and a deliberate
          bias towards doing the work inside your own browser so your files stay with you.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">How it is built</h2>
        <p>
          Almost every tool is client-side code: your browser does the work using JavaScript and
          WebAssembly, and nothing you select is transmitted anywhere. That is why the tools are fast,
          why there are no usage limits, and why we can afford to give them away.
        </p>
        <p>
          A handful of tools genuinely need to talk to something else to function — the word games use
          a dictionary on our server, and two tools fetch resources from a third party. Rather than
          make a blanket promise we cannot keep, we name each of those individually in the{" "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">What the tools are and are not</h2>
        <p>
          These are practical everyday utilities, not professional instruments. The calculators are
          useful for estimates and sanity checks, but they are not financial, medical, legal or
          engineering advice, and results should be verified before anything important depends on
          them. The{" "}
          <Link href="/terms" style={{ textDecoration: "underline" }}>Terms of Use</Link> set this out
          in full.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">How it stays free</h2>
        <p>
          There is no paid tier and no subscription. The site is free to run because the tools run on
          your device rather than on expensive servers. We plan to add modest advertising to cover
          hosting and development time; when we do, it will be disclosed here and in the privacy
          policy, and it will not be allowed to get in the way of actually using a tool.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">What&apos;s here</h2>
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
