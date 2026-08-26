CREATE TYPE "public"."operator_report_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "operator_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operator_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"operator_id" integer NOT NULL,
	"booking_id" integer,
	"reporter_name" text NOT NULL,
	"reporter_email" text NOT NULL,
	"message" text NOT NULL,
	"status" "operator_report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "review_rating" integer;--> statement-breakpoint
ALTER TABLE "operator_reports" ADD CONSTRAINT "operator_reports_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_reports" ADD CONSTRAINT "operator_reports_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_review_rating_range" CHECK ("bookings"."review_rating" is null or ("bookings"."review_rating" >= 1 and "bookings"."review_rating" <= 5));