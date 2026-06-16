import { useEffect, useState } from "react";
import { auth, hasFirebaseConfig, callFunction, signInWithCustomToken } from "../lib/firebase";

type CallbackState = "loading" | "error";

const storageKeys = {
  steamId:  "synapsecs_steam_id",
  nickname: "synapsecs_player_nickname",
};

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const SteamCallback = () => {
  const [state,   setState]   = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Validando login Steam...");

  useEffect(() => {
    const run = async () => {
      if (!hasFirebaseConfig || !auth) {
        setState("error");
        setMessage("Firebase não configurado.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const mixId  = params.get("mixId");

      // Monta os parâmetros OpenID para validação no backend
      const openidParams: Record<string, string> = {};
      params.forEach((v, k) => { openidParams[k] = v; });

      try {
        const res = await callFunction<{
          token: string; steamId: string; nickname: string; avatarUrl: string;
        }>("steamLogin", { openidParams });

        // Faz login no Firebase com o Custom Token retornado
        await signInWithCustomToken(auth!, res.token);

        localStorage.setItem(storageKeys.steamId,  res.steamId);
        localStorage.setItem(storageKeys.nickname,  res.nickname);

        setMessage("Login confirmado. Redirecionando...");
        const destination = mixId && isUuid(mixId) ? `/?mixId=${mixId}` : "/";
        window.location.replace(destination);

      } catch (err: unknown) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Falha ao validar o login Steam.");
      }
    };

    void run();
  }, []);

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="rounded-sm border border-white/10 bg-[#0f1115] p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#00f2ff]">Steam Login</p>
          <h1 className="mt-4 font-display text-2xl font-semibold text-slate-100">
            {state === "loading" ? "Sincronizando perfil" : "Não foi possível entrar"}
          </h1>
          <p className="mt-3 text-sm text-slate-400">{message}</p>
          {state === "error" && (
            <a href="/" className="mt-6 inline-flex items-center justify-center rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95">
              Voltar para o lobby
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
