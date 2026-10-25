import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../models/JournalEntry';
const key = 'mindlog.settings';
const draftKey = 'mindlog.draft';
export async function getSettings(): Promise<AppSettings | null> {
  const x = await AsyncStorage.getItem(key);
  if (!x) return null;
  const settings = JSON.parse(x);
  if (!settings || typeof settings.folderUri !== 'string' || !settings.folderUri.startsWith('content://')) throw new Error('Saved folder settings are invalid. Choose your existing journal folder again.');
  return {
    folderUri: settings.folderUri,
    theme: ['system', 'light', 'dark'].includes(settings.theme) ? settings.theme : 'system',
    profilePhotoUri: typeof settings.profilePhotoUri === 'string' ? settings.profilePhotoUri : undefined,
  };
}
export async function saveSettings(settings: AppSettings) { await AsyncStorage.setItem(key, JSON.stringify(settings)); }
export async function getDraft(): Promise<string> { return (await AsyncStorage.getItem(draftKey)) ?? ''; }
export async function saveDraft(draft: string): Promise<void> { await AsyncStorage.setItem(draftKey, draft); }
export async function clearDraft(): Promise<void> { await AsyncStorage.removeItem(draftKey); }
