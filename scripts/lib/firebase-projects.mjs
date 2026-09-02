/** Validate local aliases only; this does not contact Firebase or check IAM. */
export function validateFirebaseProjects(config) {
  const projects = config?.projects;
  if (!projects || typeof projects !== "object" || Array.isArray(projects)) {
    throw new Error(".firebaserc debe contener un objeto projects.");
  }

  for (const alias of ["default", "dev", "prod"]) {
    const projectId = projects[alias];
    if (typeof projectId !== "string" || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
      throw new Error(`El alias ${alias} debe tener un ID de proyecto válido, sin espacios.`);
    }
  }

  if (projects.dev === projects.prod) {
    throw new Error("Desarrollo y producción deben apuntar a proyectos distintos.");
  }
  if (projects.default !== projects.dev) {
    throw new Error("El proyecto predeterminado debe ser desarrollo, nunca producción.");
  }

  return { dev: projects.dev, prod: projects.prod, default: projects.default };
}
