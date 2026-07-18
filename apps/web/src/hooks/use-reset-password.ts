import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { resetPassword, type ResetPasswordRequest } from '@/lib/api';

export function useResetPassword() {
  const navigate = useNavigate({ from: '/reset-password' });

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => resetPassword(data),
    onSuccess: () => {
      toast.success('Password reset successful', {
        description: 'You can now sign in with your new password',
      });
      navigate({ to: '/reset-password-success' });
    },
    onError: (error: Error) => {
      toast.error('Reset failed', {
        description: error.message,
      });
    },
  });
}
