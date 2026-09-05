import Link from "next/link";
import { notFound } from "next/navigation";
import { startingWith } from "../../../lib/wordEngine";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";
import { wordRobots } from "../../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800;

const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");
export function generateStaticParams() {
  return ALPHA.map((prefix) => ({ prefix }));
}

// The URL space here is unbounded, so only serve a page for a segment that is a
// genuine query: letters only, 15 characters at most, and matching at least one
// word. Everything else 404s instead of returning a 200 "0 words" page.
// Sub-pages stay reachable by submitting the form.
const MAX_LEN = 15;

function parseParam(raw) {
  let dec;
  try { dec = decodeURIComponent(String(raw || "")); } catch (e) { return null; }
  if (!dec || dec.length > MAX_LEN) return null;
  if (!/^[A-Za-z]+$/.test(dec)) return null;
  return dec.toLowerCase();
}

export function generateMetadata({ params }) {
  const p = parseParam(params.prefix);
  if (!p) return { title: "Words That Start With…", robots: { index: false, follow: false } };
  const count = startingWith(p).length;
  if (!count) return { title: "Words That Start With…", robots: { index: false, follow: false } };
  const up = p.toUpperCase();
  return {
    title: `Words that start with ${up} — ${count} words`,
    description: `A complete list of ${count} words that start with ${up}, sorted by length with Scrabble scores. Free — great for Scrabble, Words With Friends and crosswords.`,
    robots: wordRobots(count),
    alternates: { canonical: `/words-starting-with/${p}` },
  };
}

export default function StartingWithPage({ params }) {
  const p = parseParam(params.prefix);
  if (!p) notFound();
  const words = startingWith(p);
  if (!words.length) notFound();
  const up = p.toUpperCase();

  const faq = [
    { q: `How many words start with ${up}?`, a: words.length ? `There are ${words.length} words that start with ${up}, from ${words[0].length} letters up to ${words[words.length - 1].length} letters long.` : `No words start with ${up}.` },
    { q: `What is the shortest word starting with ${up}?`, a: words.length ? `The shortest is "${words[0]}" (${words[0].length} letters).` : `None found.` },
  ];

  return (
    <WordListPage
      crumbs={[{ label: "Home", href: "/" }, { label: "Words Starting With", href: "/words-starting-with" }, { label: up }]}
      h1={`Words that start with “${up}”`}
      lead={words.length ? `${words.length} words start with ${up}, sorted by length.` : `No words start with ${up}.`}
      box={<WordSearchBox basePath="/words-starting-with" initial={p} placeholder="Enter a starting letter or letters" buttonLabel="Find words" allowWild={false} min={1} />}
      words={words}
      faq={faq}
      related={
        <section className="block">
          <h2 className="section-title">Related</h2>
          <p><Link href={`/words-ending-with/${p}`}>Words ending with {up}</Link> · <Link href={`/words-containing/${p}`}>Words containing {up}</Link></p>
        </section>
      }
    />
  );
}
