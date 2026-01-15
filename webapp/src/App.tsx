import { useEffect, useMemo, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { MixLobby } from './components/MixLobby';
import { MatchHistory } from './components/MatchHistory';
import { GlobalLeaderboard } from './components/Leaderboard';
import { SteamCallback } from './components/SteamCallback';
import { buildSteamLoginUrl } from './lib/steam';
import { ProfilePage } from './pages/ProfilePage';
import { Sidebar } from './components/Navigation/Sidebar';
import { DashboardOverview } from './pages/DashboardOverview';
import { TournamentsPage } from './pages/TournamentsPage';
import { AdvancedStats } from './pages/AdvancedStats';
import { supabase } from './lib/supabase';

type SidebarUser = {
  nickname: string;
  avatar_url: string | null;
  elo_interno: number;
};

const resolveTabFromLocation = (path: string, mixId: string) => {
  if (path.startsWith('/mix')) {
    return 'mix';
  }
  if (path.startsWith('/leaderboard')) {
    return 'ranking';
  }
  if (path.startsWith('/history')) {
    return 'stats';
  }
  if (path.startsWith('/profile')) {
    return 'perfil';
  }
  if (path.startsWith('/tournaments')) {
    return 'torneios';
  }
  if (mixId) {
    return 'mix';
  }
  return 'inicio';
};

const buildPathForTab = (tab: string, mixId: string) => {
  switch (tab) {
    case 'mix':
      return mixId ? `/?mixId=${encodeURIComponent(mixId)}` : '/mix';
    case 'ranking':
      return '/leaderboard';
    case 'stats':
      return '/history';
    case 'perfil':
      return '/profile';
    case 'torneios':
      return '/tournaments';
    default:
      return '/';
  }
};

export default function App() {
  const mixId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mixId') ?? '';
  }, []);
  const playerId = useMemo(() => {
    try {
      return localStorage.getItem('synapsecs_player_id') ?? '';
    } catch (error) {
      return '';
    }
  }, []);
  const loginWithSteam = () => {
    const returnUrl = `${window.location.origin}/auth/steam/callback${
      mixId ? `?mixId=${encodeURIComponent(mixId)}` : ''
    }`;
    window.location.href = buildSteamLoginUrl(returnUrl);
  };

  if (window.location.pathname.startsWith('/auth/steam/callback')) {
    return <SteamCallback />;
  }

  if (!playerId) {
    if (window.location.pathname.startsWith('/leaderboard')) {
      return <GlobalLeaderboard />;
    }
    if (window.location.pathname.startsWith('/history')) {
      return <MatchHistory />;
    }
    if (window.location.pathname.startsWith('/mix') || mixId) {
      return <MixLobby mixId={mixId} />;
    }
    return <LandingPage onLoginSteam={loginWithSteam} />;
  }

  return (
    <AuthenticatedApp
      mixId={mixId}
      playerId={playerId}
      onLogout={() => {
        try {
          localStorage.removeItem('synapsecs_player_id');
          localStorage.removeItem('synapsecs_steam_id');
          localStorage.removeItem('synapsecs_player_nickname');
        } catch (error) {
          // ignore storage errors
        }
        window.location.assign('/');
      }}
    />
  );
}

type AuthenticatedAppProps = {
  mixId: string;
  playerId: string;
  onLogout: () => void;
};

const AuthenticatedApp = ({ mixId, playerId, onLogout }: AuthenticatedAppProps) => {
  const [activeTab, setActiveTab] = useState(() =>
    resolveTabFromLocation(window.location.pathname, mixId),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<SidebarUser | null>(null);

  useEffect(() => {
    const handlePop = () => {
      setActiveTab(resolveTabFromLocation(window.location.pathname, mixId));
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [mixId]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) {
        return;
      }

      const { data } = await supabase
        .from('players')
        .select('nickname, avatar_url, elo_interno')
        .eq('id', playerId)
        .single();

      if (data) {
        setUser(data as SidebarUser);
      }
    };

    void fetchUser();
  }, [playerId]);

  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    const nextPath = buildPathForTab(tab, mixId);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (nextPath !== currentPath) {
      window.history.pushState({}, '', nextPath);
    }
    setSidebarOpen(false);
  };

  let content = <DashboardOverview />;
  if (activeTab === 'mix') {
    content = <MixLobby mixId={mixId} embedded />;
  } else if (activeTab === 'torneios') {
    content = <TournamentsPage />;
  } else if (activeTab === 'ranking') {
    content = <GlobalLeaderboard />;
  } else if (activeTab === 'perfil') {
    content = <ProfilePage playerId={playerId} />;
  } else if (activeTab === 'stats') {
    content = <AdvancedStats playerId={playerId} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activeTab={activeTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        onSelect={handleSelect}
        user={user}
      />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.3em] text-slate-600"
          >
            Menu
          </button>
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
            Synapse
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-black uppercase tracking-[0.3em] text-red-400"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{content}</main>
      </div>
    </div>
  );
};
