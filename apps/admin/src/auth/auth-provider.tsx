import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User
} from "firebase/auth";

import { adminAuth, adminAuthReady } from "../firebase/firebase";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    void adminAuthReady.then(() => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(adminAuth, (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      });
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    user,
    async signIn(email, password) {
      await adminAuthReady;
      await signInWithEmailAndPassword(adminAuth, email.trim(), password);
    },
    async signOut() {
      await firebaseSignOut(adminAuth);
    },
    async sendPasswordReset(email) {
      await adminAuthReady;
      await sendPasswordResetEmail(adminAuth, email.trim());
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
