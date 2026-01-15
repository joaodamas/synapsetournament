import type { ReactNode } from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  onClick?: () => void;
  badge?: ReactNode;
}

export const Logo = ({ variant = 'light', onClick, badge }: LogoProps) => {
  const isDark = variant === 'dark';

  return (
    <div
      className="group flex cursor-pointer select-none flex-col leading-none"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <div className="h-8 w-1.5 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-transform duration-300 group-hover:scale-y-110" />
          <div className="absolute h-4 w-4 rotate-45 rounded-sm border-2 border-blue-600 transition-transform duration-500 group-hover:rotate-90" />
        </div>

        <span
          className={`font-brand text-3xl font-black italic tracking-tight transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          } group-hover:text-blue-500`}
        >
          SYNAPSE
        </span>
        {badge && <span className="ml-2">{badge}</span>}
      </div>

      <span
        className={`ml-8 mt-1.5 text-[9px] font-bold uppercase tracking-[0.4em] ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        Tournaments
      </span>
    </div>
  );
};
