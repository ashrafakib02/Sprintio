import { createFileRoute } from '@tanstack/react-router';
import { OrganizationGeneralSettings } from '@/components/organization/organization-general-settings';

export const Route = createFileRoute(
  '/_authenticated/organization/$organizationId/settings/general',
)({
  component: OrganizationGeneralSettingsPage,
});

function OrganizationGeneralSettingsPage() {
  const { organizationId } = Route.useParams();
  return <OrganizationGeneralSettings organizationId={organizationId} />;
}
