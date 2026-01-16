import type { PlayerMatchStats } from '../lib/mvp';

type MVPCardProps = {
  playerStats: PlayerMatchStats;
  impactRating?: number;
};

const formatImpact = (value?: number) => {
  if (!value) {
    return '--';
  }
  return value.toFixed(2);
};

export const MVPCard = ({ playerStats, impactRating }: MVPCardProps) => {
  const initials = playerStats.nickname.slice(0, 2).toUpperCase();
  const avatar = playerStats.avatarUrl;

  return (
    <div className="relative overflow-hidden rounded-sm border border-white/10 bg-[#0f1115] p-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#7ff7ff]">
            Match MVP
          </span>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-500">Impact Rating</p>
            <p className="font-bold text-slate-100">{formatImpact(impactRating)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {avatar ? (
            <img
              src={avatar}
              alt={playerStats.nickname}
              className="h-20 w-20 rounded-sm border-4 border-[#00f2ff] object-cover shadow-[0_0_18px_rgba(0,242,255,0.35)]"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-sm border-4 border-[#00f2ff] bg-[#0b0f14] text-xl font-bold text-slate-200 shadow-[0_0_18px_rgba(0,242,255,0.35)]">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black italic text-slate-100">
              {playerStats.nickname}
            </h2>
            <div className="mt-2 flex flex-wrap gap-4">
              <StatBlock label="K" value={playerStats.kills} />
              <StatBlock label="D" value={playerStats.deaths} />
              <StatBlock label="ADR" value={playerStats.adr} />
            </div>
          </div>
        </div>
    </div>
  );
};

type StatBlockProps = {
  label: string;
  value: number;
};

const StatBlock = ({ label, value }: StatBlockProps) => (
  <div>
    <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
    <p className="text-lg font-black text-slate-100">{value}</p>
  </div>
);
