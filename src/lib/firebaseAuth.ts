import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
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

// Cache the access token purely in memory (never localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

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
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
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

  // Ensure GSI is ready if possible
  await ensureGsiLoaded();

  // Strategy 1: Google Identity Services (GSI) token client (best for mobile and GitHub Pages)
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
    try {
      const gsiResult = await requestGsiToken(firebaseConfig.oAuthClientId);
      cachedAccessToken = gsiResult.accessToken;
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

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const isUserDismissal =
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      String(error?.message || '').includes('popup-closed-by-user') ||
      String(error?.message || '').includes('cancelled-popup-request');

    if (isUserDismissal) {
      // User closed the popup window or switched away - this is normal behavior, not a critical error
      console.info('Google sign-in popup dismissed by user.');
      return null;
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
  cachedAccessToken = token;
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
  cachedAccessToken = null;
};
