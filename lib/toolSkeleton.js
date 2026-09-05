// Server-rendered placeholder for a tool that is loaded client-only
// (next/dynamic with ssr:false). The `loading` fallback IS rendered into the
// server HTML, so this is what crawlers, AdSense reviewers and the first paint
// see. Rendering a realistic, category-appropriate set of controls here means
// the HTML actually looks like the tool it is about to become instead of the
// old bare "Loading tool…" line.
//
// Hard rules for this file:
//  - NO hooks, NO event handlers, NO browser APIs — it must render on the server.
//  - Every control is disabled + tabIndex={-1}: these are placeholders, not UI.
//    (Being disabled also means they never fire the shell's tool_use tracking.)
//  - Only classes that already exist in app/globals.css are used.

import { getToolBySlug } from "./tools";

// Inline so we don't have to touch globals.css.
const VISUALLY_HIDDEN = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// Which shape of form each category gets.
const FAMILY_BY_CATEGORY = {
  // paste-something-in tools
  text: "text",
  data: "text",
  developer: "text",
  "seo-web": "text",
  social: "text",
  // pick-a-file tools
  pdf: "file",
  image: "file",
  "audio-video": "file",
  // two-field calculators / converters
  calculators: "pair",
  finance: "pair",
  converters: "pair",
  datetime: "pair",
  marketing: "pair",
  ecommerce: "pair",
  education: "pair",
  "home-trade": "pair",
  "local-business": "pair",
  // press-the-button tools
  games: "play",
  party: "play",
  // one field in, a code out
  "qr-barcode": "code",
};

// A handful of tools sit in a category whose default shape is wrong for them
// (an image resizer filed under Social, a counter filed under Marketing…).
// These name-based overrides keep the placeholder honest.
function familyFor(categorySlug, name, slug) {
  const base = FAMILY_BY_CATEGORY[categorySlug] || "pair";
  const n = `${name || ""} ${slug || ""}`.toLowerCase();

  if (/scanner|reader/.test(n)) return "file";
  if (/\bqr\b|qr-|barcode/.test(n)) return "code";
  if (base !== "file" && /resiz|thumbnail|\bcrop\b/.test(n)) return "file";
  if (base === "pair" && /counter|character|citation|formatter|picker|tester/.test(n)) return "text";

  return base;
}

// A believable button label, taken from the tool's own name.
function verbFor(name, family) {
  const n = String(name || "").toLowerCase();

  if (family === "code") return "Generate";

  if (family === "play") {
    if (/spin|wheel|bottle/.test(n)) return "Spin";
    if (/generat|random|picker|assigner|shuffle|draw/.test(n)) return "Generate";
    return "Start";
  }

  if (family === "pair") {
    if (/convert|converter/.test(n)) return "Convert";
    return "Calculate";
  }

  if (family === "file") {
    if (/compress|shrink/.test(n)) return "Compress";
    if (/merge|combine|join/.test(n)) return "Merge";
    if (/split/.test(n)) return "Split";
    if (/resiz/.test(n)) return "Resize";
    if (/crop/.test(n)) return "Crop";
    if (/rotate/.test(n)) return "Rotate";
    if (/trim|cut/.test(n)) return "Trim";
    if (/convert| to /.test(n)) return "Convert";
    return "Run";
  }

  // family === "text"
  if (/format|beautif|prettif|pretty|minif|indent/.test(n)) return "Format";
  if (/check|valid|count|counter|test|analy|detect|compar|diff/.test(n)) return "Check";
  if (/convert|encode|decode| to /.test(n)) return "Convert";
  if (/generat|creat|build|make/.test(n)) return "Generate";
  return "Run";
}

function Loading() {
  return <span style={VISUALLY_HIDDEN}>Loading tool…</span>;
}

function Action({ verb }) {
  return (
    <div className="tool-actions">
      <button type="button" className="btn btn-primary" disabled tabIndex={-1} aria-hidden="true">
        {verb}
      </button>
    </div>
  );
}

/**
 * Static, non-interactive stand-in for the real tool.
 * Props: { slug } — the tool slug, looked up in the catalog for name/description/category.
 */
export default function ToolSkeleton({ slug }) {
  const found = getToolBySlug(slug);
  const tool = (found && found.tool) || null;
  const categorySlug = (found && found.category && found.category.slug) || "";
  const name = (tool && tool.name) || "";
  const description = (tool && tool.description) || "";
  const family = familyFor(categorySlug, name, slug);
  const verb = verbFor(name, family);
  const idA = `skel-${slug}-a`;
  const idB = `skel-${slug}-b`;

  let fields = null;

  if (family === "file") {
    fields = (
      <div className="dropzone" aria-hidden="true">
        <p className="dropzone-title">Choose a file…</p>
        <p className="dropzone-sub">
          {description || "Everything runs right in your browser — your files never leave your device."}
        </p>
      </div>
    );
  } else if (family === "text") {
    const isCode = categorySlug === "data" || categorySlug === "developer";
    fields = (
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor={idA}>
            {isCode ? "Input" : "Your text"}
          </label>
          <textarea
            id={idA}
            className="tool-textarea"
            placeholder={isCode ? "Paste your data here…" : "Paste or type your text here…"}
            disabled
            tabIndex={-1}
            readOnly
            defaultValue=""
          />
        </div>
      </div>
    );
  } else if (family === "code") {
    fields = (
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor={idA}>
            Text or link
          </label>
          <input
            id={idA}
            type="text"
            className="tool-input"
            placeholder="https://example.com"
            disabled
            tabIndex={-1}
            readOnly
            defaultValue=""
          />
        </div>
      </div>
    );
  } else if (family === "play") {
    fields = <p className="tool-note">Press {verb.toLowerCase()} to play — no sign-up, nothing to install.</p>;
  } else {
    // family === "pair"
    const converting = verb === "Convert";
    fields = (
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor={idA}>
              {converting ? "From" : "First value"}
            </label>
            <input
              id={idA}
              type="text"
              className="tool-input"
              placeholder="0"
              disabled
              tabIndex={-1}
              readOnly
              defaultValue=""
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor={idB}>
              {converting ? "To" : "Second value"}
            </label>
            <input
              id={idB}
              type="text"
              className="tool-input"
              placeholder="0"
              disabled
              tabIndex={-1}
              readOnly
              defaultValue=""
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tool">
      <Loading />
      {description ? <p className="tool-note">{description}</p> : null}
      {fields}
      <Action verb={verb} />
    </div>
  );
}
