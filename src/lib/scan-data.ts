import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  auditLog,
  devices,
  users,
  visits,
  type VisitFlag,
} from "@/db/schema";
import type { DoorDirection } from "@/lib/door-token";

export type ScanLaptop = {
  id: string;
  model: string;
  serial: string;
  photoUrl: string;
};

export type OpenVisitSummary = {
  id: string;
  entryAt: Date;
  deviceId: string | null;
  looseSerial: string | null;
  deviceModel: string | null;
  deviceSerial: string | null;
  devicePhotoUrl: string | null;
};

export type ScanMember = {
  id: string;
  name: string;
  email: string;
  admissionNumber: string | null;
  openVisit: OpenVisitSummary | null;
  laptops: ScanLaptop[];
};

export type LookupPerson = {
  id: string;
  name: string;
  admissionNumber: string | null;
  openVisit: OpenVisitSummary | null;
  laptops: ScanLaptop[];
};

export type RecentScan = {
  id: string;
  direction: DoorDirection;
  at: Date;
  name: string;
  admissionNumber: string | null;
  deviceModel: string | null;
  looseSerial: string | null;
};

export type VisitConfirmation = {
  id: string;
  userId: string;
  name: string;
  admissionNumber: string | null;
  entryAt: Date;
  exitAt: Date | null;
  entryMethod: "qr" | "manual";
  exitMethod: "qr" | "manual" | "auto" | null;
  flags: VisitFlag[];
  looseSerial: string | null;
  deviceId: string | null;
  deviceModel: string | null;
  deviceSerial: string | null;
  devicePhotoUrl: string | null;
  direction: DoorDirection;
};

function laptopSelection() {
  return {
    id: devices.id,
    model: devices.model,
    serial: devices.serial,
    photoUrl: devices.photoUrl,
  };
}

export async function getScanMember(userId: string): Promise<ScanMember | null> {
  const db = getDb();

  const [memberRows, openVisitRows, laptopRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        admissionNumber: users.admissionNumber,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        id: visits.id,
        entryAt: visits.entryAt,
        deviceId: visits.deviceId,
        looseSerial: visits.looseSerial,
        deviceModel: devices.model,
        deviceSerial: devices.serial,
        devicePhotoUrl: devices.photoUrl,
      })
      .from(visits)
      .leftJoin(devices, eq(devices.id, visits.deviceId))
      .where(and(eq(visits.userId, userId), isNull(visits.exitAt)))
      .limit(1),
    db
      .select(laptopSelection())
      .from(devices)
      .where(and(eq(devices.ownerId, userId), eq(devices.active, true)))
      .orderBy(asc(devices.createdAt)),
  ]);

  const member = memberRows[0];

  if (!member) {
    return null;
  }

  return {
    ...member,
    openVisit: openVisitRows[0] ?? null,
    laptops: laptopRows,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function lookupPeople(
  rawQuery: string,
  limit = 8,
): Promise<LookupPerson[]> {
  const query = rawQuery.trim();

  if (query.length < 2) {
    return [];
  }

  const db = getDb();
  const pattern = `%${escapeLike(query)}%`;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      admissionNumber: users.admissionNumber,
      visitId: visits.id,
      entryAt: visits.entryAt,
      deviceId: visits.deviceId,
      looseSerial: visits.looseSerial,
      deviceModel: devices.model,
      deviceSerial: devices.serial,
      devicePhotoUrl: devices.photoUrl,
    })
    .from(users)
    .leftJoin(
      visits,
      and(eq(visits.userId, users.id), isNull(visits.exitAt)),
    )
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .where(
      or(
        ilike(users.name, pattern),
        ilike(users.admissionNumber, pattern),
      ),
    )
    .orderBy(asc(users.name))
    .limit(limit);

  const userIds = rows.map((row) => row.id);

  if (userIds.length === 0) {
    return [];
  }

  const laptopRows = await db
    .select({ ...laptopSelection(), ownerId: devices.ownerId })
    .from(devices)
    .where(
      and(inArray(devices.ownerId, userIds), eq(devices.active, true)),
    )
    .orderBy(asc(devices.createdAt));

  const laptopsByOwner = new Map<string, ScanLaptop[]>();

  for (const laptop of laptopRows) {
    const list = laptopsByOwner.get(laptop.ownerId) ?? [];
    list.push({
      id: laptop.id,
      model: laptop.model,
      serial: laptop.serial,
      photoUrl: laptop.photoUrl,
    });
    laptopsByOwner.set(laptop.ownerId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    admissionNumber: row.admissionNumber,
    openVisit: row.visitId
      ? {
          id: row.visitId,
          entryAt: row.entryAt ?? new Date(0),
          deviceId: row.deviceId,
          looseSerial: row.looseSerial,
          deviceModel: row.deviceModel,
          deviceSerial: row.deviceSerial,
          devicePhotoUrl: row.devicePhotoUrl,
        }
      : null,
    laptops: laptopsByOwner.get(row.id) ?? [],
  }));
}

export async function getVisitForConfirmation(
  visitId: string,
): Promise<VisitConfirmation | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: visits.id,
      userId: visits.userId,
      name: users.name,
      admissionNumber: users.admissionNumber,
      entryAt: visits.entryAt,
      exitAt: visits.exitAt,
      entryMethod: visits.entryMethod,
      exitMethod: visits.exitMethod,
      flags: visits.flags,
      looseSerial: visits.looseSerial,
      deviceId: visits.deviceId,
      deviceModel: devices.model,
      deviceSerial: devices.serial,
      devicePhotoUrl: devices.photoUrl,
    })
    .from(visits)
    .innerJoin(users, eq(users.id, visits.userId))
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .where(eq(visits.id, visitId))
    .limit(1);

  if (!row) {
    return null;
  }

  const [latestAudit] = await db
    .select({ action: auditLog.action })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entityId, visitId),
        inArray(auditLog.action, ["visit.check_in", "visit.check_out"]),
      ),
    )
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(1);

  return {
    ...row,
    flags: row.flags as VisitFlag[],
    direction: latestAudit?.action === "visit.check_out" ? "out" : "in",
  };
}

export async function getRecentScans(limit = 8): Promise<RecentScan[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      at: auditLog.createdAt,
      name: users.name,
      admissionNumber: users.admissionNumber,
      deviceModel: devices.model,
      looseSerial: visits.looseSerial,
    })
    .from(auditLog)
    .innerJoin(visits, sql`${visits.id}::text = ${auditLog.entityId}`)
    .innerJoin(users, eq(users.id, visits.userId))
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .where(inArray(auditLog.action, ["visit.check_in", "visit.check_out"]))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    direction: row.action === "visit.check_out" ? "out" : "in",
    at: row.at,
    name: row.name,
    admissionNumber: row.admissionNumber,
    deviceModel: row.deviceModel,
    looseSerial: row.looseSerial,
  }));
}
