import type { UserRole } from "@/db/schema";

export const ROLE_LABELS: Record<UserRole, string> = {
  member: "Member",
  gatekeeper: "Gatekeeper",
  admin: "Admin",
};

export function canOpenDoor(role: UserRole): boolean {
  return role === "gatekeeper" || role === "admin";
}

export function getInitials(name?: string | null): string {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");

  return initials.join("") || "?";
}
