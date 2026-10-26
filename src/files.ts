// Saving backup files on the device and picking one to restore. All local; nothing is uploaded.
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const FOLDER = 'CNTR';

export interface SavedFile {
  /** Where the file was saved, for the message to the user; null if only the share sheet could take it. */
  location: string | null;
  /** Whether the user sent it somewhere from the share sheet. */
  shared: boolean;
}

function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Saves `text` as `name`. On the phone: into Documents/CNTR, then opens the share sheet so the user can
 * also keep a copy elsewhere. Throws if the file could not be written anywhere.
 */
export async function saveFile(name: string, text: string, mime: string): Promise<SavedFile> {
  if (!Capacitor.isNativePlatform()) {
    download(name, text, mime);
    return { location: 'your Downloads folder', shared: false };
  }

  let uri: string;
  let location: string | null = `Documents/${FOLDER}`;
  try {
    await Filesystem.requestPermissions(); // only asks on Android 10 and older
    uri = (await Filesystem.writeFile({ path: `${FOLDER}/${name}`, data: text, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })).uri;
  } catch (error) {
    console.error('Saving to Documents failed', error);
    // Fall back to the app's own folder; the share sheet is then how the file leaves the app.
    uri = (await Filesystem.writeFile({ path: `${FOLDER}/${name}`, data: text, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true })).uri;
    location = null;
  }

  try {
    await Share.share({ title: name, files: [uri] });
    return { location, shared: true };
  } catch {
    return { location, shared: false }; // closed the share sheet
  }
}

/** Saves a copy of the current data before a restore (Documents/CNTR, else the app's private storage). Throws if both fail. */
export async function saveSafetyCopy(name: string, text: string) {
  if (!Capacitor.isNativePlatform()) return; // the browser build is for development only
  const write = (directory: Directory) => Filesystem.writeFile({ path: `${FOLDER}/${name}`, data: text, directory, encoding: Encoding.UTF8, recursive: true });
  try {
    await write(Directory.Documents);
  } catch {
    await write(Directory.Data);
  }
}

const AUTO_FOLDER = `${FOLDER}/auto`;
const AUTO_KEEP = 20;

/**
 * Writes an automatic backup to Documents/CNTR/auto (else app-private storage) and keeps the newest 20.
 * Returns false in the browser, where nothing is written. Throws if the file could not be written.
 */
export async function saveAutoBackup(name: string, text: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  let directory = Directory.Documents;
  const write = () => Filesystem.writeFile({ path: `${AUTO_FOLDER}/${name}`, data: text, directory, encoding: Encoding.UTF8, recursive: true });
  try {
    await write();
  } catch {
    directory = Directory.Data;
    await write();
  }
  try {
    // Names start with a sortable timestamp, so the oldest sort first.
    const old = (await Filesystem.readdir({ path: AUTO_FOLDER, directory })).files.map((file) => file.name).filter((file) => file.startsWith('cntr-auto-')).sort().slice(0, -AUTO_KEEP);
    for (const file of old) await Filesystem.deleteFile({ path: `${AUTO_FOLDER}/${file}`, directory });
  } catch (error) {
    console.error('Pruning old automatic backups failed', error); // harmless: just more files kept
  }
  return true;
}

/** Opens the system file picker and returns the chosen file's text, or null if nothing was chosen. */
export function pickTextFile(input: HTMLInputElement): Promise<string | null> {
  return new Promise((resolve, reject) => {
    input.value = '';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, reject);
    };
    input.click();
  });
}
