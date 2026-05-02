"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import { getUnits, getActiveTenants, getPaymentsByMonthYear } from "@/lib/firestore";
import { useLang } from "@/contexts/LangContext";
import { CheckCircle2, Clock, ChevronRight, IndianRupee, Phone } from "lucide-react";
import toast from "react-hot-toast";

export default function UnitsPage() {
  const { t } = useLang();
  const now = new Date();
  const [units, setUnits]       = useState([]);
  const [tenantMap, setTenantMap] = useState({});
  const [paymentMap, setPaymentMap] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [allUnits, tenants, payments] = await Promise.all([
          getUnits(),
          getActiveTenants(),
          getPaymentsByMonthYear(now.getMonth() + 1, now.getFullYear()),
        ]);
        const tm = {}; tenants.forEach(t => { tm[t.unitId] = t; });
        const pm = {}; payments.forEach(p => { pm[p.tenantId] = p; });
        setUnits(allUnits); setTenantMap(tm); setPaymentMap(pm);
      } catch { toast.error(t("failedLoad")); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen pb-nav" style={{ background: "var(--sn-bg)" }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-4 sticky top-0 z-40" style={{ background: "var(--sn-surface)", borderBottom: "1px solid var(--sn-border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{t("allUnits")}</h1>
              <p className="text-stone-500 dark:text-stone-400 text-base">{t("allRentalUnits")}</p>
            </div>
            <HeaderControls />
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          {loading
            ? [0,1,2,3,4,5].map(i => <div key={i} className="h-28 rounded-3xl animate-pulse bg-stone-200 dark:bg-stone-800" />)
            : units.map(unit => {
                const tenant  = tenantMap[unit.id];
                const payment = tenant ? paymentMap[tenant.id] : null;
                const isOwner = unit.isOwnerUnit;
                const isVacant = !tenant && !isOwner;
                const isPaid  = payment?.rentPaid;

                return (
                  <Link
                    key={unit.id}
                    href={`/units/${unit.id}`}
                    className="flex items-center gap-4 p-4 rounded-3xl active:scale-[0.98] transition-transform"
                    style={{ background: "var(--sn-surface)", border: "1px solid var(--sn-border)" }}
                  >
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${isOwner ? "bg-stone-100 dark:bg-stone-800" : isVacant ? "bg-walnut-100 dark:bg-walnut-900" : "bg-forest-50 dark:bg-forest-900"}`}>
                      {unit.icon || "🏠"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-stone-900 dark:text-stone-50 text-lg">{t(`unitNames.${unit.id}`) || unit.name}</span>
                        {isOwner ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">Owner</span>
                        ) : isVacant ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-walnut-100 dark:bg-walnut-900 text-walnut-700 dark:text-walnut-300">{t("vacant")}</span>
                        ) : isPaid ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-300"><CheckCircle2 size={12}/>{t("rentPaid")}</span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-ember-100 dark:bg-ember-900 text-ember-700 dark:text-ember-300"><Clock size={12}/>{t("pending")}</span>
                        )}
                      </div>

                      {isOwner ? (
                        <p className="text-stone-500 dark:text-stone-400 text-sm">{t("ownerResidence")}</p>
                      ) : (
                        <>
                          <p className="text-stone-500 dark:text-stone-400 text-sm truncate">{tenant?.name || t("noTenant")}</p>
                          {tenant && (
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-base font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-0.5">
                                <IndianRupee size={14}/>{Number(tenant.rentAmount).toLocaleString("en-IN")}{t("perMonth")}
                              </p>
                              {tenant.phone && (
                                <a
                                  href={`tel:${tenant.phone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 text-walnut-600 dark:text-walnut-400 text-sm font-medium"
                                >
                                  <Phone size={13}/>{tenant.phone}
                                </a>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <ChevronRight size={22} className="text-stone-300 dark:text-stone-600 flex-shrink-0" />
                  </Link>
                );
              })}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
