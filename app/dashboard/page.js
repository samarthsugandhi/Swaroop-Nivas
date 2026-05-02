"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import { getDashboardStats, seedUnitsIfNeeded, getYearlyStats, splitUtilityBill, cleanupDuplicates } from "@/lib/firestore";
import { signOut } from "@/lib/auth";
import { useLang } from "@/contexts/LangContext";
import { TouchButton, TouchLink, PageTransition, TouchCard } from "@/components/Touch";
import {
  Building2, Users, UserPlus, History,
  FileBarChart2, DoorOpen, LogOut, IndianRupee, Zap, Droplets, Activity
} from "lucide-react";
import toast from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function StatCard({ label, value, borderColor, icon: Icon }) {
  return (
    <div
      className={`flex-1 rounded-2xl p-4 border-l-4 ${borderColor}`}
      style={{ background: "var(--sn-surface)", border: `1px solid var(--sn-border)`, borderLeftWidth: "4px" }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</p>
        <Icon size={18} className="text-stone-400" />
      </div>
      <p className="text-3xl font-bold text-stone-900 dark:text-stone-50">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLang();
  const now = new Date();
  const [stats, setStats] = useState(null);
  const [yearlyData, setYearlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSplitter, setShowSplitter] = useState(false);
  const [splitType, setSplitType] = useState("electricity");
  const [splitting, setSplitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        await seedUnitsIfNeeded();
        const [data, yearly] = await Promise.all([
          getDashboardStats(now.getMonth() + 1, now.getFullYear()),
          getYearlyStats(now.getFullYear())
        ]);
        setStats(data);
        
        const months = t("monthsShort");
        const chartData = yearly.map((val, i) => ({ name: months[i], revenue: val }));
        setYearlyData(chartData);

        // Silent background cleanup of any accidental duplicates
        cleanupDuplicates().catch(err => console.error("Auto-cleanup error:", err));
      } catch (e) {
        console.error(e);
        toast.error(t("failedLoad"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  async function handleSplitUtility() {
    if (!splitAmt || isNaN(splitAmt) || splitAmt <= 0) return toast.error("Enter valid amount");
    setSplitting(true);
    try {
      await splitUtilityBill(splitType, Number(splitAmt), now.getMonth() + 1, now.getFullYear());
      toast.success(`${splitType} bill split successfully`);
      setShowSplitter(false);
      setSplitAmt("");
    } catch { toast.error("Failed to split bill"); }
    finally { setSplitting(false); }
  }

  const pct = stats && stats.totalExpected > 0
    ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
    : 0;

  return (
    <AuthGuard>
      <PageTransition className="min-h-screen pb-nav" style={{ background: "var(--sn-bg)" }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-4" style={{ background: "var(--sn-surface)", borderBottom: "1px solid var(--sn-border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 size={24} className="text-walnut-600 dark:text-walnut-400" />
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Swaroop Nivas</h1>
              </div>
              <p className="text-stone-500 dark:text-stone-400 mt-0.5 text-base">
                {t("monthsShort")[now.getMonth()]} {now.getFullYear()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HeaderControls />
              <TouchButton
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <LogOut size={20} />
              </TouchButton>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-6">
          {/* Quick actions row */}
          <div className="flex gap-3">
            <TouchButton onClick={() => setShowSplitter(true)} className="flex-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 py-3 rounded-2xl font-bold flex justify-center items-center gap-2">
              <Zap size={16}/> Utility Splitter
            </TouchButton>
            <TouchLink href="/expenses" className="flex-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 py-3 rounded-2xl font-bold flex justify-center items-center gap-2">
              <IndianRupee size={16}/> Expenses
            </TouchLink>
          </div>

          {/* Yearly Analytics */}
          <div>
            <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={16}/> Yearly Revenue ({now.getFullYear()})</p>
            {loading ? (
              <div className="h-48 rounded-3xl animate-pulse bg-stone-200 dark:bg-stone-800" />
            ) : (
              <div className="h-48 rounded-3xl p-4" style={{ background: "var(--sn-surface)", border: "1px solid var(--sn-border)" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData}>
                    <XAxis dataKey="name" stroke="#87837c" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', background: 'var(--sn-surface)', color: 'var(--sn-text)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#059669', fontWeight: 'bold' }}
                      formatter={(val) => `₹${val.toLocaleString("en-IN")}`}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Building overview */}
          <div>
            <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3">{t("buildingOverview")}</p>
            {loading ? (
              <div className="grid grid-cols-3 gap-3">
                {[0,1,2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse bg-stone-200 dark:bg-stone-800" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <StatCard label={t("totalUnits")} value={stats.totalUnits} borderColor="border-walnut-500" icon={Building2} />
                <StatCard label={t("occupied")} value={stats.occupied} borderColor="border-forest-500" icon={Users} />
                <StatCard label={t("vacant")} value={stats.vacant} borderColor="border-ember-500" icon={DoorOpen} />
              </div>
            )}
          </div>

          {/* Rent summary */}
          <div>
            <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3">{t("thisMonthRent")}</p>
            {loading ? (
              <div className="h-40 rounded-2xl animate-pulse bg-stone-200 dark:bg-stone-800" />
            ) : (
              <div
                className="rounded-3xl p-5 space-y-4"
                style={{ background: "var(--sn-surface)", border: "1px solid var(--sn-border)" }}
              >
                {[
                  { label: t("expected"),  value: stats.totalExpected,  color: "text-stone-700 dark:text-stone-200" },
                  { label: t("collected"), value: stats.totalCollected, color: "text-forest-600 dark:text-forest-400" },
                  { label: t("pending"),   value: stats.pending,        color: "text-brick-600 dark:text-brick-400" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className={`text-base font-semibold ${row.color}`}>{row.label}</span>
                    <span className={`text-xl font-bold flex items-center gap-0.5 ${row.color}`}>
                      <IndianRupee size={16} />{row.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                <div className="bg-stone-100 dark:bg-stone-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-forest-500 dark:bg-forest-400 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm text-stone-400 text-right">{pct}% {t("collectedPct")}</p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div>
            <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3">{t("quickActions")}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { href: "/tenants/new", icon: UserPlus,     label: t("addTenant"),  bg: "bg-walnut-600 dark:bg-walnut-500",  ring: "shadow-walnut-100 dark:shadow-walnut-950" },
                { href: "/units",       icon: Building2,     label: t("viewUnits"), bg: "bg-stone-700 dark:bg-stone-600",    ring: "shadow-stone-100 dark:shadow-stone-950" },
                { href: "/history",     icon: History,       label: t("history"),   bg: "bg-forest-600 dark:bg-forest-500",  ring: "shadow-forest-100 dark:shadow-forest-950" },
                { href: "/reports",     icon: FileBarChart2, label: t("reports"),   bg: "bg-ember-600 dark:bg-ember-500",    ring: "shadow-ember-100 dark:shadow-ember-950" },
              ].map(({ href, icon: Icon, label, bg, ring }) => (
                <TouchLink
                  key={href}
                  href={href}
                  className={`${bg} rounded-3xl flex flex-col items-center justify-center gap-3 py-7 shadow-lg ${ring}`}
                >
                  <Icon size={32} className="text-white" />
                  <span className="font-bold text-white text-base">{label}</span>
                </TouchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Splitter Modal */}
        {showSplitter && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-5" style={{ background: "var(--sn-surface)" }}>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2"><Zap size={20}/> Utility Splitter</h3>
              <p className="text-sm text-stone-500">Divide a total bill equally among all active rental units.</p>
              
              <div className="flex gap-2">
                <TouchButton onClick={() => setSplitType("electricity")} className={`flex-1 py-3 rounded-2xl font-bold border ${splitType === 'electricity' ? 'bg-ember-50 border-ember-500 text-ember-700 dark:bg-ember-900/30' : 'bg-transparent border-stone-200 dark:border-stone-700 text-stone-500'}`}>Electricity</TouchButton>
                <TouchButton onClick={() => setSplitType("water")} className={`flex-1 py-3 rounded-2xl font-bold border ${splitType === 'water' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30' : 'bg-transparent border-stone-200 dark:border-stone-700 text-stone-500'}`}>Water</TouchButton>
              </div>

              <input
                type="number"
                value={splitAmt}
                onChange={e => setSplitAmt(e.target.value)}
                placeholder="Total Bill Amount (e.g. 2000)"
                className="w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-4 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500"
              />

              <div className="flex gap-3 mt-2">
                <TouchButton onClick={() => setShowSplitter(false)} className="flex-1 py-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-2xl font-bold min-h-[56px]">{t("cancel")}</TouchButton>
                <TouchButton disabled={splitting} onClick={handleSplitUtility} className="flex-1 py-4 bg-walnut-600 text-white rounded-2xl font-bold disabled:opacity-60 min-h-[56px]">{splitting ? "..." : "Split & Apply"}</TouchButton>
              </div>
            </div>
          </div>
        )}
      </PageTransition>
      <BottomNav />
    </AuthGuard>
  );
}
