ALTER TABLE "trip_departures" ALTER COLUMN "base_price" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trip_departures" ALTER COLUMN "base_price" DROP NOT NULL;