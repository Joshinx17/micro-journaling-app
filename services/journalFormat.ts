import type { JournalEntry } from '../models/JournalEntry';

const marker = /<!-- mindlog-entry-id: ([^\s>]+) -->\s*\n<!-- created: ([^>]+) -->(?:\s*\n<!-- updated: ([^>]+) -->)?(?:\s*\n<!-- timezone: ([^>]+) -->)?\s*\n([\s\S]*?)\s*\n<!-- \/mindlog-entry -->/g;

export const entryBlock = (entry: JournalEntry): string =>
  `<!-- mindlog-entry-id: ${entry.id} -->\n<!-- created: ${entry.createdAt} -->${entry.updatedAt ? `\n<!-- updated: ${entry.updatedAt} -->` : ''}\n<!-- timezone: ${entry.timezone} -->\n${entry.content.replace(/<!--/g, '<!\\-\\-').trim()}\n<!-- /mindlog-entry -->`;

export const appendEntry = (text: string, entry: JournalEntry): string =>
  `${text.trimEnd()}\n\n---\n\n${entryBlock(entry)}\n`;

export function parseJournal(text: string, date: string, fileVersion?: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const headerTimezone = text.match(/^timezone:\s*(.+)$/m)?.[1]?.trim();
  const seen = new Set<string>();
  for (const match of text.matchAll(marker)) {
    const [, id, createdAt, updatedAt, timezone, content] = match;
    if (seen.has(id)) throw new Error(`Duplicate journal entry ID in ${date}.`);
    if (Number.isNaN(Date.parse(createdAt))) throw new Error(`Invalid journal timestamp in ${date}.`);
    seen.add(id);
    entries.push({
      id, createdAt, updatedAt, date,
      timezone: timezone?.trim() || headerTimezone || createdAt.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] || 'UTC',
      content: content.replace(/<!\\-\\-/g, '<!--').trim(), fileVersion,
    });
  }
  const markerCount = text.match(/<!-- mindlog-entry-id:/g)?.length ?? 0;
  if (markerCount !== entries.length) throw new Error(`Could not parse every entry in ${date}.`);
  return entries;
}

export function replaceEntry(text: string, entry: JournalEntry, replacement?: JournalEntry): string {
  const matches = [...text.matchAll(marker)].filter(match => match[1] === entry.id);
  if (matches.length !== 1) throw new Error('This entry no longer exists uniquely in its journal file. Reload the journal.');
  const match = matches[0];
  const start = match.index;
  const end = start + match[0].length;
  return text.slice(0, start) + (replacement ? entryBlock(replacement) : '') + text.slice(end);
}

// FNV-1a over UTF-16 code units is enough to detect a changed snapshot; it is not a security hash.
export function contentVersion(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}
