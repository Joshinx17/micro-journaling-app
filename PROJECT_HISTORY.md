# MindLog project history and change record

This document records the project direction, implemented capabilities, reliability work, and remaining limitations. It is intended to be read with [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [JOURNAL_FORMAT.md](JOURNAL_FORMAT.md), and [RELIABILITY.md](RELIABILITY.md).

## 1. Product foundation

MindLog began as an offline-first Android micro-journal with a familiar timeline experience. The product goal was to let a person write short thoughts without an account, backend, advertising, analytics, tracking, social feed, or engagement system.

The core ownership decision was to keep Markdown files in a folder selected by the user. The app treats those files as the canonical journal data, so the journal remains readable outside MindLog and is not trapped in an app database.

The initial implementation was built with Expo and React Native. It included a journal screen, onboarding, profile-style header, composer, timeline, search screen, settings screen, theme selection, profile photo selection, editing, deleting, Markdown export, and Android Storage Access Framework folder access.

## 2. Journal storage and format

The vault layout was established as:

```text
Vault/
  Journal/YYYY/MM/DD.md
  Attachments/
  Backups/YYYY/MM/DD/
  mindlog.json
```

Daily Markdown files contain front matter plus entry blocks with stable IDs, creation timestamps, optional edit timestamps, named timezones, and explicit entry delimiters. Entry text escapes HTML comment openers so normal Markdown and comment-like text do not collide with the journal markers.

The format parser was designed to reject duplicate IDs, invalid timestamps, missing entry markers, and ambiguous replacements instead of silently changing or dropping an entry. Legacy timezone metadata is retained when an older entry does not have its own timezone. CRLF headers and invalid edit timestamps are covered by tests.

The app keeps device-specific values outside the vault: the selected SAF URI, theme, profile photo URI, and composer draft are stored in AsyncStorage. This keeps the vault portable, but those values are not reproduced by a vault copy.

## 3. File safety and editing behavior

Creation creates the daily directory tree only when needed. Editing and deletion require the existing daily file and compare its content version with the loaded entry. If another application changed the file, MindLog refuses the mutation and asks the user to reload.

Before a mutation, the current daily file is copied into `Backups/YYYY/MM/DD/`. The backup is read back for verification. The canonical file is then written and read back again. The five newest pre-write revisions for a day are retained.

The implementation acknowledges the Android SAF limitation that document providers do not guarantee an atomic replacement. A verified prior revision protects the previous state, but a crash can still damage the canonical file. This is why the later recovery work preserves damaged bytes and restores only verified revisions.

## 4. UI and usability improvements

The app gained system, light, and dark themes, responsive colors, onboarding copy, a timeline composer, draft recovery, profile-photo selection, a Markdown export action, and navigation between journal, search, and settings.

The visible entry actions were improved so edit and delete are both available without relying only on long press. Buttons and inputs gained clearer accessibility labels and roles; navigation reports its selected tab; actions are disabled while a save or recovery operation is active.

The privacy wording was tightened. The app now explains that Markdown files are not encrypted and can be read by anyone who can access the selected folder. The profile header describes the journal as a Markdown journal rather than claiming a stronger privacy guarantee.

Folder switching now warns that the old folder is not moved or merged. Invalid saved settings are rejected and the user is asked to choose a folder again.

## 5. Reliability changes in the current update

### Serialized operations

All in-app journal mutations and snapshot operations share a small promise queue. Rapid creates, edits, deletes, recovery actions, and snapshots therefore cannot overlap inside the app and overwrite one another through stale reads.

The queue does not lock an external editor. The existing version check still protects against external changes observed before the write, but Android SAF cannot close the final external race around a non-atomic overwrite.

### Draft protection

The composer records the exact text submitted for a save. If a late native input event arrives while saving, the app does not clear newer text accidentally. Draft writes remain serialized, foreground/background transitions flush the latest text, and a failure to read device draft storage prevents the app from replacing a possible draft with an empty value.

Draft persistence remains asynchronous with a short debounce. A process killed before the pending write completes can still lose the latest keystrokes; the app therefore continues to encourage saving an important thought as an entry.

### Corrupted-day isolation

The journal loader now returns healthy entries plus a list of daily files that could not be read or parsed. A single damaged file no longer hides every healthy day. Writes to a damaged day are refused, and a normal complete export refuses to produce an incomplete result.

### Daily recovery

Settings exposes daily revision recovery. The user can inspect readable revisions and their thought counts, confirm a whole-day restore, and preserve the current damaged file under `Recovery/` before the verified revision is written. Invalid revisions are never offered for restoration.

### Verified vault snapshots

Settings can copy the complete selected vault into a newly created destination folder. The copy includes Markdown files, attachments, backups, recovery files, metadata, and other vault files. Files are copied and read back one at a time. A source re-scan detects changes during the copy. A manifest containing paths and non-cryptographic content versions is written last, so an interrupted copy is never treated as complete.

Snapshot restore verifies the manifest and every file before creating a new restored folder. Existing folders are never replaced. The user then selects the restored folder as the active journal. ZIP archives, cloud-provider document IDs, and streaming large-file copies are intentionally not included in this lightweight implementation.

### Release signing safety

Release signing was changed so a release build cannot silently use the public debug key. The generated Android project and the Expo config plugin require explicit keystore environment variables for release tasks. Debug builds continue to use the debug key. No production keystore or credentials were generated or committed.

## 6. Testing added

The original parser tests were expanded to cover CRLF headers and invalid edit timestamps. An in-memory filesystem now tests:

- concurrent creates and operation-queue behavior;
- stale edit detection;
- interrupted canonical writes;
- failed backups and externally changed files;
- damaged-day isolation;
- revision recovery and preservation of damaged bytes;
- missing vault structures and unsupported metadata;
- complete snapshot copies and restores;
- binary and extra vault files;
- snapshot tampering, path traversal, duplicate paths, and missing metadata;
- interrupted snapshots without a completion manifest;
- release-signing configuration transformation.

The project currently has 20 passing tests. `npm run typecheck` also passes.

## 7. Known limits and next work

The app still reads the complete journal at startup/foreground and searches the loaded entries in memory. There is no pagination or disposable search index yet. This should be measured on an actual multi-year journal before adding more machinery.

The app does not encrypt journal files, provide an app lock, synchronize to cloud services, migrate arbitrary future format versions, or include device drafts/preferences/profile photos in vault snapshots. SAF writes remain vulnerable to provider-specific interruption. Missing entire daily files cannot be reconstructed from remaining files without an independent snapshot.

Android device testing, permission-revocation testing, low-storage testing, fresh-install snapshot restoration, accessibility testing, signed release generation, and release-size measurement remain required before production distribution.
