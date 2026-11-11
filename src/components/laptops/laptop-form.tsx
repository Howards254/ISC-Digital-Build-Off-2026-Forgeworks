"use client";

import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PhotoField } from "@/components/laptops/photo-field";
import {
  MAX_MODEL_LENGTH,
  MAX_SERIAL_LENGTH,
  normalizeSerial,
} from "@/lib/member-rules";

export type LaptopFormInitial = {
  id: string;
  model: string;
  serial: string;
  photoUrl: string;
  serialPhotoUrl: string | null;
};

type LaptopFormProps = {
  mode: "create" | "edit";
  initial?: LaptopFormInitial;
};

type FieldName = "model" | "serial" | "photoUrl";
type FieldErrors = Partial<Record<FieldName, string>>;

export function LaptopForm({ mode, initial }: LaptopFormProps) {
  const router = useRouter();
  const modelRef = useRef<HTMLInputElement>(null);
  const serialRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState(initial?.model ?? "");
  const [serial, setSerial] = useState(initial?.serial ?? "");
  const [laptopFile, setLaptopFile] = useState<File | null>(null);
  const [laptopCleared, setLaptopCleared] = useState(false);
  const [serialFile, setSerialFile] = useState<File | null>(null);
  const [serialCleared, setSerialCleared] = useState(false);
  const [laptopBusy, setLaptopBusy] = useState(false);
  const [serialBusy, setSerialBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const photoBusy = laptopBusy || serialBusy;
  const isEdit = mode === "edit" && Boolean(initial);

  // Server-side field errors arrive while the form is disabled for submission.
  // Move focus once the fields are enabled again.
  useEffect(() => {
    if (submitting) {
      return;
    }

    if (fieldErrors.model) {
      modelRef.current?.focus();
    } else if (fieldErrors.serial) {
      serialRef.current?.focus();
    }
  }, [fieldErrors, submitting]);

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function showFormError(message: string) {
    setFormError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function uploadPhoto(file: File) {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body,
    });
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };

    if (response.status === 401) {
      router.replace("/?auth=required");
      router.refresh();
      throw new Error("Your session has ended.");
    }

    if (!response.ok || typeof data.url !== "string") {
      throw new Error(data.error ?? "The photo couldn't be uploaded. Try again.");
    }

    return data.url;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || photoBusy) {
      return;
    }

    const nextModel = model.trim();
    const nextSerial = normalizeSerial(serial);
    const nextErrors: FieldErrors = {};

    if (!nextModel) {
      nextErrors.model = "Enter the laptop model.";
    }

    if (!nextSerial) {
      nextErrors.serial = "Enter the serial number.";
    }

    const hasLaptopPhoto = Boolean(laptopFile) || (isEdit && !laptopCleared);

    if (!hasLaptopPhoto) {
      nextErrors.photoUrl = "Add a photo of the laptop.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError(null);

      if (nextErrors.model) {
        modelRef.current?.focus();
      } else if (nextErrors.serial) {
        serialRef.current?.focus();
      }

      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const [photoUrl, serialPhotoUrl] = await Promise.all([
        laptopFile
          ? uploadPhoto(laptopFile)
          : Promise.resolve(initial?.photoUrl ?? null),
        serialFile
          ? uploadPhoto(serialFile)
          : Promise.resolve(
              serialCleared ? null : (initial?.serialPhotoUrl ?? null),
            ),
      ]);

      if (!photoUrl) {
        setFieldErrors({ photoUrl: "Add a photo of the laptop." });
        return;
      }

      const response = await fetch(
        isEdit && initial ? `/api/devices/${initial.id}` : "/api/devices",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: nextModel,
            serial: nextSerial,
            photoUrl,
            serialPhotoUrl,
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
      };

      if (response.status === 401) {
        router.replace("/?auth=required");
        router.refresh();
        return;
      }

      if (!response.ok) {
        const field =
          data.field === "model" ||
          data.field === "serial" ||
          data.field === "photoUrl"
            ? data.field
            : null;

        if (field) {
          setFieldErrors({ [field]: data.error ?? "Check this field." });

          if (field === "model") {
            modelRef.current?.focus();
          } else if (field === "serial") {
            serialRef.current?.focus();
          }
        } else {
          showFormError(data.error ?? "The laptop couldn't be saved. Try again.");
        }

        return;
      }

      router.replace("/me");
      router.refresh();
    } catch (error) {
      showFormError(
        error instanceof Error
          ? error.message
          : "The laptop couldn't be saved. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting}
      noValidate
      className="min-w-0"
    >
      {formError ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mb-8 flex items-start gap-2.5 border-y border-rule py-3.5 focus:outline-none"
        >
          <WarningCircle
            aria-hidden="true"
            size={19}
            weight="regular"
            className="mt-0.5 shrink-0 text-vermilion"
          />
          <p className="text-sm leading-6 text-vermilion">{formError}</p>
        </div>
      ) : null}

      <div className="space-y-8">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="laptop-model" className="field-label">
              Model
              <span aria-hidden="true" className="ml-1 text-vermilion">
                *
              </span>
            </label>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              Required
            </span>
          </div>
          <input
            ref={modelRef}
            id="laptop-model"
            name="model"
            type="text"
            value={model}
            onChange={(event) => {
              setModel(event.target.value);
              clearFieldError("model");
            }}
            maxLength={MAX_MODEL_LENGTH}
            autoComplete="off"
            required
            disabled={submitting}
            aria-invalid={fieldErrors.model ? true : undefined}
            aria-describedby={
              fieldErrors.model ? "laptop-model-error" : "laptop-model-hint"
            }
            placeholder="e.g. MacBook Air 13-inch"
            className="field-input mt-2"
          />
          {fieldErrors.model ? (
            <p
              id="laptop-model-error"
              role="alert"
              className="mt-2 text-[13px] leading-5 text-vermilion"
            >
              {fieldErrors.model}
            </p>
          ) : (
            <p
              id="laptop-model-hint"
              className="mt-2 text-[13px] leading-5 text-ink-muted"
            >
              The name on the lid, or in the laptop&apos;s system settings.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="laptop-serial" className="field-label">
              Serial number
              <span aria-hidden="true" className="ml-1 text-vermilion">
                *
              </span>
            </label>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              Unique
            </span>
          </div>
          <input
            ref={serialRef}
            id="laptop-serial"
            name="serial"
            type="text"
            value={serial}
            onChange={(event) => {
              setSerial(event.target.value);
              clearFieldError("serial");
            }}
            onBlur={() => setSerial((value) => normalizeSerial(value))}
            maxLength={MAX_SERIAL_LENGTH}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            required
            disabled={submitting}
            aria-invalid={fieldErrors.serial ? true : undefined}
            aria-describedby={
              fieldErrors.serial ? "laptop-serial-error" : "laptop-serial-hint"
            }
            placeholder="FVFX1234Q6L4"
            className="field-input mt-2 font-mono uppercase tracking-[0.04em]"
          />
          {fieldErrors.serial ? (
            <p
              id="laptop-serial-error"
              role="alert"
              className="mt-2 text-[13px] leading-5 text-vermilion"
            >
              {fieldErrors.serial}
            </p>
          ) : (
            <p
              id="laptop-serial-hint"
              className="mt-2 text-[13px] leading-5 text-ink-muted"
            >
              Copy it from the sticker. Stored in capitals so the same laptop
              can&apos;t be added twice.
            </p>
          )}
        </div>

        <div className="border-t border-rule pt-7">
          <PhotoField
            label="Photo of the laptop"
            hint="A whole-laptop photo helps the librarian match the machine to its record."
            required
            initialUrl={initial?.photoUrl}
            error={fieldErrors.photoUrl}
            disabled={submitting}
            onFile={(file) => {
              setLaptopFile(file);
              setLaptopCleared(false);
              clearFieldError("photoUrl");
            }}
            onClear={() => {
              setLaptopFile(null);
              setLaptopCleared(true);
            }}
            onBusyChange={setLaptopBusy}
          />
        </div>

        <div className="border-t border-rule pt-7">
          <PhotoField
            label="Serial sticker"
            hint="Optional, but useful when the printed serial is hard to read."
            initialUrl={initial?.serialPhotoUrl}
            disabled={submitting}
            onFile={(file) => {
              setSerialFile(file);
              setSerialCleared(false);
            }}
            onClear={() => {
              setSerialFile(null);
              setSerialCleared(true);
            }}
            onBusyChange={setSerialBusy}
          />
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/me"
          className="text-link justify-center text-sm font-semibold text-ink-muted"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting || photoBusy}
          className="button-primary"
        >
          {submitting || photoBusy ? (
            <SpinnerGap
              aria-hidden="true"
              size={18}
              weight="regular"
              className="animate-spin"
            />
          ) : null}
          {submitting
            ? "Saving…"
            : photoBusy
              ? "Preparing photo…"
              : isEdit
                ? "Save changes"
                : "Add to my ledger"}
        </button>
      </div>
    </form>
  );
}
