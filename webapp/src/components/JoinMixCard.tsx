import { useState } from 'react';
import { ArrowRight, Link2, Smartphone } from 'lucide-react';

type JoinMixCardProps = {
  onJoin: (mixId: string) => void;
};

const extractMixId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get('mixId');
    if (id) {
      return id;
    }
  } catch (error) {
    // Not a URL, fall through.
  }

  const match = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
  if (match) {
    return match[0];
  }

  if (trimmed.includes('mixId=')) {
    return trimmed.split('mixId=')[1]?.split('&')[0] ?? '';
  }

  return trimmed;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export const JoinMixCard = ({ onJoin }: JoinMixCardProps) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    const mixId = extractMixId(inputValue);
    if (!isUuid(mixId)) {
      setError('Informe um mixId valido.');
      return;
    }
    setError('');
    onJoin(mixId);
  };

  return (
    <div className="rounded-sm border border-white/5 bg-[#0f1115] p-8 transition-all hover:border-[#00f2ff]/30">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-sm border border-white/10 bg-white/5 p-2 text-[#00f2ff]">
          <Link2 size={20} />
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-100">
          Entrar em mix existente
        </h3>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleJoin();
            }
          }}
          placeholder="Cole o link ou o codigo da sala..."
          className="w-full rounded-sm border border-white/10 bg-[#0b0f14] px-6 py-4 pr-14 text-sm font-bold text-slate-200 transition-all focus:border-[#00f2ff] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleJoin}
          className="absolute right-2 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] p-3 text-[#050505] transition-all hover:brightness-95"
        >
          <ArrowRight size={18} />
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs font-semibold text-[#ff8a8a]">{error}</p>
      )}

      <p className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        <Smartphone size={12} />
        Dica: peça o link ao capitao da sala.
      </p>
    </div>
  );
};
