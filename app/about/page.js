import Link from "next/link";
import { SITE, categories } from "../../lib/tools";
import { TOOL_COUNT } from "../../lib/toolCount";

export const metadata = {
  title: "About",
  description:
    "What Every Boring Tool is, why it exists, how it is built, and how it stays free — plus an honest note on what the tools can and cannot do.",
  alternates: { canonical: "/about" },
};

// Brand-entity Q&A: the questions people (and AI answer engines) ask about the
// SITE itself — free?, safe?, account?, limits? Kept factual and consistent with
// the prose above and the Privacy Policy. Rendered visibly AND as FAQPage schema
// so an AI asked "what is Every Boring Tool / is it safe" has a block to lift.
const ENTITY_FAQ = [
  {
    q: "What is Every Boring Tool?",
    a: "Every Boring Tool is a free collection of small, practical online utilities — PDF and image tools, unit and format converters, everyday calculators, developer and SEO helpers, word games and more. Each one does a single boring job well, with no account and no clutter.",
  },
  {
    q: "Is it really free? Is there a catch?",
    a: "Yes, it is free, with no paid tier and no subscription. It can stay free because the tools run on your own device rather than on expensive servers. We plan to add modest advertising to cover hosting and development time, and that will always be disclosed here and in the Privacy Policy.",
  },
  {
    q: "Do I need to sign up or create an account?",
    a: "No. There is no sign-up, no email and no login anywhere on the site. You open a tool and use it straight away.",
  },
  {
    q: "Are my files and data private?",
    a: "Almost every tool is client-side code, which means your browser does the work and nothing you select is transmitted anywhere. A few tools genuinely need to talk to something else — the word games use a dictionary on our server, and a couple fetch resources from a third party — and each of those is named individually in the Privacy Policy rather than hidden behind a blanket promise.",
  },
  {
    q: "Are there any usage limits?",
    a: "No. There are no daily caps, no file-count limits and no features held back behind a paywall. Use any tool as much as you need.",
  },
  {
    q: "Do the tools work on a phone?",
    a: "Yes. Everything runs in a normal web browser on desktop, tablet or phone, and there is nothing to install.",
  },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ENTITY_FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function About() {
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
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
          {SITE.name} is the opposite of that. {TOOL_COUNT} tools, no account, no upsell, and a
          deliberate bias towards doing the work inside your own browser so your files stay with you.
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

      <section className="tool-faq block">
        <h2 className="section-title">Common questions</h2>
        <dl>
          {ENTITY_FAQ.map((f, i) => (
            <div className="faq-item" key={i}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
    </>
  );
}
