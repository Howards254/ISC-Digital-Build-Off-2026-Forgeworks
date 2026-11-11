"use client";

import { useId, useState } from "react";

import { MAX_SERIAL_LENGTH } from "@/lib/member-rules";
import type { ScanLaptop } from "@/lib/scan-data";

type DevicePickerProps = {
  laptops: ScanLaptop[];
  defaultDeviceId?: string | null;
  disabled?: boolean;
};

function initialChoice(laptops: ScanLaptop[], defaultDeviceId?: string | null) {
  if (defaultDeviceId && laptops.some((laptop) => laptop.id === defaultDeviceId)) {
    return `device:${defaultDeviceId}`;
  }

  if (laptops[0]) {
    return `device:${laptops[0].id}`;
  }

  return "none";
}

function ChoiceMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-5 shrink-0 place-items-center rounded-full border ${
        selected ? "border-forest" : "border-rule"
      }`}
    >
      {selected ? <span className="size-2.5 rounded-full bg-forest" /> : null}
    </span>
  );
}

export function DevicePicker({
  laptops,
  defaultDeviceId = null,
  disabled = false,
}: DevicePickerProps) {
  const groupId = useId();
  const serialId = useId();
  const [choice, setChoice] = useState(() =>
    initialChoice(laptops, defaultDeviceId),
  );

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={`${groupId}-hint`}
      className="min-w-0 border-0 p-0"
    >
      <legend className="field-label">Laptop</legend>
      <p
        id={`${groupId}-hint`}
        className="mt-2 max-w-[52ch] text-sm leading-6 text-ink-muted"
      >
        Choose the laptop you have with you, or record that you came without
        one.
      </p>

      <div className="mt-3 space-y-2.5">
        {laptops.map((laptop) => {
          const value = `device:${laptop.id}`;
          const selected = choice === value;

          return (
            <label
              key={laptop.id}
              className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors duration-150 focus-within:[outline:2px_solid_var(--brass)] focus-within:outline-offset-2 ${
                selected
                  ? "border-forest bg-wash"
                  : "border-rule bg-surface hover:border-ink-muted"
              }`}
            >
              <input
                type="radio"
                name="choice"
                value={value}
                checked={selected}
                onChange={() => setChoice(value)}
                className="sr-only"
              />
              <span className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-sm border border-rule bg-wash sm:w-24">
                {/* Blob URLs are already resized and are not run through an optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={laptop.photoUrl}
                  alt={`Photo of ${laptop.model}`}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words font-display text-[1.2rem] leading-tight tracking-[-0.01em] text-ink">
                  {laptop.model}
                </span>
                <span className="mt-1 block break-all font-mono text-[10px] uppercase leading-4 tracking-[0.06em] text-ink-muted">
                  {laptop.serial}
                </span>
              </span>
              <ChoiceMark selected={selected} />
            </label>
          );
        })}

        <div>
          <label
            className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors duration-150 focus-within:[outline:2px_solid_var(--brass)] focus-within:outline-offset-2 ${
              choice === "borrowed"
                ? "border-forest bg-wash"
                : "border-rule bg-surface hover:border-ink-muted"
            }`}
          >
            <input
              type="radio"
              name="choice"
              value="borrowed"
              checked={choice === "borrowed"}
              onChange={() => setChoice("borrowed")}
              className="sr-only"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold leading-5 text-ink">
                Borrowed laptop
              </span>
              <span className="mt-0.5 block text-sm leading-5 text-ink-muted">
                A laptop whose serial is not on your ledger.
              </span>
            </span>
            <ChoiceMark selected={choice === "borrowed"} />
          </label>

          {choice === "borrowed" ? (
            <div className="mt-2.5 rounded-md border border-rule bg-surface p-3">
              <label htmlFor={serialId} className="field-label">
                Serial on the borrowed laptop
              </label>
              <input
                id={serialId}
                name="borrowedSerial"
                type="text"
                required
                maxLength={MAX_SERIAL_LENGTH}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="SERIAL"
                className="field-input mt-2 font-mono uppercase"
              />
              <p className="mt-2 font-mono text-[10px] leading-5 text-ink-muted">
                The gatekeeper can match a registered serial to its owner.
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <label
            className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors duration-150 focus-within:[outline:2px_solid_var(--brass)] focus-within:outline-offset-2 ${
              choice === "none"
                ? "border-forest bg-wash"
                : "border-rule bg-surface hover:border-ink-muted"
            }`}
          >
            <input
              type="radio"
              name="choice"
              value="none"
              checked={choice === "none"}
              onChange={() => setChoice("none")}
              className="sr-only"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold leading-5 text-ink">
                No device
              </span>
              <span className="mt-0.5 block text-sm leading-5 text-ink-muted">
                I came without a laptop.
              </span>
            </span>
            <ChoiceMark selected={choice === "none"} />
          </label>
        </div>
      </div>
    </fieldset>
  );
}
