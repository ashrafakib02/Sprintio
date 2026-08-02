import type { ApiResponse, AuthResponse, LoginInput, RegisterInput } from '@sprintio/shared';

const API_BASE = '/api';

export interface ApiError {
  error: string;
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  let body: unknown;

  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    const text = await res.text();
    const err = new Error(text || `Request failed (${res.status})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = res.status;
    throw err;
  }

  if (!res.ok) {
    const error = body as ApiError;
    const err = new Error(error.error || 'Request failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = res.status;
    throw err;
  }

  return body as ApiResponse<T>;
}

export async function register(data: RegisterInput): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginInput): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── OAuth types ────────────────────────────────────────────────

export interface OAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  provider: string;
}

// ── Auth session endpoints ───────────────────────────────────

export async function fetchMe(): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/auth/me');
}

export async function refreshTokens(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Refresh failed');
  }
}

export async function logoutApi(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// ── Email verification endpoints ─────────────────────────────

export async function resendVerification(data: {
  email: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Password reset endpoints ──────────────────────────────────

export async function forgotPassword(data: {
  email: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Google OAuth endpoints ────────────────────────────────────

export async function getGoogleAuthUrl(): Promise<ApiResponse<{ url: string }>> {
  return apiRequest<{ url: string }>('/auth/google');
}

export async function handleGoogleCallback(
  code: string,
  state: string,
): Promise<ApiResponse<{ user: OAuthUser }>> {
  return apiRequest<{ user: OAuthUser }>('/auth/google/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

export async function linkGoogleAccount(code: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/google/link', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function unlinkGoogleAccount(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/google/unlink', {
    method: 'POST',
  });
}

export async function getLinkedProviders(): Promise<
  ApiResponse<{ providers: Array<{ provider: string; linkedAt: string }> }>
> {
  return apiRequest<{ providers: Array<{ provider: string; linkedAt: string }> }>(
    '/auth/google/providers',
  );
}

// ── Session management endpoints ─────────────────────────────

export interface SessionInfo {
  id: string;
  deviceId: string;
  browser: string;
  os: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  ipAddress: string | null;
  isCurrent: boolean;
  lastActive: string;
  createdAt: string;
}

export async function fetchSessions(): Promise<ApiResponse<{ sessions: SessionInfo[] }>> {
  return apiRequest<{ sessions: SessionInfo[] }>('/auth/sessions');
}

export async function revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

// ── Workspace Members endpoints ──────────────────────────────

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  invitedById: string;
  status: 'pending' | 'accepted' | 'rejected';
  expiresAt: string;
  createdAt: string;
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<ApiResponse<{ members: WorkspaceMember[] }>> {
  return apiRequest<{ members: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`);
}

