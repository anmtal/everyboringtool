import "./globals.css";
import Link from "next/link";
import { Inter } from "next/font/google";
import { SITE, categories } from "../lib/tools";
import CategoryNav from "../components/CategoryNav";
import BrandLogo from "../components/BrandLogo";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Free Online Tools`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["free online tools", "pdf tools", "merge pdf", "image tools", "calculators", "converters", "no sign-up"],
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — Free Online Tools`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Free Online Tools`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({ children }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
              <BrandLogo />
              <span className="brand-name">{SITE.name}</span>
            </Link>
            <span className="brand-tagline">{SITE.tagline}</span>
          </div>
          <CategoryNav />
        </header>

        <main id="main" className="container main" tabIndex={-1}>{children}</main>

        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
                <BrandLogo />
                <span className="brand-name">{SITE.name}</span>
              </Link>
              <p className="footer-tag muted">
                {SITE.tagline} No sign-up, no clutter — just tools that work, right in your browser.
              </p>
            </div>
            <nav className="footer-col" aria-label="Categories">
              <h3 className="footer-h">Categories</h3>
              {categories.slice(0, 6).map((c) => (
                <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>
              ))}
            </nav>
            <nav className="footer-col" aria-label="More">
              <h3 className="footer-h">More</h3>
              <Link href="/">All tools</Link>
              {categories.slice(6).map((c) => (
                <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>
              ))}
            </nav>
            <nav className="footer-col" aria-label="Site">
              <h3 className="footer-h">Site</h3>
              <Link href="/about">About</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Use</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/unscramble">Word games</Link>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>© {year} {SITE.name}</span>
            <span>Boring, but it works.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
