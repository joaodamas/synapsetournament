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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 p-1 shadow-2xl">
      <div className="rounded-[22px] bg-slate-900/90 p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-yellow-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black">
            Match MVP
          </span>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-400">Impact Rating</p>
            <p className="font-bold text-white">{formatImpact(impactRating)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {avatar ? (
            <img
              src={avatar}
              alt={playerStats.nickname}
              className="h-20 w-20 rounded-full border-4 border-yellow-500 object-cover shadow-lg shadow-yellow-500/20"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-yellow-500 bg-slate-800 text-xl font-bold text-slate-200 shadow-lg shadow-yellow-500/20">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black italic text-white">
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
    <p className="text-lg font-black text-white">{value}</p>
  </div>
);
