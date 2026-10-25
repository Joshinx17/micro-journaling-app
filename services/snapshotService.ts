import * as FileSystem from 'expo-file-system/legacy';
import { createSnapshotStore } from './snapshotStore';
import { exclusive } from './journalService';

const SAF = FileSystem.StorageAccessFramework;
const mimeTypes: Record<string, string> = { json: 'application/json', md: 'text/markdown', txt: 'text/plain', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf', mp3: 'audio/mpeg', mp4: 'video/mp4' };
const store = createSnapshotStore({
  list: SAF.readDirectoryAsync,
  read: uri => SAF.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }),
  write: (uri, content) => SAF.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.Base64 }),
  readText: SAF.readAsStringAsync, writeText: SAF.writeAsStringAsync,
  mkdir: SAF.makeDirectoryAsync,
  create: (parent, name) => SAF.createFileAsync(parent, name, mimeTypes[name.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream'),
});

export function copySnapshot(source: string, destination: string, restore: boolean) {
  // This app resolves names from document paths; opaque cloud-provider IDs are
  // not supported. Be explicit instead of producing misnamed backups.
  const location = (uri: string) => {
    if (!uri.startsWith('content://com.android.externalstorage.documents/')) throw new Error('Choose local or removable storage using the Android Files picker. This backup flow does not support cloud document providers.');
    const decoded = decodeURIComponent(uri);
    return decoded.split('/document/')[1] ?? decoded.split('/tree/')[1];
  };
  const from = location(source), to = location(destination);
  if (to === from || to.startsWith(`${from}/`)) throw new Error('Choose a destination outside the source folder.');
  return exclusive(() => store.copy(source, destination, restore));
}
