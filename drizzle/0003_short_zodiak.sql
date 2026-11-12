CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_content_type_check" CHECK ("photos"."content_type" in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "photos_bytes_size_check" CHECK (octet_length("photos"."bytes") between 1 and 5242880)
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_owner_id_idx" ON "photos" USING btree ("owner_id");