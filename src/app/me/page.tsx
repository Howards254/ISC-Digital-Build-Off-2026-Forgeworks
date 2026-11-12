import type { Metadata } from "next";
import Link from "next/link";
import {
  Laptop as LaptopIcon,
  LockKey,
  Plus,
  QrCode,
} from "@phosphor-icons/react/dist/ssr";

import { AdmissionNumberForm } from "@/components/member/admission-number-form";
import { LaptopRow } from "@/components/member/laptop-row";
import { requireSession } from "@/lib/authz";
import { getMemberOverview } from "@/lib/member-data";
import { safeInternalPath } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/roles";
import {
  formatClock,
  formatDayLabel,
  getFirstName,
  getGreeting,
} from "@/lib/time";

export const metadata: Metadata = {
  title: "Your page",
  description:
    "Your library state, admission number, and registered laptops at a glance.",
};

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const [session, query] = await Promise.all([requireSession(), searchParams]);
  const { member, openVisit, laptops } = await getMemberOverview(session.user.id);
  const now = new Date();
  const name = member?.name ?? session.user.name ?? "";
  const email = member?.email ?? session.user.email ?? "";
  const admissionNumber = member?.admissionNumber?.trim() || null;
  const firstName = getFirstName(name, email);
  const returnTo = safeInternalPath(query.next, null);
  const admissionReminder =
    query.reason === "admission" && !admissionNumber;
  const laptopLabel =
    laptops.length === 1 ? "01 laptop" : `${String(laptops.length).padStart(2, "0")} laptops`;

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        <p>Your page · {formatDayLabel(now)}</p>
        {admissionNumber ? (
          <p className="stamp max-w-[15rem] truncate normal-case tracking-[0.1em] text-ink-muted">
            Admission {admissionNumber}
          </p>
        ) : (
          <p className="stamp text-vermilion">Admission needed</p>
        )}
      </div>

      <header className="mt-6 border-b border-rule pb-8 sm:pb-10">
        <h1 className="max-w-[20ch] break-words font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[0.95] tracking-[-0.03em] text-ink">
          {getGreeting(now)},{" "}
          <span className="text-forest">{firstName}.</span>
        </h1>
      </header>

      {admissionReminder ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 border-y border-rule py-3.5"
        >
          <span className="stamp mt-0.5 shrink-0 text-vermilion">
            Before the door
          </span>
          <p className="text-sm leading-6 text-ink-muted">
            Add your admission number to finish scanning and return to the door
            code.
          </p>
        </div>
      ) : null}

      <section
        aria-labelledby="library-status"
        className="border-b border-rule py-6 sm:py-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="library-status"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted"
          >
            Library status
          </h2>
          <p
            className={`stamp ${
              openVisit ? "text-forest" : "text-ink-muted"
            }`}
          >
            {openVisit ? "In library" : "Away"}
          </p>
        </div>

        <div className="mt-4 flex items-start gap-3 sm:mt-5">
          <span
            aria-hidden="true"
            className={`grid size-11 shrink-0 place-items-center rounded-sm border border-rule ${
              openVisit
                ? "bg-wash text-forest"
                : "bg-surface text-ink-muted"
            }`}
          >
            <LaptopIcon
              size={24}
              weight={openVisit ? "duotone" : "regular"}
            />
          </span>

          <div className="min-w-0">
            {openVisit ? (
              <p className="font-display text-[1.7rem] leading-tight tracking-[-0.015em] text-ink">
                Signed in at{" "}
                <time
                  dateTime={openVisit.entryAt.toISOString()}
                  className="tabular-nums"
                >
                  {formatClock(openVisit.entryAt)}
                </time>
              </p>
            ) : (
              <p className="font-display text-[1.7rem] leading-tight tracking-[-0.015em] text-ink">
                Not in the library
              </p>
            )}

            <p className="mt-1.5 flex items-center gap-1.5 text-sm leading-6 text-ink-muted">
              <QrCode aria-hidden="true" size={15} weight="regular" />
              Scan the code at the door to enter.
            </p>

            {!admissionNumber ? (
              <p className="mt-1.5 text-sm leading-6 text-vermilion">
                <a
                  href="#admission"
                  className="inline-flex min-h-11 items-center underline decoration-1 underline-offset-4"
                >
                  Add your admission number before your first scan.
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12 lg:pt-10">
        <section aria-labelledby="my-laptops">
          <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                On the register
              </p>
              <h2
                id="my-laptops"
                className="mt-1 font-display text-[2rem] leading-none tracking-[-0.02em] text-ink sm:text-[2.25rem]"
              >
                My laptops
              </h2>
            </div>
            <Link href="/me/laptops/new" className="button-primary">
              <Plus aria-hidden="true" size={18} weight="regular" />
              Add laptop
            </Link>
          </div>

          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            {laptopLabel}
          </p>

          {laptops.length > 0 ? (
            <ul className="mt-5 divide-y divide-rule border-y border-rule">
              {laptops.map((laptop) => (
                <LaptopRow key={laptop.id} laptop={laptop} />
              ))}
            </ul>
          ) : (
            <div className="mt-5 border-y border-rule px-4 py-12 text-center sm:py-16">
              <LaptopIcon
                aria-hidden="true"
                size={50}
                weight="duotone"
                className="mx-auto text-brass"
              />
              <p className="mt-4 font-display text-[1.5rem] leading-tight text-ink">
                No laptops on the ledger yet.
              </p>
              <p className="mx-auto mt-2 max-w-[38ch] text-sm leading-6 text-ink-muted">
                Add the laptop you bring to the library so it can be matched to
                your visits.
              </p>
            </div>
          )}

          <p className="mt-4 flex max-w-[52ch] items-start gap-2 font-mono text-[11px] leading-5 text-ink-muted">
            <LockKey
              aria-hidden="true"
              size={14}
              weight="regular"
              className="mt-0.5 shrink-0"
            />
            Only you and the librarian can see or change these records.
          </p>
        </section>

        <aside
          id="admission"
          aria-labelledby="record-title"
          className="scroll-mt-24 border-t border-rule pt-7 lg:sticky lg:top-28 lg:self-start lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Before the door
          </p>
          <h2
            id="record-title"
            className="mt-1 font-display text-[1.9rem] leading-none tracking-[-0.02em] text-ink"
          >
            Your record
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            {admissionNumber
              ? "Your admission number is on the register. Keep it current so the door can match you to your visits."
              : "Add the number from your school card. It is needed before your first scan at the door."}
          </p>

          <AdmissionNumberForm
            initialValue={admissionNumber}
            email={email}
            returnTo={returnTo}
          />

          <dl className="mt-8 divide-y divide-rule border-y border-rule">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Role
              </dt>
              <dd className="text-right text-sm font-medium text-ink">
                {ROLE_LABELS[session.user.role]}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Laptops
              </dt>
              <dd className="text-right text-sm font-medium text-ink">
                {laptops.length} active
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Email
              </dt>
              <dd className="max-w-[12rem] break-all text-right font-mono text-[11px] leading-4 text-ink-muted">
                {email}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
