import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_guest/reset-password-success')({
  component: ResetPasswordSuccessPage,
});

function ResetPasswordSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center">
            {/* Success icon badge */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
              Password reset successful
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Your password has been updated successfully. You can now sign in with your new
              password.
            </p>

            <div className="mt-8 w-full">
              <Link to="/login" className="block w-full">
                <Button className="w-full">Sign in to your account</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
