export default function BrandLogo({ className = "brand-logo" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {/* "Deadpan" — a bored face is the brand voice made visual: two dot eyes
          and one flat line for a mouth (which doubles as a screw slot). One
          evenodd path so the eyes/mouth are TRUE transparent cut-outs that adapt
          to any background; the badge fills with currentColor (= --text), so it
          stays theme-adaptive like the old mark with no hard-coded colours. */}
      <path
        className="badge"
        fillRule="evenodd"
        d="M29 7 H71 A22 22 0 0 1 93 29 V71 A22 22 0 0 1 71 93 H29 A22 22 0 0 1 7 71 V29 A22 22 0 0 1 29 7 Z M29 43 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0 Z M58 43 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0 Z M33 60 H67 A3.5 3.5 0 0 1 67 67 H33 A3.5 3.5 0 0 1 33 60 Z"
      />
    </svg>
  );
}
