import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { JournalEntry, ThemePreference } from './models/JournalEntry';
import { createEntry, deleteEntry, initializeJournal, loadEntries, updateEntry } from './services/journalService';
import { getSettings, saveSettings } from './services/settingsService';
import { displayDate, displayTime } from './utils/date';

type Screen = 'journal' | 'search' | 'settings';
const avatar = require('./assets/mindlog-avatar.png');

export default function App() {
  const system = useColorScheme();
  const [screen, setScreen] = useState<Screen>('journal');
  const [folder, setFolder] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [theme, setTheme] = useState<ThemePreference>('dark');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [editText, setEditText] = useState('');
  const dark = (theme === 'system' ? system : theme) === 'dark';
  const c = colors(dark);

  const refresh = async (root = folder) => {
    if (!root) return;
    try { setEntries(await loadEntries(root)); }
    catch (error) { Alert.alert('Could not read journal', error instanceof Error ? error.message : 'Try selecting your journal folder again.'); }
  };

  useEffect(() => { (async () => {
    try {
      const settings = await getSettings();
      if (settings?.folderUri) { setFolder(settings.folderUri); setTheme(settings.theme); setProfilePhotoUri(settings.profilePhotoUri); await refresh(settings.folderUri); }
    } finally { setLoading(false); }
  })(); }, []);

  const chooseFolder = async () => {
    try {
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return;
      await initializeJournal(permission.directoryUri);
      await saveSettings({ folderUri: permission.directoryUri, theme, profilePhotoUri });
      setFolder(permission.directoryUri);
      await refresh(permission.directoryUri);
    } catch (error) { Alert.alert('Could not set up journal', error instanceof Error ? error.message : 'Please try another folder.'); }
  };

  const save = async () => {
    if (!folder) { await chooseFolder(); return; }
    if (!draft.trim()) { Alert.alert('Nothing to save', 'Write a thought before saving.'); return; }
    setSaving(true);
    try { const entry = await createEntry(folder, draft); setEntries(current => [entry, ...current]); setDraft(''); }
    catch (error) { Alert.alert("Couldn't save your entry", error instanceof Error ? error.message : 'Your journal remains unchanged.'); }
    finally { setSaving(false); }
  };

  const submitEdit = async () => {
    if (!editing || !folder) return;
    try { const entry = await updateEntry(folder, editing, editText); setEntries(current => current.map(item => item.id === entry.id ? entry : item)); setEditing(null); }
    catch (error) { Alert.alert('Could not update entry', error instanceof Error ? error.message : 'Your journal remains unchanged.'); }
  };

  const remove = (entry: JournalEntry) => Alert.alert('Delete this entry?', 'This permanently removes it from its Markdown file.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { if (folder) await deleteEntry(folder, entry); setEntries(current => current.filter(item => item.id !== entry.id)); }
      catch (error) { Alert.alert('Could not delete entry', error instanceof Error ? error.message : 'Your journal remains unchanged.'); }
    } },
  ]);

  const setPreference = async (nextTheme: ThemePreference) => { setTheme(nextTheme); if (folder) await saveSettings({ folderUri: folder, theme: nextTheme, profilePhotoUri }); };
  const chooseProfilePhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const picked = result.assets[0];
      const extension = picked.name?.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.jpg';
      const destination = `${FileSystem.documentDirectory}mindlog-profile-photo${extension}`;
      await FileSystem.copyAsync({ from: picked.uri, to: destination });
      setProfilePhotoUri(destination);
      if (folder) await saveSettings({ folderUri: folder, theme, profilePhotoUri: destination });
    } catch (error) { Alert.alert('Could not update profile photo', error instanceof Error ? error.message : 'Please choose another image.'); }
  };
  const exportMarkdown = async () => {
    if (!folder) return;
    try {
      const output = `${FileSystem.cacheDirectory}MindLog-export.txt`;
      const summary = entries.map(entry => `# ${new Date(entry.createdAt).toLocaleDateString()} - ${displayTime(entry.createdAt)}\n\n${entry.content}`).join('\n\n---\n\n');
      await FileSystem.writeAsStringAsync(output, summary);
      await Sharing.shareAsync(output, { mimeType: 'text/plain', dialogTitle: 'Export MindLog journal' });
    } catch (error) { Alert.alert('Export failed', error instanceof Error ? error.message : 'Try again.'); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.accent} /></View>;
  if (!folder) return <Onboarding c={c} choose={chooseFolder} />;

  const edit = (entry: JournalEntry) => { setEditing(entry); setEditText(entry.content); };
  return <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
    <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
    {screen === 'journal' && <Journal c={c} draft={draft} setDraft={setDraft} save={save} saving={saving} entries={entries} profilePhotoUri={profilePhotoUri} chooseProfilePhoto={chooseProfilePhoto} onEdit={edit} onDelete={remove} />}
    {screen === 'search' && <Search c={c} entries={entries} profilePhotoUri={profilePhotoUri} onEdit={edit} onDelete={remove} />}
    {screen === 'settings' && <Settings c={c} folder={folder} theme={theme} setTheme={setPreference} choose={chooseFolder} exportJournal={exportMarkdown} />}
    <Nav c={c} screen={screen} setScreen={setScreen} />
    <Modal visible={!!editing} animationType="slide" transparent>
      <View style={styles.modalShade}><View style={[styles.modal, { backgroundColor: c.card, borderColor: c.line }]}>
        <View style={styles.modalTop}><Text style={[styles.modalTitle, { color: c.text }]}>Edit post</Text><Pressable onPress={() => setEditing(null)}><Text style={[styles.close, { color: c.muted }]}>X</Text></Pressable></View>
        <TextInput value={editText} onChangeText={setEditText} multiline autoFocus style={[styles.editor, { color: c.text, borderColor: c.line }]} placeholderTextColor={c.muted} />
        <Pressable onPress={submitEdit} style={[styles.postButton, { backgroundColor: c.accent }]}><Text style={styles.postButtonText}>Save</Text></Pressable>
      </View></View>
    </Modal>
  </SafeAreaView>;
}

