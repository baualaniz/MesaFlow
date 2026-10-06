import { FirebaseError } from "firebase/app";

const genericSignInError = "No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.";

export function signInErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) return genericSignInError;
  switch (error.code) {
    case "auth/invalid-email":
      return "Ingresá un correo electrónico válido.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos antes de volver a probar.";
    case "auth/network-request-failed":
      return "No hay conexión con el servicio. Verificá tu red e intentá nuevamente.";
    default:
      return genericSignInError;
  }
}

export function resetErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "auth/invalid-email") {
    return "Ingresá un correo electrónico válido.";
  }
  if (error instanceof FirebaseError && error.code === "auth/network-request-failed") {
    return "No hay conexión con el servicio. Verificá tu red e intentá nuevamente.";
  }
  return "No pudimos procesar la solicitud. Intentá nuevamente en unos minutos.";
}
