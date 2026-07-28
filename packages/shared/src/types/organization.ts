import type { User } from './user.js';
import { ORGANIZATION_ROLES } from '../constants/roles.js';

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  user?: User;
  createdAt: string;
}
