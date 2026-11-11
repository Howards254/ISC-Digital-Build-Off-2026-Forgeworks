"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isUuid } from "@/lib/api";
import { isDoorDirection } from "@/lib/door-token";
import { canOpenDoor } from "@/lib/roles";
import {
  parseChoiceString,
  recordScan,
  ScanError,
} from "@/lib/scan-service";

export type ManualScanState = { error: string } | null;

export async function submitManualScan(
  _previousState: ManualScanState,
  formData: FormData,
): Promise<ManualScanState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Sign in to record a scan." };
  }

  if (!canOpenDoor(session.user.role)) {
    return { error: "Only gatekeepers can record a scan." };
  }

  const direction = formData.get("dir");

  if (!isDoorDirection(direction)) {
    return { error: "Choose either the entry or exit door." };
  }

  const targetUserId = formData.get("targetUserId");

  if (typeof targetUserId !== "string" || !isUuid(targetUserId)) {
    return { error: "Select a member first." };
  }

  const choice =
    direction === "in"
      ? parseChoiceString(
          formData.get("choice"),
          formData.get("borrowedSerial"),
        )
      : null;

  let visitId: string | null = null;

  try {
    const result = await recordScan({
      actorId: session.user.id,
      targetUserId,
      direction,
      method: "manual",
      choice,
    });
    visitId = result.visitId;
  } catch (error) {
    if (error instanceof ScanError) {
      return { error: error.message };
    }

    console.error("Manual scan failed", error);
    return { error: "The scan couldn't be saved. Try again." };
  }

  if (!visitId) {
    return { error: "The scan couldn't be saved. Try again." };
  }

  redirect(`/scan/confirmation/${visitId}`);
}
