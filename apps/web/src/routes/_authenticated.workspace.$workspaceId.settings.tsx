import { createFileRoute, redirect } from '@tanstack/react-router';
import { WorkspaceSettingsLayout } from '@/components/workspace/workspace-settings-layout';

export const Route = createFileRoute('/_authenticated/workspace/$workspaceId/settings')({
  beforeLoad: ({ params }) => {
    // Redirect to general settings tab by default
    throw redirect({
      to: '/workspace/$workspaceId/settings/general',
      params: { workspaceId: params.workspaceId },
    });
  },
  component: WorkspaceSettingsParent,
});

function WorkspaceSettingsParent() {
  const { workspaceId } = Route.useParams();
  return <WorkspaceSettingsLayout workspaceId={workspaceId} />;
}
