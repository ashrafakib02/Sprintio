import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceBrandingSettings } from '@/components/workspace/workspace-branding-settings';

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceId/settings/branding',
)({
  component: WorkspaceBrandingSettingsPage,
});

function WorkspaceBrandingSettingsPage() {
  const { workspaceId } = Route.useParams();
  return <WorkspaceBrandingSettings workspaceId={workspaceId} />;
}
