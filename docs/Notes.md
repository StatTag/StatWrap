# Notes

Notes are designed to be associated with any object in StatWrap, although additional coding is needed to do the association in the user interface, and to manage persistance. Initially, notes were added for assets, then extended for projects.

Any entity that has notes associated with it must allow for an `Array` of `Objects`. We recommend the convention of the array field that stores these to be `notes`, but recognize variation may be needed in the future.

Each note `Object` has the following structure:

| Item      | Type   | Description                                                                        |
| --------- | ------ | ---------------------------------------------------------------------------------- |
| `id`      | String | A UUID for the note.                                                               |
| `author`  | String | A display name taken from StatWrap to indicate who created the note.               |
| `updated` | String | A formatted day and time that the note was last updated.                           |
| `content` | String | The text of the note. At this time, we assume this is plaintext, and not Markdown. |

The [`NoteUtil`](../app/utils/note.js) utility class provides helper functions - specifically `createNote` - to generate use notes.
