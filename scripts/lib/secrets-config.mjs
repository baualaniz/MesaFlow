const environmentName = /^[A-Z][A-Z0-9_]*$/;
const functionName = /^[A-Za-z][A-Za-z0-9]*$/;

export function parseEnvironmentExample(text, label) {
  const values = new Map();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u);
    if (!match) throw new Error(`${label}:${index + 1} no tiene formato NOMBRE=VALOR.`);
    const [, name, value] = match;
    if (values.has(name)) throw new Error(`${label} repite ${name}.`);
    values.set(name, value);
  }
  return values;
}

function assertNameList(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${label} debe ser una lista no vacía.`);
  }
  if (new Set(value).size !== value.length ||
      value.some((name) => typeof name !== "string" || !environmentName.test(name))) {
    throw new TypeError(`${label} contiene nombres repetidos o inválidos.`);
  }
}

export function validateSecretsPolicy(policy) {
  if (policy?.schemaVersion !== 1) throw new TypeError("Versión de política de secretos inválida.");
  for (const key of ["publicFrontendKeys", "backendRuntimeKeys", "secretManagerKeys"]) {
    assertNameList(policy[key], key);
  }
  if (policy.publicFrontendKeys.some((name) => !name.startsWith("PUBLIC_"))) {
    throw new TypeError("Toda configuración frontend debe usar el prefijo PUBLIC_.");
  }

  const groups = [
    ...policy.publicFrontendKeys,
    ...policy.backendRuntimeKeys,
    ...policy.secretManagerKeys
  ];
  if (new Set(groups).size !== groups.length) {
    throw new TypeError("Una clave no puede pertenecer a más de una categoría.");
  }
  if (policy.publicFrontendExample !== ".env.example" ||
      policy.backendRuntimeExample !== "functions/.env.example" ||
      policy.localSecretsExample !== "functions/.secret.local.example" ||
      policy.localSecretsFile !== "functions/.secret.local") {
    throw new TypeError("Las rutas de configuración no coinciden con el contrato del repositorio.");
  }

  const bindings = policy.futureFunctionBindings;
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) {
    throw new TypeError("Falta la matriz de acceso de funciones futuras.");
  }
  for (const [name, secrets] of Object.entries(bindings)) {
    if (!functionName.test(name)) throw new TypeError(`Nombre de función inválido: ${name}.`);
    assertNameList(secrets, `futureFunctionBindings.${name}`);
    if (secrets.some((secret) => !policy.secretManagerKeys.includes(secret))) {
      throw new TypeError(`${name} referencia un secreto fuera de la lista permitida.`);
    }
  }
  return policy;
}

function assertExactKeys(actual, expected, label) {
  const actualKeys = [...actual.keys()].sort();
  const expectedKeys = [...expected].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`${label} no coincide con la lista permitida.`);
  }
}

export function validateSecretExamples({
  policy,
  publicEnvironment,
  backendEnvironment,
  localSecrets,
  gitignore,
  runtimeSource
}) {
  validateSecretsPolicy(policy);
  const publicValues = parseEnvironmentExample(publicEnvironment, policy.publicFrontendExample);
  const backendValues = parseEnvironmentExample(backendEnvironment, policy.backendRuntimeExample);
  const secretValues = parseEnvironmentExample(localSecrets, policy.localSecretsExample);

  assertExactKeys(publicValues, policy.publicFrontendKeys, policy.publicFrontendExample);
  assertExactKeys(backendValues, policy.backendRuntimeKeys, policy.backendRuntimeExample);
  assertExactKeys(secretValues, policy.secretManagerKeys, policy.localSecretsExample);

  for (const [name, value] of publicValues) {
    const valid = name.endsWith("_URL")
      ? /^http:\/\/localhost:\d+$/u.test(value)
      : value.startsWith("REEMPLAZAR_");
    if (!valid) throw new Error(`${name} debe contener un placeholder público inequívoco.`);
  }
  for (const [name, value] of backendValues) {
    if (!value.startsWith("REEMPLAZAR_")) {
      throw new Error(`${name} debe contener un placeholder backend inequívoco.`);
    }
  }
  for (const [name, value] of secretValues) {
    if (!value.startsWith("REEMPLAZAR_SOLO_LOCAL_")) {
      throw new Error(`${name} debe dejar claro que es solo un valor local.`);
    }
  }

  const compactSource = runtimeSource.replace(/\s+/gu, "");
  for (const name of policy.secretManagerKeys) {
    if (!compactSource.includes(`defineSecret("${name}")`)) {
      throw new Error(`Falta declarar ${name} mediante defineSecret.`);
    }
  }
  for (const name of policy.backendRuntimeKeys) {
    if (!compactSource.includes(`defineString("${name}"`)) {
      throw new Error(`Falta declarar ${name} mediante defineString.`);
    }
  }
  if (compactSource.includes(".value()") || compactSource.includes("process.env")) {
    throw new Error("La etapa de política no debe leer valores que aún no tienen consumidor.");
  }

  for (const requiredRule of [
    "**/.secret.local",
    "**/.runtimeconfig.json",
    "application_default_credentials.json"
  ]) {
    if (!gitignore.includes(requiredRule)) {
      throw new Error(`.gitignore no protege ${requiredRule}.`);
    }
  }
}
