// Single source of truth for "how many tools are live". Both the exact number
// (used in prose, e.g. the About page) and the rounded marketing label (footer)
// are derived from the SAME computation so they can never drift apart and read as
// a contradiction — a small but real entity-consistency signal for AI summaries.
import { categories } from "./tools";
import { toolContent } from "./toolContent";

// A tool counts as "live" once it has real content (an entry in toolContent).
export const TOOL_COUNT = categories.reduce(
  (n, c) => n + c.tools.filter((t) => toolContent[t.slug]).length,
  0
);

// Rounded DOWN to a tens boundary so "190+" is always honest (never overstates).
export const TOOL_COUNT_LABEL = `${Math.floor(TOOL_COUNT / 10) * 10}+`;
