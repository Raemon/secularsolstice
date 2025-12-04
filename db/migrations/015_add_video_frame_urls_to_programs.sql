alter table programs add column if not exists video_frame_urls text[] not null default '{}'::text[];

