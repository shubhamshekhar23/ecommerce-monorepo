import { ApiRequestError } from '@/shared/apiClient';

export function resolveAuthError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiRequestError)) return fallback;
  if (error.statusCode === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  return error.message || fallback;
}
