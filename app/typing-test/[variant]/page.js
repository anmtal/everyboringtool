import { notFound } from "next/navigation";
import { TYPING_LANDING, landingMetadata } from "../../../lib/typingLanding";
import TypingLandingPage from "../../../components/TypingLandingPage";

// Closed set — only the enumerated variants render; anything else 404s.
export const dynamicParams = false;

const VARIANTS = ["1-minute", "5-minute", "for-kids", "code"];
export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }));
}

const getCfg = (v) => TYPING_LANDING[`typing-test/${v}`];

export function generateMetadata({ params }) {
  const cfg = getCfg(params.variant);
  return cfg ? landingMetadata(cfg) : {};
}

export default function Page({ params }) {
  const cfg = getCfg(params.variant);
  if (!cfg) notFound();
  return <TypingLandingPage cfg={cfg} />;
}
