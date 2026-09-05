import Link from "next/link";
import { SITE } from "../../lib/tools";

export const metadata = {
  title: "Contact",
  description:
    "Get in touch with Every Boring Tool — report a bug, request a tool, or ask a privacy or business question.",
  alternates: { canonical: "/contact" },
};

const CONTACT = SITE.email;

export default function Contact() {
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span className="sep">/</span><span>Contact</span>
      </nav>

      <header className="page-head">
        <h1>Contact us</h1>
        <p>Questions, bugs, tool requests or business enquiries — we read every message.</p>
      </header>

      <section className="block">
        <p style={{ fontSize: "1.05rem" }}>
          The best way to reach {SITE.name} is by email:
        </p>
        <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "10px 0 4px" }}>
          <a href={`mailto:${CONTACT}`} style={{ textDecoration: "underline" }}>{CONTACT}</a>
        </p>
        <p className="tool-note">
          There are no accounts and no support tickets here — a plain email is all it takes, and it
          comes straight to a real person.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">What to write about</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
          <li><strong>Found a bug?</strong> Tell us which tool and what happened — it genuinely helps.</li>
          <li><strong>Want a tool that isn&apos;t here?</strong> Suggest it. Good ideas get built.</li>
          <li><strong>A result looks wrong?</strong> Send the inputs you used so we can check the maths.</li>
          <li><strong>Privacy or legal question?</strong> See our{" "}
            <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy Policy</Link> and{" "}
            <Link href="/terms" style={{ textDecoration: "underline" }}>Terms of Use</Link>, or just ask.</li>
          <li><strong>Business or advertising?</strong> We&apos;re happy to talk.</li>
        </ul>
      </section>

      <section className="block">
        <h2 className="section-title">Response time</h2>
        <p>
          {SITE.name} is a small project, so replies aren&apos;t instant — but we aim to get back to
          everyone within a few days. Please include enough detail (which tool, what you did, what you
          expected) so we can help without a long back-and-forth.
        </p>
      </section>
    </>
  );
}
