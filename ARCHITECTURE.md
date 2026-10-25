# MindLog architecture

MindLog is an offline React Native app. Its journal is a user-selected Android Storage Access Framework (SAF) tree. Markdown files in `Journal/YYYY/MM/DD.md` are canonical; React state is only a view of those files. `Attachments/`, `Backups/`, and `mindlog.json` live in the same vault.

`App.tsx` handles screens and actions. `journalService.ts` binds Expo SAF to the testable `journalStore.ts`. Journal operations and snapshot copies share a queue to prevent overlapping in-app mutations. `journalFormat.ts` parses and serializes entries without Android dependencies. `settingsService.ts` stores device preferences and the unsaved composer draft in AsyncStorage; these are not portable vault metadata. Snapshot copying has a separate testable store and thin Expo adapter.

Reads, edits, and deletes locate an existing daily file. Only entry creation may create one. A mutation reads the current daily file, checks its content version against the loaded entry, writes and verifies a revision under `Backups/YYYY/MM/DD/`, then writes and verifies the canonical file. The newest five revisions per day are retained. SAF does not offer a reliable atomic replace across all document providers, so a crash during overwrite can still leave a partial canonical file; the verified prior revision remains for recovery. The app refuses an edit when the file changed outside MindLog.

The app reloads the vault on foreground. A small batch of four files is read concurrently. This is adequate for ordinary journals but is not an index or pagination system. Very large vaults may have slow startup and search. A future index must remain disposable and rebuildable from Markdown.

The combined Markdown export is a readable report, not a backup. Settings now provides verified folder snapshots and restore into a new folder, without an archive dependency. Daily recovery preserves damaged originals under `Recovery/` before restoring a selected revision. Healthy daily files remain visible when another daily file is damaged. See `RELIABILITY.md` for exact guarantees, exclusions and remaining device validation.

## Android build and size

The Expo config plugin in `plugins/withReleaseSize.js` enables R8 minification and resource shrinking for release builds and disables unused GIF/WebP native support. `app.json` removes broad storage permissions from the merged manifest and disables Android cloud backup of device-local app data. Hermes remains enabled.

The older debug APK is 53.8 MB; its compressed native libraries total about 28.0 MB for arm64 and 17.2 MB for armeabi-v7a. The default avatar image is no longer bundled. Release size has not yet been measured successfully; the checkout previously hit Windows CMake path-length limits. `withReleaseSigning` now requires explicit credentials for release tasks and preserves debug signing only for debug builds. See `RELIABILITY.md` for configuration and outstanding release validation.
