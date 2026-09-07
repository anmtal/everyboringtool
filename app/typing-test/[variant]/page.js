import { notFound } from "next/navigation";
import { TYPING_LANDING, landingMetadata, HIDDEN_LANDING } from "../../../lib/typingLanding";
import TypingLandingPage from "../../../components/TypingLandingPage";

// Closed set — only the enumerated variants render; anything else 404s. Gated
// variants (e.g. for-kids until AdSense approval) are excluded here, so their URL
// 404s until KIDS_PAGE_ENABLED is flipped on.
export const dynamicParams = false;

const VARIANTS = ["1-minute", "5-minute", "for-kids", "code"];
export function generateStaticParams() {
  return VARIANTS.filter((v) => !HIDDEN_LANDING.has(`typing-test/${v}`)).map((variant) => ({ variant }));
}

const getCfg = (v) => (HIDDEN_LANDING.has(`typing-test/${v}`) ? null : TYPING_LANDING[`typing-test/${v}`]);

export function generateMetadata({ params }) {
  const cfg = getCfg(params.variant);
  return cfg ? landingMetadata(cfg) : {};
}

export default function Page({ params }) {
  const cfg = getCfg(params.variant);
  if (!cfg) notFound();
  return <TypingLandingPage cfg={cfg} />;
}
