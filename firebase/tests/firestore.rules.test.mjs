import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import {
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "../../scripts/lib/emulator-config.mjs";

const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
const now = Timestamp.fromDate(new Date("2026-09-17T12:00:00.000Z"));
const later = Timestamp.fromDate(new Date("2026-09-17T12:05:00.000Z"));
let environment;

function product(establishmentId = "restaurantA", overrides = {}) {
  return {
    establishmentId,
    categoryId: "principales",
    name: "Producto de prueba",
    description: "Descripción segura",
    priceMinor: 10000,
    currency: "ARS",
    imagePath: null,
    available: true,
    active: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function category(establishmentId = "restaurantA", overrides = {}) {
  return {
    establishmentId,
    name: "Principales",
    description: "Categoría de prueba",
    sortOrder: 1,
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function businessHours(overrides = {}) {
  const day = { closed: false, open: "09:00", close: "23:00" };
  return {
    monday: day,
    tuesday: day,
    wednesday: day,
    thursday: day,
    friday: day,
    saturday: day,
    sunday: { closed: true, open: "10:00", close: "18:00" },
    ...overrides
  };
}

function publicSettings(establishmentId = "restaurantA", overrides = {}) {
  return {
    establishmentId,
    brandName: "Restaurante A",
    contactEmail: "contacto@restaurant-a.test",
    contactPhone: "+54 11 5555-0101",
    addressLine: "Calle 123",
    businessHours: businessHours(),
    orderingEnabled: true,
    assistanceEnabled: true,
    updatedAt: now,
    ...overrides
  };
}

function privateSettings(establishmentId = "restaurantA", overrides = {}) {
  return {
    establishmentId,
    mercadoPagoEnabled: false,
    whatsappEnabled: false,
    whatsappOptInConfirmed: false,
    whatsappRecipient: "",
    updatedAt: now,
    ...overrides
  };
}

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const writes = [
      ["establishmentSlugs/restaurante-a", { establishmentId: "restaurantA", active: true }],
      ["establishments/restaurantA", { establishmentId: "restaurantA", active: true }],
      ["establishments/restaurantB", { establishmentId: "restaurantB", active: true }],
      ["users/ownerA", { displayName: "Propietario A", establishmentIds: ["restaurantA"] }],
      ["users/staffA", { displayName: "Personal A", establishmentIds: ["restaurantA", "restaurantB"] }],
      ["establishments/restaurantA/members/ownerA", { establishmentId: "restaurantA", uid: "ownerA", role: "owner", active: true }],
      ["establishments/restaurantA/members/managerA", { establishmentId: "restaurantA", uid: "managerA", role: "manager", active: true }],
      ["establishments/restaurantA/members/staffA", { establishmentId: "restaurantA", uid: "staffA", role: "staff", active: true }],
      ["establishments/restaurantA/members/kitchenA", { establishmentId: "restaurantA", uid: "kitchenA", role: "kitchen", active: true }],
      ["establishments/restaurantA/members/inactiveA", { establishmentId: "restaurantA", uid: "inactiveA", role: "owner", active: false }],
      ["establishments/restaurantB/members/ownerB", { establishmentId: "restaurantB", uid: "ownerB", role: "owner", active: true }],
      ["establishments/restaurantA/categories/active", category()],
      ["establishments/restaurantA/categories/inactive", category("restaurantA", { active: false, sortOrder: 2 })],
      ["establishments/restaurantA/products/public", product()],
      ["establishments/restaurantA/products/hidden", product("restaurantA", { available: false, sortOrder: 2 })],
      ["establishments/restaurantB/products/hidden", product("restaurantB", { available: false, sortOrder: 2 })],
      ["establishments/restaurantA/tables/tableA", { establishmentId: "restaurantA", active: true }],
      ["establishments/restaurantA/tableSessions/sessionA", { establishmentId: "restaurantA", tableId: "tableA", status: "open" }],
      ["establishments/restaurantA/tableSessions/sessionOther", { establishmentId: "restaurantA", tableId: "tableA", status: "open" }],
      ["establishments/restaurantA/tableSessions/sessionA/participants/guestA", { establishmentId: "restaurantA", sessionId: "sessionA", uid: "guestA", active: true }],
      ["establishments/restaurantB/tableSessions/forgedSession", { establishmentId: "restaurantA", tableId: "tableA", status: "open" }],
      ["establishments/restaurantB/tableSessions/forgedSession/participants/guestA", { establishmentId: "restaurantA", sessionId: "forgedSession", uid: "guestA", active: true }],
      ["establishments/restaurantA/orders/orderA", { establishmentId: "restaurantA", sessionId: "sessionA", status: "created" }],
      ["establishments/restaurantA/orders/orderOther", { establishmentId: "restaurantA", sessionId: "sessionOther", status: "created" }],
      ["establishments/restaurantA/assistanceRequests/helpA", { establishmentId: "restaurantA", sessionId: "sessionA", status: "pending" }],
      ["establishments/restaurantA/payments/paymentA", { establishmentId: "restaurantA", sessionId: "sessionA", status: "pending" }],
      ["establishments/restaurantA/paymentPreferences/intentA", { establishmentId: "restaurantA", sessionId: "sessionA", status: "ready" }],
      ["establishments/restaurantA/dailyMetrics/2026-09-17", { establishmentId: "restaurantA", salesMinor: 0 }],
      ["establishments/restaurantA/settings/public", publicSettings()],
      ["establishments/restaurantA/settings/private", privateSettings()],
      ["establishments/restaurantA/auditLogs/logA", { establishmentId: "restaurantA", action: "seed" }],
      ["establishments/restaurantA/qrExchanges/exchangeA", { establishmentId: "restaurantA" }],
      ["paymentIntents/intentA", { establishmentId: "restaurantA", status: "ready" }],
      ["webhookEvents/eventA", { provider: "test" }]
    ];
    await Promise.all(writes.map(([path, data]) => setDoc(doc(db, path), data)));
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: DEMO_PROJECT_ID,
    firestore: { host: EMULATOR_HOST, port: EMULATOR_PORTS.firestore, rules }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seed();
});

after(async () => {
  await environment.cleanup();
});

test("visitante lee slug, establecimiento y catálogo publicado", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "establishmentSlugs/restaurante-a")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/categories/active")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/products/public")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/settings/public")));
  await assertFails(getDoc(doc(db, "establishments/restaurantA/settings/private")));
  await assertFails(getDoc(doc(db, "establishments/restaurantA/categories/inactive")));
  await assertFails(getDoc(doc(db, "establishments/restaurantA/products/hidden")));
});

