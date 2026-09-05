import Link from "next/link";
import { notFound } from "next/navigation";
import { containing } from "../../../lib/wordEngine";
import WordSearchBox from "../../../components/WordSearchBox";
import WordListPage from "../../../components/WordListPage";
import { wordRobots } from "../../../lib/wordSeo";

export const dynamicParams = true;
export const revalidate = 604800;

const SEED = ["qu", "zz", "oo", "ee", "th", "ch", "ph", "ck", "sch", "tch", "igh", "eau", "ough"];
export function generateStaticParams() {
  return SEED.map((substr) => ({ substr }));
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
  const p = parseParam(params.substr);
  if (!p) return { title: "Words Containing…", robots: { index: false, follow: false } };
  const count = containing(p).length;
  if (!count) return { title: "Words Containing…", robots: { index: false, follow: false } };
  const up = p.toUpperCase();
  return {
    title: `Words with ${up} in them — ${count} words`,
    description: `A complete list of ${count} words containing the letters ${up}, sorted by length with Scrabble scores. Free — great for Scrabble, Words With Friends and crosswords.`,
    robots: wordRobots(count),
    alternates: { canonical: `/words-containing/${p}` },
  };
}

export default function ContainingPage({ params }) {
  const p = parseParam(params.substr);
  if (!p) notFound();
  const words = containing(p);
  if (!words.length) notFound();
  const up = p.toUpperCase();

  const faq = [
    { q: `How many words contain ${up}?`, a: words.length ? `There are ${words.length} words that contain the letters ${up}.` : `No words contain ${up}.` },
    { q: `Where can I use these?`, a: `Words containing a specific sequence are handy for crosswords, Scrabble, Words With Friends and word puzzles where part of the answer is already filled in.` },
  ];

  return (
    <WordListPage
      crumbs={[{ label: "Home", href: "/" }, { label: "Words Containing", href: "/words-containing" }, { label: up }]}
      h1={`Words containing “${up}”`}
      lead={words.length ? `${words.length} words contain ${up}, sorted by length.` : `No words contain ${up}.`}
      box={<WordSearchBox basePath="/words-containing" initial={p} placeholder="Enter letters to find inside words" buttonLabel="Find words" allowWild={false} min={1} />}
      words={words}
      faq={faq}
      related={
        <section className="block">
          <h2 className="section-title">Related</h2>
          <p><Link href={`/words-starting-with/${p}`}>Words starting with {up}</Link> · <Link href={`/words-ending-with/${p}`}>Words ending with {up}</Link></p>
        </section>
      }
    />
  );
}
