-- Frunk — one-shot database bootstrap.
--
-- Paste this whole file into the Neon SQL Editor (console.neon.tech → your project →
-- SQL Editor) and run it. It is everything a blank database needs to serve the API:
-- the schema, plus the three role rows that `ROLE_IDS` in src/lib/roles.ts hardcodes.
--
-- Safe to re-run: every statement is guarded, so a second run is a no-op.
--
-- GENERATED FILE — do not edit. Regenerate with:
--   pnpm db:generate && pnpm db:bootstrap-sql
-- Source: 0000_minor_loa.sql

CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "galleries" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"name" text NOT NULL,
	"interval_miles" integer,
	"interval_months" integer,
	"last_completed_date" timestamp with time zone,
	"last_completed_mileage" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"image_url" text,
	"type" text DEFAULT 'note' NOT NULL,
	"order" integer,
	"parent_note_id" text,
	"user_id" text,
	"vehicle_id" text,
	"repair_id" text,
	"vendor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"printful_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"shipping_address" jsonb,
	"items" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"shipping" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"tracking_number" text,
	"tracking_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repairs" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"vendor_id" text,
	"description" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"mileage" integer,
	"cost" integer,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mutually_exclusive_with" integer[],
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"age" integer,
	"username" text NOT NULL,
	"roles" integer[] DEFAULT '{}' NOT NULL,
	"avatar" text,
	"email_verified" integer DEFAULT 0 NOT NULL,
	"email_verification_token" text,
	"email_verification_expires" timestamp with time zone,
	"cookie_consent" jsonb,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"gallery_id" text NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"vin" text,
	"image" text,
	"trim" text,
	"body_style" text,
	"color" text,
	"interior_color" text,
	"drivetrain" text,
	"transmission" text,
	"engine_type" text,
	"engine_size" text,
	"fuel_type" text,
	"nickname" text,
	"purchase_date" timestamp with time zone,
	"purchase_price" integer,
	"purchase_mileage" integer,
	"current_mileage" integer,
	"ownership_status" text,
	"license_plate" text,
	"license_plate_state" text,
	"is_active" integer DEFAULT 1,
	"registration_expiration" timestamp with time zone,
	"inspection_expiration" timestamp with time zone,
	"emissions_expiration" timestamp with time zone,
	"insurance_provider" text,
	"insurance_policy_number" text,
	"insurance_expiration" timestamp with time zone,
	"lien_holder" text,
	"loan_account_number" text,
	"monthly_payment" integer,
	"payoff_date" timestamp with time zone,
	"lease_end_date" timestamp with time zone,
	"lease_annual_mileage" integer,
	"last_oil_change_date" timestamp with time zone,
	"last_oil_change_mileage" integer,
	"oil_change_interval_miles" integer,
	"tire_rotation_due_mileage" integer,
	"next_service_due_mileage" integer,
	"seating_capacity" integer,
	"doors" integer,
	"mpg_city" integer,
	"mpg_highway" integer,
	"fuel_tank_capacity" integer,
	"towing_capacity" integer,
	"horsepower" integer,
	"torque" integer,
	"battery_capacity" integer,
	"ev_range" integer,
	"charger_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
	"key" text PRIMARY KEY NOT NULL,
	"challenge" text NOT NULL,
	"user_id" text,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "galleries" ADD CONSTRAINT "galleries_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notes" ADD CONSTRAINT "notes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notes" ADD CONSTRAINT "notes_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notes" ADD CONSTRAINT "notes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "repairs" ADD CONSTRAINT "repairs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "repairs" ADD CONSTRAINT "repairs_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--
-- Roles. The ids are load-bearing: ROLE_IDS in src/lib/roles.ts is { DEMO: 1, USER: 2,
-- ADMIN: 3 }, so nothing role-gated works until these three rows exist.
--
INSERT INTO "roles" ("id", "name", "mutually_exclusive_with") VALUES
	(1, 'Demo',  ARRAY[2, 3]),
	(2, 'User',  ARRAY[1]),
	(3, 'Admin', ARRAY[1])
ON CONFLICT ("id") DO NOTHING;

-- Keep the serial in step with the explicit ids above.
SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX("id") FROM "roles"));
