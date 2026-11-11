import type { Metadata } from "next";
import {
  Barcode,
  Laptop as LaptopIcon,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { FlagTags } from "@/components/admin/flag-tags";
import { getLaptopTrail } from "@/lib/admin-data";
import { normalizeSerial } from "@/lib/member-rules";
import {
  formatClock,
  formatDuration,
  formatShortDate,
} from "@/lib/time";

export const metadata: Metadata = {
  title: "Laptops",
};

type LaptopSearchParams = Promise<{
  serial?: string | string[];
}>;

export default async function AdminLaptopsPage({
  searchParams,
}: {
  searchParams: LaptopSearchParams;
}) {
  const query = await searchParams;
  const rawSerial = Array.isArray(query.serial) ? query.serial[0] : query.serial;
  const serial = normalizeSerial((rawSerial ?? "").slice(0, 80));
  const trail = serial ? await getLaptopTrail(serial) : null;
  const found = Boolean(trail && (trail.laptop || trail.visits.length > 0));

  return (
    <div>
      <header className="border-b border-rule pb-7 sm:pb-9">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <p>Laptop register</p>
          <p>Follow the serial</p>
        </div>

        <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(3rem,6.5vw,5.25rem)] leading-[0.86] tracking-[-0.045em] text-ink">
          Who had this laptop?
        </h1>
        <p className="mt-4 max-w-[58ch] text-sm leading-6 text-ink-muted">
          Search a serial to see the laptop on the register and every visit it
          travelled with — including borrowed laptops that were never
          registered.
        </p>

        <form
          action="/admin/laptops"
          method="get"
          className="mt-7 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <label htmlFor="laptop-serial" className="sr-only">
              Laptop serial number
            </label>
            <MagnifyingGlass
              aria-hidden="true"
              size={22}
              weight="regular"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              id="laptop-serial"
              name="serial"
              type="search"
              defaultValue={serial}
              maxLength={80}
              enterKeyHint="search"
              placeholder="Serial number, e.g. C02XK1ABJG5H"
              className="field-input h-14 pl-12 font-mono text-[1rem] uppercase tracking-[0.06em] placeholder:normal-case placeholder:tracking-normal"
            />
          </div>
          <button type="submit" className="button-primary sm:min-w-[9rem]">
            Trace serial
          </button>
        </form>
      </header>

      {!serial ? (
        <div className="mt-8 border-y border-rule px-4 py-14 text-center sm:py-20">
          <LaptopIcon
            aria-hidden="true"
            size={58}
            weight="duotone"
            className="mx-auto text-brass"
          />
          <p className="mt-5 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.015em] text-ink">
            The register is waiting for a serial.
          </p>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-6 text-ink-muted">
            Every laptop carries a serial on its base or in its settings. Type
            it above to pull its visits from the ledger.
          </p>
        </div>
      ) : !found ? (
        <div className="mt-8 border-y border-rule px-4 py-14 text-center sm:py-20">
          <WarningCircle
            aria-hidden="true"
            size={52}
            weight="duotone"
            className="mx-auto text-vermilion"
          />
          <p className="mt-5 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.015em] text-ink">
            No trace of {serial}.
          </p>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-6 text-ink-muted">
            This serial is not on the laptop register and has never been logged
            as a borrowed laptop. Check the number and try again.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-y border-rule py-3">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <Barcode aria-hidden="true" size={15} weight="regular" />
              {serial}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              {trail?.visits.length ?? 0}{" "}
              {trail?.visits.length === 1 ? "visit" : "visits"} on record
            </p>
          </div>

          <section aria-labelledby="laptop-record" className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  {trail?.laptop ? "On the register" : "Loose serial"}
                </p>
                <h2
                  id="laptop-record"
                  className="mt-1 font-display text-[2rem] leading-none tracking-[-0.02em] text-ink"
                >
                  {trail?.laptop ? "The laptop" : "No registered laptop"}
                </h2>
              </div>
              {trail?.laptop ? (
                <span
                  className={`stamp ${
                    trail.laptop.active ? "text-forest" : "text-vermilion"
                  }`}
                >
                  {trail.laptop.active ? "Active" : "Retired"}
                </span>
              ) : null}
            </div>

            {trail?.laptop ? (
              <div className="mt-5 grid gap-6 border-y border-rule py-6 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-8">
                <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-rule bg-wash md:col-span-2">
                    {/* Blob URLs are already resized and are not run through an optimizer. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={trail.laptop.photoUrl}
                      alt={`Photo of ${trail.laptop.model}`}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  </div>
                  {trail.laptop.serialPhotoUrl ? (
                    <div className="relative col-span-2 aspect-[3/1] overflow-hidden rounded-sm border border-rule bg-wash">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={trail.laptop.serialPhotoUrl}
                        alt={`Serial label on ${trail.laptop.model}`}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <dl className="divide-y divide-rule border-y border-rule md:border-t-0 md:pt-0">
                    <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        Model
                      </dt>
                      <dd className="font-display text-[1.35rem] leading-tight text-ink">
                        {trail.laptop.model}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        Serial
                      </dt>
                      <dd className="break-all font-mono text-[11px] uppercase tracking-[0.06em] text-ink">
                        {trail.laptop.serial}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        Owner
                      </dt>
                      <dd className="text-sm leading-6 text-ink">
                        {trail.laptop.ownerName}
                        <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                          {trail.laptop.ownerAdmissionNumber ?? "No admission"}{" "}
                          · {trail.laptop.ownerEmail}
                        </span>
                      </dd>
                    </div>
                    <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        Class
                      </dt>
                      <dd className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                        {trail.laptop.kind === "library"
                          ? "Library laptop"
                          : "Personal laptop"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : (
              <p className="mt-5 border-y border-rule py-5 text-sm leading-6 text-ink-muted">
                This serial was only seen as a borrowed, unregistered laptop.
                The visit trail below is still complete.
              </p>
            )}
          </section>

          <section aria-labelledby="laptop-trail" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2
                id="laptop-trail"
                className="font-display text-[1.8rem] leading-none tracking-[-0.02em] text-ink"
              >
                Visit trail
              </h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Newest first
              </p>
            </div>

            <ol className="mt-4 border-y border-rule">
              {(trail?.visits ?? []).map((visit) => (
                <li
                  key={visit.id}
                  className="grid gap-3 border-b border-rule px-1 py-4 last:border-b-0 md:grid-cols-[6.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-5"
                >
                  <div>
                    <p className="font-mono text-[11px] leading-5 tracking-[0.04em] text-ink">
                      {formatClock(visit.entryAt)}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                      {formatShortDate(visit.entryAt)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="font-display text-[1.2rem] leading-tight tracking-[-0.01em] text-ink">
                      {visit.visitorName}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                      {visit.visitorAdmissionNumber ?? "No admission"}
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                      In{" "}
                      <span className="text-forest">
                        {formatClock(visit.entryAt)}
                      </span>
                      {" · "}
                      {visit.entryMethod}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                      Out{" "}
                      {visit.exitAt ? (
                        <>
                          <span className="text-vermilion">
                            {formatClock(visit.exitAt)}
                          </span>
                          {" · "}
                          {visit.exitMethod ?? "manual"}
                        </>
                      ) : (
                        <span className="text-forest">Still inside</span>
                      )}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                      {visit.exitAt
                        ? formatDuration(visit.entryAt, visit.exitAt)
                        : "Open visit"}
                      {visit.looseSerial ? " · loose serial" : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap content-start gap-1.5 md:justify-end">
                    <FlagTags flags={visit.flags} emptyLabel="—" />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
