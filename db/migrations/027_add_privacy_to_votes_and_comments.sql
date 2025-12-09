-- Add privacy field to votes table
ALTER TABLE votes ADD COLUMN IF NOT EXISTS privacy TEXT NOT NULL DEFAULT 'public';

-- Add privacy field to comments table  
ALTER TABLE comments ADD COLUMN IF NOT EXISTS privacy TEXT NOT NULL DEFAULT 'public';

-- Create indexes for privacy fields
CREATE INDEX IF NOT EXISTS votes_privacy_idx ON votes USING btree (privacy);
CREATE INDEX IF NOT EXISTS comments_privacy_idx ON comments USING btree (privacy);

