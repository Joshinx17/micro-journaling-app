import * as FileSystem from 'expo-file-system/legacy';
import { JournalEntry } from '../models/JournalEntry';
import { dateKey, isoWithOffset, timezone } from '../utils/date';
import { appendEntry, contentVersion, parseJournal, replaceEntry } from './journalFormat';

const SAF = FileSystem.StorageAccessFramework;
const nameOf = (uri: string) => decodeURIComponent(uri).split('/').pop() || '';
const uuid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const header = (date: string) => `---\ndate: ${date}\ntimezone: ${timezone()}\nformat: mindlog-v1\n---\n\n# ${new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n`;

async function findChild(parent: string, name: string): Promise<string | null> {
  return (await SAF.readDirectoryAsync(parent)).find(uri => nameOf(uri) === name) ?? null;
}

async function ensureDir(parent: string, name: string): Promise<string> {
  return (await findChild(parent, name)) ?? SAF.makeDirectoryAsync(parent, name);
}

export async function findDailyFile(root: string, date: string): Promise<string | null> {
  const [year, month, day] = date.split('-');
  let dir: string | null = root;
  for (const part of ['Journal', year, month]) {
    dir = dir && await findChild(dir, part);
    if (!dir) return null;
  }
  return findChild(dir, `${day}.md`);
}

async function getOrCreateDailyFile(root: string, date: string): Promise<string> {
  const existing = await findDailyFile(root, date);
  if (existing) return existing;
  const [year, month, day] = date.split('-');
  const journal = await ensureDir(root, 'Journal');
  const yearDir = await ensureDir(journal, year);
  const monthDir = await ensureDir(yearDir, month);
  const uri = await SAF.createFileAsync(monthDir, `${day}.md`, 'text/markdown');
  const initial = header(date);
  await SAF.writeAsStringAsync(uri, initial);
  if (await SAF.readAsStringAsync(uri) !== initial) throw new Error('Could not initialize the daily journal file.');
  return uri;
}

async function makeBackup(root: string, date: string, original: string): Promise<void> {
  const [year, month, day] = date.split('-');
  let dir = await ensureDir(root, 'Backups');
  for (const segment of [year, month, day]) dir = await ensureDir(dir, segment);
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${uuid()}.md`;
  const uri = await SAF.createFileAsync(dir, filename, 'text/markdown');
  await SAF.writeAsStringAsync(uri, original);
  if (await SAF.readAsStringAsync(uri) !== original) throw new Error('Could not verify journal backup. The entry was not changed.');
}

async function trimBackups(root: string, date: string): Promise<void> {
  const [year, month, day] = date.split('-');
  let dir: string | null = await findChild(root, 'Backups');
  for (const segment of [year, month, day]) {
    dir = dir && await findChild(dir, segment);
    if (!dir) return;
  }
  if (!dir) return;
  const revisions = (await SAF.readDirectoryAsync(dir)).sort((a, b) => nameOf(b).localeCompare(nameOf(a)));
  for (const old of revisions.slice(5)) await SAF.deleteAsync(old);
}

async function verifiedWrite(root: string, date: string, uri: string, original: string, next: string): Promise<string> {
  if (original === next) return contentVersion(original);
  await makeBackup(root, date, original);
  // Android SAF cannot atomically replace documents across all providers.
  // A verified revision is retained before writing the canonical file.
  if (await SAF.readAsStringAsync(uri) !== original) throw new Error('This journal file changed outside MindLog. Reload it before editing.');
  await SAF.writeAsStringAsync(uri, next);
  if (await SAF.readAsStringAsync(uri) !== next) throw new Error('The journal file could not be verified after saving. Restore it from Backups.');
  try { await trimBackups(root, date); } catch { /* The successful journal write takes priority. */ }
  return contentVersion(next);
}

function requireCurrent(entry: JournalEntry, original: string): void {
  if (entry.fileVersion && entry.fileVersion !== contentVersion(original)) {
    throw new Error('This journal file changed outside MindLog. Reload the journal before editing.');
  }
}

export async function createEntry(root: string, content: string): Promise<JournalEntry> {
  if (!content.trim()) throw new Error('Write a thought before saving.');
  const now = new Date();
  const date = dateKey(now);
  const entry: JournalEntry = { id: uuid(), content: content.trim(), createdAt: isoWithOffset(now), date, timezone: timezone() };
  const uri = await getOrCreateDailyFile(root, date);
  const original = await SAF.readAsStringAsync(uri);
  const next = appendEntry(original, entry);
  entry.fileVersion = await verifiedWrite(root, date, uri, original, next);
  return entry;
}

export async function updateEntry(root: string, entry: JournalEntry, content: string): Promise<JournalEntry> {
  if (!content.trim()) throw new Error('An entry cannot be empty.');
  const uri = await findDailyFile(root, entry.date);
  if (!uri) throw new Error('The daily journal file is missing. Reload the journal or restore it from a backup.');
  const original = await SAF.readAsStringAsync(uri);
  requireCurrent(entry, original);
  const changed = { ...entry, content: content.trim(), updatedAt: isoWithOffset() };
  const next = replaceEntry(original, entry, changed);
  changed.fileVersion = await verifiedWrite(root, entry.date, uri, original, next);
  return changed;
}

export async function deleteEntry(root: string, entry: JournalEntry): Promise<void> {
  const uri = await findDailyFile(root, entry.date);
  if (!uri) throw new Error('The daily journal file is missing. Reload the journal or restore it from a backup.');
  const original = await SAF.readAsStringAsync(uri);
  requireCurrent(entry, original);
  const next = replaceEntry(original, entry).trimEnd() + '\n';
  // Keep a daily file when its last entry is removed; its backup remains recoverable.
  await verifiedWrite(root, entry.date, uri, original, next);
}

async function walk(uri: string, files: string[]): Promise<void> {
  for (const child of await SAF.readDirectoryAsync(uri)) {
    const name = nameOf(child);
    if (/^\d{2}\.md$/.test(name)) files.push(child);
    else if (/^\d{2}$|^\d{4}$/.test(name)) await walk(child, files);
  }
}

export async function loadEntries(root: string): Promise<JournalEntry[]> {
  const journal = await findChild(root, 'Journal');
  if (!journal) return [];
  const files: string[] = [];
  await walk(journal, files);
  const entries: JournalEntry[] = [];
  // A small batch avoids one SAF round trip per await without overwhelming slower providers.
  for (let offset = 0; offset < files.length; offset += 4) {
    const batch = await Promise.all(files.slice(offset, offset + 4).map(async uri => {
      const parts = decodeURIComponent(uri).split('/');
      const date = `${parts.at(-3)}-${parts.at(-2)}-${parts.at(-1)!.replace('.md', '')}`;
      try {
        const text = await SAF.readAsStringAsync(uri);
        return parseJournal(text, date, contentVersion(text));
      } catch (error) {
        throw new Error(`Could not read ${date}.md: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }));
    batch.forEach(items => entries.push(...items));
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function initializeJournal(root: string): Promise<void> {
  await ensureDir(root, 'Journal');
  await ensureDir(root, 'Attachments');
  await ensureDir(root, 'Backups');
  if (!await findChild(root, 'mindlog.json')) {
    const uri = await SAF.createFileAsync(root, 'mindlog.json', 'application/json');
    await SAF.writeAsStringAsync(uri, JSON.stringify({ format: 'mindlog-v1', version: 1, createdAt: new Date().toISOString() }, null, 2));
  }
  // Existing mindlog-settings.json is left untouched for backwards compatibility.
}

export { parseJournal } from './journalFormat';
