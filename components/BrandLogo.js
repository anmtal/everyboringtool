export default function BrandLogo({ className = "brand-logo" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <rect className="badge" width="100" height="100" rx="22" />
      <g className="tile">
        <rect x="26" y="26" width="20" height="20" rx="5" />
        <rect x="54" y="26" width="20" height="20" rx="5" />
        <rect x="26" y="54" width="20" height="20" rx="5" />
        <rect x="54" y="54" width="20" height="20" rx="5" />
      </g>
    </svg>
  );
}
