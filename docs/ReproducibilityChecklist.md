# Reproducibility Checklist File Format

## Project checklist

StatWrap stores the project checklist in `.statwrap/.statwrap-checklist.json`.
Format version 2 replaces the legacy item array with a versioned checklist:

```json
{
  "version": 2,
  "checklist": [
    {
      "id": "statwrap-checklist-dependency",
      "order": 1,
      "statement": "Software dependencies for the project are documented.",
      "description": "",
      "source": "default",
      "scanKey": "Dependency",
      "answer": false,
      "scanResult": {},
      "notes": [],
      "assets": [],
      "subChecklist": []
    }
  ]
}
```

`version` identifies the file format, not the application release. The
`checklist` property contains the item array. Configuration and definition exports
share the version defined by `Constants.CHECKLIST_VERSION`, currently 2, but have
different structures and purposes.

### Existing projects and migration

On read, a bare item array or a checklist without a file-level `version` is
treated as version 1. An explicit `{ "version": 1, "checklist": [...] }` is also
accepted. Conversion to version 2 is automatic and persisted before a successful
load is reported. The main process logs the source and destination versions.

Conversion:

- Recovers named built-in IDs and scan associations from recognized legacy
  metadata, not numeric positions or question text.
- Assigns UUIDs to numeric-ID-only custom/unrecognized items and preserves
  sanitized existing string IDs where applicable.
- Separates the legacy internal `name` into `scanKey`; preserves question text in
  `statement`. A missing custom statement can be recovered from its legacy name;
  a missing recognized built-in statement is restored from the built-in definition.
- Removes top-level `name` and `uid`. Unreleased UID values are not migration input.
- Preserves answers, descriptions, notes, attached assets, sub-checklists, scan
  results, and unrelated metadata. Nested asset names and note/sub-checklist IDs
  are not renamed or regenerated.
- Preserves legacy display ordering before replacing IDs, then assigns
  consecutive orders. Later items with duplicate orders move to the end.

For migration and current-format reads, the first occurrence of an ID keeps it;
later duplicates receive fresh UUIDs. Replacement generation is limited to five
attempts per duplicate. Items are not merged or dropped, and recognized scan
associations are preserved.

Malformed data, invalid versions, conflicting recognized metadata, or exhausted
ID-generation attempts produce errors. Resolve the reported invalid fields or
conflicts before retrying. Writes use a flushed temporary sibling and rename;
conversion/write failures leave the original checklist unchanged. A logging
failure after successful persistence is reported separately and does not undo
conversion. Back up project metadata before upgrading.

**This is a one-way breaking change. Do not edit converted projects using older
StatWrap versions.** No downgrade writer or older-application compatibility is
provided.

### Future versions

Newer positive safe-integer file versions, such as version 3, are accepted when
their known fields remain readable by this build. Their version numbers and
unknown file-level, item, and nested fields are preserved on project saves, not
downgraded. For example, a future item `weight` field is retained. This does not
guarantee compatibility with future changes to the types or meaning of known fields.

## Checklist item

### About

The **checklist item** contains question text, an answer, scan information, notes,
attached assets, and sub-checklist items. Identity, presentation order, and scan
association have separate responsibilities.

### Attributes

