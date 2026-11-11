"use client";

import { Trash, WarningCircle, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type RemoveLaptopButtonProps = {
  deviceId: string;
  model: string;
};

export function RemoveLaptopButton({
  deviceId,
  model,
}: RemoveLaptopButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function closeDialog() {
    if (pending) {
      return;
    }

    setOpen(false);
    setError(null);
  }

  async function handleRemove() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (response.status === 401) {
        router.replace("/?auth=required");
        router.refresh();
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "The laptop couldn't be removed. Try again.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("The laptop couldn't be removed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-sm font-medium text-vermilion transition-colors duration-150 hover:text-vermilion-hover"
      >
        <Trash aria-hidden="true" size={16} weight="regular" />
        Remove
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeDialog();
          }
        }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md border border-rule bg-surface p-0 text-ink"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="stamp text-vermilion">Remove laptop</span>
            <button
              type="button"
              onClick={closeDialog}
              disabled={pending}
              aria-label="Close"
              className="-mr-2 -mt-2 grid size-11 place-items-center rounded-sm text-ink-muted transition-colors duration-150 hover:bg-wash hover:text-ink"
            >
              <X aria-hidden="true" size={18} weight="regular" />
            </button>
          </div>

          <h2
            id={titleId}
            className="mt-5 font-display text-[1.9rem] leading-[1.05] tracking-[-0.02em] text-ink"
          >
            Take {model} off your ledger?
          </h2>
          <p
            id={descriptionId}
            className="mt-3 text-sm leading-6 text-ink-muted"
          >
            The laptop will disappear from your page, but its visit history
            stays in the library record. You can add it again later.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 border-y border-rule py-3 text-[13px] leading-5 text-vermilion"
            >
              <WarningCircle
                aria-hidden="true"
                size={17}
                weight="regular"
                className="mt-0.5 shrink-0"
              />
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={pending}
              className="button-secondary"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="button-danger"
            >
              <Trash aria-hidden="true" size={17} weight="regular" />
              {pending ? "Removing…" : "Remove laptop"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
