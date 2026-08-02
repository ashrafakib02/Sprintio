import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceGeneralSettings } from '@/components/workspace/workspace-general-settings';

export const Route = createFileRoute('/_authenticated/workspace/$workspaceId/settings/general')({
  component: WorkspaceGeneralSettingsPage,
});

function WorkspaceGeneralSettingsPage() {
  const { workspaceId } = Route.useParams();
  return <WorkspaceGeneralSettings workspaceId={workspaceId} />;
}
