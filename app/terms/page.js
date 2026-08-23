import Link from "next/link";
import { SITE } from "../../lib/tools";

export const metadata = {
  title: "Terms of Use",
  description:
    "The terms for using Every Boring Tool's free online tools — acceptable use, accuracy of results, and limitation of liability.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "23 August 2026";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export default function Terms() {
  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link><span className="sep">/</span><span>Terms of Use</span>
      </nav>

      <header className="page-head">
        <h1>Terms of Use</h1>
        <p>Last updated {UPDATED}.</p>
      </header>

      <section className="block">
        <h2 className="section-title">Accepting these terms</h2>
        <p>
          By using {SITE.name} you agree to these terms. If you do not agree with them, please do not
          use the site. There is no account to create and nothing to pay — using the tools is itself
          your acceptance.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">What you can expect</h2>
        <p>
          The tools are provided free of charge, for personal and commercial use, with no sign-up. We
          may add, change, or remove tools at any time, and we may take the site offline for
          maintenance or for good. We do not guarantee uninterrupted availability.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Accuracy of results — please read</h2>
        <p>
          Our calculators, converters and generators are provided for general information only.
          Despite our best efforts, results may contain errors, and they are <strong>not</strong>{" "}
          professional advice.
        </p>
        <p>
          In particular: financial, tax, loan, salary and investment calculators are not financial or
          tax advice; health calculators such as BMI or calorie estimators are not medical advice;
          and construction, material and HVAC estimators are not engineering advice and must not be
          relied on for ordering, structural, electrical or safety decisions. Always verify important
          figures independently and consult a qualified professional before acting on them.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Your files and your responsibility</h2>
        <p>
          You are responsible for the files and content you process, and for having the right to
          process them. Do not use the tools for anything unlawful, to infringe someone else&apos;s
          copyright or privacy, to remove protection from material you do not own, or to attempt to
          disrupt, overload or reverse-engineer the site.
        </p>
        <p>
          <strong>Keep your own backups.</strong> Tools that modify a file operate on a copy in your
          browser and give you a new file to download, but you should never rely on this site as the
          only copy of anything important.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Third-party services</h2>
        <p>
          A few tools contact third parties to work — these are named in our{" "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy Policy</Link>. Those
          services have their own terms, which govern your use of them. Links to external sites are
          provided for convenience and we are not responsible for their content.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">No warranty and limitation of liability</h2>
        <p>
          The site and every tool on it are provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;, without warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose and non-infringement.
        </p>
        <p>
          To the fullest extent permitted by law, we are not liable for any loss or damage arising
          from your use of the site — including lost data, corrupted or unusable files, lost profits,
          or decisions made on the basis of a calculated result. Some jurisdictions do not allow
          certain exclusions, so parts of this section may not apply to you.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Intellectual property</h2>
        <p>
          The site&apos;s name, design and code belong to us. Whatever you create with the tools is
          yours — we claim no rights over your files, text or output.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Governing law</h2>
        <p>
          These terms are governed by the applicable laws of Canada, without regard to
          conflict-of-law rules.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">Contact</h2>
        {CONTACT ? (
          <p>
            Questions about these terms? Email{" "}
            <a href={`mailto:${CONTACT}`} style={{ textDecoration: "underline" }}>{CONTACT}</a>.
          </p>
        ) : (
          <p className="muted">A contact address is being finalised and will be published here shortly.</p>
        )}
      </section>
    </>
  );
}
