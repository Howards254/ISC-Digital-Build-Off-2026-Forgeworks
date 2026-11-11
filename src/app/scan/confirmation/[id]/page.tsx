import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { LiveClock } from "@/components/live-clock";
import type { VisitFlag } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { isUuid } from "@/lib/api";
import { canOpenDoor } from "@/lib/roles";
import { getVisitForConfirmation } from "@/lib/scan-data";
import {
  formatClock,
  formatDayLabel,
  getSchoolTimeZone,
} from "@/lib/time";

export const metadata: Metadata = {
  title: "Door pass",
  description:
    "A paper-style pass confirming an entry or exit in the library ledger.",
};

const FLAG_NOTES: Partial<Record<VisitFlag, string>> = {
  no_tap_out:
    "The visit was still open at closing time or when the member returned.",
  no_matching_entry: "No matching entry was open for this exit.",
  manual: "Recorded manually at the door.",
  borrowed: "Borrowed laptop.",
  no_device: "No device recorded.",
  unregistered_device: "The borrowed serial is not on the register.",
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([requireSession(), params]);

  if (!isUuid(id)) {
    notFound();
  }

  const visit = await getVisitForConfirmation(id);

  if (!visit) {
    notFound();
  }

  const isStaff = canOpenDoor(session.user.role);

  if (!isStaff && visit.userId !== session.user.id) {
    notFound();
  }

  const isEntry = visit.direction === "in";
  const eventAt = isEntry ? visit.entryAt : (visit.exitAt ?? visit.entryAt);
  const deviceLabel = visit.deviceModel
    ? `${visit.deviceModel} · ${visit.deviceSerial}`
    : visit.looseSerial
      ? `Borrowed serial · ${visit.looseSerial}`
      : "No device";
  const notes = visit.flags
    .map((flag) => FLAG_NOTES[flag])
    .filter((note): note is string => Boolean(note));
  const timeZone = getSchoolTimeZone();

  return (
    <div className="pass-screen">
      <div aria-hidden="true" className="pass-hatch" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[820px] flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pass-rule pb-3">
          <p className="pass-label">Vulcan · Door pass</p>
          <div className="flex items-center gap-4">
            <p className="pass-label">{formatDayLabel(eventAt)}</p>
            <LiveClock
              initialIso={new Date().toISOString()}
              timeZone={timeZone}
              className="pass-clock text-[11px] tracking-[0.08em]"
            />
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="pass-label">
                {isEntry ? "Entry recorded" : "Exit recorded"}
              </p>
              <h1 className="mt-2 max-w-[16ch] break-words font-display text-[clamp(2.8rem,9vw,5.5rem)] leading-[0.9] tracking-[-0.035em] text-[var(--pass-ink)]">
                {visit.name}
              </h1>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--pass-muted)]">
                Admission {visit.admissionNumber ?? "not recorded"}
              </p>
            </div>

            <div
              role="img"
              aria-label={`${isEntry ? "Entry" : "Exit"} stamp`}
              className={`confirmation-stamp ${isEntry ? "stamp-in" : "stamp-out"}`}
            >
              <span>{isEntry ? "IN" : "OUT"}</span>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-4 border-y pass-rule py-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-baseline">
            <div>
              <dt className="pass-label">Time</dt>
              <dd className="pass-clock mt-1 text-[1.3rem] leading-none">
                {formatClock(eventAt)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="pass-label">Laptop</dt>
              <dd className="mt-1 break-words text-sm font-medium leading-6 text-[var(--pass-ink)]">
                {deviceLabel}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1 sm:text-right">
              <dt className="pass-label">Record</dt>
              <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--pass-muted)]">
                {visit.exitMethod === "auto"
                  ? "Automatic close"
                  : visit.entryMethod === "manual" ||
                      visit.exitMethod === "manual"
                    ? "Manual desk entry"
                    : "Door scan"}
              </dd>
            </div>
          </dl>

          {visit.devicePhotoUrl ? (
            <figure
              className={`mt-6 ${
                isEntry ? "pass-photo-in" : "pass-photo-out"
              }`}
            >
              {/* Blob URLs are already resized and are not run through an optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visit.devicePhotoUrl}
                alt={`Photo of ${visit.deviceModel ?? "the recorded laptop"}`}
                loading="eager"
                decoding="async"
                className="block w-full object-cover"
              />
              <figcaption className="pass-label mt-2">
                {visit.deviceModel} · {visit.deviceSerial}
              </figcaption>
            </figure>
          ) : null}

          {notes.length > 0 ? (
            <ul className="mt-5 space-y-1.5 border-t pass-rule pt-4">
              {notes.map((note) => (
                <li
                  key={note}
                  className="text-sm leading-6 text-[var(--pass-muted)]"
                >
                  {note}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-8 font-display text-[clamp(1.5rem,4vw,2.1rem)] leading-tight tracking-[-0.02em] text-[var(--pass-ink)]">
            Show this to the gatekeeper.
          </p>
        </main>

        <footer className="flex flex-wrap items-center gap-3 border-t pass-rule pt-4">
          {isStaff ? (
            <>
              <Link
                href={`/door/${visit.direction}`}
                className="pass-button"
              >
                <ArrowLeft aria-hidden="true" size={17} weight="regular" />
                Back to door
              </Link>
              <Link
                href={`/door/manual?dir=${visit.direction}`}
                className="pass-button-secondary"
              >
                Manual lookup
                <ArrowRight aria-hidden="true" size={17} weight="regular" />
              </Link>
            </>
          ) : (
            <Link href="/me" className="pass-button">
              Done
              <ArrowRight aria-hidden="true" size={17} weight="regular" />
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
