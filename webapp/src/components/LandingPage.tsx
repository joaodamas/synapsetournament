import type { ReactNode } from 'react';
import { Shield, Trophy, Users, Zap } from 'lucide-react';

import { Logo } from './Branding/Logo';

type LandingPageProps = {
  onLoginSteam: () => void;
};

export const LandingPage = ({ onLoginSteam }: LandingPageProps) => {
  return (
    <div className="page-shell text-slate-200">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-8">
        <Logo variant="dark" onClick={() => window.location.assign('/')} />
        <div className="flex items-center gap-8">
          <a
            href="#features"
            className="text-sm font-bold text-slate-400 transition-colors hover:text-[#00f2ff]"
          >
            Recursos
          </a>
          <a
            href="#ranking"
            className="text-sm font-bold text-slate-400 transition-colors hover:text-[#00f2ff]"
          >
            Ranking
          </a>
          <button
            type="button"
            onClick={onLoginSteam}
            className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#050505] transition-all hover:-translate-y-0.5"
          >
            Entrar com Steam
          </button>
        </div>
      </nav>

      <header className="flex flex-col items-center px-6 py-24 text-center">
        <div className="mb-6 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#7ff7ff]">
          CS2 Matchmaking Platform
        </div>
        <h1 className="mb-8 text-5xl font-black tracking-tight text-slate-100 md:text-7xl">
          JOGUE MIXES <br />
          <span className="italic text-[#00f2ff]">PROFISSIONAIS.</span>
        </h1>
        <p className="mb-10 max-w-2xl text-lg font-medium text-slate-400">
          A plataforma definitiva para organizar lobbies 5v5 com sorteio
          balanceado, veto de mapas e estatisticas reais extraidas por IA.
        </p>
        <button
          type="button"
          onClick={onLoginSteam}
          className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-12 py-5 text-xl font-black text-[#050505] shadow-[0_0_35px_rgba(0,242,255,0.4)] transition-transform hover:-translate-y-1"
        >
          COMECAR AGORA FREE
        </button>
      </header>

      <section
        id="features"
        className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3"
      >
        <FeatureCard
          icon={<Zap />}
          title="Sorteio inteligente"
          desc="Balanceamento real baseado em Faceit e GamersClub."
        />
        <FeatureCard
          icon={<Shield />}
          title="Anti-cheat ready"
          desc="Integracao com servidores privados e logs de partida."
        />
        <FeatureCard
          icon={<Trophy />}
          title="Ranking global"
          desc="Suba no Elo e apareca no leaderboard da temporada."
        />
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-20 md:grid-cols-3">
        <FeatureCard
          icon={<Users />}
          title="Comunidade ativa"
          desc="Convide amigos e acompanhe historico completo dos mixes."
        />
        <FeatureCard
          icon={<Zap />}
          title="Match flow rapido"
          desc="Veto fluido, sorteio instantaneo e kickoff automatico."
        />
        <FeatureCard
          icon={<Trophy />}
          title="Hall da fama"
          desc="Destaque para MVPs e estatisticas de alto impacto."
        />
      </section>

      <section id="ranking" className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-sm border border-white/5 bg-[#0f1115] p-10 text-center">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-[#00f2ff]">
            Ranking global
          </p>
          <h2 className="mt-4 text-3xl font-black text-slate-100">
            O topo da temporada te espera
          </h2>
          <p className="mt-3 text-slate-400">
            Conquiste vitórias, acumule Elo e apareça entre os melhores do
            SynapseCS.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign('/leaderboard')}
            className="mt-6 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-8 py-3 text-[11px] font-black uppercase tracking-[0.3em] text-[#050505] transition-all hover:-translate-y-0.5"
          >
            Ver leaderboard
          </button>
        </div>
      </section>
    </div>
  );
};

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  desc: string;
};

const FeatureCard = ({ icon, title, desc }: FeatureCardProps) => (
  <div className="group rounded-sm border border-white/10 bg-[#0f1115] p-8 transition-all hover:border-[#00f2ff]/40">
    <div className="mb-4 text-[#00f2ff] transition-transform group-hover:scale-110">
      {icon}
    </div>
    <h3 className="mb-2 text-xl font-black text-slate-100">{title}</h3>
    <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
  </div>
);
