export function deployedFunctionNames(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.result)
      ? payload.result
      : [];
  return entries.map((entry) => {
    const fullName = entry?.id ?? entry?.name ?? entry?.entryPoint ?? "";
    return String(fullName).split("/").at(-1);
  }).filter(Boolean);
}

export function assertProductionFunctions(payload, expectedNames) {
  const actual = new Set(deployedFunctionNames(payload));
  const missing = expectedNames.filter((name) => !actual.has(name));
  if (missing.length > 0) {
    throw new Error(`Functions faltantes en producción: ${missing.join(", ")}.`);
  }
  return Object.freeze({ deployed: actual.size, expected: expectedNames.length });
}
