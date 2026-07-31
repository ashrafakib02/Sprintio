import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  archiveOrganization,
  restoreOrganization,
  deleteOrganization,
  listOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type AddOrganizationMemberInput,
} from '@/lib/organization-api';
import type { OrganizationMember } from '@/types/organization';
import { getAuthState } from '@/lib/auth-store';
import { toast } from 'sonner';

// ── Query Key Factories ─────────────────────────────────────

export const ORGANIZATION_LIST_QUERY_KEY = ['organizations'] as const;

export const ORGANIZATION_CONTEXT_QUERY_KEY = (id: string) =>
  ['organization', id, 'context'] as const;

export const ORGANIZATION_MEMBERS_QUERY_KEY = (id: string) =>
  ['organization', id, 'members'] as const;

// ── Internal Types ──────────────────────────────────────────

interface OrganizationContextResponse {
  organization: Awaited<ReturnType<typeof getOrganization>>['data'];
  userRole: string;
  members: OrganizationMember[];
}

interface OrganizationListResponse {
  data: Awaited<ReturnType<typeof listOrganizations>>['data'];
}

// ── List Organizations Hook ─────────────────────────────────

export function useOrganizations(includeArchived = false) {
  return useQuery({
    queryKey: [...ORGANIZATION_LIST_QUERY_KEY, { includeArchived }],
    queryFn: () => listOrganizations(includeArchived),
    staleTime: 30_000,
    select: (response) => response.data,
  });
}

// ── Organization Context Hook ───────────────────────────────

export function useOrganizationContext(organizationId: string) {
  return useQuery({
    queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
    queryFn: async () => {
      const [orgResponse, membersResponse] = await Promise.all([
        getOrganization(organizationId),
        listOrganizationMembers(organizationId),
      ]);

      // Derive userRole from membership data
      const { user: currentUser } = getAuthState();
      const currentMembership = membersResponse.data.find((m) => m.userId === currentUser?.id);
      const userRole = currentMembership?.role ?? 'member';

      return {
        organization: orgResponse.data,
        userRole: userRole as string,
        members: membersResponse.data,
      };
    },
    staleTime: 60_000,
    retry: false,
  });
}

// ── Create Organization Hook ────────────────────────────────

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationInput) => createOrganization(data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_LIST_QUERY_KEY,
      });

      const previousData = queryClient.getQueryData<OrganizationListResponse>(
        ORGANIZATION_LIST_QUERY_KEY,
      );

      const temporaryOrganization = {
        id: `temp-${Date.now()}`,
        name: variables.name,
        slug: variables.slug ?? variables.name.toLowerCase().replace(/\s+/g, '-'),
        description: variables.description ?? null,
        logo: null,
        website: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: null,
      };

      queryClient.setQueryData<OrganizationListResponse>(ORGANIZATION_LIST_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: [...old.data, temporaryOrganization],
        };
      });

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(ORGANIZATION_LIST_QUERY_KEY, context.previousData);
      }
      toast.error('Failed to create organization', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_LIST_QUERY_KEY,
      });
    },
    onSuccess: () => {
      toast.success('Organization created');
    },
  });
}

// ── Update Organization Hook ────────────────────────────────

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationInput) => updateOrganization(organizationId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });

      const previousData = queryClient.getQueryData<OrganizationContextResponse>(
        ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      );

      queryClient.setQueryData<OrganizationContextResponse>(
        ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            organization: {
              ...old.organization,
              ...(variables.name !== undefined && { name: variables.name }),
              ...(variables.description !== undefined && { description: variables.description }),
              ...(variables.logo !== undefined && { logo: variables.logo }),
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
          context.previousData,
        );
      }
      toast.error('Failed to update organization', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
    },
    onSuccess: () => {
      toast.success('Organization settings updated');
    },
  });
}

// ── Archive Organization Hook ───────────────────────────────

