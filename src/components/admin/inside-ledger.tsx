"use client";

import {
  SignOut as SignOutIcon,
  SpinnerGap,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  signOutVisitAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { FlagTags } from "@/components/admin/flag-tags";
import type { AdminInsideVisit } from "@/lib/admin-types";

type InsideLedgerProps = {
  initialVisits: AdminInsideVisit[];
  dayLabel: string;
  initialCheckedAt: string;
};

type InsideFeed = {
  visits: AdminInsideVisit[];
  checkedAt: string;
};

const IDLE_STATE: AdminActionState = { status: "idle" };

function SignOutForm({
  visitId,
  onSignedOut,
}: {
  visitId: string;
  onSignedOut: (visitId: string) => void;
}) {
  const [state, formAction, pending] = useActionState<
    AdminActionState,
    FormData
  >(signOutVisitAction, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success") {
      onSignedOut(visitId);
    }
  }, [onSignedOut, state.status, visitId]);

  return (
    <form action={formAction} className="flex w-full flex-col items-start gap-1.5 md:w-auto md:items-end">
      <input type="hidden" name="visitId" value={visitId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-rule bg-surface px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted transition-colors duration-150 hover:border-vermilion hover:text-vermilion disabled:cursor-wait disabled:opacity-60 md:w-auto"
      >
        {pending ? (
          <SpinnerGap aria-hidden="true" size={13} className="animate-spin" />
        ) : (
          <SignOutIcon aria-hidden="true" size={13} weight="regular" />
        )}
        Sign out
      </button>
      {state.status === "error" ? (
        <p role="alert" className="max-w-[15rem] text-right text-[11px] leading-4 text-vermilion">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function EmptyLedger() {
  return (
    <div className="border-y border-rule px-4 py-14 text-center sm:py-20">
      <UsersThree
        aria-hidden="true"
        size={58}
        weight="duotone"
        className="mx-auto text-brass"
      />
      <p className="mt-5 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.015em] text-ink">
        Nobody has signed the ledger yet.
      </p>
      <p className="mx-auto mt-2 max-w-[40ch] text-sm leading-6 text-ink-muted">
        The room is empty. New entries appear here on their own, every five
        seconds.
      </p>
    </div>
  );
}

export function InsideLedger({
  initialVisits,
  dayLabel,
  initialCheckedAt,
}: InsideLedgerProps) {
  const [visits, setVisits] = useState(initialVisits);
  const [checkedAt, setCheckedAt] = useState(initialCheckedAt);
  const [stale, setStale] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/inside", {
        cache: "no-store",
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Inside feed returned ${response.status}`);
      }

      const data = (await response.json()) as InsideFeed;
      setVisits(data.visits);
      setCheckedAt(data.checkedAt);
      setStale(false);
    } catch {
      setStale(true);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 5000);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const handleSignedOut = useCallback(
    (visitId: string) => {
      setVisits((current) => current.filter((visit) => visit.id !== visitId));
      void refresh();
    },
    [refresh],
  );

  return (
    <>
      <header className="border-b border-rule pb-8 sm:pb-10">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          <p>Who&apos;s inside</p>
          <p>{dayLabel}</p>
        </div>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <h1 className="font-display text-[clamp(4.5rem,12vw,9rem)] leading-[0.78] tracking-[-0.06em] text-ink">
            {visits.length} <span className="text-forest">inside</span>
          </h1>
          <p className="max-w-[27ch] pb-2 text-sm leading-6 text-ink-muted">
            Every open visit in the building. The ledger refreshes itself every
            five seconds.
          </p>
        </div>
      </header>

      <section aria-labelledby="open-visits" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="open-visits"
            className="font-display text-[1.8rem] leading-none tracking-[-0.02em] text-ink"
          >
            Open visits
          </h2>
          <p
            aria-live="polite"
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted"
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                stale ? "bg-vermilion" : "bg-forest"
              }`}
            />
            {stale ? "Refresh paused" : `Checked ${checkedAt}`}
          </p>
        </div>

        {stale ? (
          <p className="mt-3 flex items-start gap-2 border-y border-rule py-2.5 text-xs leading-5 text-vermilion">
            <WarningCircle
              aria-hidden="true"
              size={15}
              weight="regular"
              className="mt-0.5 shrink-0"
            />
            The live feed couldn&apos;t be reached. The list below may be a few
            seconds old.
          </p>
        ) : null}

        {visits.length === 0 ? (
          <div className="mt-5">
            <EmptyLedger />
          </div>
        ) : (
          <ol className="mt-5 border-y border-rule">
            <li
              aria-hidden="true"
              className="hidden border-b border-rule px-1 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted md:grid md:grid-cols-[5rem_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_6.5rem] md:gap-4"
            >
              <span>Time in</span>
              <span>Name</span>
              <span>Laptop</span>
              <span>Flags</span>
              <span className="text-right">Action</span>
            </li>

            {visits.map((visit) => {
              const laptopSerial = visit.deviceSerial ?? visit.looseSerial;

              return (
                <li
                  key={visit.id}
                  className="grid gap-3 border-b border-rule px-1 py-4 last:border-b-0 md:grid-cols-[5rem_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_6.5rem] md:items-start md:gap-4 md:py-3.5"
                >
                  <time
                    dateTime={visit.entryAtIso}
                    className="font-mono text-[11px] leading-5 tracking-[0.06em] text-ink md:pt-1"
                  >
                    {visit.entryTime}
                  </time>

                  <div className="min-w-0">
                    <p className="font-display text-[1.3rem] leading-tight tracking-[-0.01em] text-ink">
                      {visit.name}
                    </p>
                    <p className="mt-0.5 break-all font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                      {visit.admissionNumber ?? "No admission number"}
                    </p>
                  </div>

                  <div className="min-w-0 md:pt-0.5">
                    {visit.deviceModel || laptopSerial ? (
                      <>
                        <p className="text-sm font-medium leading-5 text-ink">
                          {visit.deviceModel ?? "Laptop"}
                        </p>
                        <p className="mt-0.5 break-all font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                          {visit.deviceSerial
                            ? visit.deviceSerial
                            : `Loose · ${visit.looseSerial}`}
                        </p>
                      </>
                    ) : (
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                        No device
                      </p>
                    )}
                  </div>

                  <div className="md:pt-0.5">
                    <FlagTags flags={visit.flags} emptyLabel="—" />
                  </div>

                  <div className="md:justify-self-end">
                    <SignOutForm
                      visitId={visit.id}
                      onSignedOut={handleSignedOut}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
