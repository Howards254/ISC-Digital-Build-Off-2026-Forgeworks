CREATE TYPE "public"."device_kind" AS ENUM('personal', 'library');--> statement-breakpoint
CREATE TYPE "public"."entry_method" AS ENUM('qr', 'manual');--> statement-breakpoint
CREATE TYPE "public"."exit_method" AS ENUM('qr', 'manual');--> statement-breakpoint
CREATE TYPE "public"."role_grant_role" AS ENUM('gatekeeper', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'gatekeeper', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"serial" text NOT NULL,
	"model" text NOT NULL,
	"photo_url" text NOT NULL,
	"serial_photo_url" text NOT NULL,
	"kind" "device_kind" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_serial_unique" UNIQUE("serial")
);
--> statement-breakpoint
CREATE TABLE "role_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "role_grant_role" NOT NULL,
	"ends_at" timestamp with time zone,
	"created_by" text NOT NULL,
	CONSTRAINT "role_grants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"admission_number" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid,
	"loose_serial" text,
	"entry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exit_at" timestamp with time zone,
	"entry_method" "entry_method" NOT NULL,
	"exit_method" "exit_method",
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"closed_by" uuid,
	CONSTRAINT "visits_flags_allowed_check" CHECK ("visits"."flags" <@ array['no_tap_out', 'no_matching_entry', 'manual', 'borrowed', 'no_device', 'unregistered_device']::text[]),
	CONSTRAINT "visits_exit_after_entry_check" CHECK ("visits"."exit_at" is null or "visits"."exit_at" >= "visits"."entry_at")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "devices_owner_id_idx" ON "devices" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "devices_active_idx" ON "devices" USING btree ("active");--> statement-breakpoint
CREATE INDEX "role_grants_ends_at_idx" ON "role_grants" USING btree ("ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "visits_one_open_per_user_idx" ON "visits" USING btree ("user_id") WHERE "visits"."exit_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "visits_one_open_per_device_idx" ON "visits" USING btree ("device_id") WHERE "visits"."device_id" is not null and "visits"."exit_at" is null;--> statement-breakpoint
CREATE INDEX "visits_user_id_idx" ON "visits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "visits_device_id_idx" ON "visits" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "visits_entry_at_idx" ON "visits" USING btree ("entry_at");--> statement-breakpoint
CREATE INDEX "visits_open_idx" ON "visits" USING btree ("exit_at") WHERE "visits"."exit_at" is null;