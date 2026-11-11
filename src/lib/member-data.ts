import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { devices, users, visits } from "@/db/schema";

export async function getMemberOverview(userId: string) {
  const db = getDb();

  const [memberRows, openVisitRows, laptopRows] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        admissionNumber: users.admissionNumber,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ entryAt: visits.entryAt })
      .from(visits)
      .where(and(eq(visits.userId, userId), isNull(visits.exitAt)))
      .limit(1),
    db
      .select({
        id: devices.id,
        model: devices.model,
        serial: devices.serial,
        photoUrl: devices.photoUrl,
      })
      .from(devices)
      .where(and(eq(devices.ownerId, userId), eq(devices.active, true)))
      .orderBy(asc(devices.createdAt)),
  ]);

  return {
    member: memberRows[0] ?? null,
    openVisit: openVisitRows[0] ?? null,
    laptops: laptopRows,
  };
}

export async function getOwnedLaptop(deviceId: string, ownerId: string) {
  const [laptop] = await getDb()
    .select({
      id: devices.id,
      model: devices.model,
      serial: devices.serial,
      photoUrl: devices.photoUrl,
      serialPhotoUrl: devices.serialPhotoUrl,
    })
    .from(devices)
    .where(
      and(
        eq(devices.id, deviceId),
        eq(devices.ownerId, ownerId),
        eq(devices.active, true),
      ),
    )
    .limit(1);

  return laptop ?? null;
}

export async function getOpenVisitForDevice(deviceId: string) {
  const [visit] = await getDb()
    .select({ id: visits.id })
    .from(visits)
    .where(and(eq(visits.deviceId, deviceId), isNull(visits.exitAt)))
    .limit(1);

  return visit ?? null;
}
