import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AuthProvider } from '@/contexts/auth-provider';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <AuthProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <Outlet />
    </AuthProvider>
  );
}