test("consulta pública exige filtros de publicación y disponibilidad", async () => {
  const db = environment.unauthenticatedContext().firestore();
  const products = collection(db, "establishments/restaurantA/products");
  await assertSucceeds(getDocs(query(
    products,
    where("categoryId", "==", "principales"),
    where("active", "==", true),
    where("available", "==", true),
    orderBy("sortOrder", "asc")
  )));
  await assertFails(getDocs(products));
});

test("ninguna identidad puede enumerar tenants o hacer consultas globales", async () => {
  for (const db of [
    environment.unauthenticatedContext().firestore(),
    environment.authenticatedContext("ownerA").firestore(),
    environment.authenticatedContext("guestA").firestore()
  ]) {
    await assertFails(getDocs(collection(db, "establishments")));
    await assertFails(getDocs(collectionGroup(db, "orders")));
  }
});

test("miembros activos leen catálogo completo y datos operativos del tenant", async () => {
  const db = environment.authenticatedContext("kitchenA").firestore();
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/products/hidden")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/orders/orderA")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/tables/tableA")));
});

test("owner y manager administran catálogo con esquema válido", async () => {
  for (const uid of ["ownerA", "managerA"]) {
    const db = environment.authenticatedContext(uid).firestore();
    const ref = doc(db, `establishments/restaurantA/products/new-${uid}`);
    await assertSucceeds(setDoc(ref, product()));
    await assertSucceeds(updateDoc(ref, { priceMinor: 12000, updatedAt: later }));
    await assertSucceeds(deleteDoc(ref));
  }
});

