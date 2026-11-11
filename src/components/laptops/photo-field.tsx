"use client";

import {
  Camera,
  ImageSquare,
  SpinnerGap,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import { compressPhoto } from "@/lib/compress-photo";
import {
  formatFileSize,
  isAcceptedPhotoType,
  MAX_PHOTO_BYTES,
  PHOTO_ACCEPT,
} from "@/lib/member-rules";

type PhotoFieldProps = {
  label: string;
  hint: string;
  required?: boolean;
  initialUrl?: string | null;
  error?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onBusyChange?: (busy: boolean) => void;
};

export function PhotoField({
  label,
  hint,
  required = false,
  initialUrl = null,
  error,
  disabled = false,
  onFile,
  onClear,
  onBusyChange,
}: PhotoFieldProps) {
  const inputId = useId();
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const message = localError ?? error;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!selected) {
      return;
    }

    setLocalError(null);

    if (!isAcceptedPhotoType(selected.type)) {
      setLocalError("Choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (selected.size > MAX_PHOTO_BYTES) {
      setLocalError("Choose a photo under 5 MB.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(selected));
    setSelectedSize(selected.size);
    setProcessing(true);
    onBusyChange?.(true);

    try {
      const compressed = await compressPhoto(selected);

      if (compressed.size > MAX_PHOTO_BYTES) {
        throw new Error("The compressed photo is still too large.");
      }

      onFile(compressed);
    } catch {
      setLocalError("The photo could not be prepared. Try another image.");
    } finally {
      setProcessing(false);
      onBusyChange?.(false);
    }
  }

  function handleClear() {
    setPreviewUrl(null);
    setSelectedSize(null);
    setLocalError(null);
    onClear();
    inputRef.current?.focus();
  }

  return (
    <div role="group" aria-labelledby={labelId} className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p id={labelId} className="field-label">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-vermilion">
              *
            </span>
          ) : (
            <span className="ml-2 font-sans text-[11px] normal-case tracking-normal text-ink-muted">
              Optional
            </span>
          )}
        </p>
        {required ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            Required
          </span>
        ) : null}
      </div>
      <p className="mt-2 max-w-[52ch] text-sm leading-6 text-ink-muted">
        {hint}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:items-start">
        <div
          aria-busy={processing}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-rule bg-wash"
        >
          {previewUrl ? (
            // Local previews and uploaded Blob URLs are shown directly rather
            // than through the Next.js image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={`${label} preview`}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-ink-muted">
              <ImageSquare aria-hidden="true" size={30} weight="duotone" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                No photo
              </span>
            </div>
          )}

          {processing ? (
            <div className="absolute inset-0 grid place-items-center bg-paper/85 text-forest">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em]">
                <SpinnerGap
                  aria-hidden="true"
                  size={15}
                  weight="regular"
                  className="animate-spin"
                />
                Preparing
              </span>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={PHOTO_ACCEPT}
            onChange={handleFileChange}
            disabled={disabled || processing}
            className="sr-only"
          />
          <div className="flex flex-wrap items-center gap-2 rounded-md focus-within:[outline:2px_solid_var(--brass)] focus-within:outline-offset-[3px]">
            <label
              htmlFor={inputId}
              className={`button-secondary min-h-11 cursor-pointer px-3.5 ${
                disabled || processing ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <Camera aria-hidden="true" size={17} weight="regular" />
              {previewUrl ? "Replace photo" : "Choose photo"}
            </label>
            {previewUrl ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled || processing}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-vermilion transition-colors duration-150 hover:text-vermilion-hover"
              >
                <Trash aria-hidden="true" size={16} weight="regular" />
                Remove
              </button>
            ) : null}
          </div>

          <p className="mt-2 font-mono text-[11px] leading-5 text-ink-muted">
            JPEG, PNG, or WebP · up to 5 MB
            <br />
            Resized to about 1200px wide before upload.
          </p>

          {selectedSize !== null && !processing ? (
            <p className="mt-1 font-mono text-[11px] leading-5 text-ink-muted">
              Selected file: {formatFileSize(selectedSize)}
            </p>
          ) : null}

          {message ? (
            <p
              role="alert"
              className="mt-2 text-[13px] leading-5 text-vermilion"
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
