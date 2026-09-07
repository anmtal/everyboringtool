import { notFound } from "next/navigation";
import { TOOL_LANDINGS, landingMetadata } from "../../../lib/toolLandings";
import ToolLandingPage from "../../../components/ToolLandingPage";

export const dynamicParams = false;

const VARIANTS = ["mp4-to-mp3", "wav-to-mp3", "m4a-to-mp3", "aac-to-mp3"];
export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }));
}

const getCfg = (v) => TOOL_LANDINGS[`audio-converter/${v}`];

export function generateMetadata({ params }) {
  const cfg = getCfg(params.variant);
  return cfg ? landingMetadata(cfg) : {};
}

export default function Page({ params }) {
  const cfg = getCfg(params.variant);
  if (!cfg) notFound();
  return <ToolLandingPage cfg={cfg} />;
}
