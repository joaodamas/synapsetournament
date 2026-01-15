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
      <div className="mb-8 flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-2xl p-3 shadow-lg ${
              isTurnA
                ? 'bg-orange-500 shadow-orange-200'
                : 'bg-blue-600 shadow-blue-200'
            }`}
          >
            <MapIcon className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800">
              Veto de mapas
            </h2>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Turno:{' '}
              <span
                className={isTurnA ? 'text-orange-500' : 'text-blue-600'}
              >
                {isTurnA ? 'Capitao Time A' : 'Capitao Time B'}
              </span>
            </p>
          </div>
        </div>

        {vetoLocked ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase text-slate-400">
            Veto encerrado
          </div>
        ) : myTurn ? (
          <div className="animate-pulse rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase text-emerald-600">
            Sua vez de banir
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase text-slate-400">
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
              className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                isBanned
                  ? 'border-slate-100 opacity-40 grayscale'
                  : 'border-white shadow-lg hover:-translate-y-1 hover:border-blue-500'
              }`}
            >
              <img
                src={map.image}
                className="aspect-video w-full object-cover"
                alt={map.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tight text-white">
                      {map.name}
                    </h3>
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-300">
                      {isBanned ? 'Banido' : 'Disponivel'}
                    </span>
                  </div>

                  {canBan && (
                    <button
                      type="button"
                      onClick={() => onBan(map.id)}
                      className="rounded-xl border border-red-500/30 bg-red-500/20 px-2.5 py-2 text-red-500 backdrop-blur-md transition-all group-hover:scale-105 group-hover:bg-red-500 group-hover:text-white"
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
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
                  <div className="rounded-full border-2 border-red-500 px-4 py-1 text-xs font-black uppercase text-red-500">
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
