/* eslint-disable */

// @ts-nocheck

import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { RegisterPage } from './routes/register';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Sprintio</h1>
        <p className="mt-2 text-lg text-gray-600">
          Sprint fast. Ship together.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Welcome to the development server.
        </p>
      </div>
    </div>
  ),
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const routeTree = rootRoute.addChildren([indexRoute, registerRoute]);

export { routeTree };
