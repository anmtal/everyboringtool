"use client";
import DocForm from "./_doc-form";

const DISCLAIMER = "This is a plain-language template to get you started — not legal advice. Have it reviewed by a qualified professional before you rely on it, especially for GDPR, CCPA or other specific obligations.";

const FIELDS = [
  { name: "site", label: "Website / app name", placeholder: "Every Boring Tool" },
  { name: "url", label: "Website URL", placeholder: "https://example.com" },
  { name: "email", label: "Contact email", placeholder: "hello@example.com" },
  { name: "date", label: "Effective date", type: "date" },
  { name: "cookies", label: "We use cookies", type: "checkbox", default: false },
  { name: "analytics", label: "We use analytics (e.g. Google Analytics)", type: "checkbox", default: false },
  { name: "ads", label: "We show third-party ads", type: "checkbox", default: false },
];

function build(v) {
  const site = v.site || "[Website name]";
  const url = v.url || "[website URL]";
  const email = v.email || "[contact email]";
  const date = v.date || "[date]";
  const L = [];
  L.push("PRIVACY POLICY", "", `Last updated: ${date}`, "");
  L.push(`This Privacy Policy describes how ${site} ("we", "us", or "our") handles information when you use ${url} (the "Service").`, "");
  L.push("1. INFORMATION WE COLLECT");
  L.push(`If you contact us directly, we receive the information you choose to provide, such as your name and email address.`);
  if (v.analytics) L.push("We use analytics tools that collect standard usage data — such as pages viewed, browser type and approximate location — to understand how the Service is used.");
  if (v.cookies) L.push("We use cookies and similar technologies to operate the Service and remember your preferences.");
  else L.push("We do not use cookies beyond those strictly necessary to operate the Service.");
  if (v.ads) L.push("We display third-party advertising, and our advertising partners may use cookies to show relevant ads and measure their performance.");
  L.push("", "2. HOW WE USE INFORMATION", "We use the information we collect to provide and improve the Service, respond to your enquiries, and keep the Service secure.");
  L.push("", "3. SHARING", "We do not sell your personal information. We may share information with service providers who help us operate the Service, or where required by law.");
  L.push("", "4. YOUR RIGHTS", `Depending on where you live, you may have the right to access, correct, or delete your personal information. To make a request, contact us at ${email}.`);
  L.push("", "5. DATA RETENTION", "We keep personal information only for as long as necessary for the purposes described in this policy.");
  L.push("", "6. CHANGES", 'We may update this Privacy Policy from time to time. The "Last updated" date above shows when it was last revised.');
  L.push("", "7. CONTACT", `If you have any questions about this Privacy Policy, contact us at ${email}.`);
  return L.join("\n");
}

export default function PrivacyPolicyGenerator() {
  return <DocForm fields={FIELDS} build={build} actionLabel="Generate privacy policy" downloadName="privacy-policy.txt" disclaimer={DISCLAIMER} />;
}
