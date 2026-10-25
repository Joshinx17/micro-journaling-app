import assert from 'node:assert/strict';
import test from 'node:test';
import { createJournalStore } from '../services/journalStore.ts';
import { createSnapshotStore, readManifest } from '../services/snapshotStore.ts';
import { memoryFiles } from './memoryFiles.ts';

test('vault snapshot restores all files, including attachments, backups and damaged content', async () => {
  const memory = memoryFiles();
  const journal = createJournalStore(memory.fs);
  await journal.initializeJournal('/vault');
  await journal.createEntry('/vault', 'My thought');
  memory.files.set('/vault/Attachments/image.png', 'binary content 00 ff');
  memory.files.set('/vault/unrecognized.txt', 'Keep extra files too');
  const before = [...memory.files].filter(([path]) => path.startsWith('/vault/'));
  const snapshots = createSnapshotStore(memory.io);
  const snapshot = await snapshots.copy('/vault', '/destination', false);
  const restored = await snapshots.copy(snapshot, '/destination', true);
  for (const [path, content] of before) assert.equal(memory.files.get(path.replace('/vault', restored)), content);
  assert.equal((await journal.loadEntries(restored))[0].content, 'My thought');
  assert.deepEqual([...memory.files].filter(([path]) => path.startsWith('/vault/')), before);
});

test('tampered snapshots fail before a restore folder is created', async () => {
  const memory = memoryFiles();
  await createJournalStore(memory.fs).initializeJournal('/vault');
  const snapshots = createSnapshotStore(memory.io);
  const snapshot = await snapshots.copy('/vault', '/destination', false);
  memory.files.set(`${snapshot}/mindlog.json`, 'tampered');
  const before = [...memory.dirs];
  await assert.rejects(snapshots.copy(snapshot, '/destination', true), /verification failed/);
  assert.deepEqual([...memory.dirs], before);
});

test('interrupted snapshots never receive a completion manifest', async () => {
  const memory = memoryFiles();
  await createJournalStore(memory.fs).initializeJournal('/vault');
  memory.onWrite(uri => { if (uri.startsWith('/destination/')) throw new Error('Storage full'); });
  await assert.rejects(createSnapshotStore(memory.io).copy('/vault', '/destination', false), /Storage full/);
  assert.ok(![...memory.files.keys()].some(path => path.endsWith('mindlog-snapshot.json')));
  assert.ok(memory.files.has('/vault/mindlog.json'));
});

test('manifest rejects traversal, duplicate paths and missing required files', () => {
  const valid = { format: 'mindlog-snapshot-v1', directories: ['Journal'], files: [{ path: 'mindlog.json', version: 'checksum' }] };
  assert.doesNotThrow(() => readManifest(JSON.stringify(valid)));
  for (const path of ['../outside', 'Journal/../../outside', '/absolute', 'Journal\\outside', 'Journal']) {
    assert.throws(() => readManifest(JSON.stringify({ ...valid, files: [...valid.files, { path, version: 'x' }] })));
  }
  assert.throws(() => readManifest(JSON.stringify({ ...valid, files: [] })));
});
