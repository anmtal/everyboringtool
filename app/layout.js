import "./globals.css";
import Link from "next/link";
import { Inter } from "next/font/google";
import { SITE, categories } from "../lib/tools";
import { TOOL_COUNT_LABEL } from "../lib/toolCount";
import CategoryNav from "../components/CategoryNav";
import BrandLogo from "../components/BrandLogo";
import SiteChrome, { FrameGuard } from "../components/SiteChrome";
import { EMBED_PATHS } from "../lib/embedSlugs.mjs";
import { NO_ADS_SLUGS } from "../lib/noAds";

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
// Our own brand profiles, linked in the footer and listed in the Organization
// schema's sameAs below.
const SOCIAL = [
  { name: "YouTube", url: "https://www.youtube.com/channel/UCBUS0GlS5YbY45xtWuNcE7w" },
  { name: "Instagram", url: "https://www.instagram.com/everyboringtool/" },
  { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61594195742039" },
  { name: "X", url: "https://x.com/everyboringtool" },
];

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
      // Brand profiles for the same entity — helps Google/AI tie "Every Boring Tool"
      // together across the web (E-E-A-T / entity signal for GEO + SEO).
      sameAs: [...SOCIAL.map((s) => s.url), "https://www.producthunt.com/products/every-boring-tool"],
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

// Tool pages that must never request ads (lib/noAds.js). The gate below pauses
// ad requests there too, so Auto ads can't place units either. (A client-side
// navigation into one of these pages doesn't re-run the gate; the tool page
// also skips its manual AdSlot.)
const NO_AD_PATHS = categories.flatMap((c) => c.tools.filter((t) => NO_ADS_SLUGS.has(t.slug)).map((t) => `/${c.slug}/${t.slug}`));

export default function RootLayout({ children }) {
  const year = new Date().getFullYear();
  // Set NEXT_PUBLIC_ADSENSE_ENABLED=1 in Vercel once AdSense is approved and ad units are placed.
  const adsenseEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "1";
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Internal-traffic gate. Silences ads and analytics for the owner's
            browsers (cookie set at /internal), for previews and localhost, and
            for automated browsers: the DeadPan recorder drives production in
            Playwright, which sends an "EBT-Internal" user-agent token and
            reports navigator.webdriver (Google's own crawlers are exempt from
            that check, so ad and site review see the page unchanged).
            Self-generated ad impressions or clicks risk an AdSense
            invalid-traffic strike. Both switches are Google's documented ones:
            ga-disable-<ID> stops every GA4 hit (gtag.js only sends once the
            config call below runs, which is after this), and pauseAdRequests
            holds all ad requests. Client-side on purpose, so every page stays
            static. The second clause makes embeds ad-free and analytics-free:
            any /embed/* page (lib/embeds.js), and any page shown inside a
            frame, gets the same two switches (but isn't marked internal). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=navigator,u=n.userAgent||"",c=document.cookie||"";if(/(?:^|;\\s*)ebt_internal=1(?:;|$)/.test(c)||u.indexOf("EBT-Internal")>-1||(n.webdriver&&!/Google/i.test(u))||!/(^|\\.)everyboringtool\\.com$/.test(location.hostname)){window["ga-disable-${GA_ID}"]=true;(window.adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=1;window.__ebtInternal=true;}}catch(e){}try{if(/^\\/embed\\//.test(location.pathname)||window.self!==window.top){window["ga-disable-${GA_ID}"]=true;(window.adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=1;}if(${JSON.stringify(NO_AD_PATHS)}.indexOf(location.pathname)>-1){(window.adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=1;}}catch(e){}})();`,
          }}
        />
        {/* Frame guard. Only the /embed/<slug> pages (lib/embedSlugs.mjs) may
            be framed by other sites; every other page sends X-Frame-Options
            and frame-ancestors 'self'. If one is ever shown in a cross-origin
            frame anyway (a header rule that misses, a proxy that strips the
            headers), hide it before it paints, so there is nothing to click
            (the rule is in app/globals.css). A same-origin parent can read
            top.location; a cross-origin one throws. FrameGuard (below) covers
            client-side navigations, which load no new document. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.self===window.top||${JSON.stringify(EMBED_PATHS)}.indexOf(location.pathname)>-1)return;try{window.top.location.href}catch(e){document.documentElement.setAttribute("data-framed","blocked")}}catch(e){}})();`,
          }}
        />
        <FrameGuard />
        {/* Raw <script> so the AdSense crawler sees it in the server HTML (a
            next/script afterInteractive tag is JS-injected and invisible to the
            non-JS verification crawler). defer, not async: React hoists async
            scripts into <head>, ahead of the gate above, and a cached loader
            could then start requesting ads before pauseAdRequests is set.
            A deferred script stays here and runs only after parsing, so the
            gate always runs first. The google-adsense-account meta tag above
            stays unconditional, so site verification works while this is off. */}
        {adsenseEnabled && (
          <script
            defer
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Google Analytics 4 (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB','IS','LI','NO','CH'],wait_for_update:500});gtag('js',new Date());gtag('config','${GA_ID}');`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }}
        />
        {/* SiteChrome renders its children everywhere except /embed/<slug>
            (the iframe-able tool pages), which must show only the tool. */}
        <SiteChrome>
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
        </SiteChrome>

        <main id="main" className="container main" tabIndex={-1}>{children}</main>

        <SiteChrome>
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
                <Link href="/charts">Printable Charts</Link>
                <Link href="/blog">Guides</Link>
                <Link href="/about">About</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Use</Link>
              </nav>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {year} {SITE.name}</span>
            <nav className="footer-social" aria-label="Social profiles">
              {SOCIAL.map((s) => (
                <a key={s.name} href={s.url} rel="me noopener">{s.name}</a>
              ))}
            </nav>
            <span>Boring, but it works.</span>
          </div>
        </footer>
        </SiteChrome>
      </body>
    </html>
  );
}
