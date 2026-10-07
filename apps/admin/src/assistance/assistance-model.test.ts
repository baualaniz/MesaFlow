import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";

import {
  assistanceElapsed,
  assistanceTableLabel,
  parseAdminAssistanceRequest
} from "./assistance-model";

const created = Timestamp.fromDate(new Date("2026-10-07T15:00:00.000Z"));
const request = {
  establishmentId: "mesa-flow-demo",
  sessionId: "sesion-mesa-01",
  tableId: "mesa-01",
  customerUid: "customer-a",
  type: "waiter",
  status: "pending",
  acknowledgedBy: null,
  resolvedBy: null,
  createdAt: created,
  updatedAt: created
};

describe("modelo de asistencia administrativa", () => {
  it("convierte Timestamps y conserva el contrato estricto", () => {
    const parsed = parseAdminAssistanceRequest(
      "sesion-mesa-01",
      request,
      "mesa-flow-demo"
    );
    expect(parsed.status).toBe("pending");
    expect(parsed.createdAt).toBe("2026-10-07T15:00:00.000Z");
  });

  it("rechaza solicitudes de otro establecimiento y fechas no nativas", () => {
    expect(() => parseAdminAssistanceRequest(
      "sesion-mesa-01",
      request,
      "otro-local"
    )).toThrow();
    expect(() => parseAdminAssistanceRequest(
      "sesion-mesa-01",
      { ...request, createdAt: "2026-10-07T15:00:00.000Z" },
      "mesa-flow-demo"
    )).toThrow();
  });

  it("presenta mesa y espera con etiquetas operativas", () => {
    expect(assistanceTableLabel("mesa-03")).toBe("Mesa 03");
    expect(assistanceElapsed(
      "2026-10-07T15:00:00.000Z",
      new Date("2026-10-07T15:08:00.000Z")
    )).toBe("Hace 8 min");
  });
});
