"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import { getPastTenants } from "@/lib/firestore";
import { useLang } from "@/contexts/LangContext";
import { ArrowLeft, Calendar, Clock, IndianRupee, Phone } from "lucide-react";
import toast from "react-hot-toast";

function getDuration(moveInDate, moveOutDate, t) {
  if (!moveInDate) return "—";
  const start = new Date(moveInDate);
  const end   = moveOutDate ? new Date(moveOutDate) : new Date();
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const days   = Math.ceil((end - start) / 86400000);
  if (months < 1)  return `${days} ${t("days")}`;
  if (months < 12) return `${months} ${t("months_unit") || "months"}`;
  return `${Math.floor(months/12)}y ${months%12}m`;
}

export default function HistoryPage() {
  const { t } = useLang();
  const router = useRouter();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPastTenants();
        data.sort((a, b) => {
          const da = a.moveOutDate ? new Date(a.moveOutDate) : new Date(0);
          const db = b.moveOutDate ? new Date(b.moveOutDate) : new Date(0);
          return db - da;
        });
        setTenants(data);
      } catch { toast.error(t("failedLoad")); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const card = { background: "var(--sn-surface)", border: "1px solid var(--sn-border)" };

  return (
    <AuthGuard>
      <div className="min-h-screen pb-nav" style={{ background: "var(--sn-bg)" }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-4" style={{ background: "var(--sn-surface)", borderBottom: "1px solid var(--sn-border)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 min-h-[48px] min-w-[48px] flex items-center justify-center active:scale-95 transition">
              <ArrowLeft size={22} className="text-stone-700 dark:text-stone-300"/>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{t("tenantHistory")}</h1>
              <p className="text-stone-500 dark:text-stone-400">{t("allPastTenants")}</p>
            </div>
            <HeaderControls />
          </div>
        </div>

        <div className="px-4 py-5">
          {loading ? (
            <div className="space-y-3">
              {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-3xl animate-pulse bg-stone-200 dark:bg-stone-800"/>)}
            </div>
          ) : tenants.length === 0 ? (
            <div className="rounded-3xl p-10 text-center" style={card}>
              <p className="text-5xl mb-4">📂</p>
              <p className="text-xl font-bold text-stone-700 dark:text-stone-300">{t("noPastTenants")}</p>
              <p className="text-stone-500 dark:text-stone-400 mt-2">{t("noPastTenantsHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map(ten => (
                <div key={ten.id} className="rounded-3xl p-5" style={card}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-xl font-bold text-stone-600 dark:text-stone-400 flex-shrink-0">
                      {ten.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-bold text-stone-900 dark:text-stone-50 text-lg truncate">{ten.name}</p>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-500 whitespace-nowrap">
                          {t(`unitNames.${ten.unitId}`) || ten.unitId}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-sm text-stone-400 mb-1">
                        <Calendar size={13}/>
                        <span>{ten.moveInDate || "—"} → {ten.moveOutDate || "present"}</span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <span className="flex items-center gap-1 text-sm font-bold text-walnut-600 dark:text-walnut-400">
                          <Clock size={13}/>{getDuration(ten.moveInDate, ten.moveOutDate, t)}
                        </span>
                        {ten.phone && (
                          <a href={`tel:${ten.phone}`} className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                            <Phone size={13}/>{ten.phone}
                          </a>
                        )}
                        {ten.rentAmount && (
                          <span className="flex items-center gap-0.5 text-sm text-stone-500 dark:text-stone-400">
                            <IndianRupee size={12}/>{Number(ten.rentAmount).toLocaleString("en-IN")}/mo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
