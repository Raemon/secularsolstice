CREATE INDEX IF NOT EXISTS songs_lower_title_idx ON songs USING btree (LOWER(title));
CREATE INDEX IF NOT EXISTS programs_lower_title_idx ON programs USING btree (LOWER(title));
