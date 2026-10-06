import {
  doc,
  getDoc
} from "firebase/firestore";

import { adminFirestore } from "../firebase/firebase";
import {
  parseEstablishmentSummary,
  parseTenantMembership,
  parseUserEstablishmentIds,
  type TenantAccess
} from "./tenant-model";

export async function loadTenantAccesses(uid: string): Promise<readonly TenantAccess[]> {
  const profileSnapshot = await getDoc(doc(adminFirestore, "users", uid));
  if (!profileSnapshot.exists()) return Object.freeze([]);
  const establishmentIds = parseUserEstablishmentIds(profileSnapshot.data());

  const candidates = await Promise.all(establishmentIds.map(async (establishmentId) => {
    const membershipSnapshot = await getDoc(doc(
      adminFirestore,
      "establishments", establishmentId,
      "members", uid
    ));
    if (!membershipSnapshot.exists()) return null;
    const membership = parseTenantMembership(membershipSnapshot.data(), uid, establishmentId);
    if (!membership.active) return null;

    const establishmentSnapshot = await getDoc(doc(
      adminFirestore,
      "establishments", establishmentId
    ));
    if (!establishmentSnapshot.exists()) return null;
    const establishment = parseEstablishmentSummary(
      establishmentSnapshot.data(),
      establishmentId
    );
    if (!establishment.active) return null;
    return Object.freeze({ establishment, membership });
  }));

  return Object.freeze(
    candidates
      .filter((candidate): candidate is TenantAccess => candidate !== null)
      .sort((left, right) => left.establishment.name.localeCompare(right.establishment.name, "es"))
  );
}
