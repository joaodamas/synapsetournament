import type { ReactNode } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Swords,
  Trophy,
  User,
  X,
} from 'lucide-react';

import { Logo } from '../Branding/Logo';

type SidebarUser = {
  nickname?: string;
  avatar_url?: string | null;
  elo_interno?: number | null;
};

type SidebarItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

type SidebarProps = {
  activeTab: string;
  onSelect: (tab: string) => void;
  onLogout?: () => void;
  user?: SidebarUser | null;
  isOpen: boolean;
  onClose: () => void;
};

const menuItems: SidebarItem[] = [
  { id: 'inicio', label: 'Inicio', icon: <LayoutDashboard size={20} /> },
  { id: 'mix', label: 'Mix Lobby', icon: <Swords size={20} /> },
  { id: 'torneios', label: 'Torneios', icon: <PlusCircle size={20} /> },
  { id: 'ranking', label: 'Ranking', icon: <Trophy size={20} /> },
  { id: 'perfil', label: 'Meu perfil', icon: <User size={20} /> },
  { id: 'stats', label: 'Estatisticas', icon: <BarChart3 size={20} /> },
];

export const Sidebar = ({
  activeTab,
  onSelect,
  onLogout,
  user,
  isOpen,
  onClose,
}: SidebarProps) => {
  const initials =
    user?.nickname?.trim().slice(0, 2).toUpperCase() ?? 'NA';

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 -translate-x-full border-r border-[#00f2ff]/10 bg-[#0a0a0a] transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-6">
          <Logo variant="dark" onClick={() => onSelect('inicio')} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 md:hidden"
            aria-label="Fechar menu lateral"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={`flex w-full items-center gap-4 rounded-sm border-l-2 px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all ${
                activeTab === item.id
                  ? 'border-[#00f2ff] bg-[#00f2ff]/10 text-[#7ff7ff]'
                  : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-4 py-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nickname ?? 'Usuario'}
                className="h-8 w-8 rounded-sm border border-white/10 object-cover grayscale"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-white/5 text-xs font-bold text-slate-500">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase text-slate-200">
                {user?.nickname ?? 'Jogador'}
              </p>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#00f2ff]">
                {user?.elo_interno ?? 0} pts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-4 rounded-sm border border-transparent px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3e3e] transition-colors hover:border-[#ff3e3e]/40 hover:bg-[#ff3e3e]/10"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
};
