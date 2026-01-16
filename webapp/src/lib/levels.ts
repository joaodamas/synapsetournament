type BadgeSize = 'sm' | 'md';

const badgeBase =
  'inline-flex items-center justify-center gap-1.5 rounded-sm border font-black uppercase leading-none tracking-[0.2em]';

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-3 py-1 text-[10px]',
};

const gcColorClasses = (level: number) => {
  if (level >= 1 && level <= 5) {
    return 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200';
  }
  if (level >= 6 && level <= 11) {
    return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
  }
  if (level >= 12 && level <= 15) {
    return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200';
  }
  if (level >= 16 && level <= 17) {
    return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  }
  if (level === 18) {
    return 'border-orange-400/40 bg-orange-400/10 text-orange-200';
  }
  if (level === 19) {
    return 'border-orange-500/40 bg-orange-500/10 text-orange-200';
  }
  if (level >= 20) {
    return 'border-red-500/50 bg-red-500/10 text-red-200';
  }
  return 'border-white/10 bg-white/5 text-slate-300';
};

const faceitColorClasses = (level: number) => {
  if (level === 1) {
    return 'border-white/10 bg-white/5 text-slate-300';
  }
  if (level === 2) {
    return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200';
  }
  if (level === 3) {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  }
  if (level === 4) {
    return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  }
  if (level === 5) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  }
  if (level === 6) {
    return 'border-orange-400/40 bg-orange-400/10 text-orange-200';
  }
  if (level === 7) {
    return 'border-orange-500/40 bg-orange-500/10 text-orange-200';
  }
  if (level === 8) {
    return 'border-red-400/40 bg-red-400/10 text-red-200';
  }
  if (level === 9) {
    return 'border-red-500/40 bg-red-500/10 text-red-200';
  }
  if (level >= 10) {
    return 'border-red-500/60 bg-red-500/15 text-red-200';
  }
  return 'border-white/10 bg-white/5 text-slate-300';
};

export const getGcLevelBadgeClass = (level: number, size: BadgeSize = 'md') =>
  `${badgeBase} ${sizeClasses[size]} ${gcColorClasses(level)}`;

export const getFaceitLevelBadgeClass = (
  level: number,
  size: BadgeSize = 'md',
) => `${badgeBase} ${sizeClasses[size]} ${faceitColorClasses(level)}`;
