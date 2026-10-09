const SAFE_ERROR_NAME = /^[A-Za-z][A-Za-z0-9]{0,63}$/u;

export function shouldEnforceAppCheck(
  environment: Readonly<Record<string, string | undefined>>
): boolean {
  return environment.FUNCTIONS_EMULATOR !== "true";
}

export const CALLABLE_SECURITY_OPTIONS = Object.freeze({
  enforceAppCheck: shouldEnforceAppCheck(process.env)
});

export function safeErrorDetails(error: unknown): Readonly<{ errorName: string }> {
  const candidate = error instanceof Error ? error.name : "UnknownError";
  return Object.freeze({
    errorName: SAFE_ERROR_NAME.test(candidate) ? candidate : "Error"
  });
}

export function logInternalError(message: string, error: unknown): void {
  console.error(message, safeErrorDetails(error));
}
