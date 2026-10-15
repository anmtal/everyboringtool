import AffixWordHub, { affixMetadata } from "../../components/AffixWordHub";

// Results render per request from ?q=, so the hub is never prerendered.
export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }) {
  return affixMetadata("/words-ending-with", searchParams);
}

export default function EndingWithHub({ searchParams }) {
  return <AffixWordHub base="/words-ending-with" searchParams={searchParams} />;
}
