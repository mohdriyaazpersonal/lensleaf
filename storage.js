export function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("lensleaf-gallery", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("photos", { keyPath: "id" });
      db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(new Error("Close other Lensleaf tabs and reload."));
  });
}
export function transact(db, store, method, value, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
        store,
        method === "getAll" || method === "get" ? "readonly" : "readwrite",
      ),
      s = tx.objectStore(store);
    let request;
    if (method === "clear" || method === "getAll") request = s[method]();
    else if (key !== undefined) request = s[method](value, key);
    else request = s[method](value);
    let result;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve(result);
    tx.onabort = () =>
      reject(tx.error || new Error("Storage transaction failed."));
    tx.onerror = () => reject(tx.error);
  });
}
