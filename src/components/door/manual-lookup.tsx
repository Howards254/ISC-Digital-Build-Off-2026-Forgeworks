"use client";

import {
  ArrowLeft,
  ArrowsClockwise,
  CaretRight,
  Clock,
  MagnifyingGlass,
  SpinnerGap,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { submitManualScan, type ManualScanState } from "@/app/door/manual/actions";
import { LiveClock } from "@/components/live-clock";
import { DevicePicker } from "@/components/scan/device-picker";
import type { DoorDirection } from "@/lib/door-token";
import type { ScanLaptop } from "@/lib/scan-data";

type LookupOpenVisit = {
  id: string;
  entryAt: string;
  entryTime: string;
  deviceId: string | null;
  looseSerial: string | null;
  deviceModel: string | null;
  deviceSerial: string | null;
  devicePhotoUrl: string | null;
};

type LookupPerson = {
  id: string;
  name: string;
  admissionNumber: string | null;
  openVisit: LookupOpenVisit | null;
  laptops: ScanLaptop[];
};

type ManualLookupProps = {
  direction: DoorDirection;
  timeZone: string;
};

function ManualScanForm({
  person,
  direction,
}: {
  person: LookupPerson;
  direction: DoorDirection;
}) {
  const [state, formAction, pending] = useActionState<
    ManualScanState,
    FormData
  >(submitManualScan, null);
  const errorRef = useRef<HTMLDivElement>(null);
  const isEntry = direction === "in";
  const deviceLabel = person.openVisit?.deviceModel
    ? `${person.openVisit.deviceModel} · ${person.openVisit.deviceSerial}`
    : person.openVisit?.looseSerial
      ? `Borrowed serial · ${person.openVisit.looseSerial}`
      : person.openVisit
        ? "No device"
        : null;

  useEffect(() => {
    if (state?.error) {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} aria-busy={pending} className="mt-5">
      <input type="hidden" name="dir" value={direction} />
      <input type="hidden" name="targetUserId" value={person.id} />

      {isEntry ? (
        <DevicePicker
          laptops={person.laptops}
          defaultDeviceId={person.openVisit?.deviceId ?? null}
          disabled={pending}
        />
      ) : person.openVisit ? (
        <dl className="border-y door-rule">
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="door-label">Entered</dt>
            <dd className="door-clock text-sm">
              {person.openVisit.entryTime}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="door-label">Laptop</dt>
            <dd className="max-w-[70%] break-words text-right text-sm text-[var(--door-ink)]">
              {deviceLabel}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="border-y door-rule py-3.5 text-sm leading-6 text-[var(--door-muted)]">
          No entry is open. This will be saved as an exit without a matching
          entry.
        </p>
      )}

      {state?.error ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="door-alert mt-4 focus:outline-none"
        >
          <WarningCircle
            aria-hidden="true"
            size={18}
            weight="regular"
            className="mt-0.5 shrink-0 text-[var(--door-vermilion)]"
          />
          <p>{state.error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="door-button mt-5 w-full"
      >
        {pending ? (
          <SpinnerGap
            aria-hidden="true"
            size={18}
            weight="regular"
            className="animate-spin"
          />
        ) : (
          <User aria-hidden="true" size={18} weight="regular" />
        )}
        {pending
          ? `Recording ${isEntry ? "entry" : "exit"}…`
          : `Record ${isEntry ? "entry" : "exit"}`}
      </button>
    </form>
  );
}

export function ManualLookup({ direction, timeZone }: ManualLookupProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupPerson[]>([]);
  const [selected, setSelected] = useState<LookupPerson | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const isEntry = direction === "in";
  const otherDirection: DoorDirection = isEntry ? "out" : "in";

  useEffect(() => {
    const trimmed = query.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (trimmed.length < 2) {
        setResults([]);
        setSearching(false);
        setSearchError(null);
        return;
      }

      setSearching(true);

      try {
        const response = await fetch(
          `/api/door/lookup?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = (await response.json().catch(() => ({}))) as {
          people?: LookupPerson[];
          error?: string;
        };

        if (!response.ok || !Array.isArray(data.people)) {
          setSearchError(data.error ?? "The member search couldn't be completed.");
          setResults([]);
          return;
        }

        setResults(data.people);
        setSearchError(null);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setSearchError("The member search couldn't be completed.");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="door-screen">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b door-rule pb-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/door/${direction}`}
              className="door-link inline-flex items-center gap-1.5"
            >
              <ArrowLeft aria-hidden="true" size={16} weight="regular" />
              Door screen
            </Link>
            <span aria-hidden="true" className="h-5 w-px bg-[var(--door-rule)]" />
            <div>
              <p className="door-label">Vulcan · Gatekeeper</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--door-ink)]">
                Manual {isEntry ? "entry" : "exit"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <LiveClock
              initialIso={new Date().toISOString()}
              timeZone={timeZone}
              withSeconds={false}
              className="door-clock text-[1.3rem] leading-none"
            />
            <Link href={`/door/${otherDirection}`} className="door-link">
              {otherDirection === "in" ? "Entry screen" : "Exit screen"}
            </Link>
          </div>
        </header>

        <main className="grid flex-1 gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10 lg:py-9">
          <section aria-labelledby="manual-title" className="min-w-0">
            <p className="door-label">Find the member</p>
            <h1
              id="manual-title"
              className="mt-1 font-display text-[clamp(2.6rem,6vw,4.2rem)] leading-[0.92] tracking-[-0.03em] text-[var(--door-ink)]"
            >
              Manual {isEntry ? "entry" : "exit"}.
            </h1>
            <p className="door-muted mt-3 max-w-[52ch] text-sm leading-6">
              Search by name or admission number. Use this when a member cannot
              scan the door code. Every manual record is flagged on the visit.
            </p>

            <div className="relative mt-5">
              <label htmlFor="member-search" className="sr-only">
                Search by name or admission number
              </label>
              <MagnifyingGlass
                aria-hidden="true"
                size={18}
                weight="regular"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--door-muted)]"
              />
              <input
                id="member-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchError(null);
                }}
                placeholder="Name or admission number"
                autoComplete="off"
                spellCheck={false}
                className="door-input door-input-search w-full"
              />
              {searching ? (
                <SpinnerGap
                  aria-hidden="true"
                  size={17}
                  weight="regular"
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--door-brass)]"
                />
              ) : null}
            </div>

            <div className="mt-5">
              {searchError ? (
                <div role="alert" className="door-alert">
                  <WarningCircle
                    aria-hidden="true"
                    size={18}
                    weight="regular"
                    className="mt-0.5 shrink-0 text-[var(--door-vermilion)]"
                  />
                  <p>{searchError}</p>
                </div>
              ) : query.trim().length < 2 ? (
                <p className="door-muted border-y door-rule py-4 text-sm leading-6">
                  Start typing at least two characters to search the register.
                </p>
              ) : results.length === 0 && !searching ? (
                <p className="door-muted border-y door-rule py-4 text-sm leading-6">
                  No member matches “{query.trim()}”.
                </p>
              ) : (
                <ul className="border-t door-rule" aria-live="polite">
                  {results.map((person) => {
                    const active = selected?.id === person.id;

                    return (
                      <li key={person.id} className="border-b door-rule">
                        <button
                          type="button"
                          onClick={() => setSelected(person)}
                          aria-pressed={active}
                          className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-1 py-3.5 text-left transition-colors duration-150 ${
                            active
                              ? "bg-[rgba(124,196,163,0.1)]"
                              : "hover:bg-[rgba(242,236,221,0.04)]"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <span className="break-words text-[0.9375rem] font-semibold leading-5 text-[var(--door-ink)]">
                                {person.name}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--door-muted)]">
                                {person.admissionNumber ?? "No admission"}
                              </span>
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] leading-4 text-[var(--door-muted)]">
                              <span>
                                {person.openVisit
                                  ? `Inside since ${person.openVisit.entryTime}`
                                  : "Away"}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {person.laptops.length === 1
                                  ? "1 laptop"
                                  : `${person.laptops.length} laptops`}
                              </span>
                            </span>
                          </span>
                          <CaretRight
                            aria-hidden="true"
                            size={17}
                            weight="regular"
                            className={
                              active
                                ? "text-[var(--door-forest)]"
                                : "text-[var(--door-muted)]"
                            }
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <aside aria-labelledby="selected-title" className="door-panel h-fit p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="selected-title" className="door-label">
                Selected member
              </h2>
              {selected ? (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="door-link text-[10px] uppercase tracking-[0.12em]"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {selected ? (
              <div className="mt-4">
                <p className="break-words font-display text-[1.7rem] leading-tight tracking-[-0.015em] text-[var(--door-ink)]">
                  {selected.name}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--door-muted)]">
                  Admission {selected.admissionNumber ?? "not recorded"}
                </p>
                <p className="door-muted mt-3 flex items-center gap-1.5 text-sm leading-6">
                  <Clock aria-hidden="true" size={15} weight="regular" />
                  {selected.openVisit
                    ? `Inside since ${selected.openVisit.entryTime}`
                    : "No open visit"}
                </p>

                <ManualScanForm
                  key={`${selected.id}:${direction}:${selected.openVisit?.id ?? "none"}`}
                  person={selected}
                  direction={direction}
                />
              </div>
            ) : (
              <div className="mt-4 border-y door-rule py-8 text-center">
                <ArrowsClockwise
                  aria-hidden="true"
                  size={30}
                  weight="duotone"
                  className="mx-auto text-[var(--door-brass)]"
                />
                <p className="door-muted mt-3 text-sm leading-6">
                  Choose a member from the search results to record a{" "}
                  {isEntry ? "entry" : "exit"}.
                </p>
              </div>
            )}
          </aside>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t door-rule pt-3">
          <p className="door-label">
            Manual records carry the manual flag on the visit.
          </p>
          <p className="door-label">
            {isEntry ? "Entry" : "Exit"} · gatekeeper access only
          </p>
        </footer>
      </div>
    </div>
  );
}
