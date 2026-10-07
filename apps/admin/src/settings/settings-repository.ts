import { doc, getDoc } from "firebase/firestore";

import { adminFirestore } from "../firebase/firebase";
import {
  parsePrivateSettings,
  parsePublicSettings,
  type EstablishmentSettings
} from "./settings-model";

export async function loadEstablishmentSettings(
  establishmentId: string
): Promise<EstablishmentSettings> {
  const root = ["establishments", establishmentId, "settings"] as const;
  const [publicSnapshot, privateSnapshot] = await Promise.all([
    getDoc(doc(adminFirestore, ...root, "public")),
    getDoc(doc(adminFirestore, ...root, "private"))
  ]);
  if (!publicSnapshot.exists() || !privateSnapshot.exists()) {
    throw new Error("La configuración del establecimiento está incompleta.");
  }
  return Object.freeze({
    private: parsePrivateSettings(privateSnapshot.data(), establishmentId),
    public: parsePublicSettings(publicSnapshot.data(), establishmentId)
  });
}
