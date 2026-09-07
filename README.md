# MindLog

MindLog is a private, offline-first micro journal for Android. There is no MindLog backend, account, tracking, analytics, or advertising. Journal content is stored as human-readable Markdown files in a folder selected by you; those files, not an app database, are the source of truth.

## Features

- Fast capture, newest-first timeline, long-press edit/delete, and offline search
- One Markdown file per day, with durable entry IDs and created/updated timestamps
- Android Storage Access Framework: permissions apply only to the journal folder selected by the user
- Light, dark, and system themes
- Basic Markdown export through Android's native share sheet

## Folder format

```
MindLog/
  Journal/YYYY/MM/DD.md
  Attachments/
  mindlog-settings.json
```

Each entry is delimited by readable MindLog comments, so Markdown remains usable in any text editor.

## Develop and install

Prerequisites: Node 20+, Android Studio/SDK, and a connected Android device or emulator.

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

For development after the first native build, run `npm start` and open the installed development build. Expo Go is not supported because persistent Android folder access requires a development build.

## APK

For a local release APK, after `npx expo prebuild --platform android`:

```bash
cd android
gradlew.bat assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/`. Configure a signing key in Gradle before distributing a release build.

## Scope and privacy

Cloud sync is deliberately not enabled in 1.0: adding Drive or OneDrive requires user-owned OAuth client configuration and a conflict-resolution UI. The local journal is fully useful without them. Future sync must operate directly against a visible user folder and preserve both conflict versions rather than silently losing data.
