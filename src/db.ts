import { DB_NAME, DB_VERSION } from './constants';

let db: IDBDatabase | null = null;

export async function initDB(): Promise<void> {
  db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = (e.target as IDBOpenDBRequest).result;
      if (!d.objectStoreNames.contains('layers')) {
        d.createObjectStore('layers', { keyPath: 'key' });
      }
      if (!d.objectStoreNames.contains('scenes')) {
        const s = d.createObjectStore('scenes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = e => reject((e.target as IDBOpenDBRequest).error);
  });
}

export function dbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx  = db!.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key as IDBValidKey);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror   = () => reject(req.error);
  });
}

export function dbPut(store: string, value: object): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const tx  = db!.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export function dbGetAll<T>(store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx  = db!.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror   = () => reject(req.error);
  });
}
