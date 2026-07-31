import { createFileRoute } from '@tanstack/react-router';
import { OrganizationSettingsMembers } from '@/components/organization/organization-settings-members';

export const Route = createFileRoute(
  '/_authenticated/organization/$organizationId/settings/members',
)({
  component: OrganizationSettingsMembersPage,
});

function OrganizationSettingsMembersPage() {
  const { organizationId } = Route.useParams();
  return <OrganizationSettingsMembers organizationId={organizationId} />;
}
