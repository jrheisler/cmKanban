const PLACEHOLDER_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

function getManifestClientId() {
  const manifest = chrome?.runtime?.getManifest?.();
  return manifest?.oauth2?.client_id?.trim() ?? '';
}

export function ensureDriveOAuthConfigured() {
  if (!chrome?.identity?.getAuthToken) {
    throw new Error(
      'Google identity API unavailable. Add "identity" permission and OAuth2 details to manifest.'
    );
  }

  const clientId = getManifestClientId();
  if (!clientId || clientId === PLACEHOLDER_CLIENT_ID) {
    throw new Error(
      'Google OAuth client ID missing. Replace the placeholder in manifest.json (see docs/google-drive-setup.md for why this ID is shared across users).'
    );
  }
}

export async function getDriveToken(interactive = true) {
  ensureDriveOAuthConfigured();

  return new Promise((resolve, reject) => {
    try {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError || !token) {
          if (chrome.runtime.lastError) {
            console.error('KanbanX: Drive auth error', chrome.runtime.lastError);
          }
          reject(
            new Error(
              chrome.runtime.lastError?.message || 'Unable to authorize with Google Drive.'
            )
          );
          return;
        }
        if (interactive) {
          console.info('KanbanX: Drive token acquired', token);
        }
        resolve(token);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function clearCachedDriveToken(token) {
  if (!token || !chrome?.identity?.removeCachedAuthToken) return;
  try {
    await new Promise((resolve) => {
      try {
        chrome.identity.removeCachedAuthToken({ token }, () => resolve());
      } catch (error) {
        resolve();
      }
    });
  } catch (error) {
    console.warn('KanbanX: unable to remove cached Drive token', error);
  }
}

export async function clearAllDriveTokens() {
  if (!chrome?.identity?.clearAllCachedAuthTokens) return;
  try {
    await new Promise((resolve) => {
      try {
        chrome.identity.clearAllCachedAuthTokens(() => resolve());
      } catch (error) {
        resolve();
      }
    });
  } catch (error) {
    console.warn('KanbanX: unable to clear all Drive tokens', error);
  }
}

export { PLACEHOLDER_CLIENT_ID };
