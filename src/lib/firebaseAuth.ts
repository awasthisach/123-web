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

// Initialize Firebase App safely (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

const provider = new GoogleAuthProvider();
// Register primary Google Drive Workspace scopes
for (const scope of SCOPES) {
  provider.addScope(scope);
}
// Prompt user to select account and grant required permissions
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache access token in memory + sessionStorage (survives page refresh in same tab)
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
    // ignore quota / private mode errors
  }
}

/**
 * Request OAuth Access Token using Google Identity Services (GSI)
 * This runs client-side without relying on Firebase authDomain redirection proxy.
 */
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

          // Fetch user info with Google UserInfo endpoint
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
              email: 'awasthi.sach@gmail.com',
              photoURL: '',
            } as any,
            accessToken,
          });
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(err);
    }
  });
};

/**
 * Initialize auth state listener. Call this on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // First, check if there's a pending redirect result (e.g. from mobile fallback)
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

/**
 * Ensure Google Identity Services script is loaded
 */
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

/**
 * Trigger Google Sign-In with multi-strategy fallback:
 * 1. Try Google Identity Services (GSI) Token Client
 * 2. Fallback to Firebase signInWithPopup
 */
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  isSigningIn = true;
  let primaryError: any = null;

  // Strategy 1: Google Identity Services (GSI) token client (best for mobile and GitHub Pages)
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

  // Strategy 2: Firebase Popup
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
      // Execute redirect fallback immediately
      signInWithRedirect(auth, provider);
      // Return a promise that never resolves so the UI stays in loading state until redirect happens
      return new Promise(() => {});
    }

    // Genuine failure: log as warning
    console.warn('Google Drive Auth notice:', error?.message || error);
    const err = primaryError ? new Error(`${error.message || error} (GSI: ${primaryError.message})`) : error;
    (err as any).code = error.code || primaryError?.code;
    throw err;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve the active in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Set token manually (e.g. after successful signIn)
 */
export const setCachedAccessToken = (token: string | null) => {
  persistToken(token);
};

/**
 * Sign out and flush cached token
 */
export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  persistToken(null);
};
