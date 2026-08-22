import "./globals.css";
import Link from "next/link";
import { SITE } from "../lib/tools";

export const metadata = {
  metadataBase: new URL("https://everyboringtool.com"),
  title: {
    default: `${SITE.name} — Free Online Tools`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true">▢</span>
              <span className="brand-name">{SITE.name}</span>
            </Link>
            <span className="brand-tagline">{SITE.tagline}</span>
          </div>
        </header>
        <main className="container main">{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <span>© {new Date().getFullYear()} {SITE.name}</span>
            <span className="muted">Boring, but it works.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
