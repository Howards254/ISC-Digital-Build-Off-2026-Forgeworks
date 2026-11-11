import type { Metadata } from "next";
import { Scroll, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { FlagTags } from "@/components/admin/flag-tags";
import { AdminPagination } from "@/components/admin/pagination";
import { getAuditPage } from "@/lib/admin-data";
import type { AdminAuditEntry } from "@/lib/admin-types";
import { formatClockWithSeconds, formatShortDate } from "@/lib/time";
import { isVisitFlag, type VisitFlag } from "@/lib/visit-flags";

export const metadata: Metadata = {
  title: "Audit",
};

type AuditSearchParams = Promise<{
  page?: string | string[];
}>;

const ACTION_LABELS: Record<string, string> = {
  "visit.check_in": "Check in",
  "visit.check_out": "Check out",
  "visit.admin_check_out": "Librarian sign-out",
  "visit.auto_check_out": "Auto sign-out",
  "role.grant": "Grant role",
  "role.revoke": "Revoke role",
};

const ACTION_TONES: Record<string, string> = {
  "visit.check_in": "text-forest",
  "visit.check_out": "text-vermilion",
  "visit.admin_check_out": "text-brass",
  "visit.auto_check_out": "text-brass",
  "role.grant": "text-brass",
  "role.revoke": "text-vermilion",
};

const METHOD_LABELS: Record<string, string> = {
  qr: "QR",
  manual: "Manual",
  auto: "Automatic",
};

function actionLabel(action: string) {
  return (
    ACTION_LABELS[action] ??
    action
      .split(/[._]/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function metaString(meta: Record<string, unknown>, key: string) {
  const value = meta[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function entryFlags(entry: AdminAuditEntry): VisitFlag[] {
  const value = entry.meta.flags;

  return Array.isArray(value) ? value.filter(isVisitFlag) : [];
}

function entryDetails(entry: AdminAuditEntry) {
  const details: string[] = [];
  const email = metaString(entry.meta, "email");
  const role = metaString(entry.meta, "role");
  const method = metaString(entry.meta, "method");

  if (email) {
    details.push(email);
  }

  if (role) {
    details.push(role === "admin" ? "Admin role" : "Gatekeeper role");
  }

  if (entry.targetName) {
    details.push(
      entry.targetAdmissionNumber
        ? `${entry.targetName} · ${entry.targetAdmissionNumber}`
        : entry.targetName,
    );
  }

  if (entry.deviceModel && entry.deviceSerial) {
    details.push(`${entry.deviceModel} · ${entry.deviceSerial}`);
  } else if (entry.deviceSerial) {
    details.push(entry.deviceSerial);
  } else if (entry.looseSerial) {
    details.push(`Loose serial · ${entry.looseSerial}`);
  }

  if (method) {
    details.push(
      method === "auto" ? "Closed automatically" : `${METHOD_LABELS[method] ?? method} method`,
    );
  }

  return details;
}

function CompactAudit({ rows }: { rows: AdminAuditEntry[] }) {
  return (
    <ol className="mt-3 border-y border-rule xl:hidden">
      {rows.map((entry) => {
        const flags = entryFlags(entry);
        const details = entryDetails(entry);

        return (
          <li
            key={entry.id}
            className="border-b border-rule px-1 py-4 last:border-b-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div>
                <p className="font-mono text-[11px] leading-5 tracking-[0.04em] text-ink">
                  {formatClockWithSeconds(entry.createdAt)}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  {formatShortDate(entry.createdAt)}
                </p>
              </div>
              <span
                className={`stamp ${
                  ACTION_TONES[entry.action] ?? "text-ink-muted"
                }`}
              >
                {actionLabel(entry.action)}
              </span>
            </div>

            <p className="mt-2.5 font-display text-[1.25rem] leading-tight tracking-[-0.01em] text-ink">
              {entry.actorName ?? "Unknown actor"}
            </p>
            <p className="mt-0.5 break-all font-mono text-[10px] leading-4 text-ink-muted">
              {entry.actorEmail ?? "No email on record"}
            </p>

            {details.length > 0 ? (
              <ul className="mt-2 space-y-0.5">
                {details.map((detail) => (
                  <li
                    key={detail}
                    className="break-words text-xs leading-5 text-ink"
                  >
                    {detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 break-all font-mono text-[10px] leading-4 text-ink-muted">
                {entry.entity} · {entry.entityId}
              </p>
            )}

            {flags.length > 0 ? (
              <div className="mt-2">
                <FlagTags flags={flags} emptyLabel={null} />
              </div>
            ) : null}

            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
              {entry.action}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: AuditSearchParams;
}) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number.parseInt(rawPage ?? "1", 10);
  const result = await getAuditPage(
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  );

  return (
    <div>
      <header className="border-b border-rule pb-7 sm:pb-9">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <p>Audit log</p>
          <p>Read-only</p>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="font-display text-[clamp(3.2rem,7vw,5.5rem)] leading-[0.84] tracking-[-0.045em] text-ink">
              Audit
            </h1>
            <p className="mt-4 max-w-[54ch] text-sm leading-6 text-ink-muted">
              A permanent, read-only record of every check-in, check-out, and
              permission change made in Vulcan.
            </p>
          </div>
          <span className="stamp text-ink-muted">
            <ShieldCheck aria-hidden="true" size={13} weight="regular" className="mr-1.5" />
            Read-only
          </span>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          {result.total} {result.total === 1 ? "entry" : "entries"}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Newest first
        </p>
      </div>

      {result.rows.length === 0 ? (
        <div className="mt-3 border-y border-rule px-4 py-14 text-center sm:py-20">
          <Scroll
            aria-hidden="true"
            size={54}
            weight="duotone"
            className="mx-auto text-brass"
          />
          <p className="mt-5 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.015em] text-ink">
            The audit log is empty.
          </p>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-ink-muted">
            Entries appear here as soon as someone checks in, checks out, or
            changes a grant.
          </p>
        </div>
      ) : (
        <>
          <CompactAudit rows={result.rows} />
          <div className="mt-3 hidden border-y border-rule xl:block">
            <table className="w-full min-w-[58rem] border-collapse text-left">
            <caption className="sr-only">
              Audit entries, newest first
            </caption>
            <thead>
              <tr className="border-b border-rule">
                {["Time", "Actor", "Action", "Details"].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted first:pl-1 last:pr-1"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((entry) => {
                const flags = entryFlags(entry);
                const details = entryDetails(entry);

                return (
                  <tr key={entry.id} className="border-b border-rule last:border-b-0">
                    <td className="whitespace-nowrap px-3 py-3.5 align-top first:pl-1">
                      <p className="font-mono text-[11px] leading-5 tracking-[0.04em] text-ink">
                        {formatClockWithSeconds(entry.createdAt)}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                        {formatShortDate(entry.createdAt)}
                      </p>
                    </td>

                    <td className="max-w-[15rem] px-3 py-3.5 align-top">
                      <p className="text-sm leading-5 text-ink">
                        {entry.actorName ?? "Unknown actor"}
                      </p>
                      <p className="mt-0.5 break-all font-mono text-[10px] leading-4 text-ink-muted">
                        {entry.actorEmail ?? "No email on record"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3.5 align-top">
                      <span
                        className={`stamp ${
                          ACTION_TONES[entry.action] ?? "text-ink-muted"
                        }`}
                      >
                        {actionLabel(entry.action)}
                      </span>
                      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                        {entry.action}
                      </p>
                    </td>

                    <td className="max-w-[28rem] px-3 py-3.5 align-top last:pr-1">
                      {details.length > 0 ? (
                        <ul className="space-y-0.5">
                          {details.map((detail) => (
                            <li
                              key={detail}
                              className="break-words text-xs leading-5 text-ink"
                            >
                              {detail}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="break-all font-mono text-[10px] leading-4 text-ink-muted">
                          {entry.entity} · {entry.entityId}
                        </p>
                      )}

                      {flags.length > 0 ? (
                        <div className="mt-1.5">
                          <FlagTags flags={flags} emptyLabel={null} />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}

      <AdminPagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        unit="entries"
        hrefForPage={(page) =>
          page > 1 ? `/admin/audit?page=${page}` : "/admin/audit"
        }
      />
    </div>
  );
}
