import Link from "next/link";
import { notFound } from "next/navigation";
import { matchPattern } from "../../../lib/wordEngine";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";

export const dynamicParams = true;
export const revalidate = 604800;

const SEED = ["c-t", "-at", "s--e", "c--se", "p--nt", "w-rd", "-ing", "-tion"];
export function generateStaticParams() {
  return SEED.map((pattern) => ({ pattern }));
}

function clean(p) { return String(p || "").toLowerCase().replace(/[^a-z-]/g, "").slice(0, 15); }

export function generateMetadata({ params }) {
  const p = clean(decodeURIComponent(params.pattern || ""));
  if (p.length < 2 || !/[a-z]/.test(p)) return { title: "Crossword Solver" };
  const shown = p.replace(/-/g, "_").toUpperCase();
  const count = matchPattern(p).length;
  return {
    title: `Crossword answers for ${shown} — ${count} words | Every Boring Tool`,
    description: `Every word that fits the pattern ${shown} (use _ for unknown letters). ${count} matches with Scrabble scores. Free crossword solver.`,
    alternates: { canonical: `/crossword-solver/${p}` },
  };
}

export default function CrosswordPatternPage({ params }) {
  const p = clean(decodeURIComponent(params.pattern || ""));
  if (p.length < 2 || !/[a-z]/.test(p)) notFound();
  const shown = p.replace(/-/g, "_").toUpperCase();
  const words = matchPattern(p);

  const faq = [
    { q: `What words fit the pattern ${shown}?`, a: words.length ? `${words.length} words fit ${shown}: for example ${words.slice(0, 5).join(", ")}.` : `No words match the pattern ${shown}.` },
    { q: `How do I enter a crossword pattern?`, a: `Type the letters you know and an underscore ( _ ) for each blank square. For example c_t finds cat, cot and cut.` },
  ];

  return (
    <WordListPage
      crumbs={[{ label: "Home", href: "/" }, { label: "Crossword Solver", href: "/crossword-solver" }, { label: shown }]}
      h1={`Crossword answers for “${shown}”`}
      lead={words.length ? `${words.length} words fit the pattern ${shown} (${p.length} letters).` : `No words fit the pattern ${shown}.`}
      box={<WordSearchBox basePath="/crossword-solver" initial={p} placeholder="Enter a pattern, e.g. c-t" buttonLabel="Solve" pattern />}
      words={words}
      faq={faq}
    />
  );
}
