ALTER TABLE "vendor_users" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_users" ADD COLUMN "permissions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- Backfill: the earliest vendor_users row per operator is the account that
-- originally claimed/created it -- flag it as the owner so existing teams
-- aren't all suddenly permission-less.
UPDATE "vendor_users" SET "is_owner" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("operator_id") "id" FROM "vendor_users" ORDER BY "operator_id", "created_at" ASC
);