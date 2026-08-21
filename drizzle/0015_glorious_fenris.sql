CREATE TYPE "public"."station_category" AS ENUM('terminus', 'intermediate');--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "route_stops_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"route_id" integer NOT NULL,
	"station_id" integer NOT NULL,
	"sequence_order" integer NOT NULL,
	"minutes_from_departure" integer NOT NULL,
	"price_to_destination" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_stops_minutes_nonnegative" CHECK ("route_stops"."minutes_from_departure" >= 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "passenger_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "created_by_vendor_user_id" integer;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "category" "station_category" DEFAULT 'terminus' NOT NULL;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "photo_urls" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "route_stops_route_station_key" ON "route_stops" USING btree ("route_id","station_id");--> statement-breakpoint
CREATE UNIQUE INDEX "route_stops_route_sequence_key" ON "route_stops" USING btree ("route_id","sequence_order");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_vendor_user_id_vendor_users_id_fk" FOREIGN KEY ("created_by_vendor_user_id") REFERENCES "public"."vendor_users"("id") ON DELETE set null ON UPDATE no action;