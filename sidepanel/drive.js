const DRIVE_SETTINGS_KEY = 'kanban.drive.settings.v1';
const DRIVE_FILE_NAME = 'kanbanx-boards.json';

async function getStoredSettings() {
  try {
    const { [DRIVE_SETTINGS_KEY]: settings } = await chrome.storage.local.get(
      DRIVE_SETTINGS_KEY
    );
    return settings ?? null;
  } catch (error) {
    console.warn('KanbanX: unable to read Drive settings', error);
    return null;
  }
}

async function persistSettings(next) {
  try {
    await chrome.storage.local.set({ [DRIVE_SETTINGS_KEY]: next });
  } catch (error) {
    console.warn('KanbanX: unable to persist Drive settings', error);
  }
}

function buildMultipartBody(metadata, json) {
  const boundary = `-------${Math.random().toString(16).slice(2)}`;
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(json)}\r\n` +
    `--${boundary}--`;
  return { body, boundary };
}

function ensureIdentityAvailable() {
  if (!chrome?.identity?.getAuthToken) {
    throw new Error('Google identity API unavailable. Add "identity" permission and OAuth2 details to manifest.');
  }
}

async function getAuthToken({ interactive }) {
  ensureIdentityAvailable();
  return new Promise((resolve, reject) => {
    try {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(
            new Error(
              chrome.runtime.lastError?.message ||
                'Unable to authorize with Google Drive.'
            )
          );
          return;
        }
        resolve(token);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function removeCachedAuthToken(token) {
  if (!token || !chrome?.identity?.removeCachedAuthToken) return;
  try {
    await new Promise((resolve) => {
      try {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          resolve();
        });
      } catch (error) {
        resolve();
      }
    });
  } catch (error) {
    console.warn('KanbanX: unable to remove cached auth token', error);
  }
}

async function driveFetch(path, { method = 'GET', headers = {}, body } = {}, options = {}) {
  const { interactive = false, retryOnAuthError = false } = options;
  const url = path.startsWith('http') ? path : `https://www.googleapis.com${path}`;

  let token;
  try {
    token = await getAuthToken({ interactive });
  } catch (error) {
    if (!interactive) {
      console.warn('KanbanX: non-interactive token request failed', error);
      return null;
    }
    throw error;
  }

  const response = await fetch(url, {
    method,
    body,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers
    }
  });

  if (response.status === 401 && retryOnAuthError) {
    await removeCachedAuthToken(token);
    if (!interactive) {
      return driveFetch(path, { method, headers, body }, { interactive: true, retryOnAuthError: false });
    }
  }

  return { response, token };
}

async function findExistingFile(options = {}) {
  const request = await driveFetch(
    '/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=' +
      encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`),
    {},
    options
  );
  if (!request) return null;
  const { response } = request;
  if (!response.ok) {
    throw new Error(`Failed to query Drive files (${response.status})`);
  }
  const payload = await response.json();
  const [file] = payload.files ?? [];
  return file ?? null;
}

async function createFile(state, options = {}) {
  const metadata = {
    name: DRIVE_FILE_NAME,
    parents: ['appDataFolder']
  };
  const { body, boundary } = buildMultipartBody(metadata, state ?? {});
  const request = await driveFetch(
    '/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    },
    options
  );
  if (!request) return null;
  const { response } = request;
  if (!response.ok) {
    throw new Error(`Failed to create Drive file (${response.status})`);
  }
  return response.json();
}

async function updateFile(fileId, state, options = {}) {
  const metadata = { name: DRIVE_FILE_NAME };
  const { body, boundary } = buildMultipartBody(metadata, state ?? {});
  const request = await driveFetch(
    `/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    },
    options
  );
  if (!request) return null;
  return request.response;
}

async function readFile(fileId, options = {}) {
  const request = await driveFetch(
    `/drive/v3/files/${fileId}?alt=media`,
    {},
    options
  );
  if (!request) return null;
  return request.response;
}

export async function getDriveSettings() {
  return getStoredSettings();
}

export async function isDriveConnected() {
  const settings = await getStoredSettings();
  return Boolean(settings?.fileId);
}

export async function loadStateFromDrive() {
  const settings = await getStoredSettings();
  if (!settings?.fileId) return null;
  try {
    const response = await readFile(settings.fileId, { interactive: false });
    if (!response) return null;
    if (response.status === 404) {
      console.warn('KanbanX: Drive data file missing');
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch Drive data (${response.status})`);
    }
    const json = await response.json();
    return typeof json === 'object' && json !== null ? json : null;
  } catch (error) {
    console.error('KanbanX: unable to load data from Drive', error);
    return null;
  }
}

export async function saveStateToDrive(state, options = {}) {
  const settings = await getStoredSettings();
  if (!settings?.fileId) return false;
  try {
    const response = await updateFile(settings.fileId, state, {
      interactive: false,
      retryOnAuthError: true
    });
    if (!response) {
      return false;
    }
    if (response.status === 404) {
      const created = await createFile(state, {
        interactive: false,
        retryOnAuthError: true
      });
      if (!created?.id) {
        throw new Error('Failed to recreate Drive data file.');
      }
      await persistSettings({ ...settings, fileId: created.id, lastSyncedAt: Date.now() });
      return true;
    }
    if (!response.ok) {
      throw new Error(`Failed to update Drive data (${response.status})`);
    }
    await persistSettings({ ...settings, lastSyncedAt: Date.now() });
    return true;
  } catch (error) {
    console.error('KanbanX: unable to save data to Drive', error);
    return false;
  }
}

export async function connectDrive(state) {
  let settings = await getStoredSettings();
  try {
    const existing = settings?.fileId
      ? { id: settings.fileId }
      : await findExistingFile({ interactive: true, retryOnAuthError: true });

    let fileId = existing?.id;
    if (!fileId) {
      const created = await createFile(state, { interactive: true, retryOnAuthError: true });
      if (!created?.id) {
        throw new Error('Unable to create storage file on Google Drive.');
      }
      fileId = created.id;
    } else {
      const updateResponse = await updateFile(fileId, state, {
        interactive: true,
        retryOnAuthError: true
      });
      if (!updateResponse?.ok) {
        throw new Error('Unable to update existing Google Drive data.');
      }
    }

    settings = {
      ...(settings ?? {}),
      fileId,
      connectedAt: Date.now(),
      lastSyncedAt: Date.now()
    };
    await persistSettings(settings);
    return settings;
  } catch (error) {
    console.error('KanbanX: Drive connection failed', error);
    throw error;
  }
}

export async function disconnectDrive() {
  await persistSettings(null);
}
