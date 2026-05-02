import {
  collection, doc, getDocs, getDoc, addDoc,
  updateDoc, query, where, setDoc, serverTimestamp,
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
        notes: "",
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

export async function updateUnitNotes(unitId, notes) {
  await updateDoc(doc(db, "units", unitId), { notes });
}

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
  const ref = await addDoc(collection(db, "payments"), {
    tenantId, unitId, month, year,
    rentPaid: false, rentPaidDate: null,
    electricityBill: 0, waterBill: 0, billsPaid: false,
  });
  return { id: ref.id, tenantId, unitId, month, year, rentPaid: false, rentPaidDate: null, electricityBill: 0, waterBill: 0, billsPaid: false };
}

export async function markRentPaid(paymentId) {
  await updateDoc(doc(db, "payments", paymentId), {
    rentPaid: true,
    rentPaidDate: new Date().toISOString().split("T")[0],
  });
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
    if (payment?.rentPaid) totalCollected += Number(t.rentAmount) || 0;
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
