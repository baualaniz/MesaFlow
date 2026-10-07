import assert from "node:assert/strict";
import test from "node:test";

import {
  canAssignTeamRole,
  manageTeam,
  TeamManagementError
} from "../lib/team-management.js";

const now = new Date("2026-10-07T12:00:00.000Z");
const requestId = "abcdef0123456789abcdef0123456789";

function repository() {
  const calls = [];
  return {
    calls,
    async execute(command) {
      calls.push(command);
      if (command.action === "list") return { action: "list", members: [] };
      if (command.action === "invite") {
        return {
          action: "invite",
          member: {
            uid: "new-user", displayName: command.displayName, email: command.email,
            role: command.role, permissions: [], active: true,
            createdAt: command.updatedAt.toISOString(), updatedAt: command.updatedAt.toISOString()
          }
        };
      }
      return { action: "update", targetUid: command.targetUid, updatedAt: command.updatedAt.toISOString() };
    }
  };
}

test("normaliza listado e invitación sin aceptar permisos del cliente", async () => {
  const listRepo = repository();
  await manageTeam({ action: "list", establishmentId: "mesa-flow-demo" }, "demo-owner", listRepo, now);
  assert.equal(listRepo.calls[0].actorUid, "demo-owner");

  const inviteRepo = repository();
  await manageTeam({
    action: "invite", displayName: "  Ana Cocina  ", email: "ANA@EXAMPLE.COM",
    establishmentId: "mesa-flow-demo", requestId, role: "kitchen"
  }, "demo-manager", inviteRepo, now);
  assert.equal(inviteRepo.calls[0].displayName, "Ana Cocina");
  assert.equal(inviteRepo.calls[0].email, "ana@example.com");
  assert.equal("permissions" in inviteRepo.calls[0], false);
});

test("normaliza actualización con concurrencia explícita", async () => {
  const repo = repository();
  await manageTeam({
    action: "update", active: false, establishmentId: "mesa-flow-demo",
    expectedUpdatedAt: "2026-10-07T11:00:00.000Z", requestId,
    role: "staff", targetUid: "demo-staff"
  }, "demo-owner", repo, now);
  assert.equal(repo.calls[0].active, false);
  assert.equal(repo.calls[0].updatedAt.toISOString(), now.toISOString());
});

test("la matriz permite al owner todos los roles y limita al manager", () => {
  for (const role of ["owner", "manager", "staff", "kitchen"]) {
    assert.equal(canAssignTeamRole("owner", role), true);
  }
  assert.equal(canAssignTeamRole("manager", "staff"), true);
  assert.equal(canAssignTeamRole("manager", "kitchen"), true);
  assert.equal(canAssignTeamRole("manager", "manager"), false);
  assert.equal(canAssignTeamRole("manager", "owner"), false);
});

test("rechaza identidad ausente, roles inválidos y campos de autorización", async () => {
  const valid = {
    action: "invite", displayName: "Ana Cocina", email: "ana@example.com",
    establishmentId: "mesa-flow-demo", requestId, role: "kitchen"
  };
  for (const [input, uid] of [
    [valid, undefined],
    [{ ...valid, permissions: ["establishment.manage"] }, "demo-owner"],
    [{ ...valid, role: "superadmin" }, "demo-owner"],
    [{ ...valid, email: "no-es-email" }, "demo-owner"]
  ]) {
    await assert.rejects(manageTeam(input, uid, repository(), now), (error) =>
      error instanceof TeamManagementError && ["unauthenticated", "invalid-argument"].includes(error.code));
  }
});
