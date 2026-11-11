"use client";

import { SignOut, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type ScanExitFormProps = {
  token: string;
  hasOpenVisit: boolean;
};

export function ScanExitForm({ token, hasOpenVisit }: ScanExitFormProps) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        visitId?: string;
        error?: string;
        code?: string;
      };

      if (response.status === 401) {
        router.replace(
          `/?auth=required&next=${encodeURIComponent(`/scan?t=${token}`)}`,
        );
        router.refresh();
        return;
      }

      if (!response.ok || !data.visitId) {
        if (data.code === "expired_token") {
          router.replace("/scan/expired");
          return;
        }

        showError(data.error ?? "The scan couldn't be saved. Try again.");
        return;
      }

      router.push(`/scan/confirmation/${data.visitId}`);
    } catch {
      showError("The scan couldn't be saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="mt-6">
      {error ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mb-5 flex items-start gap-2.5 border-y border-rule py-3.5 focus:outline-none"
        >
          <WarningCircle
            aria-hidden="true"
            size={19}
            weight="regular"
            className="mt-0.5 shrink-0 text-vermilion"
          />
          <div className="min-w-0">
            <p className="text-sm leading-6 text-vermilion">{error}</p>
          </div>
        </div>
      ) : null}

      {!hasOpenVisit ? (
        <div className="border-y border-rule py-3.5">
          <p className="text-sm leading-6 text-ink-muted">
            No entry is open on your record. This scan will still be kept as an
            exit without a matching entry.
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="button-primary mt-6 w-full sm:w-auto"
      >
        {pending ? (
          <SpinnerGap
            aria-hidden="true"
            size={18}
            weight="regular"
            className="animate-spin"
          />
        ) : (
          <SignOut aria-hidden="true" size={18} weight="regular" />
        )}
        {pending ? "Recording exit…" : "Record exit"}
      </button>
    </form>
  );
}
