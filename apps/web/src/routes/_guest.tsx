import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_guest')({
  component: GuestLayout,
});

function GuestLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
