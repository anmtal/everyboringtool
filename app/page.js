import Link from "next/link";
import { categories, SITE } from "../lib/tools";
import { toolContent } from "../lib/toolContent";
import { TOOL_COUNT_LABEL } from "../lib/toolCount";
import ToolSearch from "../components/ToolSearch";

// Homepage FAQ — rendered visibly AND as FAQPage structured data. Genuine,
// original copy about the site (not the per-tool FAQs), to give the homepage
// real editorial substance beyond the tool directory.
const HOME_FAQ = [
  { q: "Is Every Boring Tool really free?", a: "Yes. Every tool is free to use, with no sign-up, no trial, and no usage limits." },
  { q: "Do I need to create an account?", a: "No. There is no login anywhere on the site — you open a tool and start using it." },
  { q: "Are my files safe?", a: "For the tools that process files, everything happens locally in your browser, so your files are never uploaded to a server or seen by anyone." },
  { q: "Does it work on my phone?", a: "Yes. The tools run in any modern browser on phones, tablets, and desktops, with nothing to install." },
  { q: "Why is it called Every Boring Tool?", a: "Because these are the unglamorous, get-it-done tools you look up once and forget about — and they should just work, without fuss. We lean into the boring." },
];

export const metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  // Link the homepage DIRECTLY to the most popular individual tools (not just
  // category hubs), so the highest-value pages get internal-link equity and
  // aren't buried two clicks deep.
  const popular = categories
    .flatMap((c) => c.tools.filter((t) => t.popular && toolContent[t.slug]).map((t) => ({ t, cat: c.slug })))
    .slice(0, 6);
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

      <section className="tool-about">
        <h2 className="tool-h2">What is Every Boring Tool?</h2>
        <p>
          Every Boring Tool is a free collection of small, single-purpose web utilities for the
          everyday tasks that don’t deserve a whole app — merging a couple of PDFs, compressing a
          photo before you email it, counting the words in an essay, converting a file from one
          format to another, generating a QR code, or running a quick calculation. Each tool does
          exactly one job, does it quickly, and then gets out of your way.
        </p>
        <p>
          We built it out of a simple frustration: almost every “free online tool” now wants you to
          create an account, sit through a wall of ads, install an extension, or upload your private
          files to a server you have never heard of — all for a task that takes ten seconds. Every
          Boring Tool is the opposite of that. No accounts, no paywalls, no watermarks, and no daily
          limits.
        </p>
        <p>
          Most of these tools run entirely inside your own browser, so your files, documents, and
          images are never uploaded anywhere — the work happens on your device and nothing is sent to
          a server. A PDF you merge or a photo you compress stays yours from start to finish. (A
          handful of tools, such as the word-game solvers, look words up on the server; none of them
          ever touch your files.)
        </p>
        <p>
          The site covers {TOOL_COUNT_LABEL} tools and counting, grouped into PDF and document
          editing, image editing and conversion, text and writing utilities, unit and file
          converters, everyday and financial calculators, developer utilities, QR and barcode
          generators, and a few word games for when you are stalling. New tools are added regularly,
          and every one is free, works on any device with a browser, and needs nothing installed.
        </p>
      </section>

      <section className="tool-faq">
        <h2 className="tool-h2">Frequently asked questions</h2>
        <dl>
          {HOME_FAQ.map((f, i) => (
            <div className="faq-item" key={i}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HOME_FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}
