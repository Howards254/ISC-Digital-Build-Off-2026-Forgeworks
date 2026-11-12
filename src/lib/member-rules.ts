export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PHOTO_ACCEPT = ACCEPTED_PHOTO_MIME_TYPES.join(",");

export const MAX_MODEL_LENGTH = 120;
export const MAX_SERIAL_LENGTH = 80;
export const MAX_ADMISSION_NUMBER_LENGTH = 40;

export const SERIAL_CONFLICT_MESSAGE =
  "This serial is already registered to another account. Ask the librarian if the laptop changed hands.";

export const OWN_SERIAL_MESSAGE = "This serial is already on your laptop ledger.";

export function normalizeSerial(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeAdmissionNumber(value: string): string {
  return value.trim().toUpperCase();
}

const UEAB_EMAIL_DOMAIN = "ueab.ac.ke";

/** UEAB addresses carry the admission number before the @. Used as a hint only. */
export function admissionNumberFromEmail(email: string): string | null {
  const [local, domain, ...rest] = email.trim().toLowerCase().split("@");

  if (!local || domain !== UEAB_EMAIL_DOMAIN || rest.length > 0) {
    return null;
  }

  return normalizeAdmissionNumber(local);
}

export function isAcceptedPhotoType(value: string) {
  return ACCEPTED_PHOTO_MIME_TYPES.includes(
    value as (typeof ACCEPTED_PHOTO_MIME_TYPES)[number],
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
