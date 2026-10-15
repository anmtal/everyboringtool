// The six word-game tools, as data: how each parses a ?q= query, finds its
// words, and words its result page. Server-only (wordEngine reads the
// dictionary with fs). Used by app/word-results/[family], the dynamic route
// that next.config.mjs rewrites every hub ?q= request to, so the hubs
// themselves stay static.

import { unscramble, anagrams, startingWith, endingWith, containing, matchPattern, scrabbleScore } from "./wordEngine";
import { parseRack, parseAffix, parsePattern } from "./wordQuery";

const plural = (n, one, many) => (n === 1 ? one : many);

const AFFIX_BOX = { buttonLabel: "Find words", allowWild: false, min: 1 };

export const WORD_FAMILIES = {
  unscramble: {
    base: "/unscramble",
    crumb: "Word Unscrambler",
    parse: parseRack,
    find: unscramble,
    show: (q) => q.toUpperCase(),
    box: null, // uses UnscrambleBox
    title: (up, n) => `Unscramble ${up} — ${n} words made from these letters`,
    h1: (up) => `Words made from “${up}”`,
    lead: (up, n) => `We found ${n} words you can make from the letters ${up}.`,
    faq: (up, w) => [
      { q: `How many words can you make from ${up}?`, a: `You can make ${w.length} valid words from the letters ${up}, ranging from 2 letters up to ${w[0].length} letters long.` },
      { q: `What is the longest word from ${up}?`, a: `The longest word is "${w[0]}" (${w[0].length} letters), worth ${scrabbleScore(w[0])} points in Scrabble.` },
    ],
    empty: "Enter 2–15 letters (use ? for a blank tile).",
  },
  anagram: {
    base: "/anagram",
    crumb: "Anagram Solver",
    parse: parseRack,
    find: anagrams,
    show: (q) => q.toUpperCase(),
    box: { placeholder: "Enter letters to find anagrams", buttonLabel: "Solve", min: 2 },
    title: (up, n) => `Anagrams of ${up} — ${n} words`,
    h1: (up) => `Anagrams of “${up}”`,
    lead: (up, n) => `${n} ${plural(n, "anagram uses", "anagrams use")} every letter of ${up}.`,
    faq: (up, w) => [
      { q: `How many anagrams does ${up} have?`, a: `${up} has ${w.length} ${plural(w.length, "anagram", "anagrams")} — ${plural(w.length, "a word", "words")} that use all of its letters exactly once.` },
      { q: `What's the difference between an anagram and unscrambling?`, a: `An anagram uses every letter exactly once, so it's the same length as your input. Unscrambling also finds shorter words that use only some of the letters.` },
    ],
    related: [{ base: "/unscramble", label: (up) => `Unscramble ${up}`, note: " to also find shorter words you can make from these letters." }],
    empty: "Enter 2–15 letters (use ? for a blank tile).",
  },
  "words-starting-with": {
    base: "/words-starting-with",
    crumb: "Words Starting With",
    parse: parseAffix,
    find: startingWith,
    show: (q) => q.toUpperCase(),
    box: { ...AFFIX_BOX, placeholder: "Enter a starting letter or letters" },
    title: (up, n) => `Words that start with ${up} — ${n} words`,
    h1: (up) => `Words that start with “${up}”`,
    lead: (up, n) => `${n} words start with ${up}, sorted by length.`,
    faq: (up, w) => [
      { q: `How many words start with ${up}?`, a: `There are ${w.length} words that start with ${up}, from ${w[0].length} letters up to ${w[w.length - 1].length} letters long.` },
      { q: `What is the shortest word starting with ${up}?`, a: `The shortest is "${w[0]}" (${w[0].length} letters).` },
    ],
    related: [
      { base: "/words-ending-with", label: (up) => `Words ending with ${up}` },
      { base: "/words-containing", label: (up) => `Words containing ${up}` },
    ],
    empty: "Enter 1–15 letters.",
  },
  "words-ending-with": {
    base: "/words-ending-with",
    crumb: "Words Ending With",
    parse: parseAffix,
    find: endingWith,
    show: (q) => q.toUpperCase(),
    box: { ...AFFIX_BOX, placeholder: "Enter an ending (e.g. ing)" },
    title: (up, n) => `Words that end with ${up} — ${n} words`,
    h1: (up) => `Words that end with “${up}”`,
    lead: (up, n) => `${n} words end in ${up}, sorted by length.`,
    faq: (up, w) => [
      { q: `How many words end with ${up}?`, a: `There are ${w.length} words that end in ${up}.` },
      { q: `What is the shortest word ending in ${up}?`, a: `The shortest is "${w[0]}" (${w[0].length} letters).` },
    ],
    related: [
      { base: "/words-starting-with", label: (up) => `Words starting with ${up}` },
      { base: "/words-containing", label: (up) => `Words containing ${up}` },
    ],
    empty: "Enter 1–15 letters.",
  },
  "words-containing": {
    base: "/words-containing",
    crumb: "Words Containing",
    parse: parseAffix,
    find: containing,
    show: (q) => q.toUpperCase(),
    box: { ...AFFIX_BOX, placeholder: "Enter letters to find inside words" },
    title: (up, n) => `Words with ${up} in them — ${n} words`,
    h1: (up) => `Words containing “${up}”`,
    lead: (up, n) => `${n} words contain ${up}, sorted by length.`,
    faq: (up, w) => [
      { q: `How many words contain ${up}?`, a: `There are ${w.length} words that contain the letters ${up}.` },
      { q: `Where can I use these?`, a: `Words containing a specific sequence are handy for crosswords, Scrabble, Words With Friends and word puzzles where part of the answer is already filled in.` },
    ],
    related: [
      { base: "/words-starting-with", label: (up) => `Words starting with ${up}` },
      { base: "/words-ending-with", label: (up) => `Words ending with ${up}` },
    ],
    empty: "Enter 1–15 letters.",
  },
  "crossword-solver": {
    base: "/crossword-solver",
    crumb: "Crossword Solver",
    parse: parsePattern,
    find: matchPattern,
    show: (q) => q.replace(/-/g, "_").toUpperCase(),
    box: { placeholder: "Enter a pattern, e.g. c_t", buttonLabel: "Solve", pattern: true },
    boxInitial: (q) => q.replace(/-/g, "_"),
    title: (up, n) => `Crossword answers for ${up} — ${n} words`,
    h1: (up) => `Crossword answers for “${up}”`,
    lead: (up, n, q) => `${n} words fit the pattern ${up} (${q.length} letters).`,
    faq: (up, w) => [
      { q: `What words fit the pattern ${up}?`, a: `${w.length} words fit ${up}: for example ${w.slice(0, 5).join(", ")}.` },
      { q: `How do I enter a crossword pattern?`, a: `Type the letters you know and an underscore ( _ ) for each blank square. For example c_t finds cat, cot and cut.` },
    ],
    empty: "Use letters and an underscore for each blank, 2–15 squares.",
  },
};

// Slug → family, for every hub path (used by next.config.mjs and the route).
export const WORD_FAMILY_SLUGS = Object.keys(WORD_FAMILIES);
