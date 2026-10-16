import { notFound } from "next/navigation";
import ToolMount from "../../../components/ToolMount";
import { EMBEDS, getEmbed } from "../../../lib/embeds";
import { getToolBySlug, SITE } from "../../../lib/tools";

// /embed/<slug>: the bare tool for other sites to iframe (see lib/embeds.js).
// The root layout leaves out the header, nav and footer on these pages
// (components/SiteChrome.jsx) and its gate turns off ads and analytics here;
// next.config.mjs sends the framing-friendly headers + X-Robots-Tag: noindex to
// exactly these paths (lib/embedSlugs.mjs), not to other /embed/* URLs.
// Only slugs in EMBEDS exist: anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(EMBEDS).map((slug) => {
    // Fail the build rather than ship a credit link to a page that has moved,
    // been renamed or been hidden.
    const found = getToolBySlug(slug);
    const live = found ? `/${found.category.slug}/${found.tool.slug}` : null;
    if (live !== EMBEDS[slug].path) {
      throw new Error(`lib/embeds.js: "${slug}" points at ${EMBEDS[slug].path}, but the live tool is ${live || "missing"}`);
    }
    return { slug };
  });
}

export function generateMetadata({ params }) {
  const e = getEmbed(params.slug);
  if (!e) return {};
  return {
    title: e.title,
    robots: { index: false, follow: true },
  };
}

export default function EmbedPage({ params }) {
  const e = getEmbed(params.slug);
  if (!e) notFound();
  return (
    <div className="embed-page">
      <ToolMount slug={params.slug} />
      <p className="embed-credit">
        <a href={`${SITE.url}${e.path}`} target="_blank" rel="nofollow noopener">
          {e.credit}
        </a>
      </p>
    </div>
  );
}
