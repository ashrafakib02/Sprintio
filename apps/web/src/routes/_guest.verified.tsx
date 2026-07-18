import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_guest/verified')({
  component: VerifiedPage,
});

function VerifiedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Email verified!</CardTitle>
          <CardDescription>Your email has been verified successfully</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Your email address has been verified successfully. You can now access all features of
              your account.
            </p>
          </div>

          {/* Sign In Button */}
          <Link to="/login" className="block">
            <Button className="w-full">Sign in to your account</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
