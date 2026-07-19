import { createFileRoute } from '@tanstack/react-router';
import { ActiveSessions } from '@/components/settings/active-sessions';
import { ConnectedAccounts } from '@/components/settings/connected-accounts';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <ActiveSessions />
      <ConnectedAccounts />
    </div>
  );
}