test("staff solo cambia disponibilidad y updatedAt", async () => {
  const db = environment.authenticatedContext("staffA").firestore();
  const ref = doc(db, "establishments/restaurantA/products/public");
  await assertSucceeds(updateDoc(ref, { available: false, updatedAt: later }));
  await assertFails(updateDoc(ref, { priceMinor: 1, updatedAt: later }));
  await assertFails(deleteDoc(ref));
});

test("protege tenant, createdAt y campos desconocidos", async () => {
  const db = environment.authenticatedContext("ownerA").firestore();
  const own = doc(db, "establishments/restaurantA/products/public");
  await assertFails(updateDoc(own, { establishmentId: "restaurantB", updatedAt: later }));
  await assertFails(updateDoc(own, { createdAt: later, updatedAt: later }));
  await assertFails(setDoc(
    doc(db, "establishments/restaurantA/products/unknown-field"),
    product("restaurantA", { unexpected: true })
  ));
  await assertFails(setDoc(
    doc(db, "establishments/restaurantB/products/cross-tenant"),
    product("restaurantB")
  ));
});

test("categorías conservan tenant y createdAt", async () => {
  const db = environment.authenticatedContext("managerA").firestore();
  const ref = doc(db, "establishments/restaurantA/categories/new-category");
  await assertSucceeds(setDoc(ref, category()));
  await assertSucceeds(updateDoc(ref, { name: "Nueva categoría", updatedAt: later }));
  await assertFails(updateDoc(ref, { createdAt: later, updatedAt: later }));
});

test("manager lista membresías pero miembro común solo lee la propia", async () => {
  const manager = environment.authenticatedContext("managerA").firestore();
  await assertSucceeds(getDocs(collection(manager, "establishments/restaurantA/members")));
  const staff = environment.authenticatedContext("staffA").firestore();
  await assertSucceeds(getDoc(doc(staff, "establishments/restaurantA/members/staffA")));
  await assertFails(getDoc(doc(staff, "establishments/restaurantA/members/ownerA")));
  await assertFails(getDocs(collection(staff, "establishments/restaurantA/members")));
});

test("el perfil propio orienta la selección pero no concede acceso a otro tenant", async () => {
  const staff = environment.authenticatedContext("staffA").firestore();
  await assertSucceeds(getDoc(doc(staff, "users/staffA")));
  await assertFails(getDoc(doc(staff, "users/ownerA")));
  await assertFails(getDocs(collection(staff, "users")));
  await assertFails(getDoc(doc(staff, "establishments/restaurantB/members/staffA")));
  await assertFails(getDoc(doc(staff, "establishments/restaurantB/products/hidden")));
});

test("participante activo solo lee su sesión y recursos vinculados", async () => {
  const db = environment.authenticatedContext("guestA").firestore();
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/tableSessions/sessionA")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/orders/orderA")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/assistanceRequests/helpA")));
  await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/payments/paymentA")));
  await assertFails(getDoc(doc(db, "establishments/restaurantA/paymentPreferences/intentA")));
  await assertFails(getDoc(doc(db, "establishments/restaurantA/tableSessions/sessionOther")));
  await assertFails(getDoc(doc(db, "establishments/restaurantA/orders/orderOther")));
});

test("un participante forjado bajo otra ruta de tenant no concede acceso", async () => {
  const db = environment.authenticatedContext("guestA").firestore();
  await assertFails(getDoc(doc(db, "establishments/restaurantB/tableSessions/forgedSession")));
  await assertFails(getDoc(doc(
    db,
    "establishments/restaurantB/tableSessions/forgedSession/participants/guestA"
  )));
});

test("participante consulta únicamente recursos filtrados por su sesión", async () => {
  const db = environment.authenticatedContext("guestA").firestore();
  const orders = collection(db, "establishments/restaurantA/orders");
  const assistance = collection(db, "establishments/restaurantA/assistanceRequests");
  const payments = collection(db, "establishments/restaurantA/payments");
  await assertSucceeds(getDocs(query(orders, where("sessionId", "==", "sessionA"))));
  await assertSucceeds(getDocs(query(assistance, where("sessionId", "==", "sessionA"))));
  await assertSucceeds(getDocs(query(payments, where("sessionId", "==", "sessionA"))));
  await assertFails(getDocs(orders));
});

