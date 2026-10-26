// One-time copy of the old localStorage data into the database. Type-only imports, so Node can test it directly.
import type { KvStore } from './kv';

/**
 * Every key the app's data lives under. Old saved reports (`cntrSavedReports`, `cntrImportedEventReport`) were
 * dropped when events replaced them: they are no longer read, backed up or restored, but never deleted.
 */
export const DATA_KEYS = ['cntrProducts', 'cntrProductHistory', 'cntrSales', 'cntrEventCosts', 'cntrLiveEvent', 'cntrEvents', 'cntrSettings'];
/** Old saved reports: no longer read or restored; kept once in an automatic backup when events arrive (main.ts). */
export const DROPPED_KEYS = ['cntrSavedReports', 'cntrImportedEventReport'];
export const MIGRATED_FLAG = 'cntrMeta.migratedFromLocalStorage';

export type MigrationResult = 'already-done' | 'nothing-to-copy' | 'copied';

/**
 * Copies the legacy values into `store`, reads them back to check they match, and only then marks the
 * migration done. The legacy values are never changed or deleted. Safe to rerun: values are written by key,
 * so a rerun replaces rather than duplicates, and once the flag is set it does nothing.
 */
export async function migrateFromLegacy(store: KvStore, legacy: Pick<Storage, 'getItem'>): Promise<MigrationResult> {
  if ((await store.readAll()).has(MIGRATED_FLAG)) return 'already-done';

  const copies = new Map<string, string>();
  for (const key of DATA_KEYS) {
    const value = legacy.getItem(key);
    if (value !== null) copies.set(key, value);
  }
  // Before the flag is set the app never writes to the store, so any values there are from an earlier
  // interrupted attempt and are safe to replace with the legacy originals.
  if (copies.size) await store.write(copies);

  const stored = await store.readAll();
  for (const [key, value] of copies) {
    if (stored.get(key) !== value) throw new Error(`Copied data did not match for ${key}`);
  }
  await store.write(new Map([[MIGRATED_FLAG, new Date().toISOString()]]));
  return copies.size ? 'copied' : 'nothing-to-copy';
}
