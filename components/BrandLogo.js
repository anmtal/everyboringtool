export default function BrandLogo({ className = "brand-logo", idKey = "1" }) {
  // The face is punched out of a solid currentColor badge with an SVG mask
  // (white = keep, black = hole). Because the eyes and mouth are true holes, the
  // mark stays theme- AND surface-adaptive (header --bg-blur, footer --surface-2)
  // while still letting each feature animate — the CSS blinks the eyes and, every
  // so often, cracks a brief smile before returning to deadpan. A unique mask id
  // per instance avoids collisions between the header and footer logos.
  const maskId = `ebt-face-${idKey}`;
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <mask id={maskId}>
        <rect x="7" y="7" width="86" height="86" rx="22" fill="#fff" />
        <circle className="eye" cx="35.5" cy="43" r="6.5" fill="#000" />
        <circle className="eye" cx="64.5" cy="43" r="6.5" fill="#000" />
        <rect className="mouth-flat" x="33" y="60" width="34" height="7" rx="3.5" fill="#000" />
        <path className="mouth-smile" d="M31 60 Q50 65 69 60 Q50 71 31 60 Z" fill="#000" />
      </mask>
      <rect width="100" height="100" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
