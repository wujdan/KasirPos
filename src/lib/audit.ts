import type { Prisma } from "@/generated/prisma/client";

type AuditEntry = {
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: Record<string, string | number | boolean | null>;
};

export async function recordAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  await tx.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId == null ? null : String(entry.entityId),
      details: entry.details ? JSON.stringify(entry.details) : null,
    },
  });
}
