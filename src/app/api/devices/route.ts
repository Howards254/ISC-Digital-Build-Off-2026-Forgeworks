import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { devices } from "@/db/schema";
import {
  apiError,
  getApiUser,
  isUniqueViolation,
  unauthorized,
} from "@/lib/api";
import { parseDevicePayload } from "@/lib/device-input";
import {
  OWN_SERIAL_MESSAGE,
  SERIAL_CONFLICT_MESSAGE,
} from "@/lib/member-rules";
import { isOwnPhotoUrl } from "@/lib/photos";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("The form didn't arrive. Try again.");
  }

  const parsed = parseDevicePayload(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error, field: parsed.field },
      { status: 422 },
    );
  }

  const { model, serial, photoUrl, serialPhotoUrl } = parsed.data;

  if (!isOwnPhotoUrl(photoUrl, user.id)) {
    return apiError("Upload the laptop photo again.", 422, "photoUrl");
  }

  if (serialPhotoUrl && !isOwnPhotoUrl(serialPhotoUrl, user.id)) {
    return apiError("Upload the serial sticker photo again.", 422);
  }

  const db = getDb();
  const [existing] = await db
    .select({
      id: devices.id,
      ownerId: devices.ownerId,
      active: devices.active,
    })
    .from(devices)
    .where(eq(devices.serial, serial))
    .limit(1);

  if (existing) {
    if (existing.ownerId !== user.id) {
      return apiError(SERIAL_CONFLICT_MESSAGE, 409, "serial");
    }

    if (existing.active) {
      return apiError(OWN_SERIAL_MESSAGE, 409, "serial");
    }

    // The member removed this laptop earlier. Put the same record back on the
    // ledger so its visit history stays connected.
    const [reactivated] = await db
      .update(devices)
      .set({
        model,
        photoUrl,
        serialPhotoUrl,
        active: true,
      })
      .where(
        and(
          eq(devices.id, existing.id),
          eq(devices.ownerId, user.id),
          eq(devices.active, false),
        ),
      )
      .returning({ id: devices.id });

    if (!reactivated) {
      return apiError("This laptop couldn't be added again. Try once more.", 409);
    }

    return Response.json({ id: reactivated.id }, { status: 201 });
  }

  try {
    const [created] = await db
      .insert(devices)
      .values({
        ownerId: user.id,
        model,
        serial,
        photoUrl,
        serialPhotoUrl,
        kind: "personal",
      })
      .returning({ id: devices.id });

    return Response.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return apiError(SERIAL_CONFLICT_MESSAGE, 409, "serial");
    }

    console.error("Device create failed", error);
    return apiError("The laptop couldn't be added. Try again.", 500);
  }
}
