import AffixWordHub, { affixMetadata } from "../../components/AffixWordHub";

// Results render per request from ?q=, so the hub is never prerendered.
export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }) {
  return affixMetadata("/words-starting-with", searchParams);
}

export default function StartingWithHub({ searchParams }) {
  return <AffixWordHub base="/words-starting-with" searchParams={searchParams} />;
}
