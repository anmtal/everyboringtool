import "./globals.css";
import Link from "next/link";
import { Inter } from "next/font/google";
import { SITE, categories } from "../lib/tools";
import { TOOL_COUNT_LABEL } from "../lib/toolCount";
import CategoryNav from "../components/CategoryNav";
import BrandLogo from "../components/BrandLogo";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

// Google AdSense publisher (client) ID.
const ADSENSE_CLIENT = "ca-pub-8757202685549420";
// Google Analytics 4 measurement ID (client-side, public — not a secret).
const GA_ID = "G-4ES1CRH19C";

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
  // Ownership verification for Google AdSense (renders the account meta tag).
  verification: { other: { "google-adsense-account": ADSENSE_CLIENT } },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

// Sitewide brand entity for E-E-A-T. Anonymity-safe: the publisher is the brand
// "Every Boring Tool", never a person. Establishes a consistent Organization +
// WebSite entity that per-page WebApplication schema can attribute to.
const ORG_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#org`,
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/icon.svg`,
      description: SITE.description,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      inLanguage: "en",
      publisher: { "@id": `${SITE.url}/#org` },
    },
  ],
};

export default function RootLayout({ children }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Raw <script> so the AdSense crawler sees it in the server HTML (a
            next/script afterInteractive tag is JS-injected and invisible to the
            non-JS verification crawler). async = non-blocking. */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
        {/* Google Analytics 4 (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }}
        />
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
              <BrandLogo idKey="h" />
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
                <BrandLogo idKey="f" />
                <span className="brand-name">{SITE.name}</span>
              </Link>
              <p className="footer-tag muted">
                {SITE.tagline} No sign-up, no clutter — just tools that work, right in your browser.
              </p>
              <p className="footer-count muted">{TOOL_COUNT_LABEL} free tools · nothing to install</p>
            </div>

            <div className="footer-links">
              <nav className="footer-col footer-col-cats" aria-label="Tool categories">
                <h3 className="footer-h">Categories</h3>
                <div className="footer-cats">
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>
                  ))}
                </div>
              </nav>

              <nav className="footer-col" aria-label="Word games">
                <h3 className="footer-h">Word Games</h3>
                <Link href="/unscramble">Word Unscrambler</Link>
                <Link href="/anagram">Anagram Solver</Link>
                <Link href="/wordle-solver">Wordle Solver</Link>
                <Link href="/crossword-solver">Crossword Solver</Link>
                <Link href="/words-starting-with">Words Starting With…</Link>
                <Link href="/words-ending-with">Words Ending With…</Link>
              </nav>

              <nav className="footer-col" aria-label="Site">
                <h3 className="footer-h">Site</h3>
                <Link href="/">All tools</Link>
                <Link href="/convert">File Converters</Link>
                <Link href="/about">About</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Use</Link>
              </nav>
            </div>
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
