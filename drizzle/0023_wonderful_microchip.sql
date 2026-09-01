CREATE TYPE "public"."device_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."fiscal_status" AS ENUM('not_required', 'pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."print_job_status" AS ENUM('queued', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."print_job_type" AS ENUM('ticket', 'receipt', 'reprint');--> statement-breakpoint
ALTER TYPE "public"."booking_channel" ADD VALUE 'mobile';--> statement-breakpoint
CREATE TABLE "device_refresh_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "device_refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"device_id" integer NOT NULL,
	"vendor_user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "devices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"operator_id" integer NOT NULL,
	"label" text NOT NULL,
	"status" "device_status" DEFAULT 'pending' NOT NULL,
	"activation_code_hash" text,
	"activation_code_expires_at" timestamp with time zone,
	"device_identifier" text,
	"activated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_activation_code_hash_unique" UNIQUE("activation_code_hash")
);
--> statement-breakpoint
CREATE TABLE "mobile_idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"vendor_user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "print_jobs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"device_id" integer,
	"vendor_user_id" integer,
	"booking_id" integer,
	"type" "print_job_type" NOT NULL,
	"is_copy" boolean DEFAULT false NOT NULL,
	"reprint_reason" text,
	"fiscal_status" "fiscal_status" DEFAULT 'not_required' NOT NULL,
	"fiscal_nivf" text,
	"fiscal_nslf" text,
	"fiscal_qr_data" text,
	"payload" jsonb NOT NULL,
	"status" "print_job_status" DEFAULT 'queued' NOT NULL,
	"failure_reason" text,
	"client_idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	CONSTRAINT "print_jobs_client_idempotency_key_unique" UNIQUE("client_idempotency_key"),
	CONSTRAINT "print_jobs_reprint_reason_required" CHECK ("print_jobs"."is_copy" = false or "print_jobs"."reprint_reason" is not null)
);
--> statement-breakpoint
ALTER TABLE "device_refresh_tokens" ADD CONSTRAINT "device_refresh_tokens_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_refresh_tokens" ADD CONSTRAINT "device_refresh_tokens_vendor_user_id_vendor_users_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_idempotency_keys" ADD CONSTRAINT "mobile_idempotency_keys_vendor_user_id_vendor_users_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_vendor_user_id_vendor_users_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_refresh_tokens_device_idx" ON "device_refresh_tokens" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "devices_operator_idx" ON "devices" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "print_jobs_device_idx" ON "print_jobs" USING btree ("device_id");