import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceSettingsRoles } from '@/components/workspace/workspace-settings-roles';

export const Route = createFileRoute('/_authenticated/workspace/$workspaceId/settings/roles')({
  component: WorkspaceSettingsRolesPage,
});

function WorkspaceSettingsRolesPage() {
  const { workspaceId } = Route.useParams();
  return <WorkspaceSettingsRoles workspaceId={workspaceId} />;
}