export async function addWorkspaceMember(
  workspaceId: string,
  data: { userId: string; role: string },
): Promise<ApiResponse<{ member: WorkspaceMember }>> {
  return apiRequest<{ member: WorkspaceMember }>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  data: { email: string; role: string },
): Promise<ApiResponse<{ invitation: WorkspaceInvitation }>> {
  return apiRequest<{ invitation: WorkspaceInvitation }>(`/workspaces/${workspaceId}/invitations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listWorkspaceInvitations(
  workspaceId: string,
): Promise<ApiResponse<{ invitations: WorkspaceInvitation[] }>> {
  return apiRequest<{ invitations: WorkspaceInvitation[] }>(
    `/workspaces/${workspaceId}/invitations`,
  );
}

export async function acceptInvitation(
  token: string,
): Promise<ApiResponse<{ member: WorkspaceMember }>> {
  return apiRequest<{ member: WorkspaceMember }>('/workspaces/invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function rejectInvitation(token: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/workspaces/invitations/reject', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function transferOwnership(
  workspaceId: string,
  data: { newOwnerId: string },
): Promise<ApiResponse<{ previousOwner: WorkspaceMember; newOwner: WorkspaceMember }>> {
  return apiRequest<{ previousOwner: WorkspaceMember; newOwner: WorkspaceMember }>(
    `/workspaces/${workspaceId}/transfer-ownership`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

// ── Workspace Settings endpoints ─────────────────────────────

export interface WorkspaceSettingsData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  brandColor: string | null;
  customDomain: string | null;
  organizationId: string | null;
  plan: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceContextMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export async function getWorkspace(
  workspaceId: string,
): Promise<ApiResponse<{ workspace: WorkspaceSettingsData }>> {
  return apiRequest<{ workspace: WorkspaceSettingsData }>(`/workspaces/${workspaceId}`);
}

export async function getWorkspaceContext(
  workspaceId: string,
): Promise<
  ApiResponse<{
    workspace: WorkspaceSettingsData;
    userRole: string;
    members: WorkspaceContextMember[];
  }>
> {
  return apiRequest<{
    workspace: WorkspaceSettingsData;
    userRole: string;
    members: WorkspaceContextMember[];
  }>(`/workspaces/${workspaceId}/context`);
}

export async function switchWorkspace(
  workspaceId: string,
): Promise<
  ApiResponse<{
    workspace: WorkspaceSettingsData;
    userRole: string;
    members: WorkspaceContextMember[];
  }>
> {
  return apiRequest<{
    workspace: WorkspaceSettingsData;
    userRole: string;
    members: WorkspaceContextMember[];
  }>(`/workspaces/${workspaceId}/switch`, {
    method: 'POST',
  });
}

export async function updateWorkspaceSettings(
  workspaceId: string,
  data: {
    name?: string;
    description?: string | null;
    logo?: string | null;
    brandColor?: string | null;
    customDomain?: string | null;
  },
): Promise<ApiResponse<{ workspace: WorkspaceSettingsData }>> {
  return apiRequest<{ workspace: WorkspaceSettingsData }>(`/workspaces/${workspaceId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: string,
): Promise<ApiResponse<{ member: WorkspaceMember }>> {
  return apiRequest<{ member: WorkspaceMember }>(
    `/workspaces/${workspaceId}/members/${userId}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );
}

// ── Role Management endpoints ───────────────────────────────

export interface WorkspaceRoleDefinition {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface WorkspacePermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

export async function listWorkspaceRoles(
  workspaceId: string,
): Promise<ApiResponse<{ roles: WorkspaceRoleDefinition[] }>> {
  return apiRequest<{ roles: WorkspaceRoleDefinition[] }>(`/workspaces/${workspaceId}/roles`);
}

export async function createWorkspaceRole(
  workspaceId: string,
  data: { name: string; description?: string; permissionIds?: string[] },
): Promise<ApiResponse<{ role: WorkspaceRoleDefinition }>> {
  return apiRequest<{ role: WorkspaceRoleDefinition }>(`/workspaces/${workspaceId}/roles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWorkspaceRoleApi(
  workspaceId: string,
  roleId: string,
  data: { name?: string; description?: string | null; permissionIds?: string[] },
): Promise<ApiResponse<{ role: WorkspaceRoleDefinition }>> {
  return apiRequest<{ role: WorkspaceRoleDefinition }>(
    `/workspaces/${workspaceId}/roles/${roleId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}

export async function deleteWorkspaceRole(
  workspaceId: string,
  roleId: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/workspaces/${workspaceId}/roles/${roleId}`, {
    method: 'DELETE',
  });
}

export async function listPermissions(): Promise<
  ApiResponse<{ permissions: WorkspacePermission[] }>
> {
  return apiRequest<{ permissions: WorkspacePermission[] }>('/workspaces/permissions');
}

// ── Workspace Archive / Delete endpoints ──────────────────────

export async function archiveWorkspace(
  workspaceId: string,
): Promise<ApiResponse<{ workspace: WorkspaceSettingsData }>> {
  return apiRequest<{ workspace: WorkspaceSettingsData }>(`/workspaces/${workspaceId}/archive`, {
    method: 'POST',
  });
}

export async function restoreWorkspace(
  workspaceId: string,
): Promise<ApiResponse<{ workspace: WorkspaceSettingsData }>> {
  return apiRequest<{ workspace: WorkspaceSettingsData }>(`/workspaces/${workspaceId}/restore`, {
    method: 'POST',
  });
}

export async function deleteWorkspacePermanently(
  workspaceId: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
}

export async function listWorkspaces(
  includeArchived?: boolean,
): Promise<ApiResponse<{ workspaces: WorkspaceSettingsData[] }>> {
  const params = includeArchived ? '?includeArchived=true' : '';
  return apiRequest<{ workspaces: WorkspaceSettingsData[] }>(`/workspaces${params}`);
}

export async function createWorkspace(data: {
  name: string;
  description?: string;
  organizationId?: string;
}): Promise<ApiResponse<{ workspace: WorkspaceSettingsData }>> {
  return apiRequest<{ workspace: WorkspaceSettingsData }>('/workspaces', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
