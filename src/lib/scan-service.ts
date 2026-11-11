import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  auditLog,
  devices,
  users,
  visits,
  type VisitFlag,
} from "@/db/schema";
import { isUuid } from "@/lib/api";
import type { DoorDirection } from "@/lib/door-token";
import { normalizeSerial } from "@/lib/member-rules";

export const LAPTOP_IN_USE_MESSAGE =
  "This laptop is already inside under another visit. Tell the gatekeeper.";

export type ScanMethod = "qr" | "manual";

export type DeviceChoice =
  | { type: "device"; deviceId: string }
  | { type: "borrowed"; serial: string }
  | { type: "none" };

export class ScanError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ScanError";
  }
}

type RecordScanInput = {
  actorId: string;
  targetUserId: string;
  direction: DoorDirection;
  method: ScanMethod;
  choice: DeviceChoice | null;
};

type RecordScanResult = {
  visitId: string;
  direction: DoorDirection;
};

function withFlags(existing: string[], ...flags: VisitFlag[]) {
  return Array.from(new Set([...existing, ...flags]));
}

function getUniqueConstraint(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    cause?: { code?: unknown; constraint?: unknown };
  };

  if (candidate.code !== "23505" && candidate.cause?.code !== "23505") {
    return null;
  }

  const constraint = candidate.constraint ?? candidate.cause?.constraint;

  return typeof constraint === "string" ? constraint : null;
}

function scanWriteError(error: unknown): ScanError {
  const constraint = getUniqueConstraint(error);

  if (constraint === "visits_one_open_per_device_idx") {
    return new ScanError(LAPTOP_IN_USE_MESSAGE, 409, "laptop_in_use");
  }

  if (constraint === "visits_one_open_per_user_idx") {
    return new ScanError(
      "This visit changed while the scan was saving. Refresh and try again.",
      409,
      "visit_changed",
    );
  }

  if (constraint?.includes("visits")) {
    return new ScanError(
      "This scan couldn't be saved. Ask the gatekeeper to check the record.",
      409,
      "visit_conflict",
    );
  }

  return new ScanError(
    "The scan couldn't be saved. Try again.",
    500,
    "scan_failed",
  );
}

export function parseChoiceString(
  choice: unknown,
  borrowedSerial: unknown,
): DeviceChoice | null {
  if (typeof choice !== "string") {
    return null;
  }

  if (choice === "none") {
    return { type: "none" };
  }

  if (choice === "borrowed") {
    if (typeof borrowedSerial !== "string" || !borrowedSerial.trim()) {
      return null;
    }

    return { type: "borrowed", serial: borrowedSerial };
  }

  if (choice.startsWith("device:")) {
    const deviceId = choice.slice("device:".length);

    if (!isUuid(deviceId)) {
      return null;
    }

    return { type: "device", deviceId };
  }

  return null;
}

