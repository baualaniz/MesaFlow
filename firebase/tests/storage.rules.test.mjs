import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { DEMO_PROJECT_ID, EMULATOR_HOST, EMULATOR_PORTS } from "../../scripts/lib/emulator-config.mjs";

const firestoreRules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
const storageRules = await readFile(new URL("../../storage.rules", import.meta.url), "utf8");
const bucket = `${DEMO_PROJECT_ID}.firebasestorage.app`;
const onePixelPng = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137
]);
let environment;

function metadata(establishmentId, uid, contentType = "image/png") {
  return { contentType, customMetadata: { establishmentId, uploadedByUid: uid } };
}

function productRef(context, establishmentId = "restaurantA", fileName = "asset.png") {
  return ref(context.storage(bucket), `establishments/${establishmentId}/products/productA/${fileName}`);
}

async function seedMember(uid, role, establishmentId = "restaurantA", active = true) {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `establishments/${establishmentId}/members/${uid}`), {
      uid, role, active, establishmentId
    });
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: DEMO_PROJECT_ID,
    firestore: { host: EMULATOR_HOST, port: EMULATOR_PORTS.firestore, rules: firestoreRules },
    storage: { host: EMULATOR_HOST, port: EMULATOR_PORTS.storage, rules: storageRules }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
});

after(async () => {
  await environment.cleanup();
});

test("owner activo sube y elimina una imagen pública de producto", async () => {
  await seedMember("ownerA", "owner");
  const owner = environment.authenticatedContext("ownerA");
  const image = productRef(owner);
  await assertSucceeds(uploadBytes(image, onePixelPng, metadata("restaurantA", "ownerA")));
  await assertSucceeds(getBytes(productRef(environment.unauthenticatedContext())));
  await assertSucceeds(deleteObject(image));
});

test("manager activo administra branding", async () => {
  await seedMember("managerA", "manager");
  const manager = environment.authenticatedContext("managerA");
  const image = ref(manager.storage(bucket), "establishments/restaurantA/branding/logo.webp");
  await assertSucceeds(uploadBytes(image, onePixelPng, metadata("restaurantA", "managerA", "image/webp")));
});

test("staff, cocina, miembro inactivo, usuario sin membresía y anónimo no escriben", async () => {
  for (const [uid, role] of [["staffA", "staff"], ["kitchenA", "kitchen"]]) {
    await seedMember(uid, role);
    const context = environment.authenticatedContext(uid);
    await assertFails(uploadBytes(productRef(context, "restaurantA", `${uid}.png`), onePixelPng, metadata("restaurantA", uid)));
  }
  await seedMember("inactiveOwner", "owner", "restaurantA", false);
  const inactive = environment.authenticatedContext("inactiveOwner");
  await assertFails(uploadBytes(productRef(inactive, "restaurantA", "inactive.png"), onePixelPng, metadata("restaurantA", "inactiveOwner")));
  const stranger = environment.authenticatedContext("strangerA");
  await assertFails(uploadBytes(productRef(stranger, "restaurantA", "stranger.png"), onePixelPng, metadata("restaurantA", "strangerA")));
  const guest = environment.unauthenticatedContext();
  await assertFails(uploadBytes(productRef(guest, "restaurantA", "guest.png"), onePixelPng, metadata("restaurantA", "guestA")));
});

test("una membresía no permite escribir en otro establecimiento", async () => {
  await seedMember("ownerA", "owner", "restaurantA");
  const owner = environment.authenticatedContext("ownerA");
  await assertFails(uploadBytes(productRef(owner, "restaurantB"), onePixelPng, metadata("restaurantB", "ownerA")));
});

test("rechaza SVG, metadata cruzada, archivo vacío y tamaño superior a 5 MiB", async () => {
  await seedMember("ownerA", "owner");
  const owner = environment.authenticatedContext("ownerA");
  await assertFails(uploadBytes(productRef(owner, "restaurantA", "asset.svg"), onePixelPng, metadata("restaurantA", "ownerA", "image/svg+xml")));
  await assertFails(uploadBytes(productRef(owner, "restaurantA", "cross.png"), onePixelPng, metadata("restaurantB", "ownerA")));
  await assertFails(uploadBytes(productRef(owner, "restaurantA", "empty.png"), new Uint8Array(), metadata("restaurantA", "ownerA")));
  await assertFails(uploadBytes(productRef(owner, "restaurantA", "large.png"), new Uint8Array(5 * 1024 * 1024 + 1), metadata("restaurantA", "ownerA")));
});

test("rechaza nombres y rutas fuera del contrato", async () => {
  await seedMember("ownerA", "owner");
  const owner = environment.authenticatedContext("ownerA");
  await assertFails(uploadBytes(productRef(owner, "restaurantA", ".hidden"), onePixelPng, metadata("restaurantA", "ownerA")));
  const privateFile = ref(owner.storage(bucket), "establishments/restaurantA/private/secret.png");
  await assertFails(uploadBytes(privateFile, onePixelPng, metadata("restaurantA", "ownerA")));
});
