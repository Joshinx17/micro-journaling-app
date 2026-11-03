import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Image, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { JournalEntry, ThemePreference } from './models/JournalEntry';
import { createEntry, deleteEntry, initializeJournal, loadEntries, loadJournal, listRevisions, restoreRevision, updateEntry } from './services/journalService';
import type { JournalIssue, Revision } from './services/journalStore';
import { copySnapshot } from './services/snapshotService';
import { clearDraft, getDraft, getSettings, saveDraft, saveSettings } from './services/settingsService';
import { dateKey, displayDate, displayTime } from './utils/date';

type Screen = 'journal' | 'search' | 'settings';
type Palette = ReturnType<typeof colors>;
type EntryAction = (entry: JournalEntry) => void;
type EntryListProps = { c: Palette; entries: JournalEntry[]; photoUri?: string; onEdit: EntryAction; onDelete: EntryAction };

export default function App() {
  const system = useColorScheme();
  const [screen, setScreen] = useState<Screen>('journal');
  const [folder, setFolder] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [issues, setIssues] = useState<JournalIssue[]>([]);
  const [readError, setReadError] = useState('');
  const refreshGeneration = useRef(0);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const [recoveryDate, setRecoveryDate] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const draftReady = useRef(false);
  const latestDraft = useRef('');
  const changeDraft = (text: string) => { latestDraft.current = text; setDraft(text); };
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftWrite = useRef<Promise<void>>(Promise.resolve());
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [editText, setEditText] = useState('');
  const dark = (theme === 'system' ? system : theme) === 'dark';
  const c = colors(dark);

  const refresh = async (root = folder) => {
    if (!root) return;
    const generation = ++refreshGeneration.current;
    try {
      const result = await loadJournal(root);
      if (generation !== refreshGeneration.current) return;
      setEntries(result.entries); setIssues(result.issues); setReadError('');
    } catch (error) {
      if (generation !== refreshGeneration.current) return;
      setEntries([]); setIssues([]);
      setReadError(error instanceof Error ? error.message : 'Try selecting your journal folder again.');
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setWorking(true);
    try { await action(); }
    catch (error) { Alert.alert('Could not complete action', error instanceof Error ? error.message : 'Please try again.'); }
    finally { busy.current = false; setWorking(false); }
  };

  useEffect(() => { (async () => {
    try {
      try { changeDraft(await getDraft()); draftReady.current = true; }
      catch { Alert.alert('Draft unavailable', 'Device storage could not be read. Restart the app before writing a new draft.'); }
      const settings = await getSettings();
      if (settings?.folderUri) { setFolder(settings.folderUri); setTheme(settings.theme); setProfilePhotoUri(settings.profilePhotoUri); await refresh(settings.folderUri); }
    } catch (error) { Alert.alert('Could not open journal', error instanceof Error ? error.message : 'Choose your journal folder again.'); }
    finally { setLoading(false); }
  })(); }, []);

  useEffect(() => {
    if (loading || !draftReady.current) return;
    const timer = setTimeout(() => {
      draftWrite.current = draftWrite.current.catch(() => {}).then(() => saveDraft(draft));
      void draftWrite.current.catch(() => Alert.alert('Draft not saved', 'Keep MindLog open until you can save this thought.'));
    }, 450);
    draftTimer.current = timer;
    return () => clearTimeout(timer);
  }, [draft, loading]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && folder) void refresh(folder);
      if (state !== 'active' && draftReady.current) {
        if (draftTimer.current) clearTimeout(draftTimer.current);
        const text = latestDraft.current;
        draftWrite.current = draftWrite.current.catch(() => {}).then(() => saveDraft(text));
        void draftWrite.current.catch(() => Alert.alert('Draft not saved', 'Device storage is unavailable. Keep the app open until your thought is saved.'));
      }
    });
    return () => listener.remove();
  }, [folder, draft]);

  const selectFolder = async () => runAction(async () => {
    try {
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return;
      await initializeJournal(permission.directoryUri);
      const result = await loadJournal(permission.directoryUri);
      await saveSettings({ folderUri: permission.directoryUri, theme, profilePhotoUri });
      ++refreshGeneration.current;
      setFolder(permission.directoryUri);
      setEntries(result.entries); setIssues(result.issues); setReadError('');
    } catch (error) { Alert.alert('Could not set up journal', error instanceof Error ? error.message : 'Please try another folder.'); }
  });
  const chooseFolder = () => {
    if (busy.current) return;
    if (!folder) { void selectFolder(); return; }
    Alert.alert('Switch journal folder?', 'Existing entries stay in the current folder; this does not move them. Your unsaved draft stays on this device and will be saved to the newly selected journal.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Choose folder', onPress: () => void selectFolder() },
    ]);
  };

  const save = async () => {
    if (busy.current || !draftReady.current) return;
    if (!folder) { await chooseFolder(); return; }
    if (!draft.trim()) { Alert.alert('Nothing to save', 'Write a thought before saving.'); return; }
    const submitted = latestDraft.current;
    busy.current = true; setWorking(true);
    try { await createEntry(folder, submitted); }
    catch (error) {
      Alert.alert("Couldn't save your entry", error instanceof Error ? error.message : 'The draft is still available.');
      busy.current = false; setWorking(false);
      return;
    }
    if (draftTimer.current) clearTimeout(draftTimer.current);
    await draftWrite.current.catch(() => {});
    // A native input event can arrive before editable=false takes effect.
    // Never clear text that differs from the submitted snapshot.
    if (latestDraft.current === submitted) changeDraft('');
    const remaining = latestDraft.current;
    draftWrite.current = draftWrite.current.catch(() => {}).then(() => remaining ? saveDraft(remaining) : clearDraft());
    try { await draftWrite.current; }
    catch { Alert.alert('Entry saved', 'The recovered draft could not be cleared from device storage.'); }
    await refresh(folder);
    busy.current = false; setWorking(false);
  };

  const discardDraft = () => Alert.alert('Discard this draft?', 'This unsaved thought will be removed from this device.', [
    { text: 'Keep writing', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: () => void runAction(async () => {
      try {
        if (draftTimer.current) clearTimeout(draftTimer.current);
        await draftWrite.current.catch(() => {});
        changeDraft('');
        draftWrite.current = draftWrite.current.catch(() => {}).then(() => clearDraft());
        await draftWrite.current;
      }
      catch { Alert.alert('Could not discard draft', 'Please try again.'); }
    }) },
  ]);

  const submitEdit = async () => runAction(async () => {
    if (!editing || !folder) return;
    try { await updateEntry(folder, editing, editText); await refresh(folder); setEditing(null); }
    catch (error) { Alert.alert('Could not update entry', error instanceof Error ? error.message : 'Your journal remains unchanged.'); }
  });

  const remove = (entry: JournalEntry) => Alert.alert('Delete this entry?', 'This permanently removes it from its Markdown file.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => void runAction(async () => {
      try { if (folder) { await deleteEntry(folder, entry); await refresh(folder); } }
      catch (error) { Alert.alert('Could not delete entry', error instanceof Error ? error.message : 'Your journal remains unchanged.'); }
    }) },
  ]);

  const setPreference = async (nextTheme: ThemePreference) => runAction(async () => { if (folder) await saveSettings({ folderUri: folder, theme: nextTheme, profilePhotoUri }); setTheme(nextTheme); });
  const chooseProfilePhoto = async () => runAction(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const picked = result.assets[0];
      const extension = picked.name?.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.jpg';
      const destination = `${FileSystem.documentDirectory}mindlog-profile-photo-${Date.now()}${extension}`;
      await FileSystem.copyAsync({ from: picked.uri, to: destination });
      if (folder) await saveSettings({ folderUri: folder, theme, profilePhotoUri: destination });
      setProfilePhotoUri(destination);
    } catch (error) { Alert.alert('Could not update profile photo', error instanceof Error ? error.message : 'Please choose another image.'); }
  });
  const showRecovery = async (date: string) => runAction(async () => {
    if (!folder) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Enter a date as YYYY-MM-DD.');
    setRevisions(await listRevisions(folder, date)); setRecoveryDate(date);
  });
  const restore = (revision: Revision) => Alert.alert('Restore this day?', `This replaces the whole ${recoveryDate} file with ${revision.entries} thoughts. The current file will be preserved in Recovery.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Restore', onPress: () => void runAction(async () => {
      if (!folder || !recoveryDate) return;
      await restoreRevision(folder, recoveryDate, revision); setRecoveryDate(null); await refresh(folder);
    }) },
  ]);
  const snapshot = (restoring: boolean) => void runAction(async () => {
    let source = folder;
    if (restoring) {
      const selected = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!selected.granted) return;
      source = selected.directoryUri;
    }
    if (!source) return;
    const destination = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!destination.granted) return;
    const result = await copySnapshot(source, destination.directoryUri, restoring);
    Alert.alert(restoring ? 'Snapshot restored' : 'Snapshot verified', `${decodeURIComponent(result)}\n\n${restoring ? 'Use Choose journal folder to open this restored copy.' : 'This includes all vault files. Device drafts, preferences and profile photo are not included. Keep a copy off this phone for protection against device loss.'}`);
  });
  const requestSnapshot = (restoring: boolean) => Alert.alert(restoring ? 'Restore a snapshot' : 'Create a vault snapshot', restoring ? 'First choose the snapshot folder, then a destination. A new folder will be created; existing journals are not replaced.' : 'Choose a destination outside your journal. All vault files will be copied and verified in a new folder. Drafts, settings and profile photo are not included.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: () => snapshot(restoring) },
  ]);
  const exportMarkdown = async () => runAction(async () => {
    if (!folder) return;
    try {
      const current = await loadEntries(folder);
      const output = `${FileSystem.cacheDirectory}MindLog-export-${new Date().toISOString().slice(0, 10)}.md`;
      const summary = current.map(entry => `# ${displayDate(entry.createdAt)} - ${displayTime(entry.createdAt)}\n\n${entry.content}`).join('\n\n---\n\n');
      await FileSystem.writeAsStringAsync(output, summary);
      await Sharing.shareAsync(output, { mimeType: 'text/markdown', dialogTitle: 'Export MindLog journal' });
    } catch (error) { Alert.alert('Export failed', error instanceof Error ? error.message : 'Try again.'); }
  });

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.accent} /></View>;
  if (!folder) return <View style={styles.safe}><Onboarding c={c} choose={chooseFolder} /><Pressable accessibilityRole="button" disabled={working} onPress={() => requestSnapshot(true)} style={{ padding: 20, backgroundColor: c.bg }}><Text style={{ color: c.accent, textAlign: 'center' }}>{working ? 'Working…' : 'Restore a snapshot'}</Text></Pressable></View>;

  const edit = (entry: JournalEntry) => { if (!busy.current) { setEditing(entry); setEditText(entry.content); } };
  return <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
    <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
    {!!readError && <Pressable accessibilityRole="button" onPress={() => void refresh()} style={{ padding: 12 }}><Text style={{ color: c.text }}>{readError} Tap to retry, or choose a folder in Settings.</Text></Pressable>}
    {!!issues.length && <Pressable accessibilityRole="button" onPress={() => setScreen('settings')} style={{ padding: 12 }}><Text style={{ color: c.text }}>{issues.length} daily file(s) need recovery. Healthy days are shown. Open Settings to review.</Text></Pressable>}
    {working && <ActivityIndicator accessibilityLabel="Working" color={c.accent} />}
    {screen === 'journal' && <Journal c={c} draft={draft} setDraft={changeDraft} save={save} discardDraft={discardDraft} saving={working || !draftReady.current} entries={entries} profilePhotoUri={profilePhotoUri} chooseProfilePhoto={chooseProfilePhoto} onEdit={edit} onDelete={remove} />}
    {screen === 'search' && <Search c={c} entries={entries} photoUri={profilePhotoUri} onEdit={edit} onDelete={remove} />}
    {screen === 'settings' && <Settings c={c} folder={folder} theme={theme} setTheme={setPreference} choose={chooseFolder} exportJournal={exportMarkdown} issues={issues} recover={showRecovery} snapshot={requestSnapshot} />}
    <Nav c={c} screen={screen} setScreen={setScreen} />
    <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => { if (!busy.current) setEditing(null); }}>
      <View style={styles.modalShade}><View style={[styles.modal, { backgroundColor: c.card, borderColor: c.line }]}>
        <View style={styles.modalTop}><Text style={[styles.modalTitle, { color: c.text }]}>Edit thought</Text><Pressable accessibilityRole="button" accessibilityLabel="Close editor" disabled={working} onPress={() => setEditing(null)}><Text style={[styles.close, { color: c.muted }]}>X</Text></Pressable></View>
        <TextInput accessibilityLabel="Edit thought" editable={!working} value={editText} onChangeText={setEditText} multiline autoFocus style={[styles.editor, { color: c.text, borderColor: c.line }]} placeholderTextColor={c.muted} />
        <Pressable accessibilityRole="button" disabled={working || !editText.trim()} onPress={submitEdit} style={[styles.postButton, { backgroundColor: c.accent }]}><Text style={styles.postButtonText}>Save</Text></Pressable>
      </View></View>
    </Modal>
    <Modal visible={recoveryDate !== null} animationType="slide" onRequestClose={() => { if (!busy.current) setRecoveryDate(null); }}>
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg, padding: 20 }]}><ScrollView>
        <Text style={[styles.modalTitle, { color: c.text }]}>Recover {recoveryDate}</Text>
        <Text style={{ color: c.muted, marginVertical: 16 }}>Choose a revision of the entire day. Review its time and thought count before restoring.</Text>
        {!revisions.length && <Text style={{ color: c.text }}>No readable revisions found. Restore an independent snapshot or preserve the file for manual repair.</Text>}
        {revisions.map(revision => <Pressable key={revision.uri} accessibilityRole="button" disabled={working} style={[styles.row, { borderBottomColor: c.line }]} onPress={() => restore(revision)}><Text style={{ color: c.accent, flex: 1 }}>{revision.label}{'\n'}{revision.entries} thoughts</Text></Pressable>)}
      </ScrollView><Pressable accessibilityRole="button" disabled={working} onPress={() => setRecoveryDate(null)} style={{ padding: 16 }}><Text style={{ color: c.accent }}>Close recovery</Text></Pressable></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const Avatar = ({ photoUri, size = 42 }: { photoUri?: string; size?: number }) => photoUri
  ? <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#163654', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.56, fontWeight: '800' }}>m</Text>
    </View>;

