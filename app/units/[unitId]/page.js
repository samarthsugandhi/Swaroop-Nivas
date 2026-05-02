"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import {
  getUnit, getTenantByUnit, getPaymentsForTenant,
  getOrCreatePayment, updateBills,
  markBillsPaid, vacateTenant, updatePayment, recordRentPayment,
  resetRentPayment, updateTenant
} from "@/lib/firestore";
import { useLang } from "@/contexts/LangContext";
import { TouchButton, TouchLink, TouchCard, PageTransition } from "@/components/Touch";
import {
  ArrowLeft, UserPlus, CheckCircle2, Clock, IndianRupee,
  Zap, Droplets, Phone, Calendar, LogOut, ChevronDown,
  ChevronUp, Save, RotateCcw, Edit3, Trash2, X
} from "lucide-react";
import toast from "react-hot-toast";

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const [y, m, d] = isoStr.split("-");
  if (!y || !m || !d) return isoStr;
  return `${d}/${m}/${y}`;
}

function PaymentCard({ payment, rentAmount, onRentPaid, onResetRent, onSaveBills, onBillsPaid, onSaveNotes, t }) {
  const [open, setOpen] = useState(false);
  const [elec, setElec] = useState(payment.electricityBill || "");
  const [water, setWater] = useState(payment.waterBill || "");
  const [payAmt, setPayAmt] = useState("");
  const [notes, setNotes] = useState(payment.notes || "");
  const [busy, setBusy] = useState(false);
  const monthName = t("months")[payment.month - 1];

  const inputCls = "w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 min-h-[52px]";
  const legacyFullPaid = payment.rentPaid && (payment.rentPaidAmount === undefined || payment.rentPaidAmount === null);
  const rentPaidAmt = legacyFullPaid ? Number(rentAmount) : (Number(payment.rentPaidAmount) || 0);
  const rentExpected = Number(rentAmount) || 0;
  const rentPending = rentExpected - rentPaidAmt;
  const progress = rentExpected > 0 ? Math.min(100, Math.round((rentPaidAmt / rentExpected) * 100)) : 0;

  return (
    <TouchCard className="rounded-3xl overflow-hidden" style={{ background: "var(--sn-surface)", border: "1px solid var(--sn-border)" }}>
      <div className="flex items-center justify-between p-4" onClick={() => setOpen(v => !v)}>
        <div>
          <p className="font-bold text-stone-900 dark:text-stone-50 text-lg">{monthName} {payment.year}</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {rentPending <= 0
              ? <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-300"><CheckCircle2 size={11}/>{t("rentPaid")}</span>
              : rentPaidAmt > 0
              ? <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-ember-100 dark:bg-ember-900 text-ember-700 dark:text-ember-300"><Clock size={11}/>Partial</span>
              : <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brick-100 dark:bg-brick-900 text-brick-700 dark:text-brick-300"><Clock size={11}/>{t("rentPending")}</span>
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-stone-700 dark:text-stone-300 flex items-center gap-0.5">
                <IndianRupee size={16}/>{rentExpected.toLocaleString("en-IN")}
              </span>
              <span className="text-sm font-medium text-stone-500">
                ₹{rentPaidAmt.toLocaleString("en-IN")} Paid • ₹{Math.max(0, rentPending).toLocaleString("en-IN")} Pending
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="bg-stone-100 dark:bg-stone-800 rounded-full h-2 mb-4 overflow-hidden">
              <div className="h-full bg-forest-500 dark:bg-forest-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            {rentPending > 0 && (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={payAmt}
                  onChange={e => setPayAmt(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder={`Amount (e.g. ${rentPending})`}
                />
                <TouchButton
                  disabled={busy || !payAmt}
                  onClick={async () => {
                    setBusy(true);
                    await onRentPaid(payment, payAmt);
                    setPayAmt("");
                    setBusy(false);
                  }}
                  className="px-5 py-3 bg-forest-600 dark:bg-forest-500 text-white rounded-2xl text-base font-bold disabled:opacity-50 min-h-[52px]"
                >Pay</TouchButton>
              </div>
            )}
            {rentPending <= 0 && payment.rentPaidDate && (
              <p className="text-sm text-forest-600 dark:text-forest-400 font-semibold">{t("paidOn")} {formatDate(payment.rentPaidDate)}</p>
            )}

            {rentPaidAmt > 0 && (
              <TouchButton
                disabled={busy}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm("Reset this month's payment to ₹0?")) {
                    setBusy(true);
                    await onResetRent(payment.id);
                    setBusy(false);
                  }
                }}
                className="mt-2 flex items-center gap-1.5 text-stone-400 hover:text-brick-500 text-sm font-medium transition-colors"
              >
                <RotateCcw size={14}/> Clear Payment
              </TouchButton>
            )}
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

          {/* Monthly Notes */}
          <div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">{t("maintenanceNotes")} (This Month)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Broken tap, leaky roof..."
            />
            <TouchButton
              disabled={busy}
              onClick={async () => { setBusy(true); await onSaveNotes(payment.id, notes); setBusy(false); }}
              className="mt-2 w-full py-3 bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-2xl text-base font-bold disabled:opacity-50 min-h-[52px]"
            >Save Notes</TouchButton>
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
  const [loading, setLoading] = useState(true);
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().split("T")[0]);
  const [vacating, setVacating] = useState(false);
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [editData, setEditData] = useState({ name: "", phone: "", rentAmount: "", advance: "", moveInDate: "" });
  const now = new Date();

  async function loadData() {
    try {
      const [u, ten] = await Promise.all([getUnit(unitId), getTenantByUnit(unitId)]);
      setUnit(u); setTenant(ten);
      if (ten) {
        setEditData({
          name: ten.name,
          phone: ten.phone,
          rentAmount: ten.rentAmount,
          advance: ten.advance || 0,
          moveInDate: ten.moveInDate || ""
        });
        const APP_START = new Date("2026-01-01");
        const moveIn = new Date(ten.moveInDate || APP_START);
        
        let startYear = moveIn.getFullYear();
        let startMonth = moveIn.getMonth() + 1;
        if (startYear < 2026) {
          startYear = 2026;
          startMonth = 1;
        }

        const endYear = now.getFullYear();
        const endMonth = now.getMonth() + 1;

        let currY = startYear;
        let currM = startMonth;
        
        while (currY < endYear || (currY === endYear && currM <= endMonth)) {
          await getOrCreatePayment(ten.id, unitId, currM, currY);
          currM++;
          if (currM > 12) {
            currM = 1;
            currY++;
          }
        }

        const all = await getPaymentsForTenant(ten.id);
        
        // Deduplicate: If multiple records exist for same month/year, pick the Paid one or the first one
        const uniquePayments = [];
        const seen = new Set();
        
        // Sort: prioritize Paid records so they are picked first in deduplication
        const sortedForDedupe = [...all].sort((a, b) => (b.rentPaid ? 1 : 0) - (a.rentPaid ? 1 : 0));
        
        for (const p of sortedForDedupe) {
          const key = `${p.month}-${p.year}`;
          if (!seen.has(key)) {
            uniquePayments.push(p);
            seen.add(key);
          }
        }

        // Final sort for display (Newest first)
        uniquePayments.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
        setPayments(uniquePayments);
      }
    } catch { toast.error(t("failedLoad")); }
    finally { setLoading(false); }
  }

  async function handleResetRent(paymentId) {
    try {
      await resetRentPayment(paymentId);
      toast.success("Payment reset");
      await loadData();
    } catch { toast.error("Reset failed"); }
  }

  async function handleUpdateTenant(e) {
    e.preventDefault();
    try {
      await updateTenant(tenant.id, {
        ...editData,
        rentAmount: Number(editData.rentAmount),
        advance: Number(editData.advance)
      });
      toast.success("Tenant updated");
      setShowEditTenantModal(false);
      await loadData();
    } catch { toast.error("Update failed"); }
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

  // Running balance
  const totalExpected = payments.reduce((s, p) => s + (tenant ? Number(tenant.rentAmount) || 0 : 0), 0);
  const totalPaid     = payments.reduce((s, p) => {
    const isLegacyPaid = p.rentPaid && (p.rentPaidAmount === undefined || p.rentPaidAmount === null);
    return s + (isLegacyPaid ? Number(tenant?.rentAmount || 0) : (Number(p.rentPaidAmount) || 0));
  }, 0);

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
                <div className="flex items-center justify-between mb-1">
                  <p className={sectionTitle}>{t("tenantDetails")}</p>
                  <TouchButton onClick={() => setShowEditTenantModal(true)} className="p-2 text-walnut-600 dark:text-walnut-400">
                    <Edit3 size={18}/>
                  </TouchButton>
                </div>
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
                    { label: t("moveIn"),  value: formatDate(tenant.moveInDate), icon: <Calendar size={13}/> },
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
                      onRentPaid={async (pmt, amt) => { 
                        await recordRentPayment(tenant.id, unitId, Number(amt), pmt.month, pmt.year, tenant.rentAmount);
                        toast.success("Payment recorded"); 
                        await loadData(); 
                      }}
                      onResetRent={handleResetRent}
                      onSaveBills={async (id, e, w) => { await updateBills(id, e||0, w||0); toast.success(t("billsSaved")); await loadData(); }}
                      onBillsPaid={async id => { await markBillsPaid(id); toast.success(t("billsMarkedPaid")); await loadData(); }}
                      onSaveNotes={async (id, n) => { await updatePayment(id, { notes: n }); toast.success("Notes saved"); await loadData(); }}
                    />
                  ))}
                </div>
              </div>
            </>
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

        {/* Edit Tenant Modal */}
        {showEditTenantModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-5 animate-slide-up" style={{ background: "var(--sn-surface)" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50">Edit Tenant</h3>
                <TouchButton onClick={() => setShowEditTenantModal(false)} className="p-2 text-stone-400">
                  <X size={24}/>
                </TouchButton>
              </div>
              
              <form onSubmit={handleUpdateTenant} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                <div>
                  <label className="block text-sm font-semibold text-stone-500 mb-1.5">{t("fullName")}</label>
                  <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-500 mb-1.5">{t("phoneNumber")}</label>
                  <input type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-stone-500 mb-1.5">Rent (₹)</label>
                    <input type="number" value={editData.rentAmount} onChange={e => setEditData({...editData, rentAmount: e.target.value})} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-500 mb-1.5">Advance (₹)</label>
                    <input type="number" value={editData.advance} onChange={e => setEditData({...editData, advance: e.target.value})} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-500 mb-1.5">{t("moveInDate")}</label>
                  <input type="date" value={editData.moveInDate} onChange={e => setEditData({...editData, moveInDate: e.target.value})} className={inputCls} />
                </div>

                <div className="flex gap-3 pt-2">
                  <TouchButton type="button" onClick={() => setShowEditTenantModal(false)} className="flex-1 py-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-2xl font-bold">{t("cancel")}</TouchButton>
                  <TouchButton type="submit" className="flex-1 py-4 bg-walnut-600 text-white rounded-2xl font-bold">{t("save")}</TouchButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageTransition>
      <BottomNav />
    </AuthGuard>
  );
}
