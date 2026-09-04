"use client";

import { useCallback, useMemo, useState } from "react";
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
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const CATEGORIES = {
  Animals: [
    "Elephant", "Kangaroo", "Penguin", "Giraffe", "Dolphin", "Octopus",
    "Hedgehog", "Flamingo", "Chameleon", "Koala", "Cheetah", "Platypus",
    "Walrus", "Peacock", "Hippopotamus", "Squirrel", "Raccoon", "Panda",
    "Ostrich", "Jellyfish", "Sloth", "Meerkat", "Armadillo", "Toucan",
    "Rhinoceros", "Seahorse", "Porcupine", "Gorilla", "Zebra", "Owl",
    "Crocodile", "Butterfly", "Beaver", "Lobster", "Camel", "Parrot",
    "Hummingbird", "Starfish", "Woodpecker", "Ladybug", "Tarantula",
    "Narwhal", "Pelican", "Otter", "Bison", "Cobra", "Swan", "Moose",
    "Ferret", "Iguana", "Pufferfish", "Wolf", "Chinchilla", "Gecko",
  ],
  Celebrities: [
    "Taylor Swift", "Tom Hanks", "Oprah Winfrey", "Dwayne Johnson",
    "Beyoncé", "Keanu Reeves", "Serena Williams", "Zendaya",
    "Morgan Freeman", "Adele", "Lionel Messi", "Emma Watson",
    "Will Smith", "Ariana Grande", "Ryan Reynolds", "Michelle Obama",
    "Chris Hemsworth", "Lady Gaga", "Steph Curry", "Sandra Bullock",
    "Ed Sheeran", "Jennifer Lawrence", "Bruno Mars", "Simone Biles",
    "Robert Downey Jr.", "Selena Gomez", "Usain Bolt", "Meryl Streep",
    "Justin Timberlake", "Priyanka Chopra", "David Beckham", "Reese Witherspoon",
    "Shakira", "Hugh Jackman", "Billie Eilish", "Jackie Chan",
    "Cristiano Ronaldo", "Emma Stone", "Snoop Dogg", "Julia Roberts",
    "LeBron James", "Kristen Bell", "Elton John", "Gordon Ramsay",
    "Dolly Parton", "Jimmy Fallon", "Mariah Carey", "Tom Cruise",
    "Rihanna", "Denzel Washington", "Katy Perry", "Michael Jordan",
  ],
  Movies: [
    "The Lion King", "Frozen", "Jurassic Park", "Toy Story", "Finding Nemo",
    "Star Wars", "Harry Potter", "The Wizard of Oz", "Jaws", "E.T.",
    "The Incredibles", "Shrek", "Home Alone", "Ghostbusters", "Up",
    "Ratatouille", "The Sound of Music", "Mary Poppins", "Cars", "Moana",
    "Kung Fu Panda", "Despicable Me", "The Jungle Book", "Aladdin",
    "Cinderella", "Beauty and the Beast", "The Little Mermaid", "Coco",
    "Zootopia", "Wall-E", "Monsters, Inc.", "Willy Wonka", "The Goonies",
    "Back to the Future", "The Karate Kid", "Free Willy", "Babe",
    "Charlotte's Web", "Matilda", "Paddington", "The Grinch", "Encanto",
    "Big Hero 6", "Tangled", "Brave", "Wreck-It Ralph", "A Bug's Life",
    "Happy Feet", "The Sandlot", "Night at the Museum", "Elf",
  ],
  Actions: [
    "Jumping", "Swimming", "Dancing", "Cooking", "Sleeping", "Sneezing",
    "Juggling", "Tiptoeing", "Yawning", "Skateboarding", "Painting",
    "Fishing", "Skiing", "Whistling", "Clapping", "Hiking", "Bowling",
    "Knitting", "Gardening", "Surfing", "Marching", "Stretching",
    "Skipping", "Waving", "Sweeping", "Typing", "Digging", "Climbing",
    "Balancing", "Bouncing", "Twirling", "Stomping", "Snoring", "Giggling",
    "Tickling", "Hopping", "Crawling", "Sculpting", "Wrestling", "Cartwheeling",
    "Somersaulting", "Rowing", "Karate chopping", "Baking", "Vacuuming",
    "Ice skating", "Roller skating", "Sneaking", "Saluting", "Shivering",
    "Blowing bubbles", "Playing air guitar", "Tightrope walking",
  ],
  Food: [
    "Pizza", "Spaghetti", "Pancakes", "Tacos", "Sushi", "Popcorn",
    "Hamburger", "Ice cream", "Watermelon", "Pretzel", "Cupcake",
    "Doughnut", "Waffle", "Noodles", "Broccoli", "Pineapple", "Cheese",
    "Hot dog", "Burrito", "Meatball", "Cotton candy", "Macaroni",
    "Peanut butter", "Marshmallow", "Cheeseburger", "French fries",
    "Grilled cheese", "Chocolate", "Strawberry", "Banana", "Pumpkin",
    "Cinnamon roll", "Bagel", "Muffin", "Lollipop", "Nachos", "Omelette",
    "Corn on the cob", "Jelly bean", "Gingerbread", "Milkshake", "Smoothie",
    "Dumplings", "Cornbread", "Cheesecake", "Avocado", "Pretzel stick",
    "Fruit salad", "Applesauce", "Toast", "Oatmeal", "Coconut", "Mango",
  ],
};

