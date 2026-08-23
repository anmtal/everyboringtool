import Link from "next/link";
import { notFound } from "next/navigation";
import { anagrams, cleanLetters } from "../../../lib/wordEngine";
import { POPULAR } from "../../../lib/wordPopular";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";

export const dynamicParams = true;
export const revalidate = 604800;

export function generateStaticParams() {
  return POPULAR.map((letters) => ({ letters }));
}

export function generateMetadata({ params }) {
  const letters = cleanLetters(decodeURIComponent(params.letters || ""));
  if (letters.replace(/\?/g, "").length < 2) return { title: "Anagram Solver" };
  const up = letters.toUpperCase();
  const count = anagrams(letters).length;
  return {
    title: `Anagrams of ${up} — ${count} words | Every Boring Tool`,
    description: `All ${count} anagrams of ${up} — words that use every letter. Free anagram solver for Scrabble, crosswords and word games.`,
    alternates: { canonical: `/anagram/${letters}` },
  };
}

export default function AnagramLettersPage({ params }) {
  const letters = cleanLetters(decodeURIComponent(params.letters || ""));
  if (letters.replace(/\?/g, "").length < 2) notFound();
  const up = letters.toUpperCase();
  const words = anagrams(letters);

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
