import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../models/JournalEntry';
const key = 'mindlog.settings';
const draftKey = 'mindlog.draft';
export async function getSettings(): Promise<AppSettings | null> { const x = await AsyncStorage.getItem(key); return x ? JSON.parse(x) : null; }
export async function saveSettings(settings: AppSettings) { await AsyncStorage.setItem(key, JSON.stringify(settings)); }
export async function getDraft(): Promise<string> { return (await AsyncStorage.getItem(draftKey)) ?? ''; }
export async function saveDraft(draft: string): Promise<void> { await AsyncStorage.setItem(draftKey, draft); }
export async function clearDraft(): Promise<void> { await AsyncStorage.removeItem(draftKey); }
