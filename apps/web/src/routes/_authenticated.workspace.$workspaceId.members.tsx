import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceMembers } from '@/components/workspace/workspace-members';

export const Route = createFileRoute('/_authenticated/workspace/$workspaceId/members')({
  component: WorkspaceMembersPage,
});

function WorkspaceMembersPage() {
  const { workspaceId } = Route.useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workspace Members</h1>
      </div>

      <WorkspaceMembers workspaceId={workspaceId} />
    </div>
  );
}
