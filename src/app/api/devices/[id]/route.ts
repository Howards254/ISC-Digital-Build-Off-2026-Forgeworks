import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import { devices } from "@/db/schema";
import {
  apiError,
  getApiUser,
  isUniqueViolation,
  isUuid,
  unauthorized,
} from "@/lib/api";
import { parseDevicePayload } from "@/lib/device-input";
import {
  OWN_SERIAL_MESSAGE,
  SERIAL_CONFLICT_MESSAGE,
} from "@/lib/member-rules";
import { getOpenVisitForDevice } from "@/lib/member-data";
import { isOwnPhotoUrl } from "@/lib/photos";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const { id } = await params;

  if (!isUuid(id)) {
    return apiError("This laptop isn't on your ledger.", 404);
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
  const db = getDb();
  const [existing] = await db
    .select({
      id: devices.id,
      serial: devices.serial,
    })
    .from(devices)
    .where(
      and(
        eq(devices.id, id),
        eq(devices.ownerId, user.id),
        eq(devices.active, true),
      ),
    )
    .limit(1);

  if (!existing) {
    return apiError("This laptop isn't on your ledger.", 404);
  }

  if (!isOwnPhotoUrl(photoUrl, user.id)) {
    return apiError("Upload the laptop photo again.", 422, "photoUrl");
  }

  if (serialPhotoUrl && !isOwnPhotoUrl(serialPhotoUrl, user.id)) {
    return apiError("Upload the serial sticker photo again.", 422);
  }

  if (serial !== existing.serial) {
    const [duplicate] = await db
      .select({ ownerId: devices.ownerId })
      .from(devices)
      .where(and(eq(devices.serial, serial), ne(devices.id, id)))
      .limit(1);

    if (duplicate) {
      return apiError(
        duplicate.ownerId === user.id
          ? OWN_SERIAL_MESSAGE
          : SERIAL_CONFLICT_MESSAGE,
        409,
        "serial",
      );
    }
  }

  try {
    const [updated] = await db
      .update(devices)
      .set({
        model,
        serial,
        photoUrl,
        serialPhotoUrl,
      })
      .where(
        and(
          eq(devices.id, id),
          eq(devices.ownerId, user.id),
          eq(devices.active, true),
        ),
      )
      .returning({ id: devices.id });

    if (!updated) {
      return apiError("This laptop isn't on your ledger.", 404);
    }

    return Response.json({ id: updated.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return apiError(SERIAL_CONFLICT_MESSAGE, 409, "serial");
    }

    console.error("Device update failed", error);
    return apiError("The laptop couldn't be saved. Try again.", 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const { id } = await params;

  if (!isUuid(id)) {
    return apiError("This laptop isn't on your ledger.", 404);
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(
      and(
        eq(devices.id, id),
        eq(devices.ownerId, user.id),
        eq(devices.active, true),
      ),
    )
    .limit(1);

  if (!existing) {
    return apiError("This laptop isn't on your ledger.", 404);
  }

  const openVisit = await getOpenVisitForDevice(id);

  if (openVisit) {
    return apiError(
      "This laptop is still signed in. Sign it out at the door before removing it.",
      409,
    );
  }

  try {
    await db
      .update(devices)
      .set({ active: false })
      .where(
        and(
          eq(devices.id, id),
          eq(devices.ownerId, user.id),
          eq(devices.active, true),
        ),
      );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Device soft delete failed", error);
    return apiError("The laptop couldn't be removed. Try again.", 500);
  }
}
