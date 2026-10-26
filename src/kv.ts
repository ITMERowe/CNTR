// Key-value stores the app's data lives in. Values are the same JSON strings the app has always stored.
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface KvStore {
  readAll(): Promise<Map<string, string>>;
  /** Applies every change in one all-or-nothing step; `null` deletes the key. */
  write(changes: Map<string, string | null>): Promise<void>;
}

/** WebView localStorage: used in the browser, and on the phone only if the database cannot be opened. */
export const localStorageStore: KvStore = {
  async readAll() {
    const all = new Map<string, string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cntr')) all.set(key, localStorage.getItem(key) ?? '');
    }
    return all;
  },
  async write(changes) {
    const apply = (entries: Iterable<[string, string | null]>) => {
      for (const [key, value] of entries) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    };
    const before = [...changes.keys()].map((key): [string, string | null] => [key, localStorage.getItem(key)]);
    try {
      apply(changes);
    } catch (error) {
      apply(before); // all or nothing, like the database (e.g. when storage is full)
      throw error;
    }
  },
};

const DB_NAME = 'cntr';

/** SQLite in the app's private storage: survives WebView cache clearing, and writes are transactional. */
export async function openSqliteStore(): Promise<KvStore> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  // After a page reload (e.g. a restore) the native connection still exists; reuse it.
  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const db: SQLiteDBConnection = consistent && exists ? await sqlite.retrieveConnection(DB_NAME, false) : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  if (!(await db.isDBOpen()).result) await db.open();
  await db.execute('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);', false);

  return {
    async readAll() {
      const rows = (await db.query('SELECT key, value FROM kv;')).values ?? [];
      return new Map(rows.map((row: { key: string; value: string }) => [row.key, row.value]));
    },
    async write(changes) {
      if (!changes.size) return;
      const set = [...changes].map(([key, value]) =>
        value === null ? { statement: 'DELETE FROM kv WHERE key = ?;', values: [key] } : { statement: 'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);', values: [key, value] },
      );
      await db.executeSet(set, true);
    },
  };
}
