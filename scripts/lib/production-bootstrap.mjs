import { encodeFirestoreFields } from "./presentation-seed.mjs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function text(value, label, minimum, maximum) {
  if (typeof value !== "string") throw new Error(`${label} debe ser texto.`);
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new Error(`${label} debe tener entre ${minimum} y ${maximum} caracteres.`);
  }
  return normalized;
}

export function validateProductionBootstrap(config) {
  if (config?.version !== 1 || config.environment !== "production" ||
      config.projectId !== "mesaflow-produccion" || config.databaseId !== "(default)") {
    throw new Error("El alta inicial debe apuntar exclusivamente a mesaflow-produccion.");
  }
  const uid = text(config.owner?.uid, "UID", 6, 128);
  if (uid.startsWith("REEMPLAZAR_")) throw new Error("Reemplazá el UID de Firebase Auth.");
  const ownerEmail = text(config.owner?.email, "Correo del propietario", 3, 254).toLowerCase();
  const contactEmail = text(
    config.publicSettings?.contactEmail,
    "Correo de contacto",
    3,
    254
  ).toLowerCase();
  if (!EMAIL.test(ownerEmail) || !EMAIL.test(contactEmail)) {
    throw new Error("Los correos del alta inicial no son válidos.");
  }
  const establishmentId = text(config.establishment?.id, "ID del establecimiento", 3, 64);
  const slug = text(config.establishment?.slug, "Slug", 3, 64);
  if (!ID.test(establishmentId) || !ID.test(slug) || establishmentId !== slug) {
    throw new Error("ID y slug deben coincidir y usar minúsculas, números o guiones.");
  }
  if (config.establishment?.timezone !== "America/Argentina/Buenos_Aires" ||
      config.establishment?.currency !== "ARS") {
    throw new Error("El piloto productivo debe usar zona horaria argentina y ARS.");
  }
  return Object.freeze({
    uid,
    ownerEmail,
    ownerDisplayName: text(config.owner.displayName, "Nombre del propietario", 2, 120),
    establishmentId,
    establishmentName: text(config.establishment.name, "Nombre del restaurante", 2, 120),
    slug,
    timezone: config.establishment.timezone,
    currency: config.establishment.currency,
    contactEmail,
    contactPhone: text(config.publicSettings.contactPhone, "Teléfono", 0, 30),
    addressLine: text(config.publicSettings.addressLine, "Dirección", 0, 200)
  });
}

function businessHours() {
  return Object.fromEntries([
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ].map((day) => [day, {
    closed: day === "sunday",
    open: "09:00",
    close: "23:00"
  }]));
}

export function productionBootstrapDocuments(config, now = new Date()) {
  const value = validateProductionBootstrap(config);
  const timestamp = now.toISOString();
  const base = `establishments/${value.establishmentId}`;
  return Object.freeze([
    {
      path: `users/${value.uid}`,
      data: {
        displayName: value.ownerDisplayName,
        email: value.ownerEmail,
        establishmentIds: [value.establishmentId],
        createdAt: { $timestamp: "now" },
        updatedAt: { $timestamp: "now" }
      }
    },
    {
      path: `establishmentSlugs/${value.slug}`,
      data: { establishmentId: value.establishmentId, active: true }
    },
    {
      path: base,
      data: {
        name: value.establishmentName,
        slug: value.slug,
        timezone: value.timezone,
        currency: value.currency,
        active: true,
        createdAt: { $timestamp: "now" },
        updatedAt: { $timestamp: "now" }
      }
    },
    {
      path: `${base}/members/${value.uid}`,
      data: {
        establishmentId: value.establishmentId,
        uid: value.uid,
        role: "owner",
        permissions: ["establishment.manage", "menu.manage", "orders.manage", "metrics.read"],
        active: true,
        createdAt: { $timestamp: "now" },
        updatedAt: { $timestamp: "now" }
      }
    },
    {
      path: `${base}/settings/public`,
      data: {
        establishmentId: value.establishmentId,
        brandName: value.establishmentName,
        contactEmail: value.contactEmail,
        contactPhone: value.contactPhone,
        addressLine: value.addressLine,
        businessHours: businessHours(),
        orderingEnabled: false,
        assistanceEnabled: false,
        updatedAt: { $timestamp: "now" }
      }
    },
    {
      path: `${base}/settings/private`,
      data: {
        establishmentId: value.establishmentId,
        mercadoPagoEnabled: false,
        whatsappEnabled: false,
        whatsappOptInConfirmed: false,
        whatsappRecipient: "",
        updatedAt: { $timestamp: "now" }
      }
    },
    {
      path: `${base}/auditLogs/production-bootstrap`,
      data: {
        establishmentId: value.establishmentId,
        actorUid: value.uid,
        action: "production.bootstrap.created",
        targetType: "establishment",
        targetId: value.establishmentId,
        before: null,
        after: { active: true, slug: value.slug },
        createdAt: { $timestamp: "now" }
      }
    }
  ].map(({ path, data }) => Object.freeze({
    path,
    fields: encodeFirestoreFields(data, timestamp)
  })));
}

export function productionBootstrapWrites(config, now = new Date()) {
  const documents = productionBootstrapDocuments(config, now);
  const prefix = `projects/mesaflow-produccion/databases/(default)/documents/`;
  return documents.map(({ path, fields }) => ({
    update: { name: `${prefix}${path}`, fields },
    currentDocument: { exists: false }
  }));
}
