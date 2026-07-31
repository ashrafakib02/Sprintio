import type { ApiResponse, Organization, OrganizationRole } from '@sprintio/shared';
import type { OrganizationMember } from '@/types/organization';
import { apiRequest } from './api';

// ─── Create ──────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  description?: string;
}

export async function createOrganization(
  data: CreateOrganizationInput,
): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>('/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── List ────────────────────────────────────────────────────────────────

export async function listOrganizations(
  includeArchived?: boolean,
): Promise<ApiResponse<Organization[]>> {
  const params = includeArchived ? '?includeArchived=true' : '';
  return apiRequest<Organization[]>(`/organizations${params}`);
}

// ─── Get by ID ───────────────────────────────────────────────────────────

export async function getOrganization(id: string): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>(`/organizations/${id}`);
}

// ─── Update ──────────────────────────────────────────────────────────────

export interface UpdateOrganizationInput {
  name?: string;
  description?: string | null;
  logo?: string | null;
}

export async function updateOrganization(
  id: string,
  data: UpdateOrganizationInput,
): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>(`/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Archive ─────────────────────────────────────────────────────────────

export async function archiveOrganization(id: string): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>(`/organizations/${id}/archive`, {
    method: 'POST',
  });
}

// ─── Restore ─────────────────────────────────────────────────────────────

export async function restoreOrganization(id: string): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>(`/organizations/${id}/restore`, {
    method: 'POST',
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────

export async function deleteOrganization(id: string): Promise<ApiResponse<null>> {
  return apiRequest<null>(`/organizations/${id}`, {
    method: 'DELETE',
  });
}

// ─── Members ─────────────────────────────────────────────────────────────

export async function listOrganizationMembers(
  id: string,
): Promise<ApiResponse<OrganizationMember[]>> {
  return apiRequest<OrganizationMember[]>(`/organizations/${id}/members`);
}

export interface AddOrganizationMemberInput {
  email: string;
  role?: OrganizationRole;
}

export async function addOrganizationMember(
  id: string,
  data: AddOrganizationMemberInput,
): Promise<ApiResponse<OrganizationMember>> {
  return apiRequest<OrganizationMember>(`/organizations/${id}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<ApiResponse<null>> {
  return apiRequest<null>(`/organizations/${organizationId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function updateOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
): Promise<ApiResponse<OrganizationMember>> {
  return apiRequest<OrganizationMember>(`/organizations/${organizationId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}
