export interface JournalEntry { id: string; content: string; createdAt: string; updatedAt?: string; date: string; timezone: string; }
export type ThemePreference = 'system' | 'light' | 'dark';
export interface AppSettings { folderUri: string; theme: ThemePreference; }
