import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// drive = list + mutate. Avoid redundant overlapping scopes.
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
];

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'select_account',
});

const TOKEN_KEY = 'gdrive_access_token';
let cachedAccessToken: string | null = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null);
let isSigningIn = false;

function persistToken(token: string | null) {
  cachedAccessToken = token;
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export const requestGsiToken = async (clientId: string): Promise<{ user: Partial<User>; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is still loading. Please try again in 2 seconds.'));
      return;
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES.join(' '),
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error || 'OAuth token request failed'));
            return;
          }
          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token received from Google'));
            return;
          }

          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              resolve({
                user: {
                  displayName: userData.name || 'Google Drive User',
                  email: userData.email || '',
                  photoURL: userData.picture || '',
                } as any,
                accessToken,
              });
              return;
            }
          } catch {
            // fallback
          }

          resolve({
            user: {
              displayName: 'Google Drive User',
              email: '',
              photoURL: '',
            } as any,
            accessToken,
          });
        },
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      reject(err);
    }
  });
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          persistToken(credential.accessToken);
          if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken!);
        }
      }
    })
    .catch((error) => {
      console.warn('Redirect auth result error:', error);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      persistToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const ensureGsiLoaded = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).google?.accounts?.oauth2) return resolve(true);

    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) return resolve(true);
      existing.addEventListener('load', () => resolve(true), { once: true });
      setTimeout(() => resolve(Boolean((window as any).google?.accounts?.oauth2)), 1500);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    setTimeout(() => resolve(Boolean((window as any).google?.accounts?.oauth2)), 2000);
  });
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  isSigningIn = true;
  let primaryError: any = null;

  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
    try {
      const gsiResult = await requestGsiToken(firebaseConfig.oAuthClientId);
      persistToken(gsiResult.accessToken);
      return gsiResult;
    } catch (gsiErr: any) {
      const isCancelled =
        gsiErr?.message?.includes('user_cancel') ||
        gsiErr?.message?.includes('closed') ||
        gsiErr?.error === 'access_denied';

      if (isCancelled) {
        console.info('GSI sign-in dismissed by user.');
        return null;
      }
      console.warn('GSI token request skipped, trying Firebase popup fallback:', gsiErr?.message || gsiErr);
      primaryError = gsiErr;
    }
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain OAuth access token for Google Drive');
    }
    persistToken(credential.accessToken);
    return { user: result.user, accessToken: cachedAccessToken! };
  } catch (error: any) {
    const isPopupError =
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request' ||
      String(error?.message || '').includes('popup');

    if (isPopupError) {
      console.info('Popup blocked or closed. Falling back to signInWithRedirect...');
      signInWithRedirect(auth, provider);
      return new Promise(() => {});
    }

    console.warn('Google Drive Auth notice:', error?.message || error);
    const err = primaryError ? new Error(`${error.message || error} (GSI: ${primaryError.message})`) : error;
    (err as any).code = error.code || primaryError?.code;
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  persistToken(token);
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  persistToken(null);
};
