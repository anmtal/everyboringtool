// Pure, framework-free spell + grammar/style engine.
// No DOM and no network: createEngine(dict) where `dict` is a Set of lowercased
// valid words. Returned { analyze, suggest, known } close over that dictionary.
// Kept separate from the React component so it can be unit-tested in Node.

// Common words a Scrabble-style list omits: contractions, days/months, modern
// and tech vocabulary, and a few everyday words. Keeps false positives low.
export const EXTRA = new Set(
  (
    "i a ok okay etc vs " +
    "i'm i've i'll i'd you're you've you'll you'd we're we've we'll we'd " +
    "they're they've they'll they'd he's he'll he'd she's she'll she'd it's it'll " +
    "that's there's here's what's who's where's how's let's y'all o'clock ma'am " +
    "don't doesn't didn't isn't aren't wasn't weren't haven't hasn't hadn't " +
    "won't wouldn't can't couldn't shouldn't mustn't needn't daren't ain't " +
    "monday tuesday wednesday thursday friday saturday sunday " +
    "january february march april may june july august september october november december " +
    "email emails website websites online offline internet intranet login logout " +
    "signup blog blogs blogger vlog podcast podcasts app apps url urls username " +
    "smartphone smartphones laptop laptops desktop wifi bluetooth ebook ebooks " +
    "download downloads upload uploads emoji emojis hashtag hashtags selfie selfies " +
    "chatbot chatbots dataset datasets pixel pixels png jpg jpeg gif webp svg pdf " +
    "html css javascript json api apis sql uri ux ui seo saas ecommerce " +
    "google youtube facebook instagram whatsapp tiktok linkedin twitter " +
    "coronavirus covid livestream livestreams startups startup freelance freelancer"
  ).split(/\s+/)
);

// The most common English words, roughly frequency-ordered, plus a tail of
// frequently-misspelled targets. Used only to rank spelling suggestions so the
// likeliest correction (e.g. "the" for "teh") surfaces first instead of an
// alphabetical near-neighbour.
const COMMON = (
  "the be to of and a in that have i it for not on with he as you do at this but his " +
  "by from they we say her she or an will my one all would there their what so up out if " +
  "about who get which go me when make can like time no just him know take people into year " +
  "your good some could them see other than then now look only come it over think also back " +
  "after use two how our work first well way even new want because any these give day most us " +
  "is are was were been has had said did got made went " +
  "very many much such through still should before here own too may down need each part place " +
  "right great little world life where help thing man woman child week month home feel find tell " +
  "ask seem try leave call keep let begin might next same another while last however between both " +
  "under few those must always never often really actually probably usually together without around " +
  "since against during again something nothing everything someone anyone number people " +
  "receive believe their there they're your you're its it's separate definitely government business " +
  "different important available especially information necessary tomorrow beautiful because friend " +
  "which whether though thought through enough people question address remember beginning "
).split(/\s+/).filter(Boolean);
const RANK = new Map();
COMMON.forEach((w, i) => { if (!RANK.has(w)) RANK.set(w, i); });

// Article exceptions: written form vs. spoken sound.
const AN_EXCEPT = /^(hour|honest|honou?r|heir|homage|honorabl|honestly|hourly)/;
const A_EXCEPT = /^(uni|use|usu|util|euro|europ|one|onc|ubiq|ufo|url|ewe|uk)/;

export function wantsAn(word) {
  const w = word.toLowerCase();
  if (A_EXCEPT.test(w)) return false;
  if (AN_EXCEPT.test(w)) return true;
  return /^[aeiou]/.test(w);
}

const APOS = /[’']/g;
export function norm(word) {
  return word.replace(APOS, "'").toLowerCase();
}

export function matchCase(original, suggestion) {
  if (original.length > 1 && original === original.toUpperCase())
    return suggestion.toUpperCase();
  if (original[0] === original[0].toUpperCase())
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  return suggestion;
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
function edits1(word) {
  const res = new Set();
  for (let i = 0; i <= word.length; i++) {
    const L = word.slice(0, i);
    const R = word.slice(i);
    if (R) res.add(L + R.slice(1));
    if (R.length > 1) res.add(L + R[1] + R[0] + R.slice(2));
    for (let c = 0; c < 26; c++) {
      const ch = LETTERS[c];
      if (R) res.add(L + ch + R.slice(1));
      res.add(L + ch + R);
    }
  }
  return res;
}

const WORDY = [
  ["in order to", "to"],
  ["due to the fact that", "because"],
  ["in spite of the fact that", "although"],
  ["at this point in time", "now"],
  ["at the present time", "now"],
  ["in the event that", "if"],
  ["for the purpose of", "for"],
  ["with regard to", "about"],
  ["with reference to", "about"],
  ["in the near future", "soon"],
  ["a large number of", "many"],
  ["a majority of", "most"],
  ["on a daily basis", "daily"],
  ["on a regular basis", "regularly"],
  ["in a timely manner", "promptly"],
  ["make a decision", "decide"],
  ["is able to", "can"],
  ["are able to", "can"],
  ["each and every", "every"],
];

const ABBREV = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc",
  "eg", "ie", "no", "vol", "fig", "inc", "ltd", "co", "approx",
]);

