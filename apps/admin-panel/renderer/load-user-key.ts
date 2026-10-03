const DATABASE = "admin-panel";
const STORE = "keys";
const USER_KEY = "user";

/** Wraps an IndexedDB request in a promise. Low, Sonar 0. */
const settle = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });

/** Opens the panel's key database, creating its store once. Low, Sonar 0. */
function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DATABASE, 1);

  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  return settle(request);
}

/**
 * Loads the user's ES256 key pair from IndexedDB, generating and storing it on first run. The
 * private key is non-extractable: it signs, and its bytes never leave WebCrypto. Low, Sonar 1.
 */
export async function loadUserKey(): Promise<CryptoKeyPair> {
  const database = await openDatabase();
  const stored = await settle<CryptoKeyPair | undefined>(database.transaction(STORE).objectStore(STORE).get(USER_KEY));

  if (stored !== undefined) return stored;

  const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);

  await settle(database.transaction(STORE, "readwrite").objectStore(STORE).put(keys, USER_KEY));
  return keys;
}
