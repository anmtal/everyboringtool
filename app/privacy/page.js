import Link from "next/link";
import { SITE } from "../../lib/tools";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Every Boring Tool handles your data: what stays on your device, the few tools that contact a third party, and what our host records.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "23 August 2026";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export default function Privacy() {
  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link><span className="sep">/</span><span>Privacy Policy</span>
      </nav>

      <header className="page-head">
        <h1>Privacy Policy</h1>
        <p>Last updated {UPDATED}.</p>
      </header>

      <section className="block">
        <h2 className="section-title">The short version</h2>
        <p>
          {SITE.name} has no accounts, no sign-up and no login. We do not ask for your name, email
          address or payment details, and we do not sell or share personal information. The large
          majority of our tools do all their work inside your own browser, which means the files and
          text you put into them are never transmitted to us at all.
        </p>
        <p>
          There are a small number of exceptions, and we would rather spell them out than hide behind
          a blanket promise. They are listed below.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Tools that run entirely on your device</h2>
        <p>
          Our PDF, image, audio and video, text, developer, calculator, converter, QR and game tools
          are built as client-side code. When you choose a file, that file is read into your
          browser&apos;s memory and processed there by JavaScript or WebAssembly. It is not uploaded,
          not stored, and not seen by us or anyone else. Closing or reloading the tab discards it.
        </p>
        <p>
          Because there is no upload, there is nothing for us to retain, log or delete — and the tools
          keep working even if your connection drops after the page has loaded.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">The exceptions, in plain terms</h2>
        <p>
          <strong>Word games.</strong> The word tools — unscrambler, anagram solver, word lists,
          crossword solver and similar — look your letters up in a dictionary held on our server, so
          the letters or pattern you enter are sent to us as part of the web address. They are not
          personal information and we do not build any profile from them, but they do appear in
          standard server logs.
        </p>
        <p>
          <strong>Image to Text (OCR).</strong> The first time you use it, your browser downloads the
          text-recognition engine and English language model from <strong>cdn.jsdelivr.net</strong>, a
          third-party content delivery network. Your image is <em>not</em> sent there — recognition
          happens locally — but jsDelivr will see your IP address as part of serving those files.
        </p>
        <p>
          <strong>YouTube Thumbnail tool.</strong> Thumbnails are fetched directly from Google&apos;s
          servers, so the video ID you enter is sent to Google and Google will see your IP address.
          Google&apos;s own privacy policy governs that request.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Hosting and server logs</h2>
        <p>
          The site is hosted by Vercel. Like essentially all web hosts, Vercel automatically records
          technical request data — IP address, timestamp, page requested, browser user-agent — for
          security, abuse prevention and reliability. We use this only in aggregate to keep the site
          running. We do not attempt to identify individuals from it.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Cookies, analytics and advertising</h2>
        <p>
          <strong>As of {UPDATED}, this site sets no cookies of its own, runs no analytics, and shows
          no advertising.</strong>
        </p>
        <p>
          We intend to introduce advertising in future to keep the tools free. When that happens,
          third-party vendors — including Google — may use cookies or similar technologies to serve
          ads based on your prior visits to this or other websites, and this policy will be updated
          before any such code is enabled. You will be able to opt out of personalised advertising by
          Google at{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            Google Ads Settings
          </a>
          , or opt out of third-party vendor cookies at{" "}
          <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            aboutads.info
          </a>
          . If you are in the EEA, the UK or Switzerland, we will ask for your consent before any
          non-essential cookies are set.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Children</h2>
        <p>
          This site is intended for a general audience and is not directed at children under 13. We do
          not knowingly collect personal information from children.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Your rights</h2>
        <p>
          Because we do not operate accounts and do not collect personal information through the
          tools, there is normally no personal data of yours for us to access, correct, export or
          erase. If you believe we hold information about you, you can contact us and we will respond
          in line with applicable law, including Canada&apos;s PIPEDA, the UK/EU GDPR and the CCPA
          where they apply to you.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Changes</h2>
        <p>
          If this policy changes materially — in particular before advertising or analytics are
          switched on — we will update the &ldquo;last updated&rdquo; date above and revise this page.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Contact</h2>
        {CONTACT ? (
          <p>
            Questions about this policy? Email{" "}
            <a href={`mailto:${CONTACT}`} style={{ textDecoration: "underline" }}>{CONTACT}</a>.
          </p>
        ) : (
          <p className="muted">
            A contact address for privacy enquiries is being finalised and will be published here
            shortly.
          </p>
        )}
      </section>
    </>
  );
}
