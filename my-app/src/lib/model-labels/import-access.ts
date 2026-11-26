import { canAssignRounds } from '@/lib/permissions';

export function canImportModelLabels(user: { accountType: string; email: string } | null): boolean {
  if (!user) return false;
  return user.accountType === 'ADMIN' || canAssignRounds(user.email);
}