let ID = 0;

export function createEngine(dict) {
  function known(word) {
    const w = norm(word);
    if (dict.has(w) || EXTRA.has(w)) return true;
    if (w.endsWith("'s")) {
      const base = w.slice(0, -2);
      if (dict.has(base) || EXTRA.has(base)) return true;
    }
    if (w.endsWith("'")) {
      const base = w.slice(0, -1);
      if (dict.has(base) || EXTRA.has(base)) return true;
    }
    return false;
  }

  function suggest(original) {
    const w = norm(original);
    const found = []; // { word, dist }
    const seen = new Set();
    const e1 = edits1(w);
    for (const c of e1) {
      if ((dict.has(c) || EXTRA.has(c)) && !seen.has(c)) {
        seen.add(c);
        found.push({ word: c, dist: 1 });
      }
    }
    if (found.length < 4 && w.length <= 13) {
      let guard = 0;
      outer: for (const c1 of e1) {
        for (const c2 of edits1(c1)) {
          if (++guard > 400000) break outer;
          if (dict.has(c2) && !seen.has(c2)) {
            seen.add(c2);
            found.push({ word: c2, dist: 2 });
            if (found.length >= 12) break outer;
          }
        }
      }
    }
    found.sort((a, b) => {
      if (a.dist !== b.dist) return a.dist - b.dist; // closer edits first
      const ra = RANK.has(a.word) ? RANK.get(a.word) : Infinity;
      const rb = RANK.has(b.word) ? RANK.get(b.word) : Infinity;
      if (ra !== rb) return ra - rb; // then most common first
      return (
        Math.abs(a.word.length - w.length) - Math.abs(b.word.length - w.length) ||
        (a.word[0] === w[0] ? 0 : 1) - (b.word[0] === w[0] ? 0 : 1) ||
        (a.word < b.word ? -1 : 1)
      );
    });
    return found.slice(0, 5).map((s) => matchCase(original, s.word));
  }

  function analyze(text, opts) {
    opts = opts || {};
    const ignoreNames = opts.ignoreNames !== false;
    const ignoredWords = opts.ignoredWords || new Set();
    const dismissed = opts.dismissed || new Set();
    const issues = [];
    const taken = [];

    const overlaps = (s, e) => taken.some((r) => s < r[1] && e > r[0]);
    const sig = (type, message, bad) => type + "|" + message + "|" + bad;

    function push(issue) {
      if (dismissed.has(sig(issue.type, issue.message, issue.bad))) return;
      issues.push(issue);
      taken.push([issue.start, issue.end]);
    }

    // doubled word
    {
      const re = /\b([A-Za-z]+)(\s+)(\1)\b/gi;
      let m;
      while ((m = re.exec(text))) {
        if (m[1].toLowerCase() !== m[3].toLowerCase()) continue;
        const start = m.index + m[1].length;
        const end = m.index + m[0].length;
        push({ id: ++ID, type: "grammar", start, end, bad: m[2] + m[3], fix: "", message: `Repeated word “${m[3]}”.`, suggestions: [""] });
      }
    }
    // should/could/would + of -> have
    {
      const re = /\b(should|would|could|must|might|may)(\s+)of\b/gi;
      let m;
      while ((m = re.exec(text))) {
        const s = m.index + m[1].length + m[2].length;
        const e = s + 2;
        if (overlaps(s, e)) continue;
        push({ id: ++ID, type: "grammar", start: s, end: e, bad: "of", fix: "have", message: `“${m[1]} of” should be “${m[1]} have”.`, suggestions: ["have"] });
      }
    }
    // alot
    {
      const re = /\balot\b/gi;
      let m;
      while ((m = re.exec(text))) {
        if (overlaps(m.index, m.index + m[0].length)) continue;
        push({ id: ++ID, type: "grammar", start: m.index, end: m.index + m[0].length, bad: m[0], fix: matchCase(m[0], "a lot"), message: "“alot” is two words: “a lot”.", suggestions: [matchCase(m[0], "a lot")] });
      }
    }
    // a / an
    {
      const re = /\b(an?)\s+([A-Za-z]+)/gi;
      let m;
      while ((m = re.exec(text))) {
        const art = m[1];
        if (/^an?$/i.test(m[2])) continue; // "a a" / "a an" — handled by the repeated-word rule
        const isAn = art.toLowerCase() === "an";
        const need = wantsAn(m[2]);
        if (isAn === need) continue;
        const s = m.index;
        const e = m.index + art.length;
        if (overlaps(s, e)) continue;
        const rep = matchCase(art, need ? "an" : "a");
        push({ id: ++ID, type: "grammar", start: s, end: e, bad: art, fix: rep, message: `Use “${rep}” before “${m[2]}”.`, suggestions: [rep] });
      }
    }
    // wordiness
    for (const [phrase, rep] of WORDY) {
      const re = new RegExp("\\b" + phrase.replace(/ /g, "\\s+") + "\\b", "gi");
      let m;
      while ((m = re.exec(text))) {
        if (overlaps(m.index, m.index + m[0].length)) continue;
        push({ id: ++ID, type: "style", start: m.index, end: m.index + m[0].length, bad: m[0], fix: matchCase(m[0], rep), message: `Wordy — consider “${rep}”.`, suggestions: [matchCase(m[0], rep)] });
      }
    }
    // double space
    {
      const re = / {2,}/g;
      let m;
      while ((m = re.exec(text))) {
        if (overlaps(m.index, m.index + m[0].length)) continue;
        push({ id: ++ID, type: "grammar", start: m.index, end: m.index + m[0].length, bad: m[0], fix: " ", message: "Multiple spaces.", suggestions: [" "] });
      }
    }
    // space before punctuation
    {
      const re = / +([,.;:!?])/g;
      let m;
      while ((m = re.exec(text))) {
        if (overlaps(m.index, m.index + m[0].length)) continue;
        push({ id: ++ID, type: "grammar", start: m.index, end: m.index + m[0].length, bad: m[0], fix: m[1], message: "Remove the space before punctuation.", suggestions: [m[1]] });
      }
    }
    // missing space after , ; :
    {
      const re = /([,;:])([A-Za-z])/g;
      let m;
      while ((m = re.exec(text))) {
        if (overlaps(m.index, m.index + m[0].length)) continue;
        push({ id: ++ID, type: "grammar", start: m.index, end: m.index + m[0].length, bad: m[0], fix: m[1] + " " + m[2], message: "Add a space after the punctuation.", suggestions: [m[1] + " " + m[2]] });
      }
    }
    // sentence capitalisation
    {
      const re = /([.!?])(\s+)([a-z])/g;
      let m;
      while ((m = re.exec(text))) {
        const before = text.slice(Math.max(0, m.index - 6), m.index).match(/([A-Za-z]+)$/);
        if (before && ABBREV.has(before[1].toLowerCase())) continue;
        const at = m.index + m[1].length + m[2].length;
        if (overlaps(at, at + 1)) continue;
        const sw = text.slice(at).match(/^[A-Za-z'’]+/);
        if (sw && !known(sw[0])) continue; // misspelled first word — let the spell-checker handle it
        push({ id: ++ID, type: "grammar", start: at, end: at + 1, bad: m[3], fix: m[3].toUpperCase(), message: "Start the sentence with a capital letter.", suggestions: [m[3].toUpperCase()] });
      }
      const first = text.match(/^(\s*)([a-z])/);
      if (first) {
        const at = first[1].length;
        const fw = text.slice(at).match(/^[A-Za-z'’]+/);
        if (!overlaps(at, at + 1) && !(fw && !known(fw[0]))) {
          push({ id: ++ID, type: "grammar", start: at, end: at + 1, bad: first[2], fix: first[2].toUpperCase(), message: "Start with a capital letter.", suggestions: [first[2].toUpperCase()] });
        }
      }
    }
    // lowercase pronoun "i"
    {
      const re = /\bi(['’](m|ve|ll|d|re))?\b/g;
      let m;
      while ((m = re.exec(text))) {
        if (m[0][0] !== "i") continue;
        if (overlaps(m.index, m.index + m[0].length)) continue;
        const rep = "I" + m[0].slice(1);
        push({ id: ++ID, type: "grammar", start: m.index, end: m.index + m[0].length, bad: m[0], fix: rep, message: "Capitalise the pronoun “I”.", suggestions: [rep] });
      }
    }

    // spelling
    let checked = 0;
    const wordRe = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
    let wm;
    while ((wm = wordRe.exec(text))) {
      const raw = wm[0];
      const start = wm.index;
      const end = start + raw.length;
      if (raw.length < 2) continue;
      if (raw === raw.toUpperCase() && raw.length >= 2) continue;
      if (/\d/.test(raw)) continue;
      if (known(raw)) continue;
      if (ignoredWords.has(norm(raw))) continue;
      if (overlaps(start, end)) continue;
      const prevChar = text.slice(0, start).match(/(\S)\s*$/);
      const sentenceStart = !prevChar || /[.!?]/.test(prevChar[1]);
      if (ignoreNames && /^[A-Z][a-z]/.test(raw) && !sentenceStart) continue;
      let sg = checked < 300 ? suggest(raw) : [];
      if (sentenceStart && /^[a-z]/.test(raw)) sg = sg.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
      push({ id: ++ID, type: "spelling", start, end, bad: raw, fix: null, message: "Possible spelling mistake.", suggestions: sg });
      checked++;
    }

    issues.sort((a, b) => a.start - b.start);

    const words = (text.match(/[A-Za-z0-9']+/g) || []).length;
    const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length || (text.trim() ? 1 : 0);
    const stats = {
      words,
      sentences,
      spelling: issues.filter((i) => i.type === "spelling").length,
      grammar: issues.filter((i) => i.type === "grammar").length,
      style: issues.filter((i) => i.type === "style").length,
    };
    return { issues, stats };
  }

  return { known, suggest, analyze };
}
