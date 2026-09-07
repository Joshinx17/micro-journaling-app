import * as FileSystem from 'expo-file-system/legacy';
import { JournalEntry } from '../models/JournalEntry';
import { dateKey, isoWithOffset, timezone } from '../utils/date';

const SAF = FileSystem.StorageAccessFramework;
const enc = encodeURIComponent;
// SAF child URIs must come from Android. Manually appending a filename to a
// tree URI produces an invalid document URI on several Android versions.
const nameOf = (uri:string) => decodeURIComponent(uri).split('/').pop() || '';
const uuid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const esc = (s:string) => s.replace(/<!--/g, '<!\\-\\-');
const entryBlock = (e:JournalEntry) => `<!-- mindlog-entry-id: ${e.id} -->\n<!-- created: ${e.createdAt} -->${e.updatedAt ? `\n<!-- updated: ${e.updatedAt} -->` : ''}\n${esc(e.content).trim()}\n<!-- /mindlog-entry -->`;
const header = (date:string) => `---\ndate: ${date}\ntimezone: ${timezone()}\nformat: mindlog-v1\n---\n\n# ${new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}\n`;
export function parseJournal(text:string, date:string): JournalEntry[] {
  const re = /<!-- mindlog-entry-id: ([^ ]+) -->\s*\n<!-- created: ([^>]+) -->(?:\s*\n<!-- updated: ([^>]+) -->)?\s*\n([\s\S]*?)\s*\n<!-- \/mindlog-entry -->/g;
  const out: JournalEntry[]=[]; let m:RegExpExecArray|null;
  while ((m=re.exec(text))) out.push({id:m[1],createdAt:m[2],updatedAt:m[3],content:m[4].replace(/<!\\-\\-/g,'<!--'),date,timezone: timezone()});
  return out;
}
async function ensureDir(uri:string, name:string) { const children=await SAF.readDirectoryAsync(uri); const existing=children.find(x=>nameOf(x)===name); if(existing) return existing; return SAF.makeDirectoryAsync(uri,name); }
async function dailyUri(root:string, date:string) { const [year,month,day]=date.split('-'); const journal=await ensureDir(root,'Journal'); const yr=await ensureDir(journal,year); const mo=await ensureDir(yr,month); const name=`${day}.md`; const children=await SAF.readDirectoryAsync(mo); const existing=children.find(x=>nameOf(x)===name); if(existing) return existing; const uri=await SAF.createFileAsync(mo,name,'text/markdown'); await SAF.writeAsStringAsync(uri,header(date)); return uri; }
async function read(uri:string) { return SAF.readAsStringAsync(uri); }
async function overwrite(uri:string, content:string) { await SAF.writeAsStringAsync(uri,content); const verified=await read(uri); if (verified !== content) throw new Error('The journal file could not be verified after saving.'); }
export async function createEntry(root:string, content:string):Promise<JournalEntry> { if(!content.trim()) throw new Error('Write a thought before saving.'); const now=new Date(), date=dateKey(now); const e:JournalEntry={id:uuid(),content:content.trim(),createdAt:isoWithOffset(now),date,timezone:timezone()}; const uri=await dailyUri(root,date); const old=await read(uri); await overwrite(uri,`${old.trimEnd()}\n\n---\n\n${entryBlock(e)}\n`); return e; }
export async function updateEntry(root:string, entry:JournalEntry, content:string) { if(!content.trim()) throw new Error('An entry cannot be empty.'); const uri=await dailyUri(root,entry.date), old=await read(uri); const changed={...entry,content:content.trim(),updatedAt:isoWithOffset()}; const re=new RegExp(`<!-- mindlog-entry-id: ${entry.id.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')} -->[\\s\\S]*?<!-- /mindlog-entry -->`); if(!re.test(old)) throw new Error('This entry no longer exists in its journal file.'); await overwrite(uri,old.replace(re,entryBlock(changed))); return changed; }
export async function deleteEntry(root:string, entry:JournalEntry) { const uri=await dailyUri(root,entry.date), old=await read(uri); const re=new RegExp(`\\n*---\\n*\\n*<!-- mindlog-entry-id: ${entry.id.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')} -->[\\s\\S]*?<!-- /mindlog-entry -->\\n?`); const next=old.replace(re,'\n'); if(parseJournal(next,entry.date).length===0) await SAF.deleteAsync(uri,{idempotent:true}); else await overwrite(uri,next.trimEnd()+'\n'); }
async function walk(uri:string, dates:string[]):Promise<void> { const children=await SAF.readDirectoryAsync(uri); for(const u of children) { const n=nameOf(u); if(n.endsWith('.md')) dates.push(u); else { try { await walk(u,dates); } catch { /* file */ } } } }
export async function loadEntries(root:string):Promise<JournalEntry[]> { const journalChildren=await SAF.readDirectoryAsync(root); const journal=journalChildren.find(x=>nameOf(x)==='Journal'); if(!journal)return []; const files:string[]=[]; try { await walk(journal,files); } catch { return []; } const all:JournalEntry[]=[]; for(const uri of files) { const parts=decodeURIComponent(uri).split('/'); const date=`${parts.at(-3)}-${parts.at(-2)}-${parts.at(-1)!.replace('.md','')}`; try { all.push(...parseJournal(await read(uri),date)); } catch { /* preserve unreadable files */ } } return all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
export async function initializeJournal(root:string) { await ensureDir(root,'Journal'); await ensureDir(root,'Attachments'); const children=await SAF.readDirectoryAsync(root); const existing=children.find(x=>nameOf(x)==='mindlog-settings.json'); if(!existing) { const settings=await SAF.createFileAsync(root,'mindlog-settings.json','application/json'); await SAF.writeAsStringAsync(settings,JSON.stringify({format:'mindlog-v1'},null,2)); } }
