"use client";

import { useCallback, useState } from "react";
import { copyText } from "../../lib/copyText";

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function randInt(max) {
  if (max <= 0) return 0;
  const b = new Uint32Array(1);
  const lim = Math.floor(0x100000000 / max) * max;
  let v;
  do {
    crypto.getRandomValues(b);
    v = b[0];
  } while (v >= lim);
  return v % max;
}

// Fisher-Yates shuffle built on randInt.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const ADJECTIVES = {
  Funny: [
    "Rowdy",
    "Sneaky",
    "Wobbly",
    "Grumpy",
    "Sleepy",
    "Bouncy",
    "Cheeky",
    "Clumsy",
    "Dizzy",
    "Feisty",
    "Goofy",
    "Jolly",
    "Nifty",
    "Quirky",
    "Salty",
    "Snazzy",
    "Spicy",
    "Wacky",
    "Zany",
    "Jumbo",
    "Mighty",
    "Turbo",
    "Rebel",
    "Rogue",
    "Fluffy",
    "Grouchy",
    "Peppy",
    "Sassy",
    "Scrappy",
    "Shifty",
    "Silly",
    "Sparkly",
    "Sturdy",
    "Twitchy",
    "Whiny",
    "Zippy",
    "Chunky",
    "Cranky",
    "Loopy",
    "Perky",
  ],
  Animals: [
    "Wild",
    "Fierce",
    "Swift",
    "Sly",
    "Bold",
    "Brave",
    "Prowling",
    "Roaring",
    "Howling",
    "Charging",
    "Galloping",
    "Soaring",
    "Stampeding",
    "Snapping",
    "Leaping",
    "Nocturnal",
    "Feral",
    "Untamed",
    "Majestic",
    "Cunning",
    "Rapid",
    "Ferocious",
    "Stealthy",
    "Furry",
    "Spotted",
    "Striped",
    "Mighty",
    "Alpha",
    "Frosty",
    "Golden",
    "Silver",
    "Shadow",
    "Thunder",
    "Storm",
    "Blazing",
    "Arctic",
    "Jungle",
    "Desert",
    "Mountain",
    "River",
  ],
  Sports: [
    "Unstoppable",
    "Champion",
    "Elite",
    "Dynamic",
    "Explosive",
    "Relentless",
    "Fearless",
    "Undefeated",
    "Blazing",
    "Electric",
    "Powerhouse",
    "Clutch",
    "Rapid",
    "Iron",
    "Titan",
    "Supreme",
    "Rising",
    "Victorious",
    "Legendary",
    "Rampaging",
    "Surging",
    "Crushing",
    "Soaring",
    "Fast-Break",
    "Grand",
    "Prime",
    "Ultimate",
    "Golden",
    "Diamond",
    "Steel",
    "Rocket",
    "Lightning",
    "Thunder",
    "Storm",
    "Comet",
    "Blitz",
    "Vortex",
    "Apex",
    "Turbo",
    "Maximum",
  ],
  Work: [
    "Strategic",
    "Synergy",
    "Agile",
    "Dynamic",
    "Proactive",
    "Visionary",
    "Innovative",
    "Efficient",
    "Elite",
    "Prime",
    "Peak",
    "Stellar",
    "Brilliant",
    "Bold",
    "Nimble",
    "Focused",
    "Driven",
    "Bright",
    "Sharp",
    "Savvy",
    "Clever",
    "Rapid",
    "Quantum",
    "Fusion",
    "Pixel",
    "Cloud",
    "Data",
    "Logic",
    "Turbo",
    "Alpha",
    "Meta",
    "Hyper",
    "Ultra",
    "Core",
    "Next",
    "Prime",
    "Bonus",
    "Deadline",
    "Coffee",
    "Spreadsheet",
  ],
};

