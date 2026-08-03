CREATE TABLE "vendor_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vendor_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"operator_id" integer NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "vendor_users_operator_id_unique" UNIQUE("operator_id"),
	CONSTRAINT "vendor_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;