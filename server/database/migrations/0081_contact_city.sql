-- A city on a site sign-up (RAZ-1093). The words they typed are their own
-- column, not a promo code and not loose source metadata. city_id is set
-- only when that text matches exactly one row in cities (name, local name,
-- slug or an alternate name). Two cities that share a name stay unmatched.
--
-- One-off: los.filinsclub's "Want Los Filin in your city?" form had been
-- collecting cities in the promo code field. Those values move onto city,
-- and that sign-up section asks for a city and hides the promo code.
-- Imported lists (HubSpot, wedance.vip) are not that form.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE profile_contacts DROP COLUMN IF EXISTS city_id;
--   ALTER TABLE profile_contacts DROP COLUMN IF EXISTS city;
--   (the moved promo codes and the site section are not put back)

ALTER TABLE "profile_contacts" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "profile_contacts" ADD COLUMN IF NOT EXISTS "city_id" uuid REFERENCES "cities"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "profile_contacts_profile_city_idx" ON "profile_contacts" ("profile_id", lower("city"));

UPDATE "profile_contacts" c
SET
  "city" = btrim(c.source->>'promo_code'),
  "source" = c.source - 'promo_code',
  "updated_at" = now()
FROM "profiles" p
WHERE c.profile_id = p.id
  AND p.username = 'los.filinsclub'
  AND coalesce(btrim(c.source->>'promo_code'), '') <> ''
  AND coalesce(btrim(c.city), '') = ''
  AND coalesce(c.source->>'from', '') NOT IN ('hubspot', 'wedance-v3')
  AND coalesce(c.source->>'hubspot_origin', '') = '';

-- Link a moved city when it names exactly one city we know.
UPDATE "profile_contacts" c
SET "city_id" = m.id
FROM (
  SELECT c2.id AS contact_id, (array_agg(DISTINCT ci.id))[1] AS id
  FROM "profile_contacts" c2
  JOIN "cities" ci ON lower(ci.name) = lower(btrim(c2.city))
    OR lower(ci.local_name) = lower(btrim(c2.city))
    OR lower(ci.slug) = lower(btrim(c2.city))
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(ci.alt_names) a
      WHERE lower(a) = lower(btrim(c2.city))
    )
  WHERE coalesce(btrim(c2.city), '') <> ''
    AND c2.city_id IS NULL
  GROUP BY c2.id
  HAVING count(DISTINCT ci.id) = 1
) m
WHERE c.id = m.contact_id;

-- The interest form uses the real City field and hides the promo code.
WITH updated AS (
  UPDATE "profile_sites" s
  SET
    "content" = jsonb_set(
      s.content,
      '{sections}',
      (
        SELECT coalesce(jsonb_agg(
          CASE
            WHEN sec->>'kind' = 'signup' AND (sec->>'anchor' = 'interest' OR sec->>'id' = 'mhbks74k')
            THEN sec
              || jsonb_build_object('hidePromo', true)
              || jsonb_build_object(
                'city',
                jsonb_build_object(
                  'label',
                  CASE
                    WHEN sec#>'{city,label}' IS NOT NULL AND sec#>'{city,label}' <> '{}'::jsonb
                    THEN sec#>'{city,label}'
                    ELSE jsonb_build_object('en', 'Your city')
                  END
                )
              )
            ELSE sec
          END
          ORDER BY ord
        ), '[]'::jsonb)
        FROM jsonb_array_elements(s.content->'sections') WITH ORDINALITY AS t(sec, ord)
      ),
      true
    ),
    "updated_at" = now()
  FROM "profiles" p
  WHERE s.profile_id = p.id
    AND p.username = 'los.filinsclub'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(s.content->'sections') sec
      WHERE sec->>'kind' = 'signup'
        AND (sec->>'anchor' = 'interest' OR sec->>'id' = 'mhbks74k')
        AND (
          sec->>'hidePromo' IS DISTINCT FROM 'true'
          OR coalesce(sec#>>'{city,label,en}', '') = ''
            AND (sec#>'{city,label}' IS NULL OR sec#>'{city,label}' = '{}'::jsonb)
        )
    )
  RETURNING s.profile_id, s.content
)
INSERT INTO "profile_site_versions" ("profile_id", "content", "via", "summary")
SELECT profile_id, content, 'backfill', '["Asked for a city on the sign-up form and hid the promo code"]'::jsonb
FROM updated;
