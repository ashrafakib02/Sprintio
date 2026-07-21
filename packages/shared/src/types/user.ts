import { USER_ROLES } from '../constants/roles.js';

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  /** The canonical role union is UserRole, but the API may return any string. */
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  bio: string | null;
  timezone: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
}
