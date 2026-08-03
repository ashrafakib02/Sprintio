/**
 * Organization query hooks — canonical public API for listing and managing
 * organizations. Delegates to use-organization-settings.ts for implementation.
 *
 * The ORGANIZATIONS_QUERY_KEY export follows the project naming convention
 * (SCOPED_ENTITY_QUERY_KEY) and is the canonical key consumers should import
 * when they need to invalidate or reference the organizations list cache.
 */
export {
  ORGANIZATION_LIST_QUERY_KEY as ORGANIZATIONS_QUERY_KEY,
  ORGANIZATION_CONTEXT_QUERY_KEY,
  ORGANIZATION_MEMBERS_QUERY_KEY,
  useOrganizations,
  useOrganizationContext,
  useCreateOrganization,
  useUpdateOrganization,
  useArchiveOrganization,
  useRestoreOrganization,
  useDeleteOrganization,
  useOrganizationMembers,
  useAddOrganizationMember,
  useRemoveOrganizationMember,
  useUpdateOrganizationMemberRole,
} from './use-organization-settings';
