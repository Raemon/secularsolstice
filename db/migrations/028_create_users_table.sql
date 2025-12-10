create table if not exists users (
  id uuid not null default gen_random_uuid(),
  username text,
  is_guest boolean not null default true,
  created_at timestamptz not null default now(),
  constraint users_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX if not exists users_username_key on users USING btree (username) WHERE (username IS NOT NULL);
