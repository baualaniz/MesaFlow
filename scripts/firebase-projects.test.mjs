import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";

function validConfig() {
  return {
    projects: {
      default: "mesaflow-desarrollo",
      dev: "mesaflow-desarrollo",
      prod: "mesaflow-produccion"
    }
  };
}

test("acepta ambientes separados con desarrollo predeterminado", () => {
  assert.deepEqual(validateFirebaseProjects(validConfig()), validConfig().projects);
});

test("rechaza una configuración sin projects", () => {
  for (const config of [null, {}, { projects: [] }]) {
    assert.throws(() => validateFirebaseProjects(config), /objeto projects/);
  }
});

test("rechaza alias requeridos ausentes", () => {
  for (const alias of ["default", "dev", "prod"]) {
    const config = validConfig();
    delete config.projects[alias];
    assert.throws(() => validateFirebaseProjects(config), /ID de proyecto válido/);
  }
});

test("rechaza IDs con espacios, caracteres inválidos o tipo incorrecto", () => {
  for (const value of ["mesaflow-desarrollo ", "MESAFLOW", "abc", "-mesaflow", "mesaflow-", "a".repeat(31), 42]) {
    const config = validConfig();
    config.projects.dev = value;
    assert.throws(() => validateFirebaseProjects(config), /ID de proyecto válido/);
  }
});

test("rechaza el mismo proyecto para dev y prod", () => {
  const config = validConfig();
  config.projects.prod = config.projects.dev;
  assert.throws(() => validateFirebaseProjects(config), /proyectos distintos/);
});

test("rechaza producción como predeterminado", () => {
  const config = validConfig();
  config.projects.default = config.projects.prod;
  assert.throws(() => validateFirebaseProjects(config), /predeterminado debe ser desarrollo/);
});

test("rechaza un tercer proyecto como predeterminado", () => {
  const config = validConfig();
  config.projects.default = "mesaflow-otro";
  assert.throws(() => validateFirebaseProjects(config), /predeterminado debe ser desarrollo/);
});

test("los alias del repositorio coinciden con los IDs suministrados por el usuario", async () => {
  const config = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
  assert.deepEqual(validateFirebaseProjects(config), validConfig().projects);
});
