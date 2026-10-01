# MindLog architecture

MindLog is an offline React Native app. Its journal is a user-selected Android Storage Access Framework (SAF) tree. Markdown files in `Journal/YYYY/MM/DD.md` are canonical; React state is only a view of those files. `Attachments/`, `Backups/`, and `mindlog.json` live in the same vault.

`App.tsx` handles the current screens and actions. `services/journalService.ts` is the only module that creates or changes vault documents. `services/journalFormat.ts` parses and serializes entries without Android dependencies. `services/settingsService.ts` stores device preferences and the unsaved composer draft in AsyncStorage; these are not portable vault metadata.

Reads, edits, and deletes locate an existing daily file. Only entry creation may create one. A mutation reads the current daily file, checks its content version against the loaded entry, writes and verifies a revision under `Backups/YYYY/MM/DD/`, then writes and verifies the canonical file. The newest five revisions per day are retained. SAF does not offer a reliable atomic replace across all document providers, so a crash during overwrite can still leave a partial canonical file; the verified prior revision remains for recovery. The app refuses an edit when the file changed outside MindLog.

The app reloads the vault on foreground. A small batch of four files is read concurrently. This is adequate for ordinary journals but is not an index or pagination system. Very large vaults may have slow startup and search. A future index must remain disposable and rebuildable from Markdown.

The current combined Markdown export is not a full backup archive. Until archive export and in-app restore are implemented, copy the entire vault folder to another location for a full backup. Do not replace an existing vault with an imported copy without preserving both.

## Android build and size

The Expo config plugin in `plugins/withReleaseSize.js` enables R8 minification and resource shrinking for release builds and disables unused GIF/WebP native support. `app.json` removes broad storage permissions from the merged manifest and disables Android cloud backup of device-local app data. Hermes remains enabled.

The older debug APK is 53.8 MB; its compressed native libraries total about 28.0 MB for arm64 and 17.2 MB for armeabi-v7a. Release size has not been measured in this checkout because Windows CMake exceeds its object-path limit under this long repository path. For an arm64-only test APK, use `cd android` and `gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a` on a build host where the native path limit is not reached. A Play Store AAB should be preferred for distribution so devices receive only their required ABI. Never distribute the default debug-signed release as a production build.
