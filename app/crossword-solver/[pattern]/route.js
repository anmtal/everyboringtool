import { gone } from "../../../lib/wordGone";

// Retired 2026-10-15: answers 410 Gone and points to the hub. See lib/wordGone.js.
export function GET(request, { params }) {
  return gone("/crossword-solver", "crossword solver", params.pattern, { pattern: true });
}
