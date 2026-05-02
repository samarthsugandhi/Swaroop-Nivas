import {
  collection, doc, getDocs, getDoc, addDoc,
  updateDoc, query, where, setDoc, serverTimestamp, deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";

// ─── 6 UNITS SEED ────────────────────────────────────────────────────────────
const UNIT_SEEDS = [
  { id: "shop",   name: "Shop",              icon: "🏪", isOwnerUnit: false },
  { id: "house",  name: "Owner's House",     icon: "🏡", isOwnerUnit: true  },
  { id: "1bhk-1", name: "1BHK-1 (First)",   icon: "🏠", isOwnerUnit: false },
  { id: "1bhk-2", name: "1BHK-2 (Mid)",     icon: "🏠", isOwnerUnit: false },
  { id: "2bhk",   name: "2BHK",             icon: "🏘️", isOwnerUnit: false },
  { id: "1bhk-3", name: "1BHK-3 (Top)",     icon: "🏠", isOwnerUnit: false },
];

export async function seedUnitsIfNeeded() {
  for (const unit of UNIT_SEEDS) {
    const ref = doc(db, "units", unit.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: unit.name,
        icon: unit.icon,
        isOwnerUnit: unit.isOwnerUnit,
        currentTenantId: null,
      });
    }
  }
}

