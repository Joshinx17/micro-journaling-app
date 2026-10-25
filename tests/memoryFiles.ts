import type { JournalFileSystem } from '../services/journalStore.ts';
import type { SnapshotIO } from '../services/snapshotStore.ts';

export function memoryFiles() {
  const files = new Map<string, string>();
  const dirs = new Set(['/vault', '/destination']);
  let beforeWrite: ((uri: string, text: string) => void) | undefined;
  const fs: JournalFileSystem = {
    async readDirectoryAsync(uri) {
      if (!dirs.has(uri)) throw new Error('Not an accessible directory');
      return [...dirs, ...files.keys()].filter(path => path.startsWith(`${uri}/`) && !path.slice(uri.length + 1).includes('/'));
    },
    async makeDirectoryAsync(parent, name) {
      if (!dirs.has(parent)) throw new Error('Missing parent');
      const path = `${parent}/${name}`;
      if (dirs.has(path) || files.has(path)) throw new Error('Already exists');
      dirs.add(path); return path;
    },
    async createFileAsync(parent, name) {
      if (!dirs.has(parent)) throw new Error('Missing parent');
      const path = `${parent}/${name}`;
      if (files.has(path)) throw new Error('Already exists');
      files.set(path, ''); return path;
    },
    async readAsStringAsync(uri) {
      if (!files.has(uri)) throw new Error('Missing file');
      return files.get(uri)!;
    },
    async writeAsStringAsync(uri, text) {
      beforeWrite?.(uri, text);
      files.set(uri, text);
    },
    async deleteAsync(uri) { files.delete(uri); },
  };
  const io: SnapshotIO = {
    list: fs.readDirectoryAsync, mkdir: fs.makeDirectoryAsync,
    create: (parent, name) => fs.createFileAsync(parent, name, ''),
    read: fs.readAsStringAsync, write: fs.writeAsStringAsync,
    readText: fs.readAsStringAsync, writeText: fs.writeAsStringAsync,
  };
  return { fs, io, files, dirs, onWrite: (hook?: typeof beforeWrite) => { beforeWrite = hook; } };
}
