import Link from "next/link";
import { notFound } from "next/navigation";
import { matchPattern } from "../../../lib/wordEngine";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";
import { wordRobots } from "../../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800;

const SEED = ["c-t", "-at", "s--e", "c--se", "p--nt", "w-rd", "-ing"];
export function generateStaticParams() {
  return SEED.map((pattern) => ({ pattern }));
}

// The URL space here is unbounded, so only serve a page for a segment that is a
// genuine pattern: letters and blank markers only ("-", or "_" as an alias),
// 2 to 15 characters, at least one real letter, and matching at least one word.
// Everything else 404s instead of returning a 200 "0 words" page. Patterns stay
// reachable by submitting the form.
const MAX_LEN = 15;

function parseParam(raw) {
  let dec;
  try { dec = decodeURIComponent(String(raw || "")); } catch (e) { return null; }
  if (dec.length < 2 || dec.length > MAX_LEN) return null;
  if (!/^[A-Za-z_-]+$/.test(dec)) return null;
  const p = dec.toLowerCase().replace(/_/g, "-");
  if (!/[a-z]/.test(p)) return null;
  return p;
}

export function generateMetadata({ params }) {
  const p = parseParam(params.pattern);
  if (!p) return { title: "Crossword Solver", robots: { index: false, follow: false } };
  const count = matchPattern(p).length;
  if (!count) return { title: "Crossword Solver", robots: { index: false, follow: false } };
  const shown = p.replace(/-/g, "_").toUpperCase();
  return {
    title: `Crossword answers for ${shown} — ${count} words`,
    description: `Every word that fits the pattern ${shown} (use _ for unknown letters). ${count} matches with Scrabble scores. Free crossword solver.`,
    robots: wordRobots(count),
    alternates: { canonical: `/crossword-solver/${p}` },
  };
}

export default function CrosswordPatternPage({ params }) {
  const p = parseParam(params.pattern);
  if (!p) notFound();
  const words = matchPattern(p);
  if (!words.length) notFound();
  const shown = p.replace(/-/g, "_").toUpperCase();

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
