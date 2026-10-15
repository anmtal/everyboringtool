import AffixWordHub, { affixMetadata } from "../../components/AffixWordHub";

// Results render per request from ?q=, so the hub is never prerendered.
export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }) {
  return affixMetadata("/words-containing", searchParams);
}

export default function ContainingHub({ searchParams }) {
  return <AffixWordHub base="/words-containing" searchParams={searchParams} />;
}
