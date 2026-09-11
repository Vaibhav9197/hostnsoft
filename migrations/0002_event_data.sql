-- The dashboard now aggregates hero_events directly instead of reading running
-- totals out of variant_metrics, so the per-event payload has to survive: which
-- CTA was clicked, and whether a deploy succeeded. Previously it was folded into
-- a counter column and thrown away.
--
-- One JSON column rather than a column per field: the shapes differ by event
-- type, and SQLite's json_extract reads them fine at this volume.

ALTER TABLE hero_events ADD COLUMN data TEXT;
