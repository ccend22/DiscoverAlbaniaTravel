CREATE TYPE "public"."blog_category" AS ENUM('news', 'activity');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blog_posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"category" "blog_category" NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text NOT NULL,
	"post_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bookings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"booking_reference" text NOT NULL,
	"trip_departure_id" integer NOT NULL,
	"travel_date" date NOT NULL,
	"passenger_name" text NOT NULL,
	"passenger_phone" text NOT NULL,
	"passenger_email" text NOT NULL,
	"seats" integer NOT NULL,
	"price_at_booking" numeric(10, 2) NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "bookings_booking_reference_unique" UNIQUE("booking_reference"),
	CONSTRAINT "bookings_seats_range" CHECK ("bookings"."seats" > 0 and "bookings"."seats" <= 9)
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "destinations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "destinations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operators_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"vat" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"street" text,
	"city" text,
	"rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "operators_vat_unique" UNIQUE("vat")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "routes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"long_name" text NOT NULL,
	"operator_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"city" text NOT NULL,
	"address" text,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "stations_name_unique" UNIQUE("name"),
	CONSTRAINT "stations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "trip_departures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trip_departures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"route_id" integer NOT NULL,
	"from_station_id" integer NOT NULL,
	"to_station_id" integer NOT NULL,
	"departure_time" time NOT NULL,
	"arrival_time" time NOT NULL,
	"duration_min" numeric(6, 1) NOT NULL,
	"distance_km" numeric(6, 1) NOT NULL,
	"weekdays" smallint[] NOT NULL,
	"base_price" numeric(10, 2) DEFAULT '1' NOT NULL,
	"planned_seats" integer DEFAULT 60 NOT NULL,
	"free_seats" integer DEFAULT 0 NOT NULL,
	"can_board" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_departure_id_trip_departures_id_fk" FOREIGN KEY ("trip_departure_id") REFERENCES "public"."trip_departures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_departures" ADD CONSTRAINT "trip_departures_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_departures" ADD CONSTRAINT "trip_departures_from_station_id_stations_id_fk" FOREIGN KEY ("from_station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_departures" ADD CONSTRAINT "trip_departures_to_station_id_stations_id_fk" FOREIGN KEY ("to_station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_departures_natural_key" ON "trip_departures" USING btree ("route_id","from_station_id","to_station_id","departure_time");--> statement-breakpoint
CREATE INDEX "trip_departures_search_idx" ON "trip_departures" USING btree ("from_station_id","to_station_id","departure_time");--> statement-breakpoint
CREATE INDEX "trip_departures_route_idx" ON "trip_departures" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "trip_departures_weekdays_gin" ON "trip_departures" USING gin ("weekdays");