// ============================================================
// FieldLensAI — Photo storage
// Photos are far too large for localStorage (~5MB cap), so they
// live in IndexedDB, which is designed for this and allows much
// more space. Text findings stay in localStorage.
// (Long term these move to the user's account/database.)
// ============================================================

const DB_NAME = 'fieldlensai';
const DB_VERSION = 1;
const STORE = 'photos';
const KEY = 'sectionPhotos';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Save a map of { sectionKey: [dataUrl, ...] }
export function savePhotos(map) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(map, KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

// Load the map back out. Resolves to {} if nothing stored yet.
export function loadPhotos() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => { db.close(); resolve(req.result || {}); };
    req.onerror = () => { db.close(); reject(req.error); };
  }));
}