const Avatar = ({ photoUri, size = 42 }: { photoUri?: string; size?: number }) => <Image source={photoUri ? { uri: photoUri } : avatar} style={{ width: size, height: size, borderRadius: size / 2 }} />;

const Onboarding = ({ c, choose }: { c: any; choose: () => void }) => <SafeAreaView style={[styles.onboard, { backgroundColor: c.bg }]}>
  <View style={[styles.onboardMark, { backgroundColor: c.accent }]}><Text style={styles.onboardMarkText}>m</Text></View>
  <Text style={[styles.onboardTitle, { color: c.text }]}>Your thoughts, in your timeline.</Text>
  <Text style={[styles.onboardCopy, { color: c.muted }]}>MindLog saves private Markdown files in a folder you choose. No account. No tracking. No cloud.</Text>
  <View style={styles.grow} />
  <Pressable style={[styles.primary, { backgroundColor: c.accent }]} onPress={choose}><Text style={styles.primaryText}>Choose journal folder</Text></Pressable>
  <Text style={[styles.fine, { color: c.muted }]}>Recommended: Documents/MindLog</Text>
</SafeAreaView>;

const ProfileHeader = ({ c, entries, photoUri, chooseProfilePhoto }: { c: any; entries: JournalEntry[]; photoUri?: string; chooseProfilePhoto: () => void }) => <View style={[styles.profile, { borderBottomColor: c.line }]}>
  <View style={[styles.cover, { backgroundColor: c.cover }]} />
  <View style={styles.profileBody}>
    <View style={[styles.profileAvatar, { borderColor: c.bg }]}><Avatar photoUri={photoUri} size={76} /></View>
    <Pressable onPress={chooseProfilePhoto} style={[styles.profileStatus, { borderColor: c.line }]}><Text style={[styles.profileStatusText, { color: c.text }]}>Change photo</Text></Pressable>
    <Text style={[styles.profileName, { color: c.text }]}>My MindLog</Text>
    <Text style={[styles.bio, { color: c.text }]}>Small notes from the day. Kept on this device.</Text>
    <View style={styles.stats}><Text style={[styles.stat, { color: c.text }]}><Text style={styles.statNumber}>{entries.length}</Text> posts</Text><Text style={[styles.stat, { color: c.text }]}><Text style={styles.statNumber}>Private</Text> journal</Text></View>
  </View>
</View>;

const Journal = ({ c, draft, setDraft, save, saving, entries, profilePhotoUri, chooseProfilePhoto, onEdit, onDelete }: any) => <View style={styles.page}>
  <View style={[styles.topBar, { borderBottomColor: c.line }]}><Text style={[styles.topBarTitle, { color: c.text }]}>MindLog</Text><View style={[styles.composeIcon, { backgroundColor: c.accent }]}><Text style={styles.composeIconText}>+</Text></View></View>
  <FlatList data={entries} keyExtractor={(entry: JournalEntry) => entry.id} contentContainerStyle={styles.timeline}
    ListHeaderComponent={<><ProfileHeader c={c} entries={entries} photoUri={profilePhotoUri} chooseProfilePhoto={chooseProfilePhoto} /><Composer c={c} photoUri={profilePhotoUri} draft={draft} setDraft={setDraft} save={save} saving={saving} /><Text style={[styles.feedHeading, { color: c.text, borderBottomColor: c.line }]}>Posts</Text></>}
    ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>Your timeline is waiting for its first thought.</Text>}
    renderItem={({ item }) => <Entry c={c} entry={item} photoUri={profilePhotoUri} onEdit={onEdit} onDelete={onDelete} />} />
