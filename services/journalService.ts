import * as FileSystem from 'expo-file-system/legacy';
import { createJournalStore } from './journalStore';

const store = createJournalStore(FileSystem.StorageAccessFramework);
export const { createEntry, updateEntry, deleteEntry, loadEntries, loadJournal, initializeJournal, listRevisions, restoreRevision, exclusive } = store;
export { parseJournal } from './journalFormat';
