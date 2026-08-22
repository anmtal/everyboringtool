import "./globals.css";
import Link from "next/link";
import { SITE } from "../lib/tools";
import CategoryNav from "../components/CategoryNav";

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
              <svg className="brand-logo" viewBox="0 0 100 100" aria-hidden="true">
                <rect className="badge" width="100" height="100" rx="22" />
                <g className="tile">
                  <rect x="26" y="26" width="20" height="20" rx="5" />
                  <rect x="54" y="26" width="20" height="20" rx="5" />
                  <rect x="26" y="54" width="20" height="20" rx="5" />
                  <rect x="54" y="54" width="20" height="20" rx="5" />
                </g>
              </svg>
              <span className="brand-name">{SITE.name}</span>
            </Link>
            <span className="brand-tagline">{SITE.tagline}</span>
          </div>
          <CategoryNav />
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
