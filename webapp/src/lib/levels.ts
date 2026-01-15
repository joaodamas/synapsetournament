type BadgeSize = 'sm' | 'md';

const badgeBase =
  'inline-flex items-center justify-center gap-1.5 rounded-full border font-black uppercase leading-none tracking-[0.2em]';

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-3 py-1 text-[10px]',
};

const gcColorClasses = (level: number) => {
  if (level >= 1 && level <= 5) {
    return 'border-purple-200 bg-purple-100 text-purple-700';
  }
  if (level >= 6 && level <= 11) {
    return 'border-blue-200 bg-blue-100 text-blue-700';
  }
  if (level >= 12 && level <= 15) {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  }
  if (level >= 16 && level <= 17) {
    return 'border-yellow-200 bg-yellow-100 text-yellow-800';
  }
  if (level === 18) {
    return 'border-amber-200 bg-amber-100 text-amber-700';
  }
  if (level === 19) {
    return 'border-orange-200 bg-orange-100 text-orange-700';
  }
  if (level >= 20) {
    return 'border-red-200 bg-red-100 text-red-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-500';
};

const faceitColorClasses = (level: number) => {
  if (level === 1) {
    return 'border-slate-300 bg-slate-200 text-slate-700';
  }
  if (level === 2) {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  }
  if (level === 3) {
    return 'border-emerald-300 bg-emerald-200 text-emerald-800';
  }
  if (level === 4) {
    return 'border-yellow-200 bg-yellow-100 text-yellow-800';
  }
  if (level === 5) {
    return 'border-yellow-300 bg-yellow-200 text-yellow-900';
  }
  if (level === 6) {
    return 'border-orange-200 bg-orange-100 text-orange-700';
  }
  if (level === 7) {
    return 'border-orange-300 bg-orange-200 text-orange-800';
  }
  if (level === 8) {
    return 'border-red-200 bg-red-100 text-red-700';
  }
  if (level === 9) {
    return 'border-red-300 bg-red-200 text-red-800';
  }
  if (level >= 10) {
    return 'border-red-900 bg-red-900 text-white';
  }
  return 'border-slate-200 bg-slate-100 text-slate-500';
};

export const getGcLevelBadgeClass = (level: number, size: BadgeSize = 'md') =>
  `${badgeBase} ${sizeClasses[size]} ${gcColorClasses(level)}`;

export const getFaceitLevelBadgeClass = (
  level: number,
  size: BadgeSize = 'md',
) => `${badgeBase} ${sizeClasses[size]} ${faceitColorClasses(level)}`;
