import type { Metadata } from "next";

import { AdminNav } from "@/components/admin/admin-nav";
import { FlagLegend } from "@/components/admin/flag-tags";
import { requireAdmin } from "@/lib/authz";

export const metadata: Metadata = {
  title: {
    default: "Librarian desk",
    template: "%s · Librarian desk · Vulcan",
  },
  description:
    "The librarian desk: live visits, history, laptop trails, gatekeeper grants, and the audit ledger.",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { session } = await requireAdmin();

  return (
    <div className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="border-b border-rule bg-surface lg:sticky lg:top-[68px] lg:flex lg:h-[calc(100dvh-68px)] lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-baseline justify-between gap-4 px-5 pb-4 pt-6 lg:block lg:px-5 lg:pb-6 lg:pt-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Librarian desk
            </p>
            <p className="mt-1 font-display text-[1.85rem] leading-none tracking-[-0.02em] text-ink">
              The ledger
            </p>
          </div>
          <p className="max-w-[12rem] truncate font-mono text-[11px] text-ink-muted lg:mt-3">
            {session.user.email}
          </p>
        </div>

        <AdminNav />

        <div
          role="region"
          aria-label="Visit flag key"
          tabIndex={0}
          className="hidden min-h-0 flex-1 overflow-y-auto border-t border-rule px-5 py-6 lg:block"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Flag key
          </p>
          <div className="mt-4">
            <FlagLegend />
          </div>
        </div>

        <details className="border-t border-rule px-5 py-3 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Flag key
            <span aria-hidden="true" className="font-sans text-base leading-none">
              +
            </span>
          </summary>
          <div className="pb-4 pt-2">
            <FlagLegend />
          </div>
        </details>
      </aside>

      <div className="min-w-0 px-5 pb-16 pt-7 sm:px-8 lg:px-10 lg:pb-20 lg:pt-10">
        {children}
      </div>
    </div>
  );
}
