CREATE TABLE "repair_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"repair_id" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repair_attachments" ADD CONSTRAINT "repair_attachments_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE cascade ON UPDATE no action;