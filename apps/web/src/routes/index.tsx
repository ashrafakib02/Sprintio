import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
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
