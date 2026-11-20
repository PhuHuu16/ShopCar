import { useAuth } from '../stores/auth';

export function useCan(permission) {
  return useAuth((s) => Boolean(s.admin?.permissions?.includes(permission)));
}
