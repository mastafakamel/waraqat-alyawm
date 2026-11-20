// db.js — غلاف صغير لـ IndexedDB. كل حاجة متخزنة كـ "مستند": { id, data, updatedAt, dirty }
// id زي 'day/2026-11-20' أو 'list/tasks'. و dirty = 1 معناها لسه ماترفعش للمزامنة (المرحلة ٦).

const DB_NAME = 'waraqa';
const STORE = 'docs';
let dbPromise = null;
let memory = null; // لو IndexedDB مش متاح (وضع خاص قديم مثلاً) بنحفظ في الذاكرة وبنقول ده

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('no-idb'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((e) => {
    memory = new Map();
    throw e;
  });
  return dbPromise;
}

function tx(mode, fn) {
  return open().then(
    (db) => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const result = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(result.value);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }),
  );
}

export function isMemoryOnly() {
  return memory !== null;
}

export async function getDoc(id) {
  try {
    return await tx('readonly', (s) => {
      const out = {};
      s.get(id).onsuccess = (e) => { out.value = e.target.result || null; };
      return out;
    });
  } catch {
    return memory?.get(id) || null;
  }
}

export async function putDoc(doc) {
  try {
    await tx('readwrite', (s) => { s.put(doc); return {}; });
  } catch {
    memory?.set(doc.id, doc);
  }
}

/** كل المستندات اللي الـ id بتاعها بيبدأ بـ prefix (مثلاً 'day/'). */
export async function allDocs(prefix = '') {
  try {
    const all = await tx('readonly', (s) => {
      const out = {};
      s.getAll().onsuccess = (e) => { out.value = e.target.result; };
      return out;
    });
    return all.filter((d) => d.id.startsWith(prefix));
  } catch {
    return [...(memory?.values() || [])].filter((d) => d.id.startsWith(prefix));
  }
}

/** بنطلب من المتصفح ميمسحش البيانات لوحده. */
export async function askPersist() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch { /* مش مهم لو فشل */ }
}