| Attribute      | Type                   | Description                                                                                                          |
| -------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`           | String                 | Stable, nonblank identity unique within this project checklist. Built-ins use named IDs; custom items use UUIDs.     |
| `order`        | Integer                | Positive display position, normalized to 1 through N after migration, add/delete/reorder, or duplicate-order repair. |
| `statement`    | String                 | The statement or question associated with the checklist item.                                                        |
| `description`  | String                 | Additional explanation of the question.                                                                              |
| `source`       | String                 | `default` for built-in items or `custom` for user-defined items.                                                     |
| `scanKey`      | String or null         | Recognized built-in scan association; null for custom/unrecognized items.                                            |
| `answer`       | Bool                   | Stores the user's response to the checklist item.                                                                    |
| `scanResult`   | Object                 | Automated scan results keyed by result category.                                                                     |
| `notes`        | Array ([]Note)         | An array containing user notes attached to the checklist item.                                                       |
| `assets`       | Array ([]Asset)        | An array containing a project asset attached to the checklist item.                                                  |
| `subChecklist` | Array ([]SubChecklist) | An array containing sub-checklist associated with the checklist item.                                                |

Editing questions, answers, notes, or assets and reordering items do not change
their IDs. Display numbers come from presentation order, never the ID. Built-in
IDs may appear in other projects; uniqueness here applies only to the current
project.

Top-level `name` and `uid` are not current item fields. `statement` is displayed
to users; `scanKey` identifies a built-in scan category independently of question
text. Custom questions do not gain scanning by resembling built-in category names.
Recognized categories without an implemented scan function remain valid.

## Checklist definition import/export

Definition exports share the configuration format version but are **not project
backups**. They contain reusable questions, not project answers or documentation:

```json
{
  "type": "statwrap-checklist",
  "version": 2,
  "exportedAt": "2026-10-09T00:00:00.000Z",
  "checklists": [
    {
      "id": "statwrap-checklist-dependency",
      "statement": "Software dependencies for the project are documented.",
      "description": "",
      "source": "default",
      "scanKey": "Dependency"
    }
  ]
}
```

Only `id`, `statement`, `description`, `source`, and validated `scanKey` are
exported/imported. Answers, notes, assets, local order, scan results, and unknown
project-specific fields are excluded. Definitions export in display order.

Import requires the current explicit export version (2). Older, missing, and
future export versions are rejected, unlike forward-compatible project-file
reads. Legacy `name`/`uid` are not interpreted; project-file migration does not
convert old definition exports.

Imported IDs are sanitized: non-string inputs generate UUIDs; strings are
trimmed, truncated to 50 characters, then trimmed again. Blank results are invalid.
Questions and descriptions are trimmed and limited to 250 and 1000 characters,
respectively. Duplicates are detected after sanitization by exact ID or
case-insensitive question text, against existing items and within the import.
Invalid/duplicate definitions are skipped and counted; an import with no valid
remaining items reports failure.

Canonical built-in IDs recover omitted scan keys. Conflicting/unknown scan keys
and custom scan associations are rejected. Repaired built-in UUIDs can retain a
recognized scan association. Imported items receive local order, false answers,
and empty notes/assets/sub-checklists; automated scans are then refreshed.

## Runtime behavior

[ChecklistService](../app/services/checklist.js) returns checklist arrays to callers
and stores them in the versioned project-file envelope. Legacy conversion is
persisted before a successful load is reported, and migration metadata is returned
for logging by the IPC handlers. Ordinary saves preserve a loaded file's version
and unknown envelope fields, and retain omitted item metadata by ID. Additions and
deletions remain effective. Repairs to duplicate IDs or orders are persisted;
unchanged current or newer files are not rewritten by reading them.

Writes use an exclusively created temporary sibling file, flush its contents, and
rename it into place. Failed writes leave the original intact and clean up only
temporary files created by that write. Load errors include the underlying error
message.

The checklist UI uses stable string IDs for keys, edits, deletion, reordering, and
undo. Custom questions receive UUIDs and a null scan key. Items display by `order`;
adding or deleting normalizes that order without changing surviving IDs. Edits
preserve scan associations and unknown item data. Scanning resolves built-in
associations from recognized IDs and scan keys, never question text or legacy
names, and returns updated items without mutating its input. It refreshes when the
project or checklist changes, including scanning newly imported items before
persistence. Checklist notes also target string IDs, while audit descriptions use
the question text.

Load or migration errors for the selected project are retained in checklist state
and shown instead of stale checklist content. Missing or empty checklists continue
through the versioned initialization and write path.

## PDF report

The PDF begins with a compact cover containing the StatWrap logo, project name,
export date, and checklist summary. The summary uses a purple-accented table with
alternating row shading and explicit **Yes**/**No** answers rather than checkbox
images. Sub-items are indented and lighter-weight. Answers remain understandable
in grayscale; **No** is neutral rather than styled as a failure.

Long questions wrap within the question column without shifting the answer
column. Long summaries continue onto additional pages with the table header
repeated and each row kept together. Checklist details begin on a new page after
the summary. Nonblank item descriptions appear immediately below their question
headings in smaller, regular-weight dark gray text, before sub-items and supporting
content. Descriptions are included whether or not notes are exported and are
omitted from the cover summary. Scan results, related assets, and optional notes
are unchanged.

## Sub-Checklist Object

### About

The **Sub-Checklist Object** represents a sub-item within a checklist item. It shares similar attributes with the Checklist Object, except for attachments, but is nested within the parent checklist item.

### Attributes

| Attribute   | Type   | Description                                                       |
| ----------- | ------ | ----------------------------------------------------------------- |
| `id`        | UUID   | A generated unique identifier for the sub-checklist item.         |
| `statement` | String | The statement or question associated with the sub-checklist item. |
| `answer`    | Bool   | Stores the user's response to the sub-checklist item.             |

## Note Object

### About

The **Note Object** stores user-added note associated with checklist items.
This follows the same structure as the existing [notes data type](https://github.com/StatTag/StatWrap/blob/master/docs/Notes.md)

### Attributes

| Attribute | Type   | Description                                                          |
| --------- | ------ | -------------------------------------------------------------------- |
| `id`      | UUID   | A generated unique identifier for the note.                          |
| `author`  | String | A display name taken from StatWrap to indicate who created the note. |
| `updated` | String | The timestamp indicating when the note was last updated.             |
| `content` | String | The text content of the note.                                        |

## Asset Object

### About

The **Asset Object** stores data of the asset attached to checklist items.

### Attributes

| Attribute         | Type   | Description                                                                                                                                                                           |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uri`             | String | The URI of the asset.                                                                                                                                                                 |
| `name`            | String | The title of the asset to display.                                                                                                                                                    |
| `isExternalAsset` | Bool   | Flag to indicate if this is an external asset (e.g., a URL)                                                                                                                           |
| `description`     | String | A brief description of the asset and why it's added to the checklist. Similar to a note, but is associated directly with the image so the explanation is in the context of the asset. |
