CREATE TABLE "ticket_scans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_scans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vendor_user_id" integer NOT NULL,
	"operator_id" integer NOT NULL,
	"booking_id" integer,
	"expected_route_id" integer,
	"scanned_value" text NOT NULL,
	"result" text NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_scans" ADD CONSTRAINT "ticket_scans_vendor_user_id_vendor_users_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_scans" ADD CONSTRAINT "ticket_scans_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_scans" ADD CONSTRAINT "ticket_scans_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_scans" ADD CONSTRAINT "ticket_scans_expected_route_id_routes_id_fk" FOREIGN KEY ("expected_route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_scans_operator_idx" ON "ticket_scans" USING btree ("operator_id","scanned_at");--> statement-breakpoint
CREATE INDEX "ticket_scans_booking_idx" ON "ticket_scans" USING btree ("booking_id");