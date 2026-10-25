# Reliability changes and validation

No runtime dependencies were added. Markdown remains canonical. There is no sync,
encryption layer, database, or automatic migration in this change.

## Backup and recovery

- Settings → Create verified snapshot copies the vault into a new destination
  folder. Choose local or removable storage outside the source vault. All files,
  attachments, revision backups, recovery copies and metadata are included.
- Each file is copied and read back, one file at a time. The source is checked
  again before writing `mindlog-snapshot.json` last. The manifest stores paths
  and non-cryptographic corruption checksums. It is not an authenticity signature.
- Restore selects a completed snapshot and creates a new folder. Checksums are
  checked before restoration and copied bytes are verified. Open the new folder
  with Choose journal folder. Existing vaults are never replaced by this flow.
- Interrupted copies remain as incomplete folders and are not automatically
  deleted. A missing/invalid completion manifest prevents snapshot restoration.
- Drafts, device preferences and the profile image are not part of a vault
  snapshot. Save drafts as entries before backing up. Copy snapshots off the phone
  separately for protection against losing the device.
- Damaged daily files are reported while healthy days remain available. Writes
  to detected damaged days are refused. Settings → Recovery offers parseable
  revisions with their thought counts. Recovery replaces the whole day after
  confirmation, preserving the damaged bytes under `Recovery/` first.
- The five latest pre-write revisions per day are still retained. Independent
  snapshots are never automatically pruned. Missing entire daily files cannot
  be detected from the remaining files alone; use an independent snapshot.

## Storage guarantees and limits

Journal operations and snapshots share an in-process queue. This prevents lost
updates between this app's operations. It cannot lock external editors. Version
checks catch observed changes, but SAF still has a race between the final check
and overwrite. Do not edit the vault externally during saves or snapshots.
Interrupted canonical writes can still require recovery. Damage that happens
to leave syntactically valid content cannot always be detected.

Snapshot copying currently supports Android's local/removable external-storage
provider. Other providers may use opaque document IDs; they are explicitly
rejected by the snapshot flow. A large attachment still requires memory for its
base64 contents; copies are per-file, not streamed. Cloud snapshots and ZIP
archives are not implemented.

The composer is disabled during actions and a late input event is checked before
clearing a submitted draft. Background draft writes report errors, and failure
to read a saved draft blocks new composer writes instead of overwriting it with
an empty value. Draft persistence remains asynchronous with a 450 ms debounce;
abrupt process termination before a write completes can lose the latest input.

## Checks

Run `npm run typecheck` and `npm test`. Tests use an in-memory filesystem to
exercise concurrent creates, failed backups, interrupted canonical writes,
external changes, corrupted-day isolation, recovery preservation, snapshot
verification/restore, hostile paths and release-signing transformation.
They do not substitute for Android storage-provider tests.

Before distributing, test on an Android device:

1. Create, edit and delete entries; recover a deleted entry through daily revisions.
2. Type, background, kill and reopen; confirm draft behavior and recovery messages.
3. Save while typing and tap actions rapidly; verify no newer text disappears.
4. Revoke folder permission and test low storage; confirm errors and retained data.
5. Damage one daily file; verify other days display and recovery preserves the original.
6. Snapshot a vault containing binary attachments, then restore from a fresh install
   into another folder and compare the files. Interrupt copying and reject the result.
7. Check small screens, keyboard-open editing, large fonts and TalkBack.
8. Measure a signed release APK/AAB and test a multi-year journal on-device.

## Release signing

The tracked Expo plugin and current generated Android project use an explicit
release signing configuration. Release tasks fail if any of these environment
variables are missing: `MINDLOG_KEYSTORE_PATH`, `MINDLOG_KEYSTORE_PASSWORD`,
`MINDLOG_KEY_ALIAS`, `MINDLOG_KEY_PASSWORD`. The keystore path is interpreted by
Gradle relative to android/app when not absolute. Store a real release keystore
under the ignored project `.signing/` directory; do not commit credentials.
No signing key was generated and no production release was built by this change.

## Deferred work

Full startup reads and in-memory search remain. Measure on-device before adding
a persistent index. Optional app lock/encrypted backups and user-controlled sync
remain separate product work. No claim of encryption or external-write atomicity
is made by the new recovery features.
