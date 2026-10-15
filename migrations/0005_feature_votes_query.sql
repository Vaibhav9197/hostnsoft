-- Ties votes to the message they were sent with, so the admin's Customer
-- Queries list can show, per message, only the features picked alongside it.
-- Votes cast without sending a message keep a NULL here and still count.

ALTER TABLE feature_votes ADD COLUMN query_id TEXT;

CREATE INDEX IF NOT EXISTS idx_feature_votes_query ON feature_votes (query_id);
