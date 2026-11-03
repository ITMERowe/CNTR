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
// Characters per read: at most 4 bytes each in UTF-8, so a piece stays under 1 MB.
const READ_CHUNK = 250_000;

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
      // Android reads each result row through a 2 MB window, and one value (all past events) can outgrow it: read in pieces.
      const rows: { key: string; size: number }[] = (await db.query('SELECT key, length(value) AS size FROM kv;')).values ?? [];
      const values = new Map<string, string>();
      for (const { key, size } of rows) {
        let value = '';
        for (let start = 1; start <= size; start += READ_CHUNK) {
          value += (await db.query('SELECT substr(value, ?, ?) AS part FROM kv WHERE key = ?;', [start, READ_CHUNK, key])).values?.[0]?.part ?? '';
        }
        values.set(key, value);
      }
      return values;
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
