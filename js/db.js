const DB_NAME = 'QSIS_AcademicDB';
const DB_VERSION = 1;

const DB = {
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('history')) {
          const hs = db.createObjectStore('history', { keyPath: 'id' });
          hs.createIndex('lastRead', 'lastRead');
        }
        if (!db.objectStoreNames.contains('cache')) {
          const cs = db.createObjectStore('cache', { keyPath: 'id' });
          cs.createIndex('cachedAt', 'cachedAt');
        }
        if (!db.objectStoreNames.contains('edits')) {
          db.createObjectStore('edits', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => { DB.db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  _tx(store, mode) {
    return DB.db.transaction(store, mode).objectStore(store);
  },

  async historyAdd(item) {
    const entry = {
      id: btoa(unescape(encodeURIComponent(item.path))).replace(/[=+/]/g, ''),
      path: item.path,
      name: item.name,
      category: item.category || 'other',
      mimeType: item.mimeType || 'other',
      rawUrl: item.rawUrl || '',
      lastRead: Date.now()
    };
    return new Promise((resolve, reject) => {
      const req = DB._tx('history', 'readwrite').put(entry);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async historyGetAll() {
    return new Promise((resolve, reject) => {
      const req = DB._tx('history', 'readonly').index('lastRead').openCursor(null, 'prev');
      const results = [];
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { results.push(cursor.value); cursor.continue(); }
        else resolve(results);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async historyGetRecent(count = 7) {
    const all = await this.historyGetAll();
    return all.slice(0, count);
  },

  async historyDelete(id) {
    return new Promise((resolve, reject) => {
      const req = DB._tx('history', 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async historyClear() {
    return new Promise((resolve, reject) => {
      const req = DB._tx('history', 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async cacheFile(item, blob) {
    const entry = {
      id: btoa(unescape(encodeURIComponent(item.path))).replace(/[=+/]/g, ''),
      path: item.path,
      name: item.name,
      category: item.category || 'other',
      mimeType: item.mimeType || 'other',
      ext: item.ext || '',
      size: item.size || blob.size,
      blob: blob,
      cachedAt: Date.now(),
      editedAt: null
    };
    return new Promise((resolve, reject) => {
      const req = DB._tx('cache', 'readwrite').put(entry);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async cacheGet(id) {
    return new Promise((resolve, reject) => {
      const req = DB._tx('cache', 'readonly').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async cacheGetAll() {
    return new Promise((resolve, reject) => {
      const req = DB._tx('cache', 'readonly').index('cachedAt').openCursor(null, 'prev');
      const results = [];
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { results.push(cursor.value); cursor.continue(); }
        else resolve(results);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async cacheDelete(id) {
    return new Promise((resolve, reject) => {
      const req = DB._tx('cache', 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async cacheClear() {
    return new Promise((resolve, reject) => {
      const req = DB._tx('cache', 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async cacheUpdateBlob(id, blob) {
    const entry = await this.cacheGet(id);
    if (!entry) return;
    entry.blob = blob;
    entry.editedAt = Date.now();
    return new Promise((resolve, reject) => {
      const req = DB._tx('cache', 'readwrite').put(entry);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  makeId(path) {
    return btoa(unescape(encodeURIComponent(path))).replace(/[=+/]/g, '');
  }
};

DB.init().catch(err => console.error('IndexedDB init failed:', err));
