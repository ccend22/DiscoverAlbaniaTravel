import { desc } from "drizzle-orm";
import { db } from "../index";
import { adminAuditLog } from "../schema";

/** Snapshot a row right before an admin permanently deletes it -- these deletes have no other recovery path. */
export async function recordAdminDelete(
  adminUserId: number | null,
  entityType: string,
  entityId: string | number,
  snapshot: unknown
): Promise<void> {
  await db.insert(adminAuditLog).values({
    adminUserId,
    action: "delete",
    entityType,
    entityId: String(entityId),
    snapshot: snapshot as object,
  });
}

export interface AdminAuditLogRow {
  id: number;
  adminUserId: number | null;
  action: string;
  entityType: string;
  entityId: string;
  snapshot: unknown;
  createdAt: Date;
}

export async function listAdminAuditLog(limit = 100): Promise<AdminAuditLogRow[]> {
  return db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(limit);
}
