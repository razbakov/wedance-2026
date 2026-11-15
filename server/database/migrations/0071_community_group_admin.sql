-- Who runs a local group and how to reach them (RAZ-967): one admin per group, a name and one
-- contact (phone / WhatsApp link / @handle). Personal data: read only by WeDance admins
-- (communityGroup.listAll) and the city's admins (communityGroup.forCity / pending), never by the
-- public city page (communityGroup.listByCity), cityChannels.official, MCP tools or PostHog.
-- Filled by hand (Admin → Community groups, city page → Local groups) or from the "Outreach CRM"
-- sheet's Admin / Admin Number columns (scripts/import-community-groups.ts --fill-admins, empty fields only).
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE community_groups DROP COLUMN IF EXISTS admin_name, DROP COLUMN IF EXISTS admin_contact;

ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "admin_name" text;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "admin_contact" text;
