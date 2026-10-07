import { FirebaseError } from "firebase/app";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";

import { adminFirestore } from "../firebase/firebase";
import {
  validateSettingsDraft,
  type EstablishmentSettingsDraft
} from "./settings-model";

function saveError(error: unknown): Error {
  if (error instanceof TypeError) return error;
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return new Error("Tu rol ya no permite modificar la configuración.", { cause: error });
  }
  return new Error("No pudimos guardar la configuración. Intentá nuevamente.", { cause: error });
}

export async function saveEstablishmentSettings(
  establishmentId: string,
  value: EstablishmentSettingsDraft
): Promise<void> {
  try {
    const draft = validateSettingsDraft(value);
    const root = ["establishments", establishmentId, "settings"] as const;
    const batch = writeBatch(adminFirestore);
    batch.set(doc(adminFirestore, ...root, "public"), {
      addressLine: draft.addressLine,
      assistanceEnabled: draft.assistanceEnabled,
      brandName: draft.brandName,
      businessHours: draft.businessHours,
      contactEmail: draft.contactEmail,
      contactPhone: draft.contactPhone,
      establishmentId,
      orderingEnabled: draft.orderingEnabled,
      updatedAt: serverTimestamp()
    });
    batch.set(doc(adminFirestore, ...root, "private"), {
      establishmentId,
      mercadoPagoEnabled: draft.mercadoPagoEnabled,
      updatedAt: serverTimestamp(),
      whatsappEnabled: draft.whatsappEnabled
    });
    await batch.commit();
  } catch (error) {
    throw saveError(error);
  }
}
