"use client";
import DocForm from "./_doc-form";

const DISCLAIMER = "This is a plain-language template to get you started — not legal advice. Have it reviewed by a qualified professional before either party signs.";

const FIELDS = [
  { name: "disclosing", label: "Disclosing party (sharing the information)", placeholder: "Acme Ltd" },
  { name: "receiving", label: "Receiving party", placeholder: "Jane Smith" },
  { name: "date", label: "Effective date", type: "date" },
  { name: "purpose", label: "Purpose", placeholder: "discussing a potential partnership" },
  { name: "term", label: "Term (years)", type: "number", placeholder: "2" },
  { name: "jurisdiction", label: "Governing law (state / country)", placeholder: "England and Wales" },
];

function build(v) {
  const L = [];
  L.push("NON-DISCLOSURE AGREEMENT", "");
  L.push(`This Non-Disclosure Agreement (the "Agreement") is entered into as of ${v.date || "[date]"} by and between:`, "");
  L.push(`Disclosing Party: ${v.disclosing || "[Disclosing Party]"}`);
  L.push(`Receiving Party: ${v.receiving || "[Receiving Party]"}`, "");
  L.push("1. PURPOSE", `The parties wish to explore ${v.purpose || "[a potential business relationship]"} (the "Purpose"), in connection with which the Disclosing Party may share confidential information.`);
  L.push("", "2. CONFIDENTIAL INFORMATION", '"Confidential Information" means any non-public information disclosed by the Disclosing Party, whether written or oral, that is marked confidential or that a reasonable person would understand to be confidential.');
  L.push("", "3. OBLIGATIONS", "The Receiving Party agrees to (a) use the Confidential Information solely for the Purpose, (b) not disclose it to any third party without prior written consent, and (c) protect it using at least the same care it uses for its own confidential information.");
  L.push("", "4. EXCLUSIONS", "Confidential Information does not include information that is or becomes public through no fault of the Receiving Party, was already known before disclosure, or is independently developed without use of the Confidential Information.");
  L.push("", "5. TERM", `This Agreement remains in effect for ${v.term || "[N]"} year(s) from the date above, and the confidentiality obligations survive its termination.`);
  L.push("", "6. GOVERNING LAW", `This Agreement is governed by the laws of ${v.jurisdiction || "[state / country]"}.`);
  L.push("", "7. SIGNATURES", "", "Disclosing Party: ______________________   Date: __________", "", "Receiving Party: ______________________   Date: __________");
  return L.join("\n");
}

export default function NdaGenerator() {
  return <DocForm fields={FIELDS} build={build} actionLabel="Generate NDA" downloadName="nda.txt" disclaimer={DISCLAIMER} />;
}
