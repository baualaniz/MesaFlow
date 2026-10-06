import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export interface AuthContextValue {
  readonly loading: boolean;
  readonly user: User | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error("AuthProvider no está disponible.");
  return value;
}
