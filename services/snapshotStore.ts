import { contentVersion } from './journalFormat.ts';

export interface SnapshotIO {
  list(uri: string): Promise<string[]>;
  read(uri: string): Promise<string>;
  write(uri: string, base64: string): Promise<void>;
  readText(uri: string): Promise<string>;
  writeText(uri: string, text: string): Promise<void>;
  mkdir(parent: string, name: string): Promise<string>;
  create(parent: string, name: string): Promise<string>;
}
type FileRecord = { path: string; version: string };
interface Manifest { format: 'mindlog-snapshot-v1'; files: FileRecord[]; directories: string[] }
const marker = 'mindlog-snapshot.json';
const nameOf = (uri: string) => decodeURIComponent(uri).split('/').pop()!;
const safePath = (path: unknown): path is string => typeof path === 'string' && path.length > 0 && path.split('/').every(part => !!part && part !== '.' && part !== '..' && !/[\\\u0000-\u001f]/.test(part));

export function readManifest(text: string): Manifest {
  const data = JSON.parse(text);
  if (data?.format !== 'mindlog-snapshot-v1' || !Array.isArray(data.files) || !Array.isArray(data.directories)) throw new Error('Not a completed MindLog snapshot.');
  const seen = new Set<string>();
  for (const path of [...data.directories, ...data.files.map((file: FileRecord) => file?.path)]) {
    if (!safePath(path) || path === marker || seen.has(path)) throw new Error('Invalid or duplicate snapshot path.');
    seen.add(path);
  }
  if (data.files.some((file: FileRecord) => typeof file.version !== 'string')) throw new Error('Missing snapshot checksum.');
  if (!data.directories.includes('Journal') || !data.files.some((file: FileRecord) => file.path === 'mindlog.json')) throw new Error('Snapshot is missing its journal or metadata.');
  return data;
}

// Byte-preserving copies, one file in memory at a time. Checksums detect accidental
// corruption, not malicious tampering. The completion manifest is written last.
export function createSnapshotStore(io: SnapshotIO) {
  async function scan(root: string) {
    const files = new Map<string, string>();
    const directories: string[] = [];
    async function walk(uri: string, prefix: string) {
      const children = await io.list(uri);
      for (const child of children) {
        const path = prefix + nameOf(child);
        if (!safePath(path) || files.has(path) || directories.includes(path)) throw new Error('Unsupported or duplicate file name.');
        if (path === marker) continue;
        // SAF has no portable directory-info API in this Expo version. A file
        // fails directory enumeration; its subsequent read must succeed.
        let isDirectory = false;
        try { await io.list(child); isDirectory = true; } catch { /* Read below verifies file accessibility. */ }
        if (isDirectory) { directories.push(path); await walk(child, `${path}/`); }
        else files.set(path, child);
      }
    }
    await walk(root, '');
    return { files, directories };
  }

  async function copy(source: string, destinationParent: string, restore: boolean): Promise<string> {
    const sourceTree = await scan(source);
    let expected: Manifest | undefined;
    if (restore) {
      const manifestUri = (await io.list(source)).find(uri => nameOf(uri) === marker);
      if (!manifestUri) throw new Error('Choose a completed MindLog snapshot folder.');
      expected = readManifest(await io.readText(manifestUri));
      if (expected.files.length !== sourceTree.files.size || expected.directories.length !== sourceTree.directories.length || expected.directories.some(path => !sourceTree.directories.includes(path))) throw new Error('Snapshot contents do not match the manifest.');
      for (const file of expected.files) {
        const uri = sourceTree.files.get(file.path);
        if (!uri || contentVersion(await io.read(uri)) !== file.version) throw new Error(`Snapshot verification failed: ${file.path}`);
      }
    }
    if (!sourceTree.directories.includes('Journal') || !sourceTree.files.has('mindlog.json')) throw new Error('Choose a MindLog vault folder.');
    const metadata = JSON.parse(await io.readText(sourceTree.files.get('mindlog.json')!));
    if (metadata.format !== 'mindlog-v1' || metadata.version !== 1) throw new Error('Unsupported journal format.');
    const label = `${restore ? 'MindLog-restored' : 'MindLog-snapshot'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const target = await io.mkdir(destinationParent, label);
    const dirs = new Map<string, string>([['', target]]);
    const split = (path: string) => { const at = path.lastIndexOf('/'); return [path.slice(0, Math.max(0, at)), path.slice(at + 1)]; };
    for (const path of sourceTree.directories.sort((a, b) => a.split('/').length - b.split('/').length)) {
      const [parent, name] = split(path);
      const directory = await io.mkdir(dirs.get(parent)!, name);
      if (nameOf(directory) !== name) throw new Error(`Storage provider renamed ${path}. Copy stopped.`);
      dirs.set(path, directory);
    }
    const records: FileRecord[] = [];
    for (const [path, uri] of sourceTree.files) {
      const content = await io.read(uri);
      const version = contentVersion(content);
      if (expected && expected.files.find(file => file.path === path)?.version !== version) throw new Error('Snapshot changed during restore.');
      const [parent, name] = split(path);
      const output = await io.create(dirs.get(parent)!, name);
      if (nameOf(output) !== name) throw new Error(`Storage provider renamed ${path}. Copy stopped.`);
      await io.write(output, content);
      if (await io.read(output) !== content) throw new Error(`Copy verification failed: ${path}. The new folder is incomplete; the source was not changed.`);
      records.push({ path, version });
    }
    // Detect source changes during the operation before marking it complete.
    const after = await scan(source);
    if (after.files.size !== sourceTree.files.size || after.directories.length !== sourceTree.directories.length || after.directories.some(path => !sourceTree.directories.includes(path))) throw new Error('Source folder changed. Please retry.');
    for (const file of records) {
      const uri = after.files.get(file.path);
      if (!uri || contentVersion(await io.read(uri)) !== file.version) throw new Error(`Source changed: ${file.path}. Please retry.`);
    }
    const manifest: Manifest = { format: 'mindlog-snapshot-v1', files: records, directories: sourceTree.directories };
    const completion = await io.create(target, marker);
    if (nameOf(completion) !== marker) throw new Error('Storage provider renamed the completion manifest. Copy is incomplete.');
    const text = JSON.stringify(manifest, null, 2);
    await io.writeText(completion, text);
    if (await io.readText(completion) !== text) throw new Error('Could not verify completion manifest. Please retry.');
    return target;
  }
  return { copy };
}
