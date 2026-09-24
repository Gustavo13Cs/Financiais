"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";

function LoginContent() {
  const router = useRouter();
  const { signIn, signUp, continueAsGuest, user } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, redirect to home
  if (user) {
    router.push("/");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message || "Erro ao realizar login."
        );
        setLoading(false);
      } else {
        router.push("/");
      }
    } else {
      if (!fullName.trim()) {
        setErrorMsg("Por favor, preencha seu nome completo.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }

      const { error } = await signUp(email.trim(), password, fullName.trim());
      if (error) {
        setErrorMsg(error.message || "Erro ao criar conta.");
        setLoading(false);
      } else {
        setSuccessMsg("Conta criada com sucesso! Redirecionando...");
        setTimeout(() => {
          router.push("/");
        }, 1200);
      }
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-goal-sky/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-income-emerald/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-space-lg">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-goal-sky/20 to-income-emerald/20 border border-[rgba(255,255,255,0.08)] mb-space-sm shadow-glow">
            <span className="material-symbols-outlined text-3xl text-income-emerald">account_balance</span>
          </div>
          <h1 className="text-display-currency font-extrabold text-text-primary tracking-tight">
            Lumina <span className="text-income-emerald">Finance</span>
          </h1>
          <p className="text-body-md text-text-secondary mt-1">
            Gestão financeira inteligente, segura e em tempo real
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl bg-surface-card/90 backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] shadow-modal p-space-lg">
          {/* Tab selector */}
          <div className="flex p-1 bg-surface-container-lowest rounded-2xl mb-space-md">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-label-md font-semibold transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-surface-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-label-md font-semibold transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-surface-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-space-md p-space-sm bg-expense-rose/10 border border-expense-rose/20 rounded-xl text-expense-rose text-body-md flex items-center gap-space-xs animate-fade-in-up">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-space-md p-space-sm bg-income-emerald/10 border border-income-emerald/20 rounded-xl text-income-emerald text-body-md flex items-center gap-space-xs animate-fade-in-up">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-space-md">
            {mode === "register" && (
              <div>
                <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                    person
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl pl-10 pr-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                E-mail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                  mail
                </span>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl pl-10 pr-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                />
              </div>
            </div>

            <div>
              <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                Senha
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                  lock
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl pl-10 pr-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-income-emerald hover:bg-income-emerald-hover disabled:opacity-50 text-white rounded-xl text-label-md font-semibold shadow-glow transition-all active:scale-[0.98] cursor-pointer mt-space-md flex items-center justify-center gap-space-xs"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Aguarde...</span>
                </>
              ) : mode === "login" ? (
                "Entrar no Lumina"
              ) : (
                "Criar Minha Conta"
              )}
            </button>
          </form>

          {/* Guest / Local mode option */}
          <div className="mt-space-lg pt-space-md border-t border-[rgba(255,255,255,0.06)] text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-label-sm text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              Continuar como Convidado (Modo Local)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}
