import Link from "next/link";
import { notFound } from "next/navigation";
import { anagrams, cleanLetters, canonicalLettersForm } from "../../../lib/wordEngine";
import { POPULAR } from "../../../lib/wordPopular";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";
import { wordRobots } from "../../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800;

export function generateStaticParams() {
  return POPULAR.map((letters) => ({ letters }));
}

// The URL space here is unbounded, so only serve a page for a segment that is a
// genuine query: letters (plus "?" wildcards) only, 15 characters at most, and
// yielding at least one anagram. Everything else 404s instead of returning a 200
// "0 words" page. Sub-pages stay reachable by submitting the form.
const MAX_LEN = 15;

function parseParam(raw) {
  let dec;
  try { dec = decodeURIComponent(String(raw || "")); } catch (e) { return null; }
  if (!dec || dec.length > MAX_LEN) return null;
  if (!/^[A-Za-z?]+$/.test(dec)) return null;
  const letters = cleanLetters(dec);
  if (letters.replace(/\?/g, "").length < 2) return null;
  return letters;
}

export function generateMetadata({ params }) {
  const letters = parseParam(params.letters);
  if (!letters) return { title: "Anagram Solver", robots: { index: false, follow: false } };
  const count = anagrams(letters).length;
  if (!count) return { title: "Anagram Solver", robots: { index: false, follow: false } };
  const up = letters.toUpperCase();
  return {
    title: `Anagrams of ${up} — ${count} words`,
    description: `All ${count} anagrams of ${up} — words that use every letter. Free anagram solver for Scrabble, crosswords and word games.`,
    robots: wordRobots(count),
    alternates: { canonical: `/anagram/${canonicalLettersForm(letters)}` },
  };
}

export default function AnagramLettersPage({ params }) {
  const letters = parseParam(params.letters);
  if (!letters) notFound();
  const words = anagrams(letters);
  if (!words.length) notFound();
  const up = letters.toUpperCase();

  const faq = [
    { q: `How many anagrams does ${up} have?`, a: words.length ? `${up} has ${words.length} anagram${words.length === 1 ? "" : "s"} — word${words.length === 1 ? "" : "s"} that use all of its letters exactly once.` : `No anagrams were found for ${up}.` },
    { q: `What's the difference between an anagram and unscrambling?`, a: `An anagram uses every letter exactly once, so it's the same length as your input. Unscrambling also finds shorter words that use only some of the letters.` },
  ];

  return (
    <WordListPage
      crumbs={[{ label: "Home", href: "/" }, { label: "Anagram Solver", href: "/anagram" }, { label: up }]}
      h1={`Anagrams of “${up}”`}
      lead={words.length ? `${words.length} anagram${words.length === 1 ? "" : "s"} use every letter of ${up}.` : `No anagrams were found for ${up}.`}
      box={<WordSearchBox basePath="/anagram" initial={letters} placeholder="Enter letters to find anagrams" buttonLabel="Solve" min={2} />}
      words={words}
      faq={faq}
      related={
        <section className="block">
          <h2 className="section-title">Also try</h2>
          <p><Link href={`/unscramble/${letters}`}>Unscramble {up}</Link> to also find shorter words you can make from these letters.</p>
        </section>
      }
    />
  );
}