</View>;

const Composer = ({ c, photoUri, draft, setDraft, save, saving }: any) => <View style={[styles.composerWrap, { borderBottomColor: c.line }]}>
  <Avatar photoUri={photoUri} /><View style={styles.composerMain}><TextInput value={draft} onChangeText={setDraft} multiline placeholder="Write a thought" placeholderTextColor={c.muted} style={[styles.composer, { color: c.text }]} />
    <View style={[styles.composerActions, { borderTopColor: c.line }]}><Text style={[styles.audience, { color: c.accent }]}>Only you can see this</Text><Pressable disabled={saving || !draft.trim()} onPress={save} style={[styles.postButton, { backgroundColor: c.accent, opacity: saving || !draft.trim() ? 0.45 : 1 }]}><Text style={styles.postButtonText}>{saving ? 'Saving...' : 'Save'}</Text></Pressable></View>
  </View>
</View>;

const Entry = ({ c, entry, photoUri, onEdit, onDelete }: any) => <Pressable onLongPress={() => Alert.alert('Entry actions', undefined, [{ text: 'Delete', style: 'destructive', onPress: () => onDelete(entry) }, { text: 'Cancel', style: 'cancel' }])} style={[styles.entry, { borderBottomColor: c.line }]}>
  <Avatar photoUri={photoUri} /><View style={styles.entryMain}><View style={styles.entryMeta}><Text style={[styles.entryTime, { color: c.muted }]}>{displayDate(entry.createdAt)} at {displayTime(entry.createdAt)}</Text></View>
    <Text style={[styles.content, { color: c.text }]}>{entry.content}</Text>
    <View style={styles.entryActions}><Pressable onPress={() => onEdit(entry)} hitSlop={8}><Text style={[styles.action, { color: c.accent }]}>Edit</Text></Pressable>{entry.updatedAt && <Text style={[styles.edited, { color: c.muted }]}>Edited</Text>}</View>
  </View>
</Pressable>;

const Timeline = ({ c, entries, photoUri, onEdit, onDelete }: any) => <FlatList data={entries} keyExtractor={(entry: JournalEntry) => entry.id} contentContainerStyle={styles.timeline} ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>No posts found.</Text>} renderItem={({ item }) => <Entry c={c} entry={item} photoUri={photoUri} onEdit={onEdit} onDelete={onDelete} />} />;

const Search = ({ c, entries, photoUri, onEdit, onDelete }: any) => {
  const [query, setQuery] = useState('');
  const found = useMemo(() => entries.filter((entry: JournalEntry) => entry.content.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query, entries]);
  return <View style={styles.page}><View style={[styles.topBar, { borderBottomColor: c.line }]}><Text style={[styles.topBarTitle, { color: c.text }]}>Search</Text></View><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search posts" placeholderTextColor={c.muted} style={[styles.search, { color: c.text, backgroundColor: c.elevated }]} /><Timeline c={c} entries={query ? found : []} photoUri={photoUri} onEdit={onEdit} onDelete={onDelete} /></View>;
};

const Settings = ({ c, folder, theme, setTheme, choose, exportJournal }: any) => <View style={styles.page}><View style={[styles.topBar, { borderBottomColor: c.line }]}><Text style={[styles.topBarTitle, { color: c.text }]}>Settings</Text></View><View style={styles.settingsContent}>
  <Text style={[styles.section, { color: c.muted }]}>APPEARANCE</Text>{(['system', 'light', 'dark'] as ThemePreference[]).map(item => <Pressable key={item} style={[styles.row, { borderBottomColor: c.line }]} onPress={() => setTheme(item)}><Text style={[styles.rowText, { color: c.text }]}>{item[0].toUpperCase() + item.slice(1)}</Text><Text style={[styles.selection, { color: theme === item ? c.accent : c.muted }]}>{theme === item ? 'Selected' : ''}</Text></Pressable>)}
  <Text style={[styles.section, { color: c.muted }]}>JOURNAL STORAGE</Text><Text numberOfLines={1} style={[styles.path, { color: c.muted }]}>{decodeURIComponent(folder)}</Text><Pressable onPress={choose}><Text style={[styles.link, { color: c.accent }]}>Change folder</Text></Pressable>
  <Text style={[styles.section, { color: c.muted }]}>DATA</Text><Pressable style={[styles.row, { borderBottomColor: c.line }]} onPress={exportJournal}><Text style={[styles.rowText, { color: c.text }]}>Export journal</Text><Text style={[styles.selection, { color: c.muted }]}>Markdown</Text></Pressable>
  <Text style={[styles.section, { color: c.muted }]}>ABOUT</Text><Text style={[styles.rowText, { color: c.text }]}>MindLog 1.1.0</Text>
