import { cache } from "react";
import { redirect } from "next/navigation";

import { auth, getEffectiveRole } from "@/auth";
import type { UserRole } from "@/db/schema";

/**
 * Resolve the effective role from the database. Auth.js keeps a role snapshot
 * in the JWT for rendering, but privileged pages and handlers must not trust
 * that snapshot: removing a grant has to take effect on the next request.
 */
export const getFreshRole = cache(async (email: string): Promise<UserRole> => {
  return getEffectiveRole(email);
});

/**
 * Server-side route guard. Every authenticated page and API handler that needs
 * a session should start here rather than trusting client state.
 */
export async function requireSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/?auth=required");
  }

  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireSession();

  if (!roles.includes(session.user.role)) {
    redirect("/me");
  }

  return session;
}

/**
 * Fresh-role guard used by the librarian area. Unlike requireRole, this checks
 * role_grants and ADMIN_EMAILS again on every request.
 */
export async function requireFreshRole(...roles: UserRole[]) {
  const session = await requireSession();
  const role = session.user.email
    ? await getFreshRole(session.user.email)
    : "member";

  if (!roles.includes(role)) {
    redirect("/me");
  }

  return { session, role };
}

export async function requireAdmin() {
  return requireFreshRole("admin");
}

export async function getAdminSession() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  const role = await getFreshRole(session.user.email);

  if (role !== "admin") {
    return null;
  }

  return { session, role };
}
