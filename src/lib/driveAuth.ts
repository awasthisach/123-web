import { ensureValidToken } from './firebaseAuth';

/**
 * Run a Drive API call with one automatic retry after token refresh on 401/auth errors.
 */
export async function withDriveAuthRetry<T>(
  getToken: () => Promise<string | null>,
  setToken: (t: string) => void,
  operation: (token: string) => Promise<T>
): Promise<T> {
  let token = await getToken();
  if (!token) throw new Error('Sign in required');

  try {
    return await operation(token);
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (!(msg.includes('401') || /invalid|auth|login|unauth|expired/i.test(msg))) {
      throw err;
    }
    const refreshed = await ensureValidToken();
    if (!refreshed) throw err;
    setToken(refreshed);
    return await operation(refreshed);
  }
}
