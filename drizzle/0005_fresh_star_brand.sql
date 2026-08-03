CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"booking_id" integer,
	"taxi_ride_request_id" integer,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "payments_provider_payment_id_unique" UNIQUE("provider_payment_id"),
	CONSTRAINT "payments_single_target" CHECK (num_nonnulls("payments"."booking_id", "payments"."taxi_ride_request_id") = 1),
	CONSTRAINT "payments_amount_nonnegative" CHECK ("payments"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "taxi_provider_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "taxi_provider_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"taxi_provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "taxi_provider_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "taxi_request_declines" (
	"taxi_ride_request_id" integer NOT NULL,
	"taxi_provider_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_inventories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trip_inventories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trip_departure_id" integer NOT NULL,
	"travel_date" date NOT NULL,
	"total_seats" integer NOT NULL,
	"available_seats" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_inventories_seats_range" CHECK ("trip_inventories"."available_seats" >= 0 and "trip_inventories"."available_seats" <= "trip_inventories"."total_seats")
);
--> statement-breakpoint
ALTER TABLE "taxi_ride_requests" ADD COLUMN "taxi_vehicle_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_taxi_ride_request_id_taxi_ride_requests_id_fk" FOREIGN KEY ("taxi_ride_request_id") REFERENCES "public"."taxi_ride_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxi_provider_users" ADD CONSTRAINT "taxi_provider_users_taxi_provider_id_taxi_providers_id_fk" FOREIGN KEY ("taxi_provider_id") REFERENCES "public"."taxi_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxi_request_declines" ADD CONSTRAINT "taxi_request_declines_taxi_ride_request_id_taxi_ride_requests_id_fk" FOREIGN KEY ("taxi_ride_request_id") REFERENCES "public"."taxi_ride_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxi_request_declines" ADD CONSTRAINT "taxi_request_declines_taxi_provider_id_taxi_providers_id_fk" FOREIGN KEY ("taxi_provider_id") REFERENCES "public"."taxi_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_inventories" ADD CONSTRAINT "trip_inventories_trip_departure_id_trip_departures_id_fk" FOREIGN KEY ("trip_departure_id") REFERENCES "public"."trip_departures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "taxi_request_declines_request_provider_key" ON "taxi_request_declines" USING btree ("taxi_ride_request_id","taxi_provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_inventories_departure_date_key" ON "trip_inventories" USING btree ("trip_departure_id","travel_date");--> statement-breakpoint
ALTER TABLE "taxi_ride_requests" ADD CONSTRAINT "taxi_ride_requests_taxi_vehicle_id_taxi_vehicles_id_fk" FOREIGN KEY ("taxi_vehicle_id") REFERENCES "public"."taxi_vehicles"("id") ON DELETE set null ON UPDATE no action;