test("participante no escribe pedidos, asistencia ni pagos directamente", async () => {
  const db = environment.authenticatedContext("guestA").firestore();
  await assertFails(setDoc(doc(db, "establishments/restaurantA/orders/new-order"), {
    establishmentId: "restaurantA", sessionId: "sessionA"
  }));
  await assertFails(setDoc(doc(db, "establishments/restaurantA/assistanceRequests/new-help"), {
    establishmentId: "restaurantA", sessionId: "sessionA"
  }));
  await assertFails(updateDoc(
    doc(db, "establishments/restaurantA/payments/paymentA"),
    { status: "approved" }
  ));
});

test("solo owner y manager leen métricas, privado y auditoría", async () => {
  for (const uid of ["ownerA", "managerA"]) {
    const db = environment.authenticatedContext(uid).firestore();
    await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/dailyMetrics/2026-09-17")));
    await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/settings/private")));
    await assertSucceeds(getDoc(doc(db, "establishments/restaurantA/auditLogs/logA")));
  }
  const staff = environment.authenticatedContext("staffA").firestore();
  await assertFails(getDoc(doc(staff, "establishments/restaurantA/dailyMetrics/2026-09-17")));
  await assertSucceeds(getDoc(doc(staff, "establishments/restaurantA/settings/public")));
  await assertFails(getDoc(doc(staff, "establishments/restaurantA/settings/private")));
});

test("owner y manager actualizan únicamente la configuración permitida", async () => {
  const publicRef = "establishments/restaurantA/settings/public";
  const privateRef = "establishments/restaurantA/settings/private";
  for (const uid of ["ownerA", "managerA"]) {
    const db = environment.authenticatedContext(uid).firestore();
    await assertSucceeds(updateDoc(doc(db, publicRef), {
      brandName: `Marca ${uid}`,
      updatedAt: serverTimestamp()
    }));
    await assertSucceeds(updateDoc(doc(db, privateRef), {
      mercadoPagoEnabled: true,
      updatedAt: serverTimestamp()
    }));
  }

  const staff = environment.authenticatedContext("staffA").firestore();
  await assertFails(updateDoc(doc(staff, publicRef), {
    orderingEnabled: false,
    updatedAt: serverTimestamp()
  }));

  const owner = environment.authenticatedContext("ownerA").firestore();
  await assertSucceeds(updateDoc(doc(owner, privateRef), {
    whatsappEnabled: true,
    whatsappOptInConfirmed: true,
    whatsappRecipient: "5491155550101",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(owner, privateRef), {
    whatsappEnabled: true,
    whatsappOptInConfirmed: false,
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(owner, privateRef), {
    whatsappRecipient: "+54 11 5555 0101",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(owner, publicRef), {
    unexpected: true,
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(owner, publicRef), {
    establishmentId: "restaurantB",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(owner, publicRef), {
    businessHours: businessHours({ monday: { closed: false, open: "25:00", close: "23:00" } }),
    updatedAt: serverTimestamp()
  }));
  await assertFails(deleteDoc(doc(owner, publicRef)));
});

test("miembro inactivo, extraño y membresía de otro tenant no ganan acceso", async () => {
  for (const uid of ["inactiveA", "strangerA", "ownerB"]) {
    const db = environment.authenticatedContext(uid).firestore();
    await assertFails(getDoc(doc(db, "establishments/restaurantA/products/hidden")));
    await assertFails(getDoc(doc(db, "establishments/restaurantA/orders/orderA")));
  }
});

test("colecciones exclusivas de backend permanecen cerradas", async () => {
  const db = environment.authenticatedContext("ownerA").firestore();
  await assertFails(getDoc(doc(db, "establishments/restaurantA/qrExchanges/exchangeA")));
  await assertFails(getDoc(doc(
    db,
    "establishments/restaurantA/notificationStates/whatsapp-assistance"
  )));
  await assertFails(getDoc(doc(db, "paymentIntents/intentA")));
  await assertFails(getDoc(doc(db, "webhookEvents/eventA")));
  await assertFails(setDoc(doc(db, "establishments/restaurantA/members/newMember"), {
    establishmentId: "restaurantA", uid: "newMember", role: "staff", active: true
  }));
});
