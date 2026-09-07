import { notFound } from "next/navigation";
import { TOOL_LANDINGS, landingMetadata } from "../../../lib/toolLandings";
import ToolLandingPage from "../../../components/ToolLandingPage";

export const dynamicParams = false;

const VARIANTS = ["hex-to-rgb", "rgb-to-hex", "palette", "gradient"];
export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }));
}

const getCfg = (v) => TOOL_LANDINGS[`color-picker/${v}`];

export function generateMetadata({ params }) {
  const cfg = getCfg(params.variant);
  return cfg ? landingMetadata(cfg) : {};
}

export default function Page({ params }) {
  const cfg = getCfg(params.variant);
  if (!cfg) notFound();
  return <ToolLandingPage cfg={cfg} />;
}
