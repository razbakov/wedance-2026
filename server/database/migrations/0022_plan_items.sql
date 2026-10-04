CREATE TABLE "plan_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dancer_id" uuid NOT NULL,
  "item_type" text NOT NULL,
  "item_id" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "plan_items_dancer_item" UNIQUE("dancer_id","item_type","item_id")
);

ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_dancer_id_dancers_id_fk" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "plan_items_dancer_idx" ON "plan_items" USING btree ("dancer_id");
