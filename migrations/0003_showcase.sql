-- Showcase: the apps people built, and the collections they're grouped into.
--
-- Lives in the same D1 database as the A/B tables because there is only one
-- database bound to this Worker, not because the two are related.
--
-- Submissions are public and unauthenticated, so nothing here is visible until
-- a human approves it: `status` gates every read the public pages do. That is
-- also the spam answer — an unapproved row is invisible, so there is nothing
-- to gain by posting one.

CREATE TABLE IF NOT EXISTS showcase_apps (
  id              TEXT PRIMARY KEY,
  -- The public URL segment, /showcase/apps/<slug>. Unique because it addresses
  -- the page; derived from the name and suffixed on collision.
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  -- The single sentence used on cards and under the title. Kept separate from
  -- the longer body so a card never has to truncate mid-thought.
  tagline         TEXT NOT NULL,
  what_it_does    TEXT,
  why_built       TEXT,

  -- Where the app actually is. `app_url` is what "Open app" opens; custom_url
  -- records a domain the creator put in front of it, if any.
  app_url         TEXT NOT NULL,
  custom_url      TEXT,
  screenshot_url  TEXT,
  -- Optional, and only for the 1-year Pro offer. A submission never requires it.
  video_url       TEXT,

  creator_name    TEXT NOT NULL,
  creator_profile TEXT,

  -- Free text rather than a foreign key: "what did you build it with" changes
  -- faster than a table of tools would, and a value we don't recognise should
  -- still be recorded rather than rejected.
  built_with      TEXT,
  category        TEXT,
  organisation    TEXT,
  location        TEXT,
  -- The event code the creator activated, if any. Drives automatic membership
  -- of that hackathon's collection.
  hackathon_code  TEXT,

  -- pending | approved | rejected. Nothing but 'approved' is ever public.
  status          TEXT NOT NULL DEFAULT 'pending',
  featured        INTEGER NOT NULL DEFAULT 0,
  -- NULL when no video was submitted; otherwise requested | granted | declined.
  pro_status      TEXT,

  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT
);

-- Every public listing filters on status and orders by featured then recency,
-- so that is the index.
CREATE INDEX IF NOT EXISTS idx_showcase_apps_public
  ON showcase_apps(status, featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_showcase_apps_category  ON showcase_apps(category);
CREATE INDEX IF NOT EXISTS idx_showcase_apps_tool      ON showcase_apps(built_with);
CREATE INDEX IF NOT EXISTS idx_showcase_apps_hackathon ON showcase_apps(hackathon_code);

-- Free-form, normalized on the way in. Deliberately NOT a public route: a tag
-- with one app behind it is a thin page, so tags feed collections rather than
-- becoming them.
CREATE TABLE IF NOT EXISTS showcase_tags (
  app_id TEXT NOT NULL,
  tag    TEXT NOT NULL,
  PRIMARY KEY (app_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_showcase_tags_tag ON showcase_tags(tag);

-- A public grouping page. `path` is the URL after /showcase/ — one segment for
-- a category or tool ("games", "claude"), two for an event or institution
-- ("hackathons/iit-indore-2026").
CREATE TABLE IF NOT EXISTS showcase_collections (
  path       TEXT PRIMARY KEY,
  -- category | ai-tool | hackathon | college | challenge | curated
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  intro      TEXT,
  -- What an app's matching column must equal to be a member: the category name,
  -- the tool name, the hackathon code. NULL for a purely curated collection,
  -- whose membership is only what showcase_collection_apps lists.
  match_value TEXT,
  -- Off by default. A collection is only worth indexing once it has a real
  -- theme and enough behind it; until then the page exists but asks not to be
  -- listed, which is what keeps this from becoming thousands of thin pages.
  indexable  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Manual membership, for curated collections and for pulling an app into a
-- collection its own columns don't already put it in. Rule-based membership
-- (category, tool, hackathon code) needs no row here.
CREATE TABLE IF NOT EXISTS showcase_collection_apps (
  collection_path TEXT NOT NULL,
  app_id          TEXT NOT NULL,
  PRIMARY KEY (collection_path, app_id)
);