</View></View>;

const Nav = ({ c, screen, setScreen }: any) => <View style={[styles.nav, { backgroundColor: c.bg, borderTopColor: c.line }]}>{([['journal', 'Home'], ['search', 'Search'], ['settings', 'Settings']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="button" style={styles.navItem} onPress={() => setScreen(id)}><View style={[styles.navDot, { backgroundColor: screen === id ? c.accent : 'transparent' }]} /><Text style={{ color: screen === id ? c.text : c.muted, fontSize: 12, fontWeight: screen === id ? '700' : '500' }}>{label}</Text></Pressable>)}</View>;

const colors = (dark: boolean) => dark
  ? { bg: '#000000', card: '#000000', elevated: '#16181c', text: '#f7f9f9', muted: '#8b98a5', line: '#2f3336', accent: '#1d9bf0', cover: '#163654' }
  : { bg: '#ffffff', card: '#ffffff', elevated: '#eff3f4', text: '#0f1419', muted: '#536471', line: '#eff3f4', accent: '#1d9bf0', cover: '#9bd7ff' };

const styles = StyleSheet.create({
  safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, page: { flex: 1 }, onboard: { flex: 1, padding: 28 }, onboardMark: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 36 }, onboardMarkText: { color: '#fff', fontSize: 30, fontWeight: '800' }, onboardTitle: { fontSize: 32, lineHeight: 39, fontWeight: '800', marginTop: 28 }, onboardCopy: { fontSize: 16, lineHeight: 24, marginTop: 14 }, grow: { flex: 1 }, primary: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 }, fine: { fontSize: 12, textAlign: 'center', marginTop: 14 }, topBar: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth }, topBarTitle: { fontSize: 20, fontWeight: '800' }, composeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, composeIconText: { color: '#fff', fontSize: 24, lineHeight: 28 }, timeline: { paddingBottom: 84 }, profile: { borderBottomWidth: StyleSheet.hairlineWidth }, cover: { height: 112 }, profileBody: { paddingHorizontal: 16, paddingBottom: 15 }, profileAvatar: { position: 'absolute', top: -40, left: 16, borderWidth: 4, borderRadius: 42 }, profileStatus: { alignSelf: 'flex-end', borderWidth: 1, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 15, marginTop: 10 }, profileStatusText: { fontSize: 14, fontWeight: '700' }, profileName: { fontSize: 20, fontWeight: '800', marginTop: 6 }, handle: { fontSize: 14, marginTop: 1 }, bio: { fontSize: 15, lineHeight: 20, marginTop: 12 }, stats: { flexDirection: 'row', gap: 18, marginTop: 12 }, stat: { fontSize: 14 }, statNumber: { fontWeight: '800' }, composerWrap: { flexDirection: 'row', gap: 11, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth }, composerMain: { flex: 1 }, composer: { minHeight: 64, maxHeight: 150, fontSize: 18, lineHeight: 24, padding: 0, textAlignVertical: 'top' }, composerActions: { minHeight: 42, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, audience: { fontSize: 13, fontWeight: '700' }, postButton: { minHeight: 34, paddingHorizontal: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, postButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' }, feedHeading: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '800', borderBottomWidth: StyleSheet.hairlineWidth }, entry: { flexDirection: 'row', gap: 11, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth }, entryMain: { flex: 1 }, entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }, entryTime: { fontSize: 14 }, entryName: { fontSize: 15, fontWeight: '800' }, entryHandle: { fontSize: 14 }, content: { fontSize: 16, lineHeight: 22, marginTop: 2 }, entryActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 11 }, action: { fontSize: 13, fontWeight: '700' }, edited: { fontSize: 12 }, empty: { textAlign: 'center', paddingVertical: 36, paddingHorizontal: 32, lineHeight: 21 }, search: { margin: 12, height: 42, borderRadius: 21, paddingHorizontal: 17, fontSize: 16 }, settingsContent: { paddingHorizontal: 16 }, section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7, marginTop: 25, marginBottom: 8 }, row: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth }, rowText: { fontSize: 16 }, selection: { fontSize: 13 }, path: { fontSize: 13, marginBottom: 11 }, link: { fontSize: 15, fontWeight: '700' }, nav: { height: 64, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }, navDot: { width: 20, height: 3, borderRadius: 2 }, modalShade: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }, modal: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 20, borderTopRightRadius: 20 }, modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { fontSize: 20, fontWeight: '800' }, close: { fontSize: 18, fontWeight: '700', padding: 4 }, editor: { minHeight: 160, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, textAlignVertical: 'top', fontSize: 16, marginTop: 16, marginBottom: 16 },
});
