import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";

import { parseAdminTable, parseAdminTableSession, tableOperationalLabel } from "./table-model";

const timestamp = Timestamp.fromDate(new Date("2026-10-07T12:00:00.000Z"));
const tableData = {
  active: true,
  createdAt: timestamp,
  currentSessionId: "session-a",
  establishmentId: "tenant-a",
  name: "Mesa 1",
  number: 1,
  qrTokenHash: "a".repeat(64),
  qrVersion: 2,
  updatedAt: timestamp
};
const sessionData = {
  balanceMinor: 500,
  closedAt: null,
  establishmentId: "tenant-a",
  openedAt: timestamp,
  paidMinor: 500,
  status: "open",
  subtotalMinor: 1000,
  tableId: "mesa-01",
  updatedAt: timestamp
};

describe("modelo administrativo de mesas", () => {
  it("convierte mesa y sesión con timestamps nativos", () => {
    const table = parseAdminTable("mesa-01", tableData, "tenant-a");
    const session = parseAdminTableSession("session-a", sessionData, "tenant-a");
    expect(table.qrVersion).toBe(2);
    expect(session.balanceMinor).toBe(500);
    expect(tableOperationalLabel(table, session)).toBe("En servicio");
  });

  it("rechaza campos desconocidos, otro tenant y saldos incoherentes", () => {
    expect(() => parseAdminTable("mesa-01", { ...tableData, token: "visible" }, "tenant-a")).toThrow();
    expect(() => parseAdminTable("mesa-01", tableData, "tenant-b")).toThrow();
    expect(() => parseAdminTableSession(
      "session-a", { ...sessionData, balanceMinor: 999 }, "tenant-a"
    )).toThrow();
  });

  it("distingue mesas disponibles, desactivadas y con pago pendiente", () => {
    const table = parseAdminTable("mesa-01", { ...tableData, currentSessionId: null }, "tenant-a");
    expect(tableOperationalLabel(table, null)).toBe("Disponible");
    expect(tableOperationalLabel({ ...table, active: false }, null)).toBe("Desactivada");
    const session = parseAdminTableSession(
      "session-a", { ...sessionData, status: "payment_pending" }, "tenant-a"
    );
    expect(tableOperationalLabel({ ...table, currentSessionId: "session-a" }, session))
      .toBe("Pago pendiente");
  });
});
