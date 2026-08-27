// Topical clusters: tools a person using one would plausibly also want. Powers
// the "Try next" CTA and the "Related tools" list with genuinely relevant
// neighbours (often cross-category) instead of just same-category siblings.
// Slugs that aren't built are filtered out where this is consumed.
const CLUSTERS = [
  // PDF Toolkit
  ["merge-pdf", "compress-pdf", "split-pdf", "word-to-pdf", "pdf-to-jpg", "jpg-to-pdf", "rotate-pdf", "protect-pdf", "reorder-pages", "add-page-numbers", "watermark-pdf"],
  // Image Editing
  ["image-compressor", "image-resizer", "crop-image", "rotate-image", "meme-generator", "favicon-generator"],
  // Image Format Conversion
  ["png-to-jpg", "jpg-to-png", "image-to-webp", "webp-to-png", "svg-to-png", "heic-to-jpg", "image-to-base64", "image-to-text"],
  // Audio & Video
  ["video-to-text", "audio-converter", "video-to-audio", "video-trim", "audio-trim", "audio-merge", "video-merge"],
  // QR & Barcode
  ["qr-code-generator", "wifi-qr-generator", "qr-code-scanner", "url-qr-generator", "vcard-qr-generator", "whatsapp-qr-generator", "barcode-generator", "email-qr-generator"],
  // Text Cleanup & Compare
  ["case-converter", "find-and-replace", "sort-lines", "remove-duplicate-lines", "text-diff", "slugify"],
  // Text Generators & Encoders
  ["fancy-font-generator", "morse-code-translator", "text-reverser", "lorem-ipsum-generator"],
  // Word & Character Count
  ["word-counter", "character-counter", "reading-time-calculator", "tweet-character-counter", "bio-character-counter", "product-title-counter"],
  // Unit & Measurement Converters
  ["unit-converter", "length-converter", "temperature-converter", "weight-converter", "paper-size-converter"],
  // Everyday & Shopping Math
  ["percentage-calculator", "tip-calculator", "discount-calculator"],
  // Math & Numbers
  ["average-calculator", "ratio-calculator", "fraction-calculator", "scientific-calculator", "roman-numeral-converter", "number-to-words"],
  // Randomizers & Decision Makers
  ["random-number-generator", "random-picker", "yes-no-wheel", "wheel-of-names", "coin-flip", "dice-roll"],
  // Health Calculators
  ["bmi-calculator", "calorie-calculator"],
  // Date Math
  ["age-calculator", "date-difference", "business-days-calculator", "week-number", "add-subtract-days", "time-zone-converter"],
  // Timers & Countdowns
  ["countdown-timer", "stopwatch", "pomodoro-timer"],
  // Students & Study
  ["gpa-calculator", "grade-calculator", "flashcard-generator", "study-planner", "citation-formatter"],
  // Finance & Investing
  ["loan-calculator", "mortgage-calculator", "compound-interest-calculator", "simple-interest-calculator", "sip-calculator", "roi-calculator", "inflation-calculator", "savings-goal-calculator", "salary-calculator"],
  // Local Business & Invoicing
  ["invoice-generator", "receipt-generator", "quote-calculator", "estimate-template", "hourly-rate-calculator", "sales-tax-calculator", "gst-vat-calculator", "appointment-slot-generator", "work-hours-calculator"],
  // Pricing, Margin & Seller Fees
  ["profit-margin-calculator", "markup-calculator", "break-even-calculator", "amazon-margin-calculator", "shopify-fee-calculator", "etsy-fee-calculator", "price-after-fees-calculator", "dropshipping-profit-calculator", "sku-generator"],
  // Marketing & Ad Metrics
  ["roas-calculator", "cpm-calculator", "cac-calculator", "cpa-calculator", "conversion-rate-calculator", "landing-page-roi-calculator", "engagement-rate-calculator", "utm-builder", "email-subject-line-tester"],
  // Social Media & Creator
  ["youtube-thumbnail-downloader", "youtube-thumbnail-resizer", "instagram-image-resizer", "hashtag-generator", "caption-formatter", "fake-tweet-generator", "link-in-bio-qr"],
  // Data & Format Conversion
  ["json-formatter", "csv-to-json", "json-to-csv", "markdown-to-html", "base64-encode-decode", "url-encode-decode", "number-base-converter"],
  // Dev Security & Generators
  ["hash-generator", "uuid-generator", "jwt-decoder", "password-generator", "regex-tester", "cron-generator"],
  // Code Minifiers
  ["html-minifier", "css-minifier", "js-minifier"],
  // Color Tools
  ["color-converter", "color-picker"],
  // SEO & Web
  ["meta-tag-generator", "keyword-density-checker", "serp-snippet-preview", "schema-generator", "robots-txt-generator", "slug-generator", "canonical-tag-generator", "llms-txt-generator"],
  // Puzzles & Classic Games
  ["sudoku", "2048", "wordle", "minesweeper", "solitaire", "hangman", "word-search", "memory-match", "tic-tac-toe"],
  // Reflex & Speed Tests
  ["typing-speed-test", "reaction-time-test", "cps-test"],
  // Home & Trade Project Calculators
  ["concrete-calculator", "paint-calculator", "flooring-calculator", "tile-calculator", "fence-calculator", "wallpaper-calculator", "mulch-calculator", "firewood-calculator", "hvac-load-estimator"],
  // Trade Sizing & Reference Charts
  ["sheet-metal-gauge-converter", "pipe-size-converter", "drill-bit-size-converter", "battery-equivalents", "bulb-base-converter"],
  // Baking & Cooking
  ["cups-to-grams-converter", "oven-temperature-converter", "pan-size-converter", "yeast-converter"],
  // Craft & Sewing
  ["knitting-crochet-converter", "thread-size-converter", "bead-size-converter"],
  // Apparel & Body Sizes
  ["clothing-size-converter", "kids-clothing-size-converter", "ring-size-converter", "bra-size-converter"],
];

const BY_SLUG = new Map();
for (const group of CLUSTERS) {
  for (const slug of group) {
    if (!BY_SLUG.has(slug)) BY_SLUG.set(slug, group);
  }
}

// Other slugs in the same cluster (excludes the tool itself). Empty if unclustered.
export function relatedSlugs(slug) {
  const group = BY_SLUG.get(slug);
  if (!group) return [];
  return group.filter((s) => s !== slug);
}
