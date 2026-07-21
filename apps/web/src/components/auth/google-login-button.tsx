import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { GoogleLogo } from '@/components/ui/google-logo';
import { Spinner } from '@/components/ui/spinner';

interface GoogleLoginButtonProps {
  className?: string;
  variant?: ButtonProps['variant'];
}

export function GoogleLoginButton({ className, variant = 'outline' }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    // Redirect directly to the backend OAuth endpoint.
    // The backend generates a state param, stores it in an HttpOnly cookie,
    // and issues a 302 redirect to Google's consent page.
    window.location.href = '/api/auth/google';
  }

  return (
    <Button
      variant={variant}
      className={cn('w-full', className)}
      onClick={handleClick}
      disabled={loading}
      type="button"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner className="h-4 w-4" />
          Connecting...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <GoogleLogo className="h-4 w-4" />
          Continue with Google
        </span>
      )}
    </Button>
  );
}
