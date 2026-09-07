import { notFound } from "next/navigation";
import { TOOL_LANDINGS, landingMetadata } from "../../../lib/toolLandings";
import ToolLandingPage from "../../../components/ToolLandingPage";

export const dynamicParams = false;

const VARIANTS = ["cpm-to-cpc", "for-facebook", "ecpm", "budget"];
export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }));
}

const getCfg = (v) => TOOL_LANDINGS[`cpm-calculator/${v}`];

export function generateMetadata({ params }) {
  const cfg = getCfg(params.variant);
  return cfg ? landingMetadata(cfg) : {};
}

export default function Page({ params }) {
  const cfg = getCfg(params.variant);
  if (!cfg) notFound();
  return <ToolLandingPage cfg={cfg} />;
}
