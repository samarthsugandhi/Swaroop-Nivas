"use client";
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import { addTenant } from "@/lib/firestore";
import { useLang } from "@/contexts/LangContext";
import { TouchButton, PageTransition } from "@/components/Touch";
import { ArrowLeft, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

const UNIT_OPTIONS = [
  { id: "shop",   label_en: "Shop",           label_kn: "ಅಂಗಡಿ" },
  { id: "1bhk-1", label_en: "1BHK-1 (First)", label_kn: "1BHK-1 (ಮೊದಲ)" },
  { id: "1bhk-2", label_en: "1BHK-2 (Mid)",   label_kn: "1BHK-2 (ಮಧ್ಯ)" },
  { id: "2bhk",   label_en: "2BHK",            label_kn: "2BHK" },
  { id: "1bhk-3", label_en: "1BHK-3 (Top)",   label_kn: "1BHK-3 (ಮೇಲು)" },
];

function AddTenantForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useLang();

  const [form, setForm] = useState({
    name: "", phone: "", idProof: "", unitId: searchParams.get("unit") || "",
    rentAmount: "", advance: "", moveInDate: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())  return toast.error(t("fullName"));
    if (!form.phone.trim()) return toast.error(t("phoneNumber"));
    if (!form.unitId)       return toast.error(t("assignUnit"));
    if (!form.rentAmount)   return toast.error(t("monthlyRent"));

    setLoading(true);
    try {
      const tenantId = await addTenant({
        name: form.name.trim(), phone: form.phone.trim(),
        idProof: form.idProof.trim(),
        unitId: form.unitId,
        rentAmount: Number(form.rentAmount),
        advance: Number(form.advance || 0),
        moveInDate: form.moveInDate,
      });

      toast.success(`${form.name} ${t("tenantAdded")}`);
      router.push(`/units/${form.unitId}`);
    } catch (err) {
      console.error(err);
      toast.error(t("failedSave"));
    } finally { setLoading(false); }
  }

  const inputCls = "w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-4 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 placeholder:text-stone-400 transition min-h-[56px]";
  const labelCls = "block text-base font-semibold text-stone-600 dark:text-stone-400 mb-2";
  const card = { background: "var(--sn-surface)", border: "1px solid var(--sn-border)" };
  const sectionTitle = "text-sm font-bold text-stone-400 uppercase tracking-widest mb-4";

  return (
    <PageTransition className="min-h-screen pb-nav" style={{ background: "var(--sn-bg)" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: "var(--sn-surface)", borderBottom: "1px solid var(--sn-border)" }}>
        <div className="flex items-center gap-3">
          <TouchButton onClick={() => router.back()} className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 min-h-[48px] min-w-[48px] flex items-center justify-center">
            <ArrowLeft size={22} className="text-stone-700 dark:text-stone-300"/>
          </TouchButton>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{t("addTenant")}</h1>
            <p className="text-stone-500 dark:text-stone-400">{t("personalInfo")}</p>
          </div>
          <HeaderControls />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5">
        {/* Personal Info */}
        <div className="rounded-3xl p-5 space-y-5" style={card}>
          <p className={sectionTitle}>{t("personalInfo")}</p>
          <div>
            <label className={labelCls}>{t("fullName")}</label>
            <input type="text" className={inputCls} placeholder={t("enterName")} value={form.name} onChange={e => set("name", e.target.value)}/>
          </div>
          <div>
            <label className={labelCls}>{t("phoneNumber")}</label>
            <input type="tel" className={inputCls} placeholder={t("enterPhone")} value={form.phone} onChange={e => set("phone", e.target.value)}/>
          </div>
          <div>
            <label className={labelCls}>{t("idProofNote")}</label>
            <input type="text" className={inputCls} placeholder={t("idProofNotePh")} value={form.idProof} onChange={e => set("idProof", e.target.value)}/>
          </div>
        </div>

        {/* Unit & Rent */}
        <div className="rounded-3xl p-5 space-y-5" style={card}>
          <p className={sectionTitle}>{t("unitAndRent")}</p>
          <div>
            <label className={labelCls}>{t("assignUnit")}</label>
            <select className={inputCls} value={form.unitId} onChange={e => set("unitId", e.target.value)}>
              <option value="">{t("selectUnit")}</option>
              {UNIT_OPTIONS.map(u => (
                <option key={u.id} value={u.id}>{lang === "kn" ? u.label_kn : u.label_en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t("monthlyRent")}</label>
            <input type="number" className={inputCls} placeholder={t("enterRent")} value={form.rentAmount} onChange={e => set("rentAmount", e.target.value)}/>
          </div>
          <div>
            <label className={labelCls}>{t("advancePaid")}</label>
            <input type="number" className={inputCls} placeholder={t("enterAdvance")} value={form.advance} onChange={e => set("advance", e.target.value)}/>
          </div>
          <div>
            <label className={labelCls}>{t("moveInDate")}</label>
            <input type="date" className={inputCls} value={form.moveInDate} onChange={e => set("moveInDate", e.target.value)}/>
          </div>
        </div>

        <TouchButton
          type="submit"
          disabled={loading}
          className="w-full bg-walnut-600 dark:bg-walnut-500 text-white py-5 rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 min-h-[64px]"
        >
          {loading
            ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            : <><UserPlus size={22}/>{t("addTenant")}</>}
        </TouchButton>
      </form>
    </PageTransition>
  );
}

export default function AddTenantPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{ background: "var(--sn-bg)" }}><div className="w-10 h-10 border-4 border-walnut-600 border-t-transparent rounded-full animate-spin"/></div>}>
        <AddTenantForm />
      </Suspense>
      <BottomNav />
    </AuthGuard>
  );
}
