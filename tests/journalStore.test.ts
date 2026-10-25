import assert from 'node:assert/strict';
import test from 'node:test';
import { createJournalStore } from '../services/journalStore.ts';
import { memoryFiles } from './memoryFiles.ts';

async function setup() {
  const memory = memoryFiles();
  const store = createJournalStore(memory.fs);
  await store.initializeJournal('/vault');
  return { ...memory, store };
}

test('rapid creates are serialized, including directory creation', async () => {
  const { store } = await setup();
  await Promise.all(Array.from({ length: 20 }, (_, index) => store.createEntry('/vault', `Thought ${index}`)));
  const entries = await store.loadEntries('/vault');
  assert.equal(entries.length, 20);
  assert.equal(new Set(entries.map(entry => entry.content)).size, 20);
});

test('stale edits are refused and failed operations do not poison the queue', async () => {
  const { store } = await setup();
  const original = await store.createEntry('/vault', 'Before');
  await store.updateEntry('/vault', original, 'After');
  await assert.rejects(store.deleteEntry('/vault', original), /changed outside/);
  assert.equal((await store.loadEntries('/vault'))[0].content, 'After');
  await store.createEntry('/vault', 'Still usable');
});

test('interrupted overwrite preserves a usable revision and recovery preserves damaged bytes', async () => {
  const { store, files, onWrite } = await setup();
  const entry = await store.createEntry('/vault', 'Irreplaceable');
  const daily = [...files.keys()].find(path => path.startsWith('/vault/Journal/') && path.endsWith('.md'))!;
  onWrite((uri) => {
    if (uri === daily) { files.set(uri, '<!-- mindlog-entry-id: damaged -->'); throw new Error('Storage full'); }
  });
  await assert.rejects(store.updateEntry('/vault', entry, 'New text'), /Storage full/);
  onWrite();
  assert.equal((await store.loadJournal('/vault')).issues.length, 1);
  await assert.rejects(store.createEntry('/vault', 'Do not overwrite damage'), /parse every entry/);
  const revision = (await store.listRevisions('/vault', entry.date)).find(item => item.entries === 1)!;
  await store.restoreRevision('/vault', entry.date, revision);
  assert.equal((await store.loadEntries('/vault'))[0].content, 'Irreplaceable');
  assert.ok([...files].some(([path, text]) => path.startsWith('/vault/Recovery/') && text.includes('damaged')));
});

test('one corrupt daily file does not hide healthy days and export refuses omissions', async () => {
  const { store, files, dirs } = await setup();
  await store.createEntry('/vault', 'Healthy');
  dirs.add('/vault/Journal/2000'); dirs.add('/vault/Journal/2000/01');
  files.set('/vault/Journal/2000/01/01.md', '');
  const result = await store.loadJournal('/vault');
  assert.equal(result.entries.length, 1);
  assert.deepEqual(result.issues.map(issue => issue.date), ['2000-01-01']);
  await assert.rejects(store.loadEntries('/vault'), /incomplete export/);
});

test('a failed backup prevents canonical writes', async () => {
  const { store, files, onWrite } = await setup();
  const entry = await store.createEntry('/vault', 'Keep me');
  const before = [...files].filter(([path]) => path.includes('/Journal/'));
  onWrite(uri => { if (uri.includes('/Backups/')) throw new Error('Permission revoked'); });
  await assert.rejects(store.updateEntry('/vault', entry, 'Lost'), /Permission revoked/);
  assert.deepEqual([...files].filter(([path]) => path.includes('/Journal/')), before);
});

test('external changes during backup are detected before canonical overwrite', async () => {
  const { store, files, onWrite } = await setup();
  const entry = await store.createEntry('/vault', 'Keep me');
  const daily = [...files.keys()].find(path => path.includes('/Journal/') && path.endsWith('.md'))!;
  onWrite(uri => { if (uri.includes('/Backups/')) files.set(daily, `${files.get(daily)}\nExternal note`); });
  await assert.rejects(store.updateEntry('/vault', entry, 'Overwrite'), /changed outside/);
  assert.ok(files.get(daily)?.endsWith('External note'));
});

test('missing journal root and unsupported metadata are explicit errors', async () => {
  const { store, dirs, files } = await setup();
  dirs.delete('/vault/Journal');
  await assert.rejects(store.loadJournal('/vault'), /missing/);
  files.set('/vault/mindlog.json', '{"format":"future","version":2}');
  await assert.rejects(store.initializeJournal('/vault'), /Unsupported/);
});
