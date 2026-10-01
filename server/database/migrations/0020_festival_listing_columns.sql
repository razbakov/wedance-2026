ALTER TABLE "festivals" ADD COLUMN "city" text;
ALTER TABLE "festivals" ADD COLUMN "country" text;
ALTER TABLE "festivals" ADD COLUMN "description" text;
ALTER TABLE "festivals" ADD COLUMN "styles" json DEFAULT '[]'::json;
ALTER TABLE "festivals" ADD COLUMN "logo" text;
ALTER TABLE "festivals" ADD COLUMN "accent_color" text;
