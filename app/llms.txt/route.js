// /llms.txt — a machine-readable map of the site for AI agents and answer
// engines (the emerging llms.txt convention). Generated from the live tool
// catalog so it can never drift from what is actually built. Concise: names,
// URLs and one-line descriptions. See /llms-full.txt for the full answer prose.
import { categories, SITE } from "../../lib/tools";
import { toolContent } from "../../lib/toolContent";

export const dynamic = "force-static";

const WORD_GAMES = [
  ["/unscramble", "Word Unscrambler", "Unscramble letters into valid words for Scrabble and Words With Friends."],
  ["/anagram", "Anagram Solver", "Find every anagram of a set of letters."],
  ["/wordle-solver", "Wordle Solver", "Enter the letters you know and their positions to see every possible answer."],
  ["/words-starting-with", "Words Starting With", "List every word beginning with the letters you choose."],
  ["/words-ending-with", "Words Ending With", "List every word ending in a given suffix, like -ing or -ed."],
  ["/words-containing", "Words Containing", "List words that contain a given letter sequence."],
  ["/crossword-solver", "Crossword Solver", "Solve a crossword clue from a known-letter pattern."],
];

function buildLlms() {
  const b = SITE.url;
  const L = [];
  L.push(`# ${SITE.name}`, "");
  L.push(`> ${SITE.description}`, "");
  L.push(
    "Every Boring Tool is a free collection of small, practical online utilities: PDF and image tools, unit and format converters, everyday calculators, developer and SEO helpers, word games and more. Every tool is free, needs no account or sign-up, has no usage limits, and works in a normal web browser on desktop or mobile with nothing to install. Most tools do their work entirely in your browser.",
    ""
  );

  L.push("## Word Games");
  for (const [href, name, desc] of WORD_GAMES) L.push(`- [${name}](${b}${href}): ${desc}`);
  L.push("");

  for (const c of categories) {
    const built = c.tools.filter((t) => toolContent[t.slug]);
    if (built.length === 0) continue;
    L.push(`## ${c.name}`);
    if (c.description) L.push(c.description);
    L.push(`- [All ${c.name}](${b}/${c.slug}): Browse every ${c.name.toLowerCase()} tool.`);
    for (const t of built) L.push(`- [${t.name}](${b}/${c.slug}/${t.slug}): ${t.description}`);
    L.push("");
  }

  L.push("## About");
  L.push(`- [About](${b}/about): What Every Boring Tool is, how it is built, and how it stays free.`);
  L.push(`- [Privacy Policy](${b}/privacy): Exactly what each tool does and does not send anywhere.`);
  L.push(`- [Contact](${b}/contact): How to get in touch.`);
  L.push("");
  return L.join("\n");
}

export function GET() {
  return new Response(buildLlms(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
