import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { signInWithSchoolAccount } from "@/app/actions";
import { auth } from "@/auth";
import { ScanExitForm } from "@/components/scan/scan-exit-form";
import { ScanForm } from "@/components/scan/scan-form";
import { ScanShell } from "@/components/scan/scan-shell";
import { SchoolSignInButton } from "@/components/school-sign-in-button";
import {
  DOOR_CONFIG_MESSAGE,
  DOOR_INVALID_MESSAGE,
  verifyDoorToken,
} from "@/lib/door-token";
import { getScanMember } from "@/lib/scan-data";
import { formatClock } from "@/lib/time";

export const metadata: Metadata = {
  title: "Door scan",
  description:
    "Scan the library door code to record an entry or exit in the Vulcan ledger.",
};

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";
  const scanPath = token ? `/scan?t=${encodeURIComponent(token)}` : "/scan";
  const verified = token
    ? await verifyDoorToken(token)
    : ({ ok: false, reason: "invalid" } as const);
  const session = await auth();

  if (!verified.ok) {
    if (verified.reason === "expired") {
      redirect("/scan/expired");
    }

    const message =
      verified.reason === "config"
        ? DOOR_CONFIG_MESSAGE
        : DOOR_INVALID_MESSAGE;

    return (
      <ScanShell eyebrow="Door code" title="Scan the code again.">
        <div className="flex items-start gap-3 border-y border-rule py-4">
          <WarningCircle
            aria-hidden="true"
            size={22}
            weight="regular"
            className="mt-0.5 shrink-0 text-vermilion"
          />
          <div>
            <p role="alert" className="text-[1.0625rem] leading-7 text-ink">
              {message}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Door codes last one minute and work only for the direction shown
              on the screen.
            </p>
          </div>
        </div>

        <Link href="/me" className="button-secondary mt-6">
          Open your page
        </Link>
      </ScanShell>
    );
  }

  if (!session?.user?.id) {
    return (
      <ScanShell eyebrow="Door scan" title="Sign in to scan.">
        <p className="max-w-[54ch] text-[1.0625rem] leading-7 text-ink-muted">
          The door code is still waiting. Sign in with your school account and
          you will come straight back to this scan.
        </p>
        <form action={signInWithSchoolAccount} className="mt-6">
          <input type="hidden" name="returnTo" value={scanPath} />
          <SchoolSignInButton label="Sign in and continue" />
        </form>
        <p className="mt-3 font-mono text-[10px] leading-5 text-ink-muted">
          Verified school Google accounts only.
        </p>
      </ScanShell>
    );
  }

  const member = await getScanMember(session.user.id);

  if (!member) {
    return (
      <ScanShell eyebrow="Door scan" title="Your record is missing.">
        <p role="alert" className="text-sm leading-6 text-vermilion">
          Your member record could not be found. Ask the librarian to check it.
        </p>
        <Link href="/me" className="button-secondary mt-6">
          Open your page
        </Link>
      </ScanShell>
    );
  }

  if (!member.admissionNumber) {
    redirect(`/me?next=${encodeURIComponent(scanPath)}&reason=admission`);
  }

  const direction = verified.direction;
  const isEntry = direction === "in";
  const openVisit = member.openVisit;
  const deviceLabel = openVisit
    ? openVisit.deviceModel
      ? `${openVisit.deviceModel} · ${openVisit.deviceSerial}`
      : openVisit.looseSerial
        ? `Borrowed serial · ${openVisit.looseSerial}`
        : "No device"
    : null;

  return (
    <ScanShell
      eyebrow={`${isEntry ? "Entry" : "Exit"} · 60-second door code`}
      title={isEntry ? "Sign the entry." : "Sign the exit."}
      aside={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="break-words font-display text-[1.45rem] leading-tight tracking-[-0.01em] text-ink">
              {member.name}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              Admission {member.admissionNumber}
            </p>
          </div>
          <span
            className={`stamp ${isEntry ? "text-forest" : "text-vermilion"}`}
          >
            {isEntry ? "Entry" : "Exit"}
          </span>
        </div>
      }
    >
      {isEntry ? (
        <>
          <p className="max-w-[56ch] text-sm leading-6 text-ink-muted">
            Choose the laptop you are bringing inside. If you borrowed one
            without registering it, enter the serial from the sticker.
          </p>
          <ScanForm
            token={token}
            laptops={member.laptops}
            defaultDeviceId={openVisit?.deviceId ?? null}
          />
        </>
      ) : (
        <>
          {openVisit ? (
            <dl className="divide-y divide-rule border-y border-rule">
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  Entered
                </dt>
                <dd className="text-right font-mono text-sm tabular-nums text-ink">
                  {formatClock(openVisit.entryAt)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  Laptop
                </dt>
                <dd className="max-w-[70%] break-words text-right text-sm text-ink">
                  {deviceLabel}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="border-y border-rule py-3.5 text-sm leading-6 text-ink-muted">
              You have no open entry on the ledger. This exit will be recorded
              with a note that no matching entry was found.
            </p>
          )}

          <ScanExitForm token={token} hasOpenVisit={Boolean(openVisit)} />
        </>
      )}
    </ScanShell>
  );
}
