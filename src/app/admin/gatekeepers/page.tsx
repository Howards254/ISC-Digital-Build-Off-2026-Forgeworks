import type { Metadata } from "next";
import { IdentificationBadge, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { GatekeeperForm } from "@/components/admin/gatekeeper-form";
import { RemoveGrantButton } from "@/components/admin/remove-grant-button";
import { getCurrentRoleGrants } from "@/lib/admin-data";
import type { AdminRoleGrant } from "@/lib/admin-types";
import { formatShortDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Gatekeepers",
};

function roleClass(role: AdminRoleGrant["role"]) {
  return role === "admin" ? "text-brass" : "text-forest";
}

function CompactGrants({ grants }: { grants: AdminRoleGrant[] }) {
  return (
    <ol className="mt-4 border-y border-rule xl:hidden">
      {grants.map((grant) => (
        <li
          key={grant.id}
          className="border-b border-rule px-1 py-4 last:border-b-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="break-all font-mono text-[11px] leading-5 text-ink">
                {grant.email}
              </p>
              <p className="mt-1 break-all font-mono text-[10px] uppercase leading-4 tracking-[0.08em] text-ink-muted">
                Granted by {grant.createdBy}
              </p>
            </div>
            <span className={`stamp ${roleClass(grant.role)}`}>
              {grant.role}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              {grant.endsAt
                ? `Ends ${formatShortDate(grant.endsAt)}`
                : "No end date"}
            </p>
            <RemoveGrantButton grantId={grant.id} email={grant.email} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function AdminGatekeepersPage() {
  const grants = await getCurrentRoleGrants();

  return (
    <div>
      <header className="border-b border-rule pb-7 sm:pb-9">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <p>Desk permissions</p>
          <p>Checked on every request</p>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="font-display text-[clamp(3.2rem,7vw,5.5rem)] leading-[0.84] tracking-[-0.045em] text-ink">
              Gatekeepers
            </h1>
            <p className="mt-4 max-w-[56ch] text-sm leading-6 text-ink-muted">
              Who may open the door and read the ledger. Grants live in the
              database, so a removal takes effect on the next request — not
              after a token expires.
            </p>
          </div>
          <span className="stamp text-forest">
            {grants.length} {grants.length === 1 ? "grant" : "grants"}
          </span>
        </div>
      </header>

      <section aria-labelledby="add-gatekeeper" className="border-b border-rule py-6">
        <div className="flex items-center gap-2">
          <IdentificationBadge
            aria-hidden="true"
            size={18}
            weight="duotone"
            className="text-brass"
          />
          <h2
            id="add-gatekeeper"
            className="font-display text-[1.5rem] leading-none tracking-[-0.02em] text-ink"
          >
            Add a grant
          </h2>
        </div>
        <p className="mt-2 max-w-[62ch] text-sm leading-6 text-ink-muted">
          Give a colleague the desk or the full librarian role. Leave the end
          date blank for a permanent grant.
        </p>
        <GatekeeperForm />
      </section>

      <section aria-labelledby="current-grants" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2
            id="current-grants"
            className="font-display text-[1.8rem] leading-none tracking-[-0.02em] text-ink"
          >
            Current grants
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            role_grants
          </p>
        </div>

        {grants.length === 0 ? (
          <div className="mt-4 border-y border-rule px-4 py-14 text-center sm:py-20">
            <ShieldCheck
              aria-hidden="true"
              size={54}
              weight="duotone"
              className="mx-auto text-brass"
            />
            <p className="mt-5 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.015em] text-ink">
              No gatekeepers on the ledger.
            </p>
            <p className="mx-auto mt-2 max-w-[44ch] text-sm leading-6 text-ink-muted">
              Add the first grant above. Permanent admins configured in
              ADMIN_EMAILS sit outside this ledger.
            </p>
          </div>
        ) : (
          <>
            <CompactGrants grants={grants} />
            <div className="mt-4 hidden overflow-x-auto border-y border-rule xl:block">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <caption className="sr-only">Current role grants</caption>
                <thead>
                  <tr className="border-b border-rule">
                    {["Email", "Role", "Ends", "Granted by", "Action"].map(
                      (label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted first:pl-1 last:pr-1"
                        >
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {grants.map((grant) => (
                    <tr
                      key={grant.id}
                      className="border-b border-rule last:border-b-0"
                    >
                      <td className="max-w-[20rem] px-3 py-4 align-top first:pl-1">
                        <p className="break-all font-mono text-[11px] leading-5 text-ink">
                          {grant.email}
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <span className={`stamp ${roleClass(grant.role)}`}>
                          {grant.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 align-top font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                        {grant.endsAt
                          ? formatShortDate(grant.endsAt)
                          : "No end date"}
                      </td>
                      <td className="max-w-[17rem] px-3 py-4 align-top">
                        <p className="break-all font-mono text-[11px] leading-5 text-ink-muted">
                          {grant.createdBy}
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top last:pr-1">
                        <RemoveGrantButton
                          grantId={grant.id}
                          email={grant.email}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-ink-muted">
        <ShieldCheck
          aria-hidden="true"
          size={14}
          weight="regular"
          className="mt-0.5 shrink-0"
        />
        Every admin page and action re-reads the database role, so revoking a
        grant closes the desk immediately.
      </p>
    </div>
  );
}
