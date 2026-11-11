"use client";

import { CheckCircle, FloppyDisk } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  MAX_ADMISSION_NUMBER_LENGTH,
  normalizeAdmissionNumber,
} from "@/lib/member-rules";

type AdmissionNumberFormProps = {
  initialValue: string | null;
  returnTo?: string | null;
};

export function AdmissionNumberForm({
  initialValue,
  returnTo = null,
}: AdmissionNumberFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const admissionNumber = normalizeAdmissionNumber(value);

    if (!admissionNumber) {
      setSaved(false);
      setError("Enter your admission number.");
      return;
    }

    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admissionNumber }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        admissionNumber?: string;
        error?: string;
      };

      if (response.status === 401) {
        router.replace("/?auth=required");
        router.refresh();
        return;
      }

      if (!response.ok || !data.admissionNumber) {
        setError(data.error ?? "Your admission number couldn't be saved.");
        return;
      }

      setValue(data.admissionNumber);
      setSaved(true);
      router.refresh();

      if (returnTo) {
        router.replace(returnTo);
      }
    } catch {
      setError("Your admission number couldn't be saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5" noValidate>
      <label htmlFor="admission-number" className="field-label">
        Admission number
      </label>
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <input
          id="admission-number"
          name="admissionNumber"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
            setSaved(false);
          }}
          maxLength={MAX_ADMISSION_NUMBER_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "admission-error" : "admission-hint"}
          disabled={pending}
          placeholder="24-0187"
          className="field-input uppercase sm:flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="button-secondary shrink-0 px-4"
        >
          <FloppyDisk aria-hidden="true" size={17} weight="regular" />
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {error ? (
        <p
          id="admission-error"
          role="alert"
          className="mt-2 text-[13px] leading-5 text-vermilion"
        >
          {error}
        </p>
      ) : (
        <p
          id="admission-hint"
          className="mt-2 font-mono text-[10px] leading-5 text-ink-muted"
        >
          Stored in capitals. Required before your first scan.
          {returnTo ? " Saving returns you to the door code." : ""}
        </p>
      )}

      {saved ? (
        <p
          role="status"
          className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-forest"
        >
          <CheckCircle aria-hidden="true" size={15} weight="regular" />
          Admission number saved.
        </p>
      ) : null}
    </form>
  );
}
