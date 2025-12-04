alter table programs drop column if exists video_frame_urls;
alter table programs add column if not exists video_url text;

