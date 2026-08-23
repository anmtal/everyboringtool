import Link from "next/link";
import { byLength } from "../lib/wordEngine";
import { wordRouteLabel } from "../lib/wordRoutes";
import WordListPage from "./WordListPage";

const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

export function nLetterWords(route) {
  const opts = {};
  if (route.mode === "starting") opts.startsWith = route.value;
  if (route.mode === "ending") opts.endsWith = route.value;
  if (route.mode === "with") opts.contains = route.value;
  return byLength(route.length, opts);
}

export default function NLetterWordsView({ route }) {
  const n = route.length;
  const label = wordRouteLabel(route);
  const words = nLetterWords(route);
  const v = (route.value || "").toUpperCase();

  const crumbs = [{ label: "Home", href: "/" }];
  if (route.mode !== "plain") {
    crumbs.push({ label: `${n} Letter Words`, href: `/${n}-letter-words` });
    crumbs.push({ label: route.mode === "starting" ? `Starting With ${v}` : route.mode === "ending" ? `Ending With ${v}` : `With ${v}` });
  } else {
    crumbs.push({ label: label });
  }

  const faq = [
    { q: `How many ${label.toLowerCase()} are there?`, a: words.length ? `There are ${words.length} ${label.toLowerCase()} in our word list.` : `No ${label.toLowerCase()} were found.` },
    { q: `Can I use these in Wordle and Scrabble?`, a: `These come from a standard English dictionary used for Scrabble and Words With Friends. Most everyday ${n}-letter words are valid Wordle guesses too.` },
  ];

  const related = (
    <>
      <section className="block">
        <h2 className="section-title">Words of other lengths</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[3, 4, 5, 6, 7, 8, 9].filter((x) => x !== n).map((x) => (
            <Link key={x} href={`/${x}-letter-words`} className="badge" style={{ textDecoration: "none" }}>{x}-letter words</Link>
          ))}
        </div>
      </section>
      {route.mode === "plain" && (
        <section className="block">
          <h2 className="section-title">{n}-letter words by starting letter</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALPHA.map((l) => (
              <Link key={l} href={`/${n}-letter-words-starting-with-${l}`} className="badge" style={{ textDecoration: "none" }}>{l.toUpperCase()}</Link>
            ))}
          </div>
        </section>
      )}
      {n === 5 && (
        <section className="block">
          <p><Link href="/wordle-solver">Solving a Wordle?</Link> Use the Wordle solver to narrow these down with your clues.</p>
        </section>
      )}
    </>
  );

  return (
    <WordListPage
      crumbs={crumbs}
      h1={label}
      lead={words.length ? `${words.length} ${label.toLowerCase()}, listed alphabetically.` : `No ${label.toLowerCase()} were found.`}
      words={words}
      faq={faq}
      related={related}
    />
  );
}
