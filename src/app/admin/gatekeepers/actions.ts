"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { auditLog, roleGrants } from "@/db/schema";
import { isUuid } from "@/lib/api";
import { getAdminSession } from "@/lib/authz";
import { endOfSchoolDay, parseDateInput } from "@/lib/school-date";

export type GatekeeperActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function addGatekeeperAction(
  _previousState: GatekeeperActionState,
  formData: FormData,
): Promise<GatekeeperActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your librarian session has ended. Sign in again.",
    };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "gatekeeper");
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const schoolDomain = (process.env.SCHOOL_DOMAIN ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  if (schoolDomain && !email.endsWith(`@${schoolDomain}`)) {
    return {
      status: "error",
      message: `Use a school address ending in @${schoolDomain}.`,
    };
  }

  if (role !== "gatekeeper" && role !== "admin") {
    return { status: "error", message: "Choose a valid role." };
  }

  let endsAt: Date | null = null;

  if (endsAtRaw) {
    const parts = parseDateInput(endsAtRaw);
    const parsed = parts ? endOfSchoolDay(endsAtRaw) : null;

    if (!parsed) {
      return { status: "error", message: "Enter a valid end date." };
    }

    if (parsed.getTime() < Date.now()) {
      return {
        status: "error",
        message: "Choose an end date in the future, or leave it blank.",
      };
    }

    endsAt = parsed;
  }

  const db = getDb();
  const actorEmail = admin.session.user.email ?? "unknown";

  try {
    const [grant] = await db
      .insert(roleGrants)
      .values({
        email,
        role,
        endsAt,
        createdBy: actorEmail,
      })
      .onConflictDoUpdate({
        target: roleGrants.email,
        set: {
          role,
          endsAt,
          createdBy: actorEmail,
        },
      })
      .returning({ id: roleGrants.id });

    await db.insert(auditLog).values({
      actorId: admin.session.user.id,
      action: "role.grant",
      entity: "role_grant",
      entityId: grant?.id ?? email,
      meta: {
        email,
        role,
        endsAt: endsAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Gatekeeper grant failed", error);

    return {
      status: "error",
      message: "The gatekeeper couldn't be added. Try again.",
    };
  }

  revalidatePath("/admin/gatekeepers");
  revalidatePath("/admin/audit");

  return {
    status: "success",
    message: `${email} is now ${
      role === "admin" ? "an admin" : "a gatekeeper"
    }.`,
  };
}

export async function removeRoleGrantAction(
  _previousState: GatekeeperActionState,
  formData: FormData,
): Promise<GatekeeperActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your librarian session has ended. Sign in again.",
    };
  }

  const grantId = String(formData.get("grantId") ?? "");

  if (!isUuid(grantId)) {
    return { status: "error", message: "That grant could not be found." };
  }

  const db = getDb();
  const [grant] = await db
    .select({
      id: roleGrants.id,
      email: roleGrants.email,
      role: roleGrants.role,
    })
    .from(roleGrants)
    .where(eq(roleGrants.id, grantId))
    .limit(1);

  if (!grant) {
    revalidatePath("/admin/gatekeepers");
    return { status: "success" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(roleGrants).where(eq(roleGrants.id, grantId));

      await tx.insert(auditLog).values({
        actorId: admin.session.user.id,
        action: "role.revoke",
        entity: "role_grant",
        entityId: grant.id,
        meta: {
          email: grant.email,
          role: grant.role,
        },
      });
    });
  } catch (error) {
    console.error("Gatekeeper removal failed", error);

    return {
      status: "error",
      message: "The grant couldn't be removed. Try again.",
    };
  }

  revalidatePath("/admin/gatekeepers");
  revalidatePath("/admin/audit");

  return { status: "success" };
}
