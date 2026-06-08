// Finsight logo — Finance + Insight. A rising chart line whose peak is a focal
// "lens" node (the insight), inside an indigo→violet rounded tile.
export function LogoMark({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      role="img" aria-label="Finsight">
      <defs>
        <linearGradient id="finsightGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#finsightGrad)" />
      {/* rising trend line */}
      <path d="M12 31 L20 23 L26 27 L35.5 16.5" stroke="white" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* insight lens at the peak */}
      <circle cx="35.5" cy="16.5" r="4.5" fill="url(#finsightGrad)" stroke="white" strokeWidth="2.5" />
      {/* baseline */}
      <path d="M13 37 H35" stroke="white" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
