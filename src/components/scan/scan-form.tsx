"use client";

import { SignIn, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { DevicePicker } from "@/components/scan/device-picker";
import type { ScanLaptop } from "@/lib/scan-data";

type ScanFormProps = {
  token: string;
  laptops: ScanLaptop[];
  defaultDeviceId?: string | null;
};

export function ScanForm({
  token,
  laptops,
  defaultDeviceId = null,
}: ScanFormProps) {
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

    const formData = new FormData(event.currentTarget);
    const choice = formData.get("choice");
    const borrowedSerial = formData.get("borrowedSerial");

    if (
      choice === "borrowed" &&
      (typeof borrowedSerial !== "string" || !borrowedSerial.trim())
    ) {
      showError("Enter the serial on the borrowed laptop.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, choice, borrowedSerial }),
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

      <DevicePicker
        laptops={laptops}
        defaultDeviceId={defaultDeviceId}
        disabled={pending}
      />

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
          <SignIn aria-hidden="true" size={18} weight="regular" />
        )}
        {pending ? "Recording entry…" : "Record entry"}
      </button>
    </form>
  );
}