const Onboarding = ({ c, choose }: { c: Palette; choose: () => void }) => <SafeAreaView style={[styles.onboard, { backgroundColor: c.bg }]}>
  <View style={[styles.onboardMark, { backgroundColor: c.accent }]}><Text style={styles.onboardMarkText}>m</Text></View>
  <Text style={[styles.onboardTitle, { color: c.text }]}>Your thoughts, in your timeline.</Text>
  <Text style={[styles.onboardCopy, { color: c.muted }]}>MindLog saves Markdown files in a folder you choose. No account or tracking. Files are not encrypted; anyone with access to the folder can read them.</Text>
  <View style={styles.grow} />
  <Pressable accessibilityRole="button" accessibilityLabel="Choose journal folder" style={[styles.primary, { backgroundColor: c.accent }]} onPress={choose}><Text style={styles.primaryText}>Choose journal folder</Text></Pressable>
  <Text style={[styles.fine, { color: c.muted }]}>Recommended: Documents/MindLog</Text>
</SafeAreaView>;

const ProfileHeader = ({ c, entries, photoUri, chooseProfilePhoto }: { c: Palette; entries: JournalEntry[]; photoUri?: string; chooseProfilePhoto: () => void }) => <View style={[styles.profile, { borderBottomColor: c.line }]}>
  <View style={[styles.cover, { backgroundColor: c.cover }]} />
  <View style={styles.profileBody}>
    <View style={[styles.profileAvatar, { borderColor: c.bg }]}><Avatar photoUri={photoUri} size={76} /></View>
    <Pressable onPress={chooseProfilePhoto} style={[styles.profileStatus, { borderColor: c.line }]}><Text style={[styles.profileStatusText, { color: c.text }]}>Change photo</Text></Pressable>
    <Text style={[styles.profileName, { color: c.text }]}>My MindLog</Text>
    <Text style={[styles.bio, { color: c.text }]}>Small notes from the day. Kept on this device.</Text>
    <View style={styles.stats}><Text style={[styles.stat, { color: c.text }]}><Text style={styles.statNumber}>{entries.length}</Text> thoughts</Text><Text style={[styles.stat, { color: c.text }]}>Markdown journal</Text></View>
  </View>
