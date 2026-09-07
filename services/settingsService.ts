import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../models/JournalEntry';
const key = 'mindlog.settings';
export async function getSettings(): Promise<AppSettings | null> { const x = await AsyncStorage.getItem(key); return x ? JSON.parse(x) : null; }
export async function saveSettings(settings: AppSettings) { await AsyncStorage.setItem(key, JSON.stringify(settings)); }
