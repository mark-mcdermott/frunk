ALTER TABLE "maintenance_schedules" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "schedule_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reminders_by_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_schedule_id_maintenance_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."maintenance_schedules"("id") ON DELETE set null ON UPDATE no action;