import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { resendVerification, type ResendVerificationRequest } from '@/lib/api';

export function useResendVerification() {
  return useMutation({
    mutationFn: (data: ResendVerificationRequest) => resendVerification(data),
    onSuccess: () => {
      toast.success('Verification email sent', {
        description: 'Check your inbox for the verification link',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to send email', {
        description: error.message,
      });
    },
  });
}
