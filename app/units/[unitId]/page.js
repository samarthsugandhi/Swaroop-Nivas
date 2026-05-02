"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import {
  getUnit, getTenantByUnit, getPaymentsForTenant,
  getOrCreatePayment, markRentPaid, updateBills,
  markBillsPaid, vacateTenant, updateUnitNotes,
} from "@/lib/firestore";
import { useLang } from "@/contexts/LangContext";
import { TouchButton, TouchLink, TouchCard, PageTransition } from "@/components/Touch";
import {
  ArrowLeft, UserPlus, CheckCircle2, Clock, IndianRupee,
  Zap, Droplets, Phone, Calendar, LogOut, ChevronDown,
  ChevronUp, Save,
} from "lucide-react";
import toast from "react-hot-toast";

function PaymentCard({ payment, rentAmount, onRentPaid, onSaveBills, onBillsPaid, t }) {
  const [open, setOpen] = useState(false);
  const [elec, setElec] = useState(payment.electricityBill || "");
  const [water, setWater] = useState(payment.waterBill || "");
  const [busy, setBusy] = useState(false);
  const monthName = t("months")[payment.month - 1];

  const inputCls = "w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 min-h-[52px]";

  return (
    <TouchCard className="rounded-3xl overflow-hidden" style={{ background: "var(--sn-surface)", border: "1px solid var(--sn-border)" }}>
      <div className="flex items-center justify-between p-4" onClick={() => setOpen(v => !v)}>
        <div>
          <p className="font-bold text-stone-900 dark:text-stone-50 text-lg">{monthName} {payment.year}</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {payment.rentPaid
              ? <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-300"><CheckCircle2 size={11}/>{t("rentPaid")}</span>
              : <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-ember-100 dark:bg-ember-900 text-ember-700 dark:text-ember-300"><Clock size={11}/>{t("rentPending")}</span>
            }
            {(payment.electricityBill > 0 || payment.waterBill > 0) && (
              payment.billsPaid
                ? <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-300">{t("billsPaid")}</span>
                : <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brick-100 dark:bg-brick-900 text-brick-700 dark:text-brick-300">{t("billsDue")}</span>
            )}
          </div>
        </div>
        <div className="text-stone-400">
          {open ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
        </div>
      </div>

      {open && (
        <div className="border-t space-y-5 p-4" style={{ borderColor: "var(--sn-border)" }}>
          {/* Rent */}
          <div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">{t("rent")}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-stone-700 dark:text-stone-300 flex items-center gap-0.5">
                <IndianRupee size={16}/>{Number(rentAmount).toLocaleString("en-IN")}
              </span>
              {payment.rentPaid
                ? <span className="text-sm text-forest-600 dark:text-forest-400 font-semibold">{t("paidOn")} {payment.rentPaidDate}</span>
                : <TouchButton
                    disabled={busy}
                    onClick={async () => { setBusy(true); await onRentPaid(payment.id); setBusy(false); }}
                    className="px-5 py-3 bg-forest-600 dark:bg-forest-500 text-white rounded-2xl text-base font-bold disabled:opacity-50 min-h-[52px]"
                  >{t("markPaid")}</TouchButton>
              }
            </div>
          </div>

          {/* Bills */}
          <div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">{t("utilityBills")}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-1 mb-1.5 font-medium">
                  <Zap size={14} className="text-ember-500"/>{t("electricity")}
                </label>
                <input type="number" value={elec} onChange={e => setElec(e.target.value)} className={inputCls} placeholder="0"/>
              </div>
              <div>
                <label className="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-1 mb-1.5 font-medium">
                  <Droplets size={14} className="text-stone-400"/>{t("water")}
                </label>
                <input type="number" value={water} onChange={e => setWater(e.target.value)} className={inputCls} placeholder="0"/>
              </div>
            </div>
            <div className="flex gap-2">
              <TouchButton
                disabled={busy}
                onClick={async () => { setBusy(true); await onSaveBills(payment.id, elec, water); setBusy(false); }}
                className="flex-1 py-3 bg-walnut-600 dark:bg-walnut-500 text-white rounded-2xl text-base font-bold disabled:opacity-50 min-h-[52px]"
              >{t("saveBills")}</TouchButton>
              {!payment.billsPaid && (payment.electricityBill > 0 || payment.waterBill > 0) && (
                <TouchButton
                  disabled={busy}
                  onClick={async () => { setBusy(true); await onBillsPaid(payment.id); setBusy(false); }}
                  className="flex-1 py-3 bg-forest-600 dark:bg-forest-500 text-white rounded-2xl text-base font-bold disabled:opacity-50 min-h-[52px]"
                >{t("billsPaid")}</TouchButton>
              )}
            </div>
          </div>
        </div>
      )}
    </TouchCard>
  );
}

export default function UnitDetailPage() {
  const { unitId } = useParams();
  const router = useRouter();
  const { t } = useLang();

  const [unit, setUnit]       = useState(null);
  const [tenant, setTenant]   = useState(null);
  const [payments, setPayments] = useState([]);
  const [notes, setNotes]     = useState("");
  const [loading, setLoading] = useState(true);
  const [vacating, setVacating] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().split("T")[0]);
  const now = new Date();

  async function loadData() {
    try {
      const [u, ten] = await Promise.all([getUnit(unitId), getTenantByUnit(unitId)]);
      setUnit(u); setTenant(ten); setNotes(u?.notes || "");
      if (ten) {
        await getOrCreatePayment(ten.id, unitId, now.getMonth() + 1, now.getFullYear());
        const all = await getPaymentsForTenant(ten.id);
        all.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
        setPayments(all);
      }
    } catch { toast.error(t("failedLoad")); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [unitId]);

  async function handleVacate() {
    setVacating(true);
    try {
      await vacateTenant(tenant.id, unitId, vacateDate);
      toast.success(t("unitVacated"));
      setShowVacateModal(false);
      router.push("/units");
    } catch { toast.error(t("failedSave")); }
    finally { setVacating(false); }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try { await updateUnitNotes(unitId, notes); toast.success(t("notesSaved")); }
    catch { toast.error(t("failedSave")); }
    finally { setSavingNotes(false); }
  }

  // Running balance
  const totalExpected = payments.reduce((s, p) => s + (tenant ? Number(tenant.rentAmount) || 0 : 0), 0);
  const totalPaid     = payments.filter(p => p.rentPaid).reduce((s, p) => s + (Number(tenant?.rentAmount) || 0), 0);

  const inputCls = "w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-4 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 min-h-[56px]";
  const sectionTitle = "text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3";
  const card = { background: "var(--sn-surface)", border: "1px solid var(--sn-border)" };

  if (loading) return (
    <AuthGuard>
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--sn-bg)" }}>
        <div className="w-10 h-10 border-4 border-walnut-600 border-t-transparent rounded-full animate-spin"/>
      </div>
      <BottomNav />
    </AuthGuard>
  );

  const isOwner  = unit?.isOwnerUnit;
  const isVacant = !tenant && !isOwner;

  return (
    <AuthGuard>
      <PageTransition className="min-h-screen pb-nav" style={{ background: "var(--sn-bg)" }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-4" style={{ background: "var(--sn-surface)", borderBottom: "1px solid var(--sn-border)" }}>
          <div className="flex items-center gap-3">
            <TouchButton onClick={() => router.back()} className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 min-h-[48px] min-w-[48px] flex items-center justify-center">
              <ArrowLeft size={22} className="text-stone-700 dark:text-stone-300"/>
            </TouchButton>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{unit?.icon}</span>
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{t(`unitNames.${unit?.id}`) || unit?.name}</h1>
              </div>
              <p className="text-stone-500 dark:text-stone-400">{isOwner ? t("ownerResidence") : isVacant ? t("vacant") : tenant?.name}</p>
            </div>
            <HeaderControls />
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Owner unit */}
          {isOwner && (
            <div className="rounded-3xl p-6 text-center" style={card}>
              <p className="text-4xl mb-3">🏡</p>
              <p className="text-xl font-bold text-stone-700 dark:text-stone-300">{t("ownerResidence")}</p>
              <p className="text-stone-500 dark:text-stone-400 mt-2">{t("noRentTracking")}</p>
            </div>
          )}

          {/* Vacant */}
          {isVacant && (
            <div className="rounded-3xl p-8 text-center space-y-4" style={card}>
              <p className="text-5xl">🏠</p>
              <p className="text-xl font-bold text-stone-700 dark:text-stone-300">{t("unitVacant")}</p>
              <TouchLink href={`/tenants/new?unit=${unitId}`}
                className="inline-flex items-center justify-center gap-2 bg-walnut-600 dark:bg-walnut-500 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-lg min-h-[56px]"
              >
                <UserPlus size={22}/>{t("addTenantBtn")}
              </TouchLink>
            </div>
          )}

          {/* Tenant info */}
          {!isOwner && tenant && (
            <>
              <div className="rounded-3xl p-5 space-y-4" style={card}>
                <p className={sectionTitle}>{t("tenantDetails")}</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-walnut-100 dark:bg-walnut-900 rounded-2xl flex items-center justify-center text-2xl font-bold text-walnut-700 dark:text-walnut-300 flex-shrink-0">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-stone-900 dark:text-stone-50">{tenant.name}</p>
                    <a href={`tel:${tenant.phone}`} className="text-base text-walnut-600 dark:text-walnut-400 flex items-center gap-1 font-medium mt-0.5">
                      <Phone size={15}/>{tenant.phone}
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("rent"),    value: `₹${Number(tenant.rentAmount).toLocaleString("en-IN")}` },
                    { label: t("advance"), value: `₹${Number(tenant.advance||0).toLocaleString("en-IN")}` },
                    { label: t("moveIn"),  value: tenant.moveInDate, icon: <Calendar size={13}/> },
                    { label: t("idProof"), value: tenant.idProof || "—" },
                  ].map(row => (
                    <div key={row.label} className="bg-stone-50 dark:bg-stone-800 rounded-2xl p-3">
                      <p className="text-xs text-stone-400 dark:text-stone-500 font-medium mb-1">{row.label}</p>
                      <p className="font-bold text-stone-800 dark:text-stone-200 text-base flex items-center gap-1">
                        {row.icon}{row.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Running balance */}
                <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t("runningBalance")}</p>
                  <div className="flex justify-between"><span className="text-sm text-stone-500">{t("totalExpected")}</span><span className="font-bold text-stone-700 dark:text-stone-300">₹{totalExpected.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-forest-600 dark:text-forest-400 font-medium">{t("totalPaid")}</span><span className="font-bold text-forest-600 dark:text-forest-400">₹{totalPaid.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between border-t border-stone-200 dark:border-stone-700 pt-2"><span className="text-sm text-brick-600 dark:text-brick-400 font-medium">{t("pending")}</span><span className="font-bold text-brick-600 dark:text-brick-400">₹{(totalExpected - totalPaid).toLocaleString("en-IN")}</span></div>
                </div>

                <div className="flex gap-3 mt-4">
                  <TouchLink href={`/tenants/new?unit=${unitId}`}
                    className="flex-1 py-3.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-2xl text-base font-bold text-center min-h-[52px] flex items-center justify-center"
                  >{t("changeTenant")}</TouchLink>
                  <TouchButton
                    onClick={() => setShowVacateModal(true)}
                    className="flex-1 py-3.5 bg-brick-50 dark:bg-brick-900 text-brick-700 dark:text-brick-300 rounded-2xl text-base font-bold flex items-center justify-center gap-2 min-h-[52px]"
                  >
                    <LogOut size={16}/>{t("vacate")}
                  </TouchButton>
                </div>
              </div>

              {/* Monthly Payments */}
              <div>
                <p className={sectionTitle}>{t("monthlyPayments")}</p>
                <div className="space-y-3">
                  {payments.map(p => (
                    <PaymentCard
                      key={p.id} payment={p} rentAmount={tenant.rentAmount} t={t}
                      onRentPaid={async id => { await markRentPaid(id); toast.success(t("rentMarkedPaid")); await loadData(); }}
                      onSaveBills={async (id, e, w) => { await updateBills(id, e||0, w||0); toast.success(t("billsSaved")); await loadData(); }}
                      onBillsPaid={async id => { await markBillsPaid(id); toast.success(t("billsMarkedPaid")); await loadData(); }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes section (all non-owner units) */}
          {!isOwner && (
            <div className="rounded-3xl p-5" style={card}>
              <p className={sectionTitle}>{t("maintenanceNotes")}</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder={t("notesPlaceholder")}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 resize-none"
              />
              <TouchButton
                disabled={savingNotes}
                onClick={handleSaveNotes}
                className="mt-3 w-full py-3.5 bg-walnut-600 dark:bg-walnut-500 text-white rounded-2xl text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60 min-h-[52px]"
              >
                <Save size={18}/>{t("saveNotes")}
              </TouchButton>
            </div>
          )}
        </div>

        {/* Vacate modal */}
        {showVacateModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-5" style={{ background: "var(--sn-surface)" }}>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50">{t("confirmVacate")}</h3>
              <div>
                <label className="block text-base font-semibold text-stone-600 dark:text-stone-400 mb-2">{t("vacateDate")}</label>
                <input
                  type="date"
                  value={vacateDate}
                  onChange={e => setVacateDate(e.target.value)}
                  className="w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-4 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 min-h-[56px]"
                />
              </div>
              <div className="flex gap-3">
                <TouchButton onClick={() => setShowVacateModal(false)} className="flex-1 py-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-2xl text-base font-bold min-h-[56px]">{t("cancel")}</TouchButton>
                <TouchButton
                  disabled={vacating}
                  onClick={handleVacate}
                  className="flex-1 py-4 bg-brick-600 text-white rounded-2xl text-base font-bold disabled:opacity-60 min-h-[56px]"
                >{vacating ? "..." : t("vacate")}</TouchButton>
              </div>
            </div>
          </div>
        )}
      </PageTransition>
      <BottomNav />
    </AuthGuard>
  );
}