// ─── UNITS ───────────────────────────────────────────────────────────────────
export async function getUnits() {
  const snap = await getDocs(collection(db, "units"));
  // maintain seed order
  const order = UNIT_SEEDS.map(u => u.id);
  const units = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return units.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export async function getUnit(unitId) {
  const snap = await getDoc(doc(db, "units", unitId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateUnitTenant(unitId, tenantId) {
  await updateDoc(doc(db, "units", unitId), { currentTenantId: tenantId });
}

// (Removed updateUnitNotes, moved to payments)

// ─── TENANTS ─────────────────────────────────────────────────────────────────
export async function getActiveTenants() {
  const q = query(collection(db, "tenants"), where("isActive", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPastTenants() {
  const q = query(collection(db, "tenants"), where("isActive", "==", false));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTenant(tenantId) {
  const snap = await getDoc(doc(db, "tenants", tenantId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getTenantByUnit(unitId) {
  const q = query(
    collection(db, "tenants"),
    where("unitId", "==", unitId),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function addTenant(data) {
  // Vacate existing tenant in this unit
  const existing = await getTenantByUnit(data.unitId);
  if (existing) {
    await updateDoc(doc(db, "tenants", existing.id), {
      isActive: false,
      moveOutDate: data.vacateDate || new Date().toISOString().split("T")[0],
    });
  }
  const ref = await addDoc(collection(db, "tenants"), {
    ...data,
    isActive: true,
    moveOutDate: null,
    createdAt: serverTimestamp(),
  });
  await updateUnitTenant(data.unitId, ref.id);
  return ref.id;
}

export async function vacateTenant(tenantId, unitId, moveOutDate) {
  await updateDoc(doc(db, "tenants", tenantId), {
    isActive: false,
    moveOutDate: moveOutDate || new Date().toISOString().split("T")[0],
  });
  await updateUnitTenant(unitId, null);
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
export async function getPaymentsForTenant(tenantId) {
  const q = query(collection(db, "payments"), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPaymentByMonth(tenantId, month, year) {
  const q = query(
    collection(db, "payments"),
    where("tenantId", "==", tenantId),
    where("month", "==", month),
    where("year", "==", year)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getOrCreatePayment(tenantId, unitId, month, year) {
  const existing = await getPaymentByMonth(tenantId, month, year);
  if (existing) return existing;
  const data = {
    tenantId, unitId, month, year,
    rentPaidAmount: 0, rentPaid: false, rentPaidDate: null,
    electricityBill: 0, waterBill: 0, billsPaid: false,
    notes: "",
  };
  const ref = await addDoc(collection(db, "payments"), data);
  return { id: ref.id, ...data };
}

export async function recordRentPayment(tenantId, unitId, amount, month, year, tenantRentAmount) {
  if (amount <= 0) return;
  const payment = await getOrCreatePayment(tenantId, unitId, month, year);
  
  const currentPaid = Number(payment.rentPaidAmount) || 0;
  const rentAmt = Number(tenantRentAmount) || 0;
  const remainingNeeded = rentAmt - currentPaid;

  if (remainingNeeded > 0) {
    if (amount <= remainingNeeded) {
      const newPaid = currentPaid + amount;
      await updateDoc(doc(db, "payments", payment.id), {
        rentPaidAmount: newPaid,
        rentPaid: newPaid >= rentAmt,
        rentPaidDate: newPaid >= rentAmt ? new Date().toISOString().split("T")[0] : payment.rentPaidDate,
      });
      return;
    } else {
      await updateDoc(doc(db, "payments", payment.id), {
        rentPaidAmount: rentAmt,
        rentPaid: true,
        rentPaidDate: new Date().toISOString().split("T")[0],
      });
      amount -= remainingNeeded;
    }
  }

  // Rollover to next month
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  await recordRentPayment(tenantId, unitId, amount, nextMonth, nextYear, tenantRentAmount);
}

export async function updateBills(paymentId, electricityBill, waterBill) {
  await updateDoc(doc(db, "payments", paymentId), {
    electricityBill: Number(electricityBill),
    waterBill: Number(waterBill),
  });
}

export async function markBillsPaid(paymentId) {
  await updateDoc(doc(db, "payments", paymentId), { billsPaid: true });
}

export async function updatePayment(paymentId, data) {
  await updateDoc(doc(db, "payments", paymentId), data);
}

export async function getPaymentsByMonthYear(month, year) {
  const q = query(
    collection(db, "payments"),
    where("month", "==", month),
    where("year", "==", year)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export async function getDashboardStats(month, year) {
  const [units, activeTenants, payments] = await Promise.all([
    getUnits(),
    getActiveTenants(),
    getPaymentsByMonthYear(month, year),
  ]);
  const rentalUnits = units.filter(u => !u.isOwnerUnit);
  const occupied = activeTenants.length;
  const vacant = rentalUnits.length - occupied;

  let totalExpected = 0, totalCollected = 0;
  activeTenants.forEach(t => {
    totalExpected += Number(t.rentAmount) || 0;
    const payment = payments.find(p => p.tenantId === t.id);
    if (payment) {
      const isLegacyPaid = payment.rentPaid && (payment.rentPaidAmount === undefined || payment.rentPaidAmount === null);
      totalCollected += isLegacyPaid ? Number(t.rentAmount || 0) : (Number(payment.rentPaidAmount) || 0);
    }
  });

  return {
    totalUnits: units.length,
    rentalUnits: rentalUnits.length,
    occupied,
    vacant,
    totalExpected,
    totalCollected,
    pending: totalExpected - totalCollected,
  };
}

export async function getYearlyStats(year) {
  const [paymentsSnap, tenantsSnap] = await Promise.all([
    getDocs(query(collection(db, "payments"), where("year", "==", year))),
    getDocs(collection(db, "tenants"))
  ]);
  const payments = paymentsSnap.docs.map(d => d.data());
  const tenants = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const monthly = Array(12).fill(0);
  payments.forEach(p => {
    const isLegacyPaid = p.rentPaid && (p.rentPaidAmount === undefined || p.rentPaidAmount === null);
    if (isLegacyPaid) {
      const t = tenants.find(t => t.id === p.tenantId);
      monthly[p.month - 1] += Number(t?.rentAmount) || 0;
    } else {
      monthly[p.month - 1] += Number(p.rentPaidAmount) || 0;
    }
  });
  return monthly;
}

// ─── UTILITIES & EXPENSES ────────────────────────────────────────────────────
export async function splitUtilityBill(type, totalAmount, month, year) {
  const [units, tenants] = await Promise.all([getUnits(), getActiveTenants()]);
  const activeRentalUnits = units.filter(u => !u.isOwnerUnit && u.currentTenantId);
  if (activeRentalUnits.length === 0) return;

  const perUnit = Math.ceil(Number(totalAmount) / activeRentalUnits.length);
  
  for (const unit of activeRentalUnits) {
    const tenant = tenants.find(t => t.id === unit.currentTenantId);
    if (!tenant) continue;
    const payment = await getOrCreatePayment(tenant.id, unit.id, month, year);
    const updateData = type === "electricity" 
      ? { electricityBill: (Number(payment.electricityBill)||0) + perUnit }
      : { waterBill: (Number(payment.waterBill)||0) + perUnit };
    await updateDoc(doc(db, "payments", payment.id), updateData);
  }
}

export async function addExpense(data) {
  const ref = await addDoc(collection(db, "expenses"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getExpensesByMonth(month, year) {
  const q = query(
    collection(db, "expenses"),
    where("month", "==", month),
    where("year", "==", year)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteExpense(expenseId) {
  await deleteDoc(doc(db, "expenses", expenseId));
}

export async function updateTenant(tenantId, data) {
  await updateDoc(doc(db, "tenants", tenantId), data);
}

export async function resetRentPayment(paymentId) {
  await updateDoc(doc(db, "payments", paymentId), {
    rentPaidAmount: 0,
    rentPaid: false,
    rentPaidDate: null
  });
}
