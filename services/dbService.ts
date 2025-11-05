export type TextBlockType = 'title' | 'subtitle' | 'body' | 'observation';

export interface TextBlock {
  id: string;
  type: TextBlockType;
  content: string;
}

export interface ChecklistItemData {
  text: string;
  isChecked: boolean;
  images?: string[];
  texts?: TextBlock[];
}

export interface Checklist {
  id: number;
  title: string;
  createdAt: number;
  items: ChecklistItemData[];
}

const DB_NAME = 'ChecklistDB';
const STORE_NAME = 'checklists';
const DB_VERSION = 1;

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const addList = (list: Checklist): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(list);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const getAllLists = (): Promise<Checklist[]> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
};

export const updateList = (list: Checklist): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(list);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const deleteList = (id: number): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