const CATEGORY_NAMES = Object.keys(CATEGORIES);

export default function HeadsUpGenerator() {
  const [category, setCategory] = useState("Animals");
  const [word, setWord] = useState(null);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  // Track a shuffled order per category so words do not repeat back-to-back.
  const [queues, setQueues] = useState({});

  const pool = useMemo(() => CATEGORIES[category] || [], [category]);

  const newWord = useCallback(() => {
    setCopied(false);
    const current = queues[category];
    let queue = current && current.length > 0 ? current.slice() : shuffle(pool);
    let next = queue.shift();
    // Avoid immediately repeating the same word after a reshuffle.
    if (next === word && queue.length > 0) {
      queue.push(next);
      next = queue.shift();
    }
    setQueues((q) => ({ ...q, [category]: queue }));
    setWord(next);
    setCount((c) => c + 1);
  }, [queues, category, pool, word]);

  const changeCategory = useCallback((name) => {
    setCategory(name);
    setWord(null);
    setCount(0);
    setCopied(false);
  }, []);

  async function handleCopy() {
    if (!word) return;
    try {
      await copyText(word);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="hu-category">
            Category
          </label>
          <select
            id="hu-category"
            className="tool-select"
            value={category}
            onChange={(e) => changeCategory(e.target.value)}
          >
            {CATEGORY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={newWord}>
          {word ? "New word" : "Start"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={!word}
        >
          {copied ? "Copied!" : "Copy word"}
        </button>
      </div>

      {word ? (
        <div className="tool-result" aria-live="polite">
          <p className="tool-result-label">Hold this on your forehead</p>
          <div
            className="tool-result-value"
            style={{
              fontSize: "clamp(2rem, 9vw, 4rem)",
              fontWeight: 800,
              textAlign: "center",
              lineHeight: 1.15,
              wordBreak: "break-word",
              padding: "0.75rem 0",
            }}
          >
            {word}
          </div>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{count}</div>
              <div className="tool-stat-label">Words shown</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pool.length}</div>
              <div className="tool-stat-label">In {category}</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="tool-note">
          Pick a category, then press &ldquo;Start.&rdquo; Hold your phone to
          your forehead so the room can see the word — everyone acts it out or
          gives clues while you guess. Tap &ldquo;New word&rdquo; for the next
          round.
        </p>
      )}

      <p className="tool-note">
        Words are drawn in a shuffled order using your browser&apos;s
        cryptographic random generator, so you cycle through the whole category
        before any word repeats. Everything runs on your device — nothing is
        sent anywhere.
      </p>
    </div>
  );
}
