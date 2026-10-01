import assert from 'node:assert/strict';
import test from 'node:test';
import { appendEntry, contentVersion, entryBlock, parseJournal, replaceEntry } from '../services/journalFormat.ts';

const date = '2026-10-01';
const first = {
  id: 'entry-one', createdAt: '2026-10-01T09:30:00+05:30', timezone: 'Asia/Kolkata',
  date, content: 'Morning **thought**\n\n```ts\nconst x = 1;\n```\n<!-- hidden --> 👋',
};
const second = {
  id: 'entry-two', createdAt: '2026-10-01T11:00:00+05:30', timezone: 'Asia/Kolkata',
  date, content: 'Another thought',
};
const journal = `---\ndate: ${date}\nformat: mindlog-v1\n---\n\n${entryBlock(first)}\n\n---\n\n${entryBlock(second)}\n`;

test('parses empty and multiline Markdown with stable timezone', () => {
  assert.deepEqual(parseJournal('', date), []);
  const entries = parseJournal(journal, date);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].content, first.content);
  assert.equal(entries[0].timezone, 'Asia/Kolkata');
});

test('retains legacy entry timezone from header instead of current device', () => {
  const legacy = `---\ntimezone: America/New_York\n---\n\n<!-- mindlog-entry-id: old -->\n<!-- created: 2025-11-02T01:30:00-04:00 -->\nlegacy\n<!-- /mindlog-entry -->`;
  assert.equal(parseJournal(legacy, '2025-11-02')[0].timezone, 'America/New_York');
});

test('editing and deleting one entry preserve the other', () => {
  const changed = { ...first, content: 'Edited #learning', updatedAt: '2026-10-01T10:00:00+05:30' };
  const edited = replaceEntry(journal, first, changed);
  assert.deepEqual(parseJournal(edited, date).map(entry => entry.content), [changed.content, second.content]);
  const deleted = replaceEntry(edited, changed);
  assert.deepEqual(parseJournal(deleted, date).map(entry => entry.id), [second.id]);
});

test('appending to a daily file preserves existing entries', () => {
  const appended = appendEntry(journal, { ...second, id: 'entry-three' });
  assert.deepEqual(parseJournal(appended, date).map(entry => entry.id), ['entry-one', 'entry-two', 'entry-three']);
});

test('rejects duplicate IDs and missing entries', () => {
  assert.throws(() => parseJournal(`${journal}\n${entryBlock(first)}`, date), /Duplicate/);
  assert.throws(() => replaceEntry(journal, { ...first, id: 'missing' }), /no longer exists/);
  assert.throws(() => parseJournal(`${journal}\n<!-- mindlog-entry-id: damaged -->`, date), /parse every entry/);
});

test('content version changes when external text changes', () => {
  assert.notEqual(contentVersion(journal), contentVersion(`${journal}external edit`));
});
