import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["member", "gatekeeper", "admin"]);
export const roleGrantRole = pgEnum("role_grant_role", ["gatekeeper", "admin"]);
export const deviceKind = pgEnum("device_kind", ["personal", "library"]);
export const entryMethod = pgEnum("entry_method", ["qr", "manual"]);
export const exitMethod = pgEnum("exit_method", ["qr", "manual", "auto"]);

export const VISIT_FLAGS = [
  "no_tap_out",
  "no_matching_entry",
  "manual",
  "borrowed",
  "no_device",
  "unregistered_device",
] as const;

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    image: text("image"),
    admissionNumber: text("admission_number"),
    role: userRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_admission_number_normalized_check",
      sql`${table.admissionNumber} is null or (${table.admissionNumber} = upper(btrim(${table.admissionNumber})) and length(${table.admissionNumber}) > 0)`,
    ),
  ],
);

export const roleGrants = pgTable(
  "role_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    role: roleGrantRole("role").notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
  },
  (table) => [index("role_grants_ends_at_idx").on(table.endsAt)],
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    serial: text("serial").notNull().unique(),
    model: text("model").notNull(),
    photoUrl: text("photo_url").notNull(),
    serialPhotoUrl: text("serial_photo_url"),
    kind: deviceKind("kind").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("devices_owner_id_idx").on(table.ownerId),
    index("devices_active_idx").on(table.active),
    check(
      "devices_serial_normalized_check",
      sql`${table.serial} = upper(btrim(${table.serial})) and length(${table.serial}) > 0`,
    ),
  ],
);

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    deviceId: uuid("device_id").references(() => devices.id),
    looseSerial: text("loose_serial"),
    entryAt: timestamp("entry_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    exitAt: timestamp("exit_at", { withTimezone: true }),
    entryMethod: entryMethod("entry_method").notNull(),
    exitMethod: exitMethod("exit_method"),
    flags: text("flags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    closedBy: uuid("closed_by").references(() => users.id),
  },
  (table) => [
    uniqueIndex("visits_one_open_per_user_idx")
      .on(table.userId)
      .where(sql`${table.exitAt} is null`),
    uniqueIndex("visits_one_open_per_device_idx")
      .on(table.deviceId)
      .where(sql`${table.deviceId} is not null and ${table.exitAt} is null`),
    index("visits_user_id_idx").on(table.userId),
    index("visits_device_id_idx").on(table.deviceId),
    index("visits_entry_at_idx").on(table.entryAt),
    index("visits_open_idx")
      .on(table.exitAt)
      .where(sql`${table.exitAt} is null`),
    check(
      "visits_flags_allowed_check",
      sql`${table.flags} <@ array['no_tap_out', 'no_matching_entry', 'manual', 'borrowed', 'no_device', 'unregistered_device']::text[]`,
    ),
    check(
      "visits_exit_after_entry_check",
      sql`${table.exitAt} is null or ${table.exitAt} >= ${table.entryAt}`,
    ),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    meta: jsonb("meta")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_log_actor_id_idx").on(table.actorId),
    index("audit_log_entity_idx").on(table.entity, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);

export type UserRole = (typeof userRole.enumValues)[number];
export type RoleGrantRole = (typeof roleGrantRole.enumValues)[number];
export type VisitFlag = (typeof VISIT_FLAGS)[number];