</View>;

const Journal = ({ c, draft, setDraft, save, discardDraft, saving, entries, profilePhotoUri, chooseProfilePhoto, onEdit, onDelete }: Omit<EntryListProps, 'photoUri'> & { draft: string; setDraft: (value: string) => void; save: () => void; discardDraft: () => void; saving: boolean; profilePhotoUri?: string; chooseProfilePhoto: () => void }) => <View style={styles.page}>
  <View style={[styles.topBar, { borderBottomColor: c.line }]}><Text style={[styles.topBarTitle, { color: c.text }]}>MindLog</Text></View>
  <FlatList data={entries} keyExtractor={(entry: JournalEntry) => `${entry.date}:${entry.id}`} contentContainerStyle={styles.timeline}
    ListHeaderComponent={<><ProfileHeader c={c} entries={entries} photoUri={profilePhotoUri} chooseProfilePhoto={chooseProfilePhoto} /><Composer c={c} photoUri={profilePhotoUri} draft={draft} setDraft={setDraft} save={save} discardDraft={discardDraft} saving={saving} /><Text style={[styles.feedHeading, { color: c.text, borderBottomColor: c.line }]}>Thoughts</Text></>}
    ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>Your timeline is waiting for its first thought.</Text>}
    renderItem={({ item }) => <Entry c={c} entry={item} photoUri={profilePhotoUri} onEdit={onEdit} onDelete={onDelete} />} />
