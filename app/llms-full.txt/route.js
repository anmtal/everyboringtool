// /llms-full.txt — the full, ingestible text of the site for AI answer engines:
// every built tool with its "About" explainer and FAQ answers concatenated, so an
// agent can lift a direct answer without fetching each page. Generated from the
// live catalog. Larger than /llms.txt by design.
import { categories, SITE } from "../../lib/tools";
import { toolContent } from "../../lib/toolContent";

export const dynamic = "force-static";

function buildFull() {
  const b = SITE.url;
  const L = [];
  L.push(`# ${SITE.name} — full content`, "");
  L.push(`> ${SITE.description}`, "");
  L.push(
    "Every tool below is free, needs no account, has no usage limits, and runs in a normal web browser. Each entry gives the tool name, its URL, a plain explainer, and the questions people ask about it.",
    ""
  );

  for (const c of categories) {
    const built = c.tools.filter((t) => toolContent[t.slug]);
    if (built.length === 0) continue;
    L.push(`## ${c.name}`);
    if (c.description) L.push(c.description, "");

    for (const t of built) {
      const content = toolContent[t.slug];
      L.push(`### ${t.name}`);
      L.push(`URL: ${b}/${c.slug}/${t.slug}`);
      L.push(t.description, "");
      if (content.about) {
        for (const para of content.about.split("\n\n")) L.push(para.replace(/\s+/g, " ").trim());
        L.push("");
      }
      if (content.faq && content.faq.length) {
        L.push("FAQ:");
        for (const f of content.faq) {
          L.push(`Q: ${f.q}`);
          L.push(`A: ${f.a}`);
        }
        L.push("");
      }
    }
  }
  return L.join("\n");
}

export function GET() {
  return new Response(buildFull(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