export function useArchiveOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveOrganization(organizationId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });

      const previousData = queryClient.getQueryData<OrganizationContextResponse>(
        ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      );

      queryClient.setQueryData<OrganizationContextResponse>(
        ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            organization: {
              ...old.organization,
              archivedAt: new Date().toISOString(),
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
          context.previousData,
        );
      }
      toast.error('Failed to archive organization', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
    },
    onSuccess: () => {
      toast.success('Organization archived');
    },
  });
}

// ── Restore Organization Hook ───────────────────────────────

export function useRestoreOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => restoreOrganization(organizationId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });

      const previousData = queryClient.getQueryData<OrganizationContextResponse>(
        ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      );

      queryClient.setQueryData<OrganizationContextResponse>(
        ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            organization: {
              ...old.organization,
              archivedAt: null,
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
          context.previousData,
        );
      }
      toast.error('Failed to restore organization', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
    },
    onSuccess: () => {
      toast.success('Organization restored');
    },
  });
}

// ── Delete Organization Hook ────────────────────────────────

export function useDeleteOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteOrganization(organizationId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_LIST_QUERY_KEY,
      });

      const previousData = queryClient.getQueryData<OrganizationListResponse>(
        ORGANIZATION_LIST_QUERY_KEY,
      );

      queryClient.setQueryData<OrganizationListResponse>(ORGANIZATION_LIST_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((org) => org.id !== organizationId),
        };
      });

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(ORGANIZATION_LIST_QUERY_KEY, context.previousData);
      }
      toast.error('Failed to delete organization', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_LIST_QUERY_KEY,
      });
    },
    onSuccess: () => {
      toast.success('Organization permanently deleted');
      window.location.href = '/';
    },
  });
}

// ── Organization Members Hooks ──────────────────────────────

export function useOrganizationMembers(organizationId: string) {
  return useQuery({
    queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
    queryFn: () => listOrganizationMembers(organizationId),
    select: (response) => response.data,
    staleTime: 30_000,
  });
}

// ── Add Organization Member Hook ────────────────────────────

export function useAddOrganizationMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddOrganizationMemberInput) => addOrganizationMember(organizationId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      });

      const previousMembers = queryClient.getQueryData<OrganizationMember[]>(
        ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      );

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const temporaryMember: OrganizationMember = {
        id: tempId,
        organizationId,
        userId: tempId,
        role: variables.role ?? 'member',
        createdAt: new Date().toISOString(),
        user: {
          id: tempId,
          name: variables.email,
          email: variables.email,
          avatarUrl: null,
        },
      };

      queryClient.setQueryData<OrganizationMember[]>(
        ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
        (old) => [...(old ?? []), temporaryMember],
      );

      return { previousMembers };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
          context.previousMembers,
        );
      }
      toast.error('Failed to add member', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
    },
    onSuccess: () => {
      toast.success('Member added');
    },
  });
}

// ── Remove Organization Member Hook ─────────────────────────

export function useRemoveOrganizationMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeOrganizationMember(organizationId, userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      });

      const previousMembers = queryClient.getQueryData<OrganizationMember[]>(
        ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      );

      queryClient.setQueryData<OrganizationMember[]>(
        ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
        (old) => old?.filter((m) => m.userId !== userId) ?? [],
      );

      return { previousMembers };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
          context.previousMembers,
        );
      }
      toast.error('Failed to remove member', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
    },
    onSuccess: () => {
      toast.success('Member removed');
    },
  });
}

// ── Update Organization Member Role Hook ────────────────────

export function useUpdateOrganizationMemberRole(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrganizationMember['role'] }) =>
      updateOrganizationMemberRole(organizationId, userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({
        queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      });

      const previousMembers = queryClient.getQueryData<OrganizationMember[]>(
        ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      );

      queryClient.setQueryData<OrganizationMember[]>(
        ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
        (old) =>
          old?.map((member) => (member.userId === userId ? { ...member, role } : member)) ?? [],
      );

      return { previousMembers };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
          context.previousMembers,
        );
      }
      toast.error('Failed to update role', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
    },
    onSuccess: () => {
      toast.success('Member role updated');
    },
  });
}
