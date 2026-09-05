import Link from "next/link";
import { SITE } from "../../lib/tools";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Every Boring Tool handles your data: what stays on your device, the few tools that contact a third party, and what our host records.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "4 September 2026";
const CONTACT = SITE.email;

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
          <strong>Video & Audio to Text.</strong> Like the OCR tool, the first time you use it your
          browser downloads a speech-recognition model from a third-party content delivery network
          (Hugging Face). Your audio or video is <em>not</em> sent there — transcription happens
          entirely on your device — but the CDN will see your IP address while it serves the model.
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
          <strong>As of {UPDATED}, this site uses Google Analytics and carries Google
          advertising.</strong> Here is exactly what that means.
        </p>
        <p>
          <strong>Analytics.</strong> We use Google Analytics 4, which sets cookies in your browser
          (the <code>_ga</code> family) to tell one visit apart from another. It reports aggregate,
          anonymised usage statistics — how many people used a tool, which pages they arrived on,
          roughly which country they were in — so we know which tools are worth keeping and
          improving. We do not use it to identify you, and we do not upload anything you put into a
          tool. You can opt out of Google Analytics on every site you visit with Google&apos;s{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            browser opt-out add-on
          </a>
          .
        </p>
        <p>
          <strong>Advertising.</strong> Google AdSense may serve ads on this site to keep the tools
          free. Google and its partners use cookies — including the DoubleClick cookie — to serve
          and measure ads, and to personalise them based on your prior visits to this and other
          websites. How Google uses cookies in advertising is described at{" "}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            policies.google.com/technologies/ads
          </a>
          . You can turn off personalised advertising by Google at{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            Google Ads Settings
          </a>
          , or opt out of third-party vendor cookies at{" "}
          <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            aboutads.info
          </a>
          .
        </p>
        <p>
          <strong>The tools themselves are unaffected.</strong> Analytics and advertising sit around
          the page, not inside the tools: the files, images and text you process are still handled
          locally in your browser and are never uploaded — not to us, not to Google, not to anyone.
        </p>
        <p>
          If you are in the EEA, the UK or Switzerland, Google shows a consent message where consent
          is required before non-essential advertising and analytics cookies are set, and your choice
          is respected.
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
          If this policy changes materially — in particular if the way advertising or analytics work
          here changes — we will update the &ldquo;last updated&rdquo; date above and revise this page.
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
