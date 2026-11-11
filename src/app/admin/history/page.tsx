import type { Metadata } from "next";
import Link from "next/link";
import {
  DownloadSimple,
  FunnelSimple,
  ListMagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";

import { FlagTags } from "@/components/admin/flag-tags";
import { AdminPagination } from "@/components/admin/pagination";
import {
  getHistoryPage,
  parseHistoryFilters,
  type AdminHistoryFilters,
} from "@/lib/admin-data";
import type { AdminHistoryRow } from "@/lib/admin-types";
import { getSchoolDateInput } from "@/lib/school-date";
import {
  formatClock,
  formatDayMonth,
  formatDuration,
} from "@/lib/time";
import { VISIT_FLAGS, VISIT_FLAG_INFO } from "@/lib/visit-flags";

export const metadata: Metadata = {
  title: "History",
};

type HistorySearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function CompactHistory({ rows }: { rows: AdminHistoryRow[] }) {
  return (
    <ol className="mt-3 border-y border-rule xl:hidden">
      {rows.map((row) => (
        <li
          key={row.id}
          className="border-b border-rule px-1 py-4 last:border-b-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div>
              <p className="font-mono text-[11px] leading-5 tracking-[0.04em] text-ink">
                {formatClock(row.entryAt)}
                <span className="px-1.5 text-ink-muted">→</span>
                {row.exitAt ? (
                  formatClock(row.exitAt)
                ) : (
                  <span className="text-forest">Inside</span>
                )}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                {formatDayMonth(row.entryAt)} ·{" "}
                {formatDuration(row.entryAt, row.exitAt)}
              </p>
            </div>
            <FlagTags flags={row.flags} emptyLabel="—" />
          </div>

          <div className="mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="font-display text-[1.25rem] leading-tight tracking-[-0.01em] text-ink">
                {row.name}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                {row.admissionNumber ?? "No admission"}
              </p>
            </div>

            <div className="min-w-0">
              {row.deviceModel || row.deviceSerial || row.looseSerial ? (
                <>
                  <p className="text-sm leading-5 text-ink">
                    {row.deviceModel ?? "Loose laptop"}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                    {row.deviceSerial
                      ? row.deviceSerial
                      : `Loose · ${row.looseSerial}`}
                  </p>
                </>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  No device
                </p>
              )}
            </div>
          </div>

          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
            In <span className="text-forest">{row.entryMethod}</span>
            <span className="px-1.5">·</span>
            Out{" "}
            <span className={row.exitMethod ? "text-vermilion" : ""}>
              {row.exitMethod ?? "—"}
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function historyQuery(filters: AdminHistoryFilters, page?: number) {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  });

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.flag) {
    params.set("flag", filters.flag);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  return params.toString();
}

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: HistorySearchParams;
}) {
  const params = await searchParams;
  const filters = parseHistoryFilters(params);
  const result = await getHistoryPage(filters);
  const today = getSchoolDateInput();
  const filtered =
    filters.from !== today ||
    filters.to !== today ||
    Boolean(filters.query) ||
    Boolean(filters.flag);
  const exportHref = `/admin/history/export?${historyQuery(filters)}`;

  return (
    <div>
      <header className="border-b border-rule pb-7 sm:pb-9">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <p>Visit ledger</p>
          <p>The reading room archive</p>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <h1 className="font-display text-[clamp(3.2rem,7vw,5.5rem)] leading-[0.84] tracking-[-0.045em] text-ink">
              History
            </h1>
            <p className="mt-4 max-w-[54ch] text-sm leading-6 text-ink-muted">
              Every signature, in and out. Filter the ledger by day, person,
              admission number, serial or flag.
            </p>
          </div>

          <a href={exportHref} download className="button-secondary">
            <DownloadSimple aria-hidden="true" size={17} weight="regular" />
            Export CSV
          </a>
        </div>
      </header>

      <form
        action="/admin/history"
        method="get"
        className="mt-6 border-y border-rule py-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <FunnelSimple aria-hidden="true" size={14} weight="regular" />
            Filter the ledger
          </p>
          <Link
            href="/admin/history"
            className="text-link text-xs font-medium text-ink-muted"
          >
            Reset to today
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_9rem_minmax(0,1fr)_11rem_auto] lg:items-end">
          <div>
            <label htmlFor="history-from" className="field-label">
              From
            </label>
            <input
              id="history-from"
              name="from"
              type="date"
              defaultValue={filters.from}
              className="field-input mt-1.5"
            />
          </div>

          <div>
            <label htmlFor="history-to" className="field-label">
              To
            </label>
            <input
              id="history-to"
              name="to"
              type="date"
              defaultValue={filters.to}
              className="field-input mt-1.5"
            />
          </div>

          <div>
            <label htmlFor="history-query" className="field-label">
              Name, admission or serial
            </label>
            <input
              id="history-query"
              name="q"
              type="search"
              maxLength={80}
              defaultValue={filters.query}
              placeholder="Search the register"
              className="field-input mt-1.5"
            />
          </div>

          <div>
            <label htmlFor="history-flag" className="field-label">
              Flag
            </label>
            <select
              id="history-flag"
              name="flag"
              defaultValue={filters.flag ?? ""}
              className="field-input mt-1.5"
            >
              <option value="">Any flag</option>
              {VISIT_FLAGS.map((flag) => (
                <option key={flag} value={flag}>
                  {VISIT_FLAG_INFO[flag].label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="button-primary sm:col-span-2 lg:col-span-1">
            Apply filters
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          {result.total} {result.total === 1 ? "visit" : "visits"}
          {filtered ? " · filtered" : " · today"}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          {filters.from === filters.to
            ? filters.from
            : `${filters.from} → ${filters.to}`}
        </p>
      </div>

      {result.rows.length === 0 ? (
        <div className="mt-3 border-y border-rule px-4 py-14 text-center sm:py-20">
          <ListMagnifyingGlass
            aria-hidden="true"
            size={54}
            weight="duotone"
            className="mx-auto text-brass"
          />
          <p className="mt-5 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.015em] text-ink">
            No visits match this filter.
          </p>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-ink-muted">
            Try a wider date range, a different serial, or clear the filters to
            return to today&apos;s ledger.
          </p>
        </div>
      ) : (
        <>
          <CompactHistory rows={result.rows} />
          <div className="mt-3 hidden border-y border-rule xl:block">
            <table className="w-full min-w-[60rem] border-collapse text-left">
            <caption className="sr-only">
              Visits from {filters.from} to {filters.to}
            </caption>
            <thead>
              <tr className="border-b border-rule">
                {[
                  "Time in",
                  "Time out",
                  "Duration",
                  "Name",
                  "Laptop",
                  "Flags",
                  "Method",
                ].map((label) => (
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
              {result.rows.map((row) => (
                <tr key={row.id} className="border-b border-rule last:border-b-0">
                  <td className="px-3 py-3.5 align-top first:pl-1">
                    <p className="font-mono text-[11px] leading-5 tracking-[0.04em] text-ink">
                      {formatClock(row.entryAt)}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                      {formatDayMonth(row.entryAt)}
                    </p>
                  </td>

                  <td className="px-3 py-3.5 align-top">
                    {row.exitAt ? (
                      <>
                        <p className="font-mono text-[11px] leading-5 tracking-[0.04em] text-ink">
                          {formatClock(row.exitAt)}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                          {formatDayMonth(row.exitAt)}
                        </p>
                      </>
                    ) : (
                      <span className="stamp text-forest">Inside</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3.5 align-top font-mono text-[11px] text-ink-muted">
                    {formatDuration(row.entryAt, row.exitAt)}
                  </td>

                  <td className="px-3 py-3.5 align-top">
                    <p className="font-display text-[1.15rem] leading-tight tracking-[-0.01em] text-ink">
                      {row.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                      {row.admissionNumber ?? "No admission"}
                    </p>
                  </td>

                  <td className="max-w-[14rem] px-3 py-3.5 align-top">
                    {row.deviceModel || row.deviceSerial || row.looseSerial ? (
                      <>
                        <p className="text-sm leading-5 text-ink">
                          {row.deviceModel ?? "Loose laptop"}
                        </p>
                        <p className="mt-0.5 break-all font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                          {row.deviceSerial
                            ? row.deviceSerial
                            : `Loose · ${row.looseSerial}`}
                        </p>
                      </>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                        No device
                      </span>
                    )}
                  </td>

                  <td className="max-w-[15rem] px-3 py-3.5 align-top">
                    <FlagTags flags={row.flags} emptyLabel="—" />
                  </td>

                  <td className="whitespace-nowrap px-3 py-3.5 align-top last:pr-1">
                    <dl className="space-y-1 font-mono text-[10px] uppercase tracking-[0.08em]">
                      <div className="flex items-center gap-1.5">
                        <dt className="text-ink-muted">In</dt>
                        <dd className="text-forest">{row.entryMethod}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <dt className="text-ink-muted">Out</dt>
                        <dd className={row.exitMethod ? "text-vermilion" : "text-ink-muted"}>
                          {row.exitMethod ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <AdminPagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        unit="visits"
        hrefForPage={(page) =>
          `/admin/history?${historyQuery(filters, page)}`
        }
      />
    </div>
  );
}
