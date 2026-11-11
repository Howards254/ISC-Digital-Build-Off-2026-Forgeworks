import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { and, eq, gt, isNull, or } from "drizzle-orm";

import { getDb } from "@/db";
import { roleGrants, users, type UserRole } from "@/db/schema";

const ROLE_REFRESH_MS = 5 * 60 * 1000;

export function getSchoolDomain(): string {
  return (process.env.SCHOOL_DOMAIN ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSchoolEmail(email: string): boolean {
  const domain = getSchoolDomain();
  const normalized = normalizeEmail(email);

  if (!domain || normalized.split("@").length !== 2) {
    return false;
  }

  return normalized.endsWith(`@${domain}`);
}

export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);

  return admins.includes(normalizeEmail(email));
}

export async function getEffectiveRole(email: string): Promise<UserRole> {
  if (isAdminEmail(email)) {
    return "admin";
  }

  const [grant] = await getDb()
    .select({ role: roleGrants.role })
    .from(roleGrants)
    .where(
      and(
        eq(roleGrants.email, normalizeEmail(email)),
        or(isNull(roleGrants.endsAt), gt(roleGrants.endsAt, new Date())),
      ),
    )
    .limit(1);

  return grant?.role ?? "member";
}

const schoolDomain = getSchoolDomain();
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => normalizeEmail(value))
  .filter(Boolean);
// Google's `hd` parameter confines the account chooser to a Workspace domain.
// Omit it when an allowlisted admin lives outside the school so that account
// can still reach the chooser. The server-side signIn gate remains authoritative.
const hasExternalAdmin = adminEmails.some(
  (email) => !schoolDomain || !email.endsWith(`@${schoolDomain}`),
);
const hostedDomain =
  schoolDomain &&
  !["gmail.com", "googlemail.com"].includes(schoolDomain) &&
  !hasExternalAdmin
    ? schoolDomain
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
          ...(hostedDomain ? { hd: hostedDomain } : {}),
        },
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      const googleProfile = profile as
        | {
            email?: string | null;
            email_verified?: boolean | null;
          }
        | undefined;

      if (!googleProfile?.email || googleProfile.email_verified !== true) {
        return false;
      }

      // Explicitly allowlisted admins may live outside the school domain.
      // Everyone else still passes through the domain gate.
      return (
        isSchoolEmail(googleProfile.email) ||
        isAdminEmail(googleProfile.email)
      );
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const email = normalizeEmail(user.email);
        const role = await getEffectiveRole(email);
        const name = user.name?.trim() || email;

        const [record] = await getDb()
          .insert(users)
          .values({
            email,
            name,
            image: user.image ?? null,
            role,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name,
              image: user.image ?? null,
              role,
            },
          })
          .returning({
            id: users.id,
            role: users.role,
            name: users.name,
            image: users.image,
          });

        token.userId = record.id;
        token.role = record.role;
        token.name = record.name;
        token.picture = record.image;
        token.email = email;
        token.roleCheckedAt = Date.now();
      } else if (token.email && token.userId) {
        const checkedAt =
          typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;

        if (Date.now() - checkedAt > ROLE_REFRESH_MS) {
          const role = await getEffectiveRole(token.email);

          if (role !== token.role) {
            await getDb()
              .update(users)
              .set({ role })
              .where(eq(users.id, token.userId));
            token.role = role;
          }

          token.roleCheckedAt = Date.now();
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.role = token.role ?? "member";
      }

      return session;
    },
  },
});
