import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { forgotPassword } from '@/lib/api';

export function useForgotPassword() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { email: string }) => forgotPassword(data),
    onSuccess: (_response, variables) => {
      setSubmittedEmail(variables.email);
      toast.success('Email sent', {
        description: 'Check your inbox for the password reset link',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to send email', {
        description: error.message,
      });
    },
  });

  const resetState = useCallback(() => {
    setSubmittedEmail(null);
    mutation.reset();
  }, [mutation]);

  return { ...mutation, submittedEmail, reset: resetState };
}
