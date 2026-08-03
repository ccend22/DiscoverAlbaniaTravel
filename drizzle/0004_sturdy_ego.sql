CREATE TYPE "public"."taxi_provider_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."taxi_ride_status" AS ENUM('requested', 'accepted', 'declined', 'cancelled', 'completed');--> statement-breakpoint
CREATE TABLE "taxi_providers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "taxi_providers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"city" text NOT NULL,
	"status" "taxi_provider_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "taxi_ride_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "taxi_ride_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"request_reference" text NOT NULL,
	"user_id" integer,
	"taxi_provider_id" integer,
	"pickup_location" text NOT NULL,
	"destination" text NOT NULL,
	"pickup_at" timestamp with time zone NOT NULL,
	"passengers" integer NOT NULL,
	"passenger_name" text NOT NULL,
	"passenger_phone" text NOT NULL,
	"passenger_email" text NOT NULL,
	"notes" text,
	"quoted_price" numeric(10, 2),
	"status" "taxi_ride_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "taxi_ride_requests_request_reference_unique" UNIQUE("request_reference"),
	CONSTRAINT "taxi_ride_requests_passengers_range" CHECK ("taxi_ride_requests"."passengers" > 0 and "taxi_ride_requests"."passengers" <= 8)
);
--> statement-breakpoint
CREATE TABLE "taxi_vehicles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "taxi_vehicles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"taxi_provider_id" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"plate_number" text NOT NULL,
	"passenger_capacity" integer DEFAULT 4 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "taxi_vehicles_plate_number_unique" UNIQUE("plate_number")
);
--> statement-breakpoint
ALTER TABLE "taxi_ride_requests" ADD CONSTRAINT "taxi_ride_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxi_ride_requests" ADD CONSTRAINT "taxi_ride_requests_taxi_provider_id_taxi_providers_id_fk" FOREIGN KEY ("taxi_provider_id") REFERENCES "public"."taxi_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxi_vehicles" ADD CONSTRAINT "taxi_vehicles_taxi_provider_id_taxi_providers_id_fk" FOREIGN KEY ("taxi_provider_id") REFERENCES "public"."taxi_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "taxi_ride_requests_pickup_idx" ON "taxi_ride_requests" USING btree ("pickup_at");