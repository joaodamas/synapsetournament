type LogoProps = {
  className?: string;
};

export const FaceitLogo = ({ className }: LogoProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M3 4h18l-3.6 7.6h-5.8L9.4 20z"
      fill="currentColor"
    />
  </svg>
);

export const GamersClubLogo = ({ className }: LogoProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <text
      x="12"
      y="15"
      textAnchor="middle"
      fontSize="9"
      fontWeight="700"
      fontFamily="system-ui, -apple-system, Segoe UI, Arial, sans-serif"
      fill="#ffffff"
    >
      GC
    </text>
  </svg>
);
