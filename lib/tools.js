// The entire site's content lives here. Add categories and tools by editing this file.

export const SITE = {
  name: "Every Boring Tool",
  short: "EBT",
  domain: "everyboringtool.com",
  url: "https://everyboringtool.com",
  tagline: "Everything simple and boring.",
  description:
    "Every boring tool you need, in one simple place. Free, fast, and no sign-up — everything runs right in your browser.",
};

export const categories = [
  {
    slug: "pdf",
    name: "PDF Tools",
    short: "PDF",
    emoji: "\u{1F4C4}",
    description: "Merge, split, compress and convert PDFs — right in your browser.",
    status: "live",
    tools: [
      { slug: "merge-pdf", name: "Merge PDF", description: "Combine several PDFs into one file.", popular: true },
      { slug: "split-pdf", name: "Split PDF", description: "Separate a PDF into pages or ranges.", popular: true },
      { slug: "compress-pdf", name: "Compress PDF", description: "Shrink PDF size without wrecking quality.", popular: true },
      { slug: "pdf-to-jpg", name: "PDF to JPG", description: "Turn each PDF page into an image.", popular: true },
      { slug: "jpg-to-pdf", name: "JPG to PDF", description: "Combine images into a single PDF." },
      { slug: "rotate-pdf", name: "Rotate PDF", description: "Turn pages the right way up and save." },
      { slug: "unlock-pdf", name: "Unlock PDF", description: "Remove a password from a PDF you own." },
      { slug: "protect-pdf", name: "Protect PDF", description: "Add a password to keep a PDF private." },
      { slug: "reorder-pages", name: "Reorder Pages", description: "Drag pages into the order you want." },
      { slug: "add-page-numbers", name: "Add Page Numbers", description: "Insert page numbers into a PDF." },
      { slug: "watermark-pdf", name: "Watermark PDF", description: "Stamp text or a logo across pages." },
    ],
  },
  {
    slug: "image",
    name: "Image Tools",
    short: "Image",
    emoji: "\u{1F5BC}\u{FE0F}",
    description: "Compress, resize, convert and crop images in seconds.",
    status: "soon",
    tools: [],
  },
  {
    slug: "text",
    name: "Text & Writing",
    short: "Text",
    emoji: "\u{270D}\u{FE0F}",
    description: "Word counters, case converters, unscramblers and more.",
    status: "soon",
    tools: [],
  },
  {
    slug: "calculators",
    name: "Calculators",
    short: "Calculators",
    emoji: "\u{1F522}",
    description: "Percentages, ages, loans, BMI — quick answers.",
    status: "soon",
    tools: [],
  },
  {
    slug: "finance",
    name: "Finance",
    short: "Finance",
    emoji: "\u{1F4B0}",
    description: "Loan, mortgage, interest and tax calculators.",
    status: "soon",
    tools: [],
  },
  {
    slug: "converters",
    name: "Converters",
    short: "Converters",
    emoji: "\u{1F4B1}",
    description: "Units, currency, colors, time zones and bases.",
    status: "soon",
    tools: [],
  },
  {
    slug: "developer",
    name: "Developer",
    short: "Developer",
    emoji: "\u{1F468}\u{200D}\u{1F4BB}",
    description: "JSON, regex, hashes, encoders and formatters.",
    status: "soon",
    tools: [],
  },
  {
    slug: "games",
    name: "Games",
    short: "Games",
    emoji: "\u{1F3AE}",
    description: "Sudoku, typing tests, word games and quick classics.",
    status: "soon",
    tools: [],
  },
];

export function getCategory(slug) {
  return categories.find((c) => c.slug === slug) || null;
}

export function getTool(categorySlug, toolSlug) {
  const category = getCategory(categorySlug);
  if (!category) return null;
  return category.tools.find((t) => t.slug === toolSlug) || null;
}

// Flat list of every tool, tagged with its category — used by search.
export function allTools() {
  const out = [];
  for (const c of categories) {
    for (const t of c.tools) {
      out.push({
        ...t,
        category: c.slug,
        categoryName: c.name,
        emoji: c.emoji,
        href: `/${c.slug}/${t.slug}`,
      });
    }
  }
  return out;
}
