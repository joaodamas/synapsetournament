import { Map as MapIcon, X } from 'lucide-react';

import { MAP_POOL } from '../lib/maps';

type AdvancedMapVetoProps = {
  bannedMaps: string[];
  onBan: (mapId: string) => void;
  isTurnA: boolean;
  isCapA: boolean;
  isCapB: boolean;
  vetoLocked: boolean;
};

export const AdvancedMapVeto = ({
  bannedMaps,
  onBan,
  isTurnA,
  isCapA,
  isCapB,
  vetoLocked,
}: AdvancedMapVetoProps) => {
  const myTurn = (isTurnA && isCapA) || (!isTurnA && isCapB);

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between rounded-sm border border-white/5 bg-[#0f1115] p-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-sm border p-3 ${
              isTurnA
                ? 'border-[#ff3e3e]/40 bg-[#ff3e3e]/10 text-[#ff8a8a]'
                : 'border-[#00f2ff]/40 bg-[#00f2ff]/10 text-[#7ff7ff]'
            }`}
          >
            <MapIcon size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-100">
              Veto de mapas
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">
              Turno:{' '}
              <span
                className={isTurnA ? 'text-[#ff3e3e]' : 'text-[#00f2ff]'}
              >
                {isTurnA ? 'Capitao Time A' : 'Capitao Time B'}
              </span>
            </p>
          </div>
        </div>

        {vetoLocked ? (
          <div className="rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase text-slate-500">
            Veto encerrado
          </div>
        ) : myTurn ? (
          <div className="animate-pulse rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 px-4 py-2 text-[10px] font-black uppercase text-[#7ff7ff]">
            Sua vez de banir
          </div>
        ) : (
          <div className="rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase text-slate-500">
            Aguardando oponente...
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {MAP_POOL.map((map) => {
          const isBanned = bannedMaps.includes(map.id);
          const canBan = myTurn && !vetoLocked && !isBanned;

          return (
            <div
              key={map.id}
              className={`group relative overflow-hidden rounded-sm border transition-all duration-300 ${
                isBanned
                  ? 'border-[#ff3e3e] border-b-4 opacity-50 grayscale'
                  : 'border-white/10 border-b-4 border-b-[#00f2ff] hover:-translate-y-1 hover:border-[#00f2ff]/60'
              }`}
            >
              <img
                src={map.image}
                className="aspect-video w-full object-cover"
                alt={map.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tight text-white">
                      {map.name}
                    </h3>
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-slate-400">
                      {isBanned ? 'Eliminado' : 'Ativo'}
                    </span>
                  </div>

                  {canBan && (
                    <button
                      type="button"
                      onClick={() => onBan(map.id)}
                      className="rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/20 px-2.5 py-2 text-[#ff3e3e] backdrop-blur-md transition-all group-hover:scale-105 group-hover:bg-[#ff3e3e] group-hover:text-white"
                    >
                      <span className="mr-1 text-[9px] font-black uppercase">
                        Banir
                      </span>
                      <X size={14} className="inline" />
                    </button>
                  )}
                </div>
              </div>

              {isBanned && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/70">
                  <div className="rounded-sm border border-[#ff3e3e] px-4 py-1 text-xs font-black uppercase text-[#ff3e3e]">
                    Fora do mix
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
