export type UserRole = 'owner' | 'admin' | 'member' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  bio: string | null;
  timezone: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
}
