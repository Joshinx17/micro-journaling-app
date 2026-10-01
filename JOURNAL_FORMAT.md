# Journal format

The vault root contains `mindlog.json` with `format: "mindlog-v1"`, a version, and creation time. Existing `mindlog-settings.json` files are left untouched for compatibility. Device folder URIs, theme, profile photo, and composer draft stay in AsyncStorage.

Daily entries are stored in `Journal/YYYY/MM/DD.md`. A daily header contains date, timezone, and format metadata. Each entry has a stable ID and timestamps with UTC offsets:

```markdown
<!-- mindlog-entry-id: example-id -->
<!-- created: 2026-10-01T15:42:31+05:30 -->
<!-- timezone: Asia/Kolkata -->
Thought text, including **Markdown**.
<!-- /mindlog-entry -->
```

An edited entry also has `<!-- updated: ... -->`. MindLog escapes `<!--` in entry content as `<!\-\-` to avoid delimiter collisions, then reverses that escape when reading. Older entries without a per-entry timezone use the daily header timezone. If neither exists, the timestamp offset is used; the original named timezone cannot be recovered from such entries.

The parser rejects duplicate IDs and malformed entry markers rather than silently dropping thoughts. Files remain editable in any text editor. If an external edit changes a loaded daily file, MindLog asks for a reload before editing or deleting an entry. The five most recent pre-write revisions of each day are stored under `Backups/YYYY/MM/DD/`.
