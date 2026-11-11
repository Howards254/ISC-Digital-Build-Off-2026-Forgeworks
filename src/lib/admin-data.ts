import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db";
import { auditLog, devices, roleGrants, users, visits } from "@/db/schema";
import type {
  AdminAuditEntry,
  AdminHistoryRow,
  AdminInsideVisit,
  AdminLaptopTrail,
  AdminRoleGrant,
} from "@/lib/admin-types";
import { normalizeSerial } from "@/lib/member-rules";
import {
  getSchoolDateInput,
  parseDateInput,
  startOfNextSchoolDay,
  startOfSchoolDay,
} from "@/lib/school-date";
import { formatClock } from "@/lib/time";
import { isVisitFlag, type VisitFlag } from "@/lib/visit-flags";

export const HISTORY_PAGE_SIZE = 25;
export const AUDIT_PAGE_SIZE = 30;

export type AdminHistoryFilters = {
  from: string;
  to: string;
  query: string;
  flag: VisitFlag | null;
  page: number;
};

type SearchParamsLike = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validDateInput(value: string | undefined, fallback: string) {
  return value && parseDateInput(value) ? value : fallback;
}

export function parseHistoryFilters(
  params: SearchParamsLike,
  now = new Date(),
): AdminHistoryFilters {
  const today = getSchoolDateInput(now);
  let from = validDateInput(firstValue(params.from), today);
  let to = validDateInput(firstValue(params.to), today);

  if (from > to) {
    [from, to] = [to, from];
  }

  const rawQuery = firstValue(params.q)?.trim() ?? "";
  const rawFlag = firstValue(params.flag);
  const rawPage = Number.parseInt(firstValue(params.page) ?? "1", 10);

  return {
    from,
    to,
    query: rawQuery.slice(0, 80),
    flag: isVisitFlag(rawFlag) ? rawFlag : null,
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function historyConditions(filters: AdminHistoryFilters): SQL[] {
  const conditions: SQL[] = [];
  const from = startOfSchoolDay(filters.from);
  const to = startOfNextSchoolDay(filters.to);

  if (from) {
    conditions.push(gte(visits.entryAt, from));
  }

  if (to) {
    conditions.push(lt(visits.entryAt, to));
  }

  if (filters.query) {
    const pattern = `%${escapeLike(filters.query)}%`;

    conditions.push(
      or(
        ilike(users.name, pattern),
        ilike(users.admissionNumber, pattern),
        ilike(devices.serial, pattern),
        ilike(visits.looseSerial, pattern),
      ) as SQL,
    );
  }

  if (filters.flag) {
    conditions.push(arrayContains(visits.flags, [filters.flag]));
  }

  return conditions;
}

function historySelection() {
  return {
    id: visits.id,
    entryAt: visits.entryAt,
    exitAt: visits.exitAt,
    name: users.name,
    admissionNumber: users.admissionNumber,
    deviceModel: devices.model,
    deviceSerial: devices.serial,
    looseSerial: visits.looseSerial,
    flags: visits.flags,
    entryMethod: visits.entryMethod,
    exitMethod: visits.exitMethod,
  };
}

export async function getHistoryPage(
  filters: AdminHistoryFilters,
): Promise<{
  rows: AdminHistoryRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}> {
  const db = getDb();
  const where = and(...historyConditions(filters));
  const [countRow] = await db
    .select({ value: count() })
    .from(visits)
    .innerJoin(users, eq(users.id, visits.userId))
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .where(where);
  const total = Number(countRow?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const rows = await db
    .select(historySelection())
    .from(visits)
    .innerJoin(users, eq(users.id, visits.userId))
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .where(where)
    .orderBy(desc(visits.entryAt), desc(visits.id))
    .limit(HISTORY_PAGE_SIZE)
    .offset((page - 1) * HISTORY_PAGE_SIZE);

  return {
    rows: rows.map((row) => ({
      ...row,
      flags: row.flags as VisitFlag[],
    })) as AdminHistoryRow[],
    total,
    page,
    pageCount,
    pageSize: HISTORY_PAGE_SIZE,
  };
}

export async function getHistoryForExport(
  filters: AdminHistoryFilters,
): Promise<AdminHistoryRow[]> {
  const rows = await getDb()
    .select(historySelection())
    .from(visits)
    .innerJoin(users, eq(users.id, visits.userId))
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .where(and(...historyConditions(filters)))
    .orderBy(desc(visits.entryAt), desc(visits.id));

  return rows.map((row) => ({
    ...row,
    flags: row.flags as VisitFlag[],
  })) as AdminHistoryRow[];
}

export async function getInsideVisits(): Promise<AdminInsideVisit[]> {
  const rows = await getDb()
    .select({
      id: visits.id,
      entryAt: visits.entryAt,
      name: users.name,
      admissionNumber: users.admissionNumber,
      deviceModel: devices.model,
      deviceSerial: devices.serial,
      looseSerial: visits.looseSerial,
      flags: visits.flags,
    })
    .from(visits)
    .innerJoin(users, eq(users.id, visits.userId))
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .where(isNull(visits.exitAt))
    .orderBy(asc(visits.entryAt), asc(visits.id));

  return rows.map((row) => ({
    id: row.id,
    entryAtIso: row.entryAt.toISOString(),
    entryTime: formatClock(row.entryAt),
    name: row.name,
    admissionNumber: row.admissionNumber,
    deviceModel: row.deviceModel,
    deviceSerial: row.deviceSerial,
    looseSerial: row.looseSerial,
    flags: row.flags as VisitFlag[],
  }));
}

export async function getLaptopTrail(
  rawSerial: string,
): Promise<AdminLaptopTrail | null> {
  const serial = normalizeSerial(rawSerial);

  if (!serial) {
    return null;
  }

  const db = getDb();
  const owner = alias(users, "owner");
  const [deviceRows, visitRows] = await Promise.all([
    db
      .select({
        id: devices.id,
        serial: devices.serial,
        model: devices.model,
        photoUrl: devices.photoUrl,
        serialPhotoUrl: devices.serialPhotoUrl,
        kind: devices.kind,
        active: devices.active,
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerAdmissionNumber: owner.admissionNumber,
      })
      .from(devices)
      .innerJoin(owner, eq(owner.id, devices.ownerId))
      .where(eq(devices.serial, serial))
      .limit(1),
    db
      .select({
        id: visits.id,
        visitorId: visits.userId,
        visitorName: users.name,
        visitorAdmissionNumber: users.admissionNumber,
        entryAt: visits.entryAt,
        exitAt: visits.exitAt,
        flags: visits.flags,
        entryMethod: visits.entryMethod,
        exitMethod: visits.exitMethod,
        looseSerial: visits.looseSerial,
      })
      .from(visits)
      .innerJoin(users, eq(users.id, visits.userId))
      .leftJoin(devices, eq(devices.id, visits.deviceId))
      .where(
        or(
          eq(visits.looseSerial, serial),
          eq(devices.serial, serial),
        ),
      )
      .orderBy(desc(visits.entryAt), desc(visits.id)),
  ]);

  return {
    serial,
    laptop: deviceRows[0] ?? null,
    visits: visitRows.map((row) => ({
      ...row,
      flags: row.flags as VisitFlag[],
    })),
  };
}

export async function getCurrentRoleGrants(
  now = new Date(),
): Promise<AdminRoleGrant[]> {
  return getDb()
    .select({
      id: roleGrants.id,
      email: roleGrants.email,
      role: roleGrants.role,
      endsAt: roleGrants.endsAt,
      createdBy: roleGrants.createdBy,
    })
    .from(roleGrants)
    .where(
      or(isNull(roleGrants.endsAt), gt(roleGrants.endsAt, now)),
    )
    .orderBy(asc(roleGrants.email));
}

export async function getAuditPage(requestedPage: number) {
  const db = getDb();
  const [countRow] = await db.select({ value: count() }).from(auditLog);
  const total = Number(countRow?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const actor = alias(users, "actor");
  const member = alias(users, "member");
  const rows = await db
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      meta: auditLog.meta,
      actorName: actor.name,
      actorEmail: actor.email,
      targetName: member.name,
      targetAdmissionNumber: member.admissionNumber,
      deviceModel: devices.model,
      deviceSerial: devices.serial,
      looseSerial: visits.looseSerial,
    })
    .from(auditLog)
    .leftJoin(actor, eq(actor.id, auditLog.actorId))
    .leftJoin(
      visits,
      and(
        eq(auditLog.entity, "visit"),
        sql`${visits.id}::text = ${auditLog.entityId}`,
      ),
    )
    .leftJoin(member, eq(member.id, visits.userId))
    .leftJoin(devices, eq(devices.id, visits.deviceId))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(AUDIT_PAGE_SIZE)
    .offset((page - 1) * AUDIT_PAGE_SIZE);

  return {
    rows: rows as AdminAuditEntry[],
    total,
    page,
    pageCount,
    pageSize: AUDIT_PAGE_SIZE,
  };
}
