import InternalToggle from "../../components/InternalToggle";

// Owner-only utility: marks this browser as internal so the layout's gate turns
// off GA4 and ad requests for it. Unlisted and noindexed. Anyone who finds it
// can only opt their own browser out, which is harmless.
export const metadata = {
  title: "Internal browser",
  robots: { index: false, follow: false },
};

export default function InternalPage() {
  return (
    <>
      <header className="page-head">
        <h1>Internal browser</h1>
        <p>Marks this browser as the site owner&apos;s. Google Analytics stops recording it and no ads are requested, so your own visits never count as traffic or as ad impressions. Do this once on every browser and device you use.</p>
      </header>
      <div className="block" style={{ marginTop: 0 }}>
        <InternalToggle />
      </div>
    </>
  );
}
