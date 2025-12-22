export type User = {
  id: string;
  username: string | null;
  created_at: string;
  performed_program_ids: string[];
  is_admin: boolean;
  ever_set_username: boolean;
};

export type AuthBody = {
  username: string;
  password: string;
  currentUserId?: string;
  mode?: 'login' | 'register';
};

export type DbUser = {
  id: string;
  username: string;
  password_hash: string | null;
  created_at: string;
  performed_program_ids: string[];
  is_admin: boolean;
  ever_set_username: boolean;
};