const NOUNS = {
  Funny: [
    "Penguins",
    "Waffles",
    "Llamas",
    "Pickles",
    "Noodles",
    "Muffins",
    "Nachos",
    "Potatoes",
    "Marshmallows",
    "Cucumbers",
    "Pancakes",
    "Donuts",
    "Meatballs",
    "Bananas",
    "Gummy Bears",
    "Jellybeans",
    "Pineapples",
    "Cupcakes",
    "Biscuits",
    "Pretzels",
    "Sock Puppets",
    "Rubber Ducks",
    "Garden Gnomes",
    "Ninjas",
    "Wizards",
    "Robots",
    "Dinosaurs",
    "Aliens",
    "Pirates",
    "Cowboys",
    "Vikings",
    "Zombies",
    "Yetis",
    "Goblins",
    "Trolls",
    "Unicorns",
    "Dragons",
    "Pandas",
    "Sloths",
    "Hamsters",
  ],
  Animals: [
    "Wolves",
    "Tigers",
    "Lions",
    "Eagles",
    "Falcons",
    "Hawks",
    "Bears",
    "Panthers",
    "Cheetahs",
    "Leopards",
    "Foxes",
    "Owls",
    "Ravens",
    "Sharks",
    "Cobras",
    "Vipers",
    "Stallions",
    "Rhinos",
    "Bison",
    "Gorillas",
    "Jaguars",
    "Lynxes",
    "Badgers",
    "Otters",
    "Dolphins",
    "Orcas",
    "Mustangs",
    "Bulls",
    "Rams",
    "Elk",
    "Moose",
    "Coyotes",
    "Bobcats",
    "Pumas",
    "Condors",
    "Ospreys",
    "Barracudas",
    "Mantas",
    "Scorpions",
    "Mongooses",
  ],
  Sports: [
    "Titans",
    "Warriors",
    "Champions",
    "Rockets",
    "Blazers",
    "Chargers",
    "Raiders",
    "Kings",
    "Giants",
    "Legends",
    "Dynamos",
    "Strikers",
    "Rangers",
    "Knights",
    "Guardians",
    "Crushers",
    "Sluggers",
    "All-Stars",
    "Aces",
    "Bolts",
    "Blitz",
    "Cyclones",
    "Hurricanes",
    "Avalanche",
    "Thunderbolts",
    "Comets",
    "Meteors",
    "Vipers",
    "Cobras",
    "Spartans",
    "Gladiators",
    "Vanguard",
    "Dominators",
    "Machines",
    "Force",
    "Squad",
    "United",
    "Athletic",
    "Dream Team",
    "Powerhouse",
  ],
  Work: [
    "Squad",
    "Collective",
    "Crew",
    "Alliance",
    "Coalition",
    "Task Force",
    "Innovators",
    "Pioneers",
    "Trailblazers",
    "Achievers",
    "Visionaries",
    "Dynamos",
    "Mavericks",
    "Catalysts",
    "Architects",
    "Builders",
    "Ninjas",
    "Rockstars",
    "Wizards",
    "Gurus",
    "Champions",
    "Legends",
    "Avengers",
    "Guardians",
    "Navigators",
    "Strategists",
    "Analysts",
    "Engineers",
    "Creators",
    "Makers",
    "Hustlers",
    "Go-Getters",
    "Powerhouse",
    "Brainstorm",
    "Think Tank",
    "Dream Team",
    "A-Team",
    "Elite Force",
    "Deadliners",
    "Overachievers",
  ],
};

const THEMES = ["Funny", "Animals", "Sports", "Work"];
const BATCH = 8;

function makeName(theme) {
  const adjs = ADJECTIVES[theme] || ADJECTIVES.Funny;
  const nouns = NOUNS[theme] || NOUNS.Funny;
  const adj = adjs[randInt(adjs.length)];
  const noun = nouns[randInt(nouns.length)];
  return `The ${adj} ${noun}`;
}

export default function TeamNameGenerator() {
  const [theme, setTheme] = useState("Funny");
  const [names, setNames] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(-1);

  const generate = useCallback(() => {
    setCopiedIdx(-1);
    const seen = new Set();
    const out = [];
    let guard = 0;
    // Draw unique names; cap attempts so we never loop forever if the pool is
    // exhausted (it is large, so BATCH unique names is always reachable).
    while (out.length < BATCH && guard < 400) {
      guard++;
      const n = makeName(theme);
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    setNames(out);
  }, [theme]);

  const handleCopy = useCallback(async (name, idx) => {
    try {
      await copyText(name);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? -1 : cur)), 1500);
    } catch {
      setCopiedIdx(-1);
    }
  }, []);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tng-theme">
              Theme
            </label>
            <select
              id="tng-theme"
              className="tool-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={generate}>
          {names.length > 0 ? "Generate more" : "Generate names"}
        </button>
      </div>

      {names.length > 0 ? (
        <div className="tool-result" aria-live="polite">
          <p className="tool-result-label">
            {BATCH} {theme.toLowerCase()} team names
          </p>
          <ul style={{ listStyle: "none", margin: "0.5rem 0 0", padding: 0 }}>
            {names.map((name, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  padding: "0.55rem 0",
                  borderBottom:
                    i === names.length - 1
                      ? "none"
                      : "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    wordBreak: "break-word",
                  }}
                >
                  {name}
                </span>
                <button
                  type="button"
                  className={copiedIdx === i ? "btn btn-success" : "btn"}
                  onClick={() => handleCopy(name, i)}
                  style={{ flexShrink: 0 }}
                >
                  {copiedIdx === i ? "Copied!" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="tool-note">
          Pick a theme, then press &ldquo;Generate names&rdquo; for a fresh batch
          of {BATCH} team names. Tap &ldquo;Copy&rdquo; on any one you like.
        </p>
      )}

      <p className="tool-note">
        Names are built by pairing a random adjective with a random noun using
        your browser’s cryptographic random generator, so each batch is different.
        Everything runs locally on your device — nothing is uploaded.
      </p>
    </div>
  );
}