</View>;

const Composer = ({ c, photoUri, draft, setDraft, save, discardDraft, saving }: { c: Palette; photoUri?: string; draft: string; setDraft: (value: string) => void; save: () => void; discardDraft: () => void; saving: boolean }) => <View style={[styles.composerWrap, { borderBottomColor: c.line }]}>
  <Avatar photoUri={photoUri} /><View style={styles.composerMain}><TextInput accessibilityLabel="Write a thought" editable={!saving} value={draft} onChangeText={setDraft} multiline placeholder="Write a thought" placeholderTextColor={c.muted} style={[styles.composer, { color: c.text }]} />
    <View style={[styles.composerActions, { borderTopColor: c.line, gap: 10 }]}><Text style={[styles.audience, { color: c.accent, flex: 1 }]}>Your journal</Text>{!!draft && <Pressable accessibilityRole="button" accessibilityLabel="Discard draft" disabled={saving} onPress={discardDraft} hitSlop={8}><Text style={[styles.action, { color: c.muted }]}>Discard</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Save thought" disabled={saving || !draft.trim()} onPress={save} style={[styles.postButton, { backgroundColor: c.accent, opacity: saving || !draft.trim() ? 0.45 : 1 }]}><Text style={styles.postButtonText}>{saving ? 'Please wait…' : 'Save'}</Text></Pressable></View>
  </View>
</View>;

const Entry = ({ c, entry, photoUri, onEdit, onDelete }: { c: Palette; entry: JournalEntry; photoUri?: string; onEdit: EntryAction; onDelete: EntryAction }) => <Pressable onLongPress={() => Alert.alert('Entry actions', undefined, [{ text: 'Delete', style: 'destructive', onPress: () => onDelete(entry) }, { text: 'Cancel', style: 'cancel' }])} style={[styles.entry, { borderBottomColor: c.line }]}>
  <Avatar photoUri={photoUri} /><View style={styles.entryMain}><View style={styles.entryMeta}><Text style={[styles.entryTime, { color: c.muted }]}>{displayDate(entry.createdAt)} at {displayTime(entry.createdAt)}</Text></View>
    <Text style={[styles.content, { color: c.text }]}>{entry.content}</Text>
    <View style={styles.entryActions}><Pressable accessibilityRole="button" accessibilityLabel="Edit thought" onPress={() => onEdit(entry)} hitSlop={12}><Text style={[styles.action, { color: c.accent }]}>Edit</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Delete thought" onPress={() => onDelete(entry)} hitSlop={12}><Text style={[styles.action, { color: c.muted }]}>Delete</Text></Pressable>{entry.updatedAt && <Text style={[styles.edited, { color: c.muted }]}>Edited</Text>}</View>
  </View>
</Pressable>;

const Timeline = ({ c, entries, photoUri, onEdit, onDelete }: EntryListProps) => <FlatList data={entries} keyExtractor={(entry: JournalEntry) => `${entry.date}:${entry.id}`} contentContainerStyle={styles.timeline} ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>No thoughts found.</Text>} renderItem={({ item }) => <Entry c={c} entry={item} photoUri={photoUri} onEdit={onEdit} onDelete={onDelete} />} />;

