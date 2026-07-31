import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceSettingsMembers } from '@/components/workspace/workspace-settings-members';

export const Route = createFileRoute('/_authenticated/workspace/$workspaceId/settings/members')({
  component: WorkspaceSettingsMembersPage,
});

function WorkspaceSettingsMembersPage() {
  const { workspaceId } = Route.useParams();
  return <WorkspaceSettingsMembers workspaceId={workspaceId} />;
}
