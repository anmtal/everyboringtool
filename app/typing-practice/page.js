import { TYPING_LANDING, landingMetadata } from "../../lib/typingLanding";
import TypingLandingPage from "../../components/TypingLandingPage";

const cfg = TYPING_LANDING["typing-practice"];

export function generateMetadata() {
  return landingMetadata(cfg);
}

export default function Page() {
  return <TypingLandingPage cfg={cfg} />;
}
