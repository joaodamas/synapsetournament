type LogoProps = {
  className?: string;
};

export const FaceitLogo = ({ className }: LogoProps) => (
  <img
    src="/Faceit.png"
    alt=""
    aria-hidden="true"
    className={className}
    loading="lazy"
  />
);

export const GamersClubLogo = ({ className }: LogoProps) => (
  <img
    src="/GamersClub.png"
    alt=""
    aria-hidden="true"
    className={className}
    loading="lazy"
  />
);
