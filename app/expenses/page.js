"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import HeaderControls from "@/components/HeaderControls";
import { addExpense, getExpensesByMonth, deleteExpense } from "@/lib/firestore";
import { useLang } from "@/contexts/LangContext";
import { PageTransition, TouchButton } from "@/components/Touch";
import { IndianRupee, Hammer, Plus, Calendar, ArrowLeft, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const [y, m, d] = isoStr.split("-");
  if (!y || !m || !d) return isoStr;
  return `${d}/${m}/${y}`;
}

export default function ExpensesPage() {
  const { t } = useLang();
  const router = useRouter();
  const now = new Date();
  
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [busy, setBusy] = useState(false);

  const YEARS = [];
  for (let y = now.getFullYear(); y >= 2020; y--) YEARS.push(y);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getExpensesByMonth(month, year);
      // Sort by date descending
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(data);
    } catch {
      toast.error(t("failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [month, year]);

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!desc || !amount || isNaN(amount) || amount <= 0) return toast.error("Enter valid details");
    setBusy(true);
    try {
      const expenseDate = new Date(date);
      await addExpense({
        description: desc,
        amount: Number(amount),
        date: date,
        month: expenseDate.getMonth() + 1,
        year: expenseDate.getFullYear()
      });
      toast.success("Expense logged");
      setShowForm(false);
      setDesc("");
      setAmount("");
      // If the expense was added for the currently viewed month, reload
      if (expenseDate.getMonth() + 1 === month && expenseDate.getFullYear() === year) {
        await loadData();
      }
    } catch {
      toast.error("Failed to add expense");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const selectCls = "border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 min-h-[52px]";
  const inputCls = "w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-4 text-base bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-walnut-500 min-h-[56px]";

  const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <AuthGuard>
      <PageTransition className="min-h-screen pb-nav" style={{ background: "var(--sn-bg)" }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-4 sticky top-0 z-40" style={{ background: "var(--sn-surface)", borderBottom: "1px solid var(--sn-border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <TouchButton onClick={() => router.push("/dashboard")} className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 min-h-[48px] min-w-[48px] flex items-center justify-center">
              <ArrowLeft size={22} className="text-stone-700 dark:text-stone-300"/>
            </TouchButton>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2"><Hammer size={22}/> Building Expenses</h1>
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
          <TouchButton onClick={() => setShowForm(true)} className="w-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg min-h-[56px]">
            <Plus size={20}/> Log New Expense
          </TouchButton>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse bg-stone-200 dark:bg-stone-800" />)}
            </div>
          ) : (
            <>
              {expenses.length > 0 && (
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-sm font-bold text-stone-400 uppercase tracking-widest">Total Spent</span>
                  <span className="text-xl font-bold text-brick-600 dark:text-brick-400 flex items-center gap-0.5"><IndianRupee size={16}/>{totalExpense.toLocaleString("en-IN")}</span>
                </div>
              )}
              
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-stone-400">No expenses logged for this month.</p>
                  </div>
                ) : (
                  expenses.map(e => (
                    <div key={e.id} className="rounded-2xl p-4 flex items-center justify-between shadow-sm" style={{ background: "var(--sn-surface)", border: "1px solid var(--sn-border)" }}>
                      <div>
                        <p className="font-bold text-stone-900 dark:text-stone-50 text-base">{e.description}</p>
                        <p className="text-sm text-stone-500 flex items-center gap-1 mt-0.5"><Calendar size={12}/>{formatDate(e.date)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-brick-600 dark:text-brick-400 flex items-center gap-0.5 text-lg">
                          <IndianRupee size={16}/>{Number(e.amount).toLocaleString("en-IN")}
                        </span>
                        <TouchButton onClick={() => handleDelete(e.id)} className="text-stone-400 hover:text-brick-500 p-2">
                          <Trash2 size={18}/>
                        </TouchButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-5" style={{ background: "var(--sn-surface)" }}>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50">Log Expense</h3>
              
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-500 mb-1.5">Description</label>
                  <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Plumbing fix for 1BHK-2" className={inputCls} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-stone-500 mb-1.5">Amount (₹)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1500" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-500 mb-1.5">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <TouchButton type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-2xl font-bold min-h-[56px]">{t("cancel")}</TouchButton>
                  <TouchButton type="submit" disabled={busy} className="flex-1 py-4 bg-walnut-600 text-white rounded-2xl font-bold disabled:opacity-60 min-h-[56px]">{busy ? "..." : "Save Expense"}</TouchButton>
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
