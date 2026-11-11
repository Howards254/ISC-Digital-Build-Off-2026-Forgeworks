import Link from "next/link";

import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getFreshRole } from "@/lib/authz";

export async function TopBar() {
  const session = await auth();
  const role = session?.user?.email
    ? await getFreshRole(session.user.email)
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-4 px-5 sm:h-[68px] sm:px-8">
        <Link
          href="/"
          aria-label="Vulcan home"
          className="flex min-h-11 items-center gap-2.5 rounded-md"
        >
          <span
            aria-hidden="true"
            className="relative grid size-8 place-items-center rounded-xs border border-forest font-display text-lg leading-none text-forest"
          >
            V
            <span className="absolute -right-px -top-px size-1.5 bg-vermilion" />
          </span>
          <span className="font-display text-[1.6rem] leading-none tracking-[-0.02em] text-ink">
            Vulcan
          </span>
          <span className="hidden border-l border-rule pl-3 font-mono text-[11px] uppercase leading-tight tracking-[0.14em] text-ink-muted md:block">
            Library
            <br />
            ledger
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1.5">
          <ThemeToggle />
          {session?.user ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              role={role ?? session.user.role}
            />
          ) : (
            <Link
              href="/#sign-in"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-150 hover:text-forest hover:decoration-forest"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
