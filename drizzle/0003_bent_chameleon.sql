CREATE TABLE "expiration_reminders" (
	"vehicle_id" text NOT NULL,
	"kind" text NOT NULL,
	"sent_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expiration_reminders_vehicle_id_kind_pk" PRIMARY KEY("vehicle_id","kind")
);
--> statement-breakpoint
ALTER TABLE "expiration_reminders" ADD CONSTRAINT "expiration_reminders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;