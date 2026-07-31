import { createFileRoute, redirect } from '@tanstack/react-router';
import { OrganizationSettingsLayout } from '@/components/organization/organization-settings-layout';

export const Route = createFileRoute('/_authenticated/organization/$organizationId/settings')({
  beforeLoad: ({ params }) => {
    // Redirect to general settings tab by default
    throw redirect({
      to: '/organization/$organizationId/settings/general',
      params: { organizationId: params.organizationId },
    });
  },
  component: OrganizationSettingsParent,
});

function OrganizationSettingsParent() {
  const { organizationId } = Route.useParams();
  return <OrganizationSettingsLayout organizationId={organizationId} />;
}
