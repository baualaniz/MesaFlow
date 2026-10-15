import {
  DEVELOPMENT_SMOKE_PLAN,
  validateSmokeResponse
} from "./lib/deployment-smoke.mjs";

try {
  for (const check of DEVELOPMENT_SMOKE_PLAN) {
    const response = await fetch(check.url, {
      headers: { "user-agent": "MesaFlow-Development-Smoke/1.0" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000)
    });
    await validateSmokeResponse(check, response);
    console.log(`[OK] ${check.name}: ${check.status}`);
  }
  console.log("Smoke Hosting dev aprobado; operación solo lectura.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
