ALTER TABLE "bookings" ADD COLUMN "route_stop_id" integer;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "ticket_token" text;--> statement-breakpoint
UPDATE "bookings" SET "ticket_token" = encode(gen_random_bytes(24), 'hex') WHERE "ticket_token" IS NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "ticket_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "ticket_checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "ticket_checked_in_by_vendor_user_id" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_route_stop_id_route_stops_id_fk" FOREIGN KEY ("route_stop_id") REFERENCES "public"."route_stops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ticket_checked_in_by_vendor_user_id_vendor_users_id_fk" FOREIGN KEY ("ticket_checked_in_by_vendor_user_id") REFERENCES "public"."vendor_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ticket_token_unique" UNIQUE("ticket_token");
