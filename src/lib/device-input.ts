import { z } from "zod";

import {
  MAX_MODEL_LENGTH,
  MAX_SERIAL_LENGTH,
  normalizeSerial,
} from "@/lib/member-rules";

const devicePayloadSchema = z.object({
  model: z
    .string()
    .trim()
    .min(1, "Enter the laptop model.")
    .max(MAX_MODEL_LENGTH, `Keep the model under ${MAX_MODEL_LENGTH} characters.`),
  serial: z
    .string()
    .trim()
    .min(1, "Enter the serial number.")
    .max(MAX_SERIAL_LENGTH, `Keep the serial under ${MAX_SERIAL_LENGTH} characters.`),
  photoUrl: z.string().trim().min(1, "Add a photo of the laptop."),
  serialPhotoUrl: z.string().trim().nullable().optional(),
});

export type DevicePayload = {
  model: string;
  serial: string;
  photoUrl: string;
  serialPhotoUrl: string | null;
};

export function parseDevicePayload(
  input: unknown,
):
  | { success: true; data: DevicePayload }
  | { success: false; error: string; field?: "model" | "serial" | "photoUrl" } {
  const parsed = devicePayloadSchema.safeParse(input);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field =
      issue?.path[0] === "model" ||
      issue?.path[0] === "serial" ||
      issue?.path[0] === "photoUrl"
        ? issue.path[0]
        : undefined;

    return {
      success: false,
      error: issue?.message ?? "Check the laptop details and try again.",
      field,
    };
  }

  return {
    success: true,
    data: {
      model: parsed.data.model,
      serial: normalizeSerial(parsed.data.serial),
      photoUrl: parsed.data.photoUrl,
      serialPhotoUrl: parsed.data.serialPhotoUrl || null,
    },
  };
}
