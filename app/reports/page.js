"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import { getPaymentsByMonthYear, getActiveTenants, getExpensesByMonth } from "@/lib/firestore";
import { useLang } from "@/contexts/LangContext";
import { PageTransition } from "@/components/Touch";
import { FileBarChart2, IndianRupee, CheckCircle2, Clock, Zap, Droplets, TrendingUp, Hammer } from "lucide-react";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const { t } = useLang();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);

  const YEARS = [];
  for (let y = now.getFullYear(); y >= 2020; y--) YEARS.push(y);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      try {
        const [payments, tenants, expenses] = await Promise.all([
          getPaymentsByMonthYear(month, year),
          getActiveTenants(),
          getExpensesByMonth(month, year)
        ]);
        const tenantMap = {};
        tenants.forEach(t => { tenantMap[t.id] = t; });
        const rows = payments.map(p => ({ ...p, tenant: tenantMap[p.tenantId] || null }));

        const totalRentExpected  = rows.reduce((s, r) => s + (Number(r.tenant?.rentAmount)||0), 0);
        const totalRentCollected = rows.reduce((s, r) => {
          const isLegacyPaid = r.rentPaid && (r.rentPaidAmount === undefined || r.rentPaidAmount === null);
          return s + (isLegacyPaid ? Number(r.tenant?.rentAmount||0) : (Number(r.rentPaidAmount)||0));
        }, 0);
        const totalElec  = rows.reduce((s, r) => s + Number(r.electricityBill||0), 0);
        const totalWater = rows.reduce((s, r) => s + Number(r.waterBill||0), 0);
        const totalBillsPaid = rows.filter(r => r.billsPaid).reduce((s, r) => s + Number(r.electricityBill||0) + Number(r.waterBill||0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount)||0), 0);
        const netProfit = totalRentCollected - totalExpenses;

        setData({ rows, totalRentExpected, totalRentCollected,
          totalRentPending: totalRentExpected - totalRentCollected,
          totalElec, totalWater, totalBills: totalElec + totalWater, totalBillsPaid,
          totalExpenses, netProfit
        });
      } catch { toast.error(t("failedLoad")); }
      finally { setLoading(false); }
    }
    loadReport();
  }, [month, year]);

  const card = { background: "var(--sn-surface)", border: "1px solid var(--sn-border)" };
  const selectCls = "border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 min-h-[52px]";
  const sectionTitle = "text-sm font-bold text-stone-400 uppercase tracking-widest mb-3";

  return (
    <AuthGuard>
      <PageTransition className="min-h-screen pb-nav" style={{ background: "var(--sn-bg)" }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-4 sticky top-0 z-40" style={{ background: "var(--sn-surface)", borderBottom: "1px solid var(--sn-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-ember-100 dark:bg-ember-900 rounded-2xl flex items-center justify-center">
                <FileBarChart2 size={20} className="text-ember-600 dark:text-ember-400"/>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{t("reports")}</h1>
                <p className="text-stone-500 dark:text-stone-400">{t("monthlySummary")}</p>
              </div>
            </div>
            <HeaderControls />
          </div>

          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={`${selectCls} flex-1`}>
              {t("months").map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${selectCls} w-28`}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          {loading ? (
            <div className="space-y-4">
              {[0,1,2].map(i => <div key={i} className="h-32 rounded-3xl animate-pulse bg-stone-200 dark:bg-stone-800"/>)}
            </div>
          ) : !data ? null : (
            <>
              {/* Net Profit Summary */}
              <div className="rounded-3xl p-5" style={{ background: "var(--sn-surface)", border: "2px solid #059669" }}>
                <p className="text-sm font-bold text-forest-600 dark:text-forest-400 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp size={16}/> Net Profit</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-stone-500 mb-1">Total Collected - Expenses</p>
                    <span className="text-3xl font-bold text-forest-600 dark:text-forest-400 flex items-center gap-0.5"><IndianRupee size={24}/>{data.netProfit.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Rent summary */}
              <div className="rounded-3xl p-5 space-y-4" style={card}>
                <p className={sectionTitle}>{t("rentSummary")}</p>
                {[
                  { label: t("expected"),  val: data.totalRentExpected,  cls: "text-stone-700 dark:text-stone-200" },
                  { label: t("collected"), val: data.totalRentCollected, cls: "text-forest-600 dark:text-forest-400" },
                  { label: "Expenses",     val: data.totalExpenses,      cls: "text-brick-600 dark:text-brick-400", icon: Hammer },
                  { label: t("pending"),   val: data.totalRentPending,   cls: "text-amber-600 dark:text-amber-400" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className={`text-base font-semibold flex items-center gap-1 ${row.cls}`}>{row.icon && <row.icon size={14}/>}{row.label}</span>
                    <span className={`text-xl font-bold flex items-center gap-0.5 ${row.cls}`}>
                      <IndianRupee size={15}/>{row.val.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                {data.totalRentExpected > 0 && (
                  <div className="bg-stone-100 dark:bg-stone-800 rounded-full h-3 overflow-hidden mt-1">
                    <div className="h-full bg-forest-500 dark:bg-forest-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((data.totalRentCollected/data.totalRentExpected)*100)}%` }}/>
                  </div>
                )}
              </div>

              {/* Bills summary */}
              <div className="rounded-3xl p-5 space-y-4" style={card}>
                <p className={sectionTitle}>{t("utilityBills")}</p>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-base font-semibold text-ember-600 dark:text-ember-400"><Zap size={16}/>{t("electricity_short")}</span>
                  <span className="text-xl font-bold text-stone-800 dark:text-stone-200 flex items-center gap-0.5"><IndianRupee size={15}/>{data.totalElec.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-base font-semibold text-stone-500 dark:text-stone-400"><Droplets size={16}/>{t("water_short")}</span>
                  <span className="text-xl font-bold text-stone-800 dark:text-stone-200 flex items-center gap-0.5"><IndianRupee size={15}/>{data.totalWater.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-px" style={{ background: "var(--sn-border)" }}/>
                <div className="flex justify-between">
                  <span className="text-base font-bold text-stone-700 dark:text-stone-300">{t("totalBills")}</span>
                  <span className="text-xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-0.5"><IndianRupee size={15}/>{data.totalBills.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-base font-semibold text-forest-600 dark:text-forest-400"><CheckCircle2 size={16}/>{t("billsPaid")}</span>
                  <span className="text-xl font-bold text-forest-600 dark:text-forest-400 flex items-center gap-0.5"><IndianRupee size={15}/>{data.totalBillsPaid.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Per unit */}
              {data.rows.length > 0 ? (
                <div>
                  <p className={sectionTitle}>{t("perUnit")}</p>
                  <div className="space-y-3">
                    {data.rows.map(row => {
                      const rentExpected = Number(row.tenant?.rentAmount) || 0;
                      const isLegacyPaid = row.rentPaid && (row.rentPaidAmount === undefined || row.rentPaidAmount === null);
                      const rentPaid = isLegacyPaid ? rentExpected : (Number(row.rentPaidAmount) || 0);
                      const rentPending = rentExpected - rentPaid;

                      return (
                        <div key={row.id} className="rounded-3xl p-4" style={card}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-bold text-stone-900 dark:text-stone-50 text-base">{t(`unitNames.${row.unitId}`) || row.unitId}</p>
                              <p className="text-sm text-stone-500 dark:text-stone-400">{row.tenant?.name || "—"}</p>
                            </div>
                            {rentPending <= 0
                              ? <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-300"><CheckCircle2 size={11}/>{t("rentPaid")}</span>
                              : rentPaid > 0
                              ? <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-ember-100 dark:bg-ember-900 text-ember-700 dark:text-ember-300"><Clock size={11}/>Partial</span>
                              : <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brick-100 dark:bg-brick-900 text-brick-700 dark:text-brick-300"><Clock size={11}/>{t("pending")}</span>
                            }
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            {[
                              { l: t("rent"), v: `₹${rentPaid.toLocaleString("en-IN")}` },
                              { l: t("electricity_short"), v: `₹${Number(row.electricityBill||0).toLocaleString("en-IN")}` },
                              { l: t("water_short"), v: `₹${Number(row.waterBill||0).toLocaleString("en-IN")}` },
                            ].map(col => (
                              <div key={col.l} className="bg-stone-50 dark:bg-stone-800 rounded-2xl p-3">
                                <p className="text-stone-400 text-xs mb-1">{col.l}</p>
                                <p className="font-bold text-stone-800 dark:text-stone-200">{col.v}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl p-10 text-center" style={card}>
                  <p className="text-5xl mb-4">📊</p>
                  <p className="text-xl font-bold text-stone-700 dark:text-stone-300">{t("noData")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </AuthGuard>
  );
}
