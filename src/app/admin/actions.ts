"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { auditLog, visits, type VisitFlag } from "@/db/schema";
import { getAdminSession } from "@/lib/authz";
import { isUuid } from "@/lib/api";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  visitId?: string;
};

function withFlag(flags: string[], flag: VisitFlag): VisitFlag[] {
  return Array.from(new Set([...flags, flag])) as VisitFlag[];
}

/**
 * Close an open visit from the librarian desk. The audit entry records that
 * the close was manual and which librarian performed it.
 */
export async function signOutVisitAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your librarian session has ended. Sign in again.",
    };
  }

  const visitId = String(formData.get("visitId") ?? "");

  if (!isUuid(visitId)) {
    return { status: "error", message: "That visit could not be found." };
  }

  const db = getDb();
  const [visit] = await db
    .select({
      id: visits.id,
      userId: visits.userId,
      flags: visits.flags,
    })
    .from(visits)
    .where(and(eq(visits.id, visitId), isNull(visits.exitAt)))
    .limit(1);

  if (!visit) {
    revalidatePath("/admin");
    return {
      status: "success",
      message: "That visit was already signed out.",
      visitId,
    };
  }

  const now = new Date();
  const flags = withFlag(visit.flags, "manual");

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(visits)
        .set({
          exitAt: now,
          exitMethod: "manual",
          flags,
          closedBy: admin.session.user.id,
        })
        .where(and(eq(visits.id, visitId), isNull(visits.exitAt)));

      await tx.insert(auditLog).values({
        actorId: admin.session.user.id,
        action: "visit.admin_check_out",
        entity: "visit",
        entityId: visitId,
        meta: {
          targetUserId: visit.userId,
          direction: "out",
          method: "manual",
          by: "librarian",
          flags,
        },
      });
    });
  } catch (error) {
    console.error("Librarian sign-out failed", error);

    return {
      status: "error",
      message: "The visit couldn't be signed out. Try again.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/history");
  revalidatePath("/admin/audit");

  return { status: "success", visitId };
}
