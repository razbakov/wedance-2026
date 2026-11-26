-- One announcement post per event (RAZ-986).
-- Opening the editor created two: the sidebar and the content plan both
-- inserted the announcement before either could see the other. Keep the one
-- that already has a flyer, else the oldest, and refuse a second.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
-- The preview database runs the branch's migrations on its own copy.
--
-- Rollback:
--   DROP INDEX IF EXISTS event_posts_one_announcement;

DELETE FROM event_posts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      row_number() OVER (
        PARTITION BY event_id
        ORDER BY
          (SELECT count(*) FROM event_flyers f WHERE f.post_id = event_posts.id) DESC,
          created_at ASC NULLS LAST,
          id ASC
      ) AS n
    FROM event_posts
    WHERE kind = 'announcement'
  ) ranked
  WHERE n > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS event_posts_one_announcement
  ON event_posts (event_id)
  WHERE kind = 'announcement';