const Search = ({ c, entries, photoUri, onEdit, onDelete }: EntryListProps) => {
  const [query, setQuery] = useState('');
  const found = useMemo(() => entries.filter((entry: JournalEntry) => entry.content.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query, entries]);
  return <View style={styles.page}><View style={[styles.topBar, { borderBottomColor: c.line }]}><Text style={[styles.topBarTitle, { color: c.text }]}>Search</Text></View><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search thoughts" placeholderTextColor={c.muted} style={[styles.search, { color: c.text, backgroundColor: c.elevated }]} /><Timeline c={c} entries={query ? found : []} photoUri={photoUri} onEdit={onEdit} onDelete={onDelete} /></View>;
};

const Settings = ({ c, folder, theme, setTheme, choose, exportJournal, issues, recover, snapshot }: { c: Palette; folder: string; theme: ThemePreference; setTheme: (value: ThemePreference) => void; choose: () => void; exportJournal: () => void; issues: JournalIssue[]; recover: (date: string) => void; snapshot: (restore: boolean) => void }) => {
  const [date, setDate] = useState(dateKey());
  return <View style={styles.page}><View style={[styles.topBar, { borderBottomColor: c.line }]}><Text style={[styles.topBarTitle, { color: c.text }]}>Settings</Text></View><ScrollView contentContainerStyle={[styles.settingsContent, { paddingBottom: 24 }]}>
  <Text style={[styles.section, { color: c.muted }]}>APPEARANCE</Text>{(['system', 'light', 'dark'] as ThemePreference[]).map(item => <Pressable key={item} style={[styles.row, { borderBottomColor: c.line }]} onPress={() => setTheme(item)}><Text style={[styles.rowText, { color: c.text }]}>{item[0].toUpperCase() + item.slice(1)}</Text><Text style={[styles.selection, { color: theme === item ? c.accent : c.muted }]}>{theme === item ? 'Selected' : ''}</Text></Pressable>)}
  <Text style={[styles.section, { color: c.muted }]}>JOURNAL STORAGE</Text><Text numberOfLines={1} style={[styles.path, { color: c.muted }]}>{decodeURIComponent(folder)}</Text><Pressable onPress={choose}><Text style={[styles.link, { color: c.accent }]}>Change folder</Text></Pressable>
  <Text style={[styles.section, { color: c.muted }]}>DATA</Text><Pressable style={[styles.row, { borderBottomColor: c.line }]} onPress={exportJournal}><Text style={[styles.rowText, { color: c.text }]}>Export journal</Text><Text style={[styles.selection, { color: c.muted }]}>Markdown</Text></Pressable>
  <Text style={{ color: c.muted }}>Readable export only. Use a snapshot for a complete vault backup.</Text>
  <Pressable accessibilityRole="button" style={styles.row} onPress={() => snapshot(false)}><Text style={{ color: c.accent }}>Create verified snapshot</Text></Pressable>
  <Pressable accessibilityRole="button" style={styles.row} onPress={() => snapshot(true)}><Text style={{ color: c.accent }}>Restore snapshot to a new folder</Text></Pressable>
  <Text style={[styles.section, { color: c.muted }]}>RECOVERY</Text>
  {issues.map(issue => <Pressable accessibilityRole="button" key={issue.date} onPress={() => recover(issue.date)} style={{ paddingVertical: 10 }}><Text style={{ color: c.accent }}>{issue.date}: {issue.message}</Text></Pressable>)}
  <Text style={{ color: c.muted }}>Recover a damaged day or undo an edit or deletion. The five latest revisions per day are available.</Text>
  <TextInput accessibilityLabel="Recovery date, YYYY-MM-DD" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={c.muted} style={[styles.search, { color: c.text, backgroundColor: c.elevated }]} />
  <Pressable accessibilityRole="button" style={styles.row} onPress={() => recover(date)}><Text style={{ color: c.accent }}>View daily revisions</Text></Pressable>
  <Text style={[styles.section, { color: c.muted }]}>PRIVACY</Text>
  <Text style={{ color: c.muted }}>Your journal stays in the folder you choose. MindLog has no account, ads, analytics, or app server. Journal files and snapshots are not encrypted by MindLog. Other apps or storage providers with access to your folder may be able to read them. Sharing or exporting sends content to the destination you select. Uninstalling MindLog does not delete a journal stored in a user-selected folder.</Text>
  <Text style={[styles.section, { color: c.muted }]}>ABOUT</Text><Text style={[styles.rowText, { color: c.text }]}>MindLog 1.1.0</Text>
</ScrollView></View>;
};