export async function recordScan({
  actorId,
  targetUserId,
  direction,
  method,
  choice,
}: RecordScanInput): Promise<RecordScanResult> {
  const db = getDb();
  const now = new Date();
  const baseFlags: VisitFlag[] = method === "manual" ? ["manual"] : [];

  const [memberRows, openVisitRows] = await Promise.all([
    db
      .select({
        id: users.id,
        admissionNumber: users.admissionNumber,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1),
    db
      .select({
        id: visits.id,
        deviceId: visits.deviceId,
        flags: visits.flags,
      })
      .from(visits)
      .where(and(eq(visits.userId, targetUserId), isNull(visits.exitAt)))
      .limit(1),
  ]);

  const member = memberRows[0] ?? null;

  if (!member) {
    throw new ScanError("This member record could not be found.", 404, "member_not_found");
  }

  if (!member.admissionNumber) {
    throw new ScanError(
      "Add your admission number before scanning.",
      422,
      "admission_required",
    );
  }

  const openVisit = openVisitRows[0] ?? null;

  if (direction === "out") {
    const audit = {
      actorId,
      action: "visit.check_out",
      entity: "visit",
      meta: {
        targetUserId,
        direction,
        method,
        closedVisitId: openVisit?.id ?? null,
        flags: openVisit
          ? withFlags(openVisit.flags, ...baseFlags)
          : withFlags(baseFlags, "no_matching_entry"),
      },
    };

    if (openVisit) {
      const visitId = openVisit.id;

      await db.transaction(async (tx) => {
        await tx
          .update(visits)
          .set({
            exitAt: now,
            exitMethod: method,
            flags: withFlags(openVisit.flags, ...baseFlags),
            closedBy: actorId,
          })
          .where(and(eq(visits.id, visitId), isNull(visits.exitAt)));

        await tx.insert(auditLog).values({ ...audit, entityId: visitId });
      });

      return { visitId, direction };
    }

    const visitId = crypto.randomUUID();
    const flags = withFlags(baseFlags, "no_matching_entry");

    await db.transaction(async (tx) => {
      await tx.insert(visits).values({
        id: visitId,
        userId: targetUserId,
        deviceId: null,
        looseSerial: null,
        entryAt: now,
        exitAt: now,
        entryMethod: method,
        exitMethod: method,
        flags,
        closedBy: actorId,
      });

      await tx.insert(auditLog).values({
        ...audit,
        entityId: visitId,
        meta: { ...audit.meta, flags },
      });
    });

    return { visitId, direction };
  }

  let device: { id: string; ownerId: string } | null = null;
  let looseSerial: string | null = null;
  const flags = [...baseFlags];

  if (!choice) {
    throw new ScanError(
      "Choose one of your laptops, a borrowed laptop, or no device.",
      422,
      "device_choice_required",
    );
  }

  if (choice.type === "device") {
    const [owned] = await db
      .select({ id: devices.id, ownerId: devices.ownerId })
      .from(devices)
      .where(
        and(
          eq(devices.id, choice.deviceId),
          eq(devices.ownerId, targetUserId),
          eq(devices.active, true),
        ),
      )
      .limit(1);

    if (!owned) {
      throw new ScanError(
        "That laptop isn't on your ledger.",
        422,
        "device_not_found",
      );
    }

    device = owned;
  } else if (choice.type === "borrowed") {
    const serial = normalizeSerial(choice.serial);

    if (!serial) {
      throw new ScanError(
        "Enter the serial on the borrowed laptop.",
        422,
        "serial_required",
      );
    }

    const [registered] = await db
      .select({ id: devices.id, ownerId: devices.ownerId })
      .from(devices)
      .where(and(eq(devices.serial, serial), eq(devices.active, true)))
      .limit(1);

    if (registered) {
      device = registered;

      if (registered.ownerId !== targetUserId) {
        flags.push("borrowed");
      }
    } else {
      looseSerial = serial;
      flags.push("borrowed", "unregistered_device");
    }
  } else {
    flags.push("no_device");
  }

  if (device) {
    const [deviceVisit] = await db
      .select({ userId: visits.userId })
      .from(visits)
      .where(and(eq(visits.deviceId, device.id), isNull(visits.exitAt)))
      .limit(1);

    // A member re-scanning in keeps the laptop connected to the visit that is
    // about to be closed with no_tap_out.
    if (deviceVisit && deviceVisit.userId !== targetUserId) {
      throw new ScanError(LAPTOP_IN_USE_MESSAGE, 409, "laptop_in_use");
    }
  }

  const visitId = crypto.randomUUID();
  const meta = {
    targetUserId,
    direction,
    method,
    closedVisitId: openVisit?.id ?? null,
    deviceId: device?.id ?? null,
    looseSerial,
    flags,
  };

  try {
    if (openVisit) {
      await db.transaction(async (tx) => {
        await tx
          .update(visits)
          .set({
            exitAt: now,
            exitMethod: method,
            flags: withFlags(openVisit.flags, "no_tap_out"),
            closedBy: actorId,
          })
          .where(and(eq(visits.id, openVisit.id), isNull(visits.exitAt)));

        await tx.insert(visits).values({
          id: visitId,
          userId: targetUserId,
          deviceId: device?.id ?? null,
          looseSerial,
          entryAt: now,
          entryMethod: method,
          flags,
        });

        await tx.insert(auditLog).values({
          actorId,
          action: "visit.check_in",
          entity: "visit",
          entityId: visitId,
          meta,
        });
      });
    } else {
      await db.transaction(async (tx) => {
        await tx.insert(visits).values({
          id: visitId,
          userId: targetUserId,
          deviceId: device?.id ?? null,
          looseSerial,
          entryAt: now,
          entryMethod: method,
          flags,
        });

        await tx.insert(auditLog).values({
          actorId,
          action: "visit.check_in",
          entity: "visit",
          entityId: visitId,
          meta,
        });
      });
    }
  } catch (error) {
    if (getUniqueConstraint(error)) {
      throw scanWriteError(error);
    }

    console.error("Scan write failed", error);
    throw new ScanError(
      "The scan couldn't be saved. Try again.",
      500,
      "scan_failed",
    );
  }

  return { visitId, direction };
}
