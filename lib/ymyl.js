// "Your Money or Your Life" tools — ones whose output people may act on for a
// money or health decision. Google's quality guidelines hold these to a higher
// trust bar, so we surface an on-page "estimates, not professional advice" note
// (shown on the page itself, not just on /about). Anonymity-safe.
const FINANCIAL = new Set([
  "mortgage-calculator",
  "loan-calculator",
  "compound-interest-calculator",
  "simple-interest-calculator",
  "inflation-calculator",
  "roi-calculator",
  "savings-goal-calculator",
  "sip-calculator",
  "salary-calculator",
  "gst-vat-calculator",
  "sales-tax-calculator",
  "hourly-rate-calculator",
]);

const HEALTH = new Set(["bmi-calculator", "calorie-calculator"]);

export function ymylNote(slug) {
  if (HEALTH.has(slug)) {
    return "This is a general estimate for information only — not medical advice. Everyone is different, so check with a qualified healthcare professional before making decisions about your health.";
  }
  if (FINANCIAL.has(slug)) {
    return "This is a simplified estimate for general information only — not financial, tax, or legal advice. Real figures vary by lender, rate, jurisdiction and your own circumstances, so confirm with a qualified professional before acting.";
  }
  return null;
}
