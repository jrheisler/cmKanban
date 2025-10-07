const DB_NAME = 'kanbanx';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

let dbPromise;

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open attachments database'));
    });
  }
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionComplete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Attachment transaction aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('Attachment transaction failed'));
  });
}

export async function saveAttachment(file) {
  if (!file) throw new Error('No file provided');
  const db = await openDatabase();
  const id = createId();
  const record = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: Date.now(),
    blob: file
  };
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(record);
  await transactionComplete(tx);
  return { id, name: record.name, type: record.type, size: record.size, createdAt: record.createdAt };
}

export async function getAttachment(id) {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const record = await requestToPromise(store.get(id));
  await transactionComplete(tx);
  return record ?? null;
}

export async function deleteAttachment(id) {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await transactionComplete(tx);
}