const Nav = ({ c, screen, setScreen }: { c: Palette; screen: Screen; setScreen: (screen: Screen) => void }) => <View style={[styles.nav, { backgroundColor: c.bg, borderTopColor: c.line }]}>{([['journal', 'Home'], ['search', 'Search'], ['settings', 'Settings']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: screen === id }} style={styles.navItem} onPress={() => setScreen(id)}><View style={[styles.navDot, { backgroundColor: screen === id ? c.accent : 'transparent' }]} /><Text style={{ color: screen === id ? c.text : c.muted, fontSize: 12, fontWeight: screen === id ? '700' : '500' }}>{label}</Text></Pressable>)}</View>;

const colors = (dark: boolean) => dark
  ? { bg: '#000000', card: '#000000', elevated: '#16181c', text: '#f7f9f9', muted: '#8b98a5', line: '#2f3336', accent: '#1d9bf0', cover: '#163654' }
  : { bg: '#ffffff', card: '#ffffff', elevated: '#eff3f4', text: '#0f1419', muted: '#536471', line: '#eff3f4', accent: '#1d9bf0', cover: '#9bd7ff' };

const styles = StyleSheet.create({
  safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, page: { flex: 1 }, onboard: { flex: 1, padding: 28 }, onboardMark: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 36 }, onboardMarkText: { color: '#fff', fontSize: 30, fontWeight: '800' }, onboardTitle: { fontSize: 32, lineHeight: 39, fontWeight: '800', marginTop: 28 }, onboardCopy: { fontSize: 16, lineHeight: 24, marginTop: 14 }, grow: { flex: 1 }, primary: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 }, fine: { fontSize: 12, textAlign: 'center', marginTop: 14 }, topBar: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth }, topBarTitle: { fontSize: 20, fontWeight: '800' }, composeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, composeIconText: { color: '#fff', fontSize: 24, lineHeight: 28 }, timeline: { paddingBottom: 84 }, profile: { borderBottomWidth: StyleSheet.hairlineWidth }, cover: { height: 112 }, profileBody: { paddingHorizontal: 16, paddingBottom: 15 }, profileAvatar: { position: 'absolute', top: -40, left: 16, borderWidth: 4, borderRadius: 42 }, profileStatus: { alignSelf: 'flex-end', borderWidth: 1, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 15, marginTop: 10 }, profileStatusText: { fontSize: 14, fontWeight: '700' }, profileName: { fontSize: 20, fontWeight: '800', marginTop: 6 }, handle: { fontSize: 14, marginTop: 1 }, bio: { fontSize: 15, lineHeight: 20, marginTop: 12 }, stats: { flexDirection: 'row', gap: 18, marginTop: 12 }, stat: { fontSize: 14 }, statNumber: { fontWeight: '800' }, composerWrap: { flexDirection: 'row', gap: 11, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth }, composerMain: { flex: 1 }, composer: { minHeight: 64, maxHeight: 150, fontSize: 18, lineHeight: 24, padding: 0, textAlignVertical: 'top' }, composerActions: { minHeight: 44, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, audience: { fontSize: 13, fontWeight: '700' }, postButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, postButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' }, feedHeading: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '800', borderBottomWidth: StyleSheet.hairlineWidth }, entry: { flexDirection: 'row', gap: 11, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth }, entryMain: { flex: 1 }, entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }, entryTime: { fontSize: 14 }, entryName: { fontSize: 15, fontWeight: '800' }, entryHandle: { fontSize: 14 }, content: { fontSize: 16, lineHeight: 22, marginTop: 2 }, entryActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 11 }, action: { fontSize: 13, fontWeight: '700' }, edited: { fontSize: 12 }, empty: { textAlign: 'center', paddingVertical: 36, paddingHorizontal: 32, lineHeight: 21 }, search: { margin: 12, height: 42, borderRadius: 21, paddingHorizontal: 17, fontSize: 16 }, settingsContent: { paddingHorizontal: 16 }, section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7, marginTop: 25, marginBottom: 8 }, row: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth }, rowText: { fontSize: 16 }, selection: { fontSize: 13 }, path: { fontSize: 13, marginBottom: 11 }, link: { fontSize: 15, fontWeight: '700' }, nav: { height: 64, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }, navDot: { width: 20, height: 3, borderRadius: 2 }, modalShade: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }, modal: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 20, borderTopRightRadius: 20 }, modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { fontSize: 20, fontWeight: '800' }, close: { fontSize: 18, fontWeight: '700', padding: 4 }, editor: { minHeight: 160, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, textAlignVertical: 'top', fontSize: 16, marginTop: 16, marginBottom: 16 },
});
