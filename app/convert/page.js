import Link from "next/link";
import { SITE } from "../../lib/tools";
import { PAIRS, FORMATS, pairName } from "../../lib/convertMatrix";

export const metadata = {
  title: "File Converters — Free Online Video & Audio Conversion",
  description:
    "Free browser-based file converters. Convert between MP4, MOV, WEBM, MKV, AVI, MP3, WAV, M4A and more — no sign-up, no watermark, and nothing is uploaded.",
  alternates: { canonical: "/convert" },
};

export default function ConvertHub() {
  const abs = (x) => `${SITE.url}${x}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Convert", item: abs("/convert") },
        ],
      },
      {
        "@type": "ItemList",
        name: "Free file converters",
        numberOfItems: PAIRS.length,
        itemListElement: PAIRS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${pairName(p)} Converter`,
          url: abs(`/convert/${p.slug}`),
        })),
      },
    ],
  };

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <span>Convert</span>
      </nav>

      <header className="page-head">
        <h1>File Converters</h1>
        <p>Convert video and audio between formats, free and right in your browser — nothing is uploaded.</p>
      </header>

      <div className="grid">
        {PAIRS.map((p) => (
          <Link key={p.slug} href={`/convert/${p.slug}`} className="card tool-card">
            <span className="tool-name">{pairName(p)}</span>
            <span className="tool-desc">Convert {FORMATS[p.from].name} to {FORMATS[p.to].name}.</span>
            <span className="cat-meta"><span className="badge badge-live">Open</span></span>
          </Link>
        ))}
      </div>

      <section className="tool-related" style={{ marginTop: 40 }}>
        <h2 className="tool-h2">More audio &amp; video tools</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href="/audio-video" className="badge" style={{ textDecoration: "none" }}>All Audio &amp; Video tools</Link>
          <Link href="/audio-video/compress-video" className="badge" style={{ textDecoration: "none" }}>Compress Video</Link>
          <Link href="/audio-video/video-trim" className="badge" style={{ textDecoration: "none" }}>Trim Video</Link>
          <Link href="/audio-video/video-to-gif" className="badge" style={{ textDecoration: "none" }}>Video to GIF</Link>
          <Link href="/audio-video/mute-video" className="badge" style={{ textDecoration: "none" }}>Mute Video</Link>
          <Link href="/audio-video/add-subtitles" className="badge" style={{ textDecoration: "none" }}>Add Subtitles</Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
