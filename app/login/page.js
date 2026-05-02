"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Building2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import HeaderControls from "@/components/HeaderControls";
import { TouchButton, PageTransition } from "@/components/Touch";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) { toast.error(t("enterEmailPw")); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch {
      toast.error(t("invalidCred"));
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-2xl px-4 py-4 text-base bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 placeholder:text-stone-400 transition min-h-[56px]";

  return (
    <PageTransition className="min-h-screen flex flex-col" style={{ background: "var(--sn-bg)" }}>
      {/* Top controls */}
      <div className="flex justify-end p-4">
        <HeaderControls />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-12">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-walnut-600 dark:bg-walnut-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-walnut-200 dark:shadow-walnut-950 mb-5">
            <Building2 size={46} className="text-walnut-50" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">Swaroop Nivas</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1 text-base">Rental Management</p>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm rounded-3xl shadow-xl border p-7"
          style={{ background: "var(--sn-surface)", borderColor: "var(--sn-border)" }}
        >
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-7">{t("ownerLogin")}</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-base font-semibold text-stone-600 dark:text-stone-400 mb-2">{t("email")}</label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  className={`${inputCls} pl-12`}
                  placeholder="owner@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-stone-600 dark:text-stone-400 mb-2">{t("password")}</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type={showPw ? "text" : "password"}
                  className={`${inputCls} pl-12 pr-14`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 p-1"
                >
                  {showPw ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <TouchButton
              type="submit"
              disabled={loading}
              className="w-full bg-walnut-600 dark:bg-walnut-500 text-white py-4 rounded-2xl text-xl font-bold shadow-md mt-1 flex items-center justify-center gap-2 disabled:opacity-70 min-h-[60px]"
            >
              {loading
                ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : t("login")}
            </TouchButton>
          </form>

          <p className="text-sm text-stone-400 dark:text-stone-600 text-center mt-5">{t("loginHint")}</p>
        </div>
      </div>
    </PageTransition>
  );
}
