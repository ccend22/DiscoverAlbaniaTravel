ALTER TABLE "bookings" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "manage_token" text;