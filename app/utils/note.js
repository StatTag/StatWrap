import { v4 as uuid } from 'uuid';
import GeneralUtil from './general';

export default class NoteUtil {
  /**
   * Return the current date and time formatted for display for asset notes
   */
  static getNoteDate() {
    const date = new Date(Date.now());
    return GeneralUtil.formatDateTime(date);
  }

  /**
   * Create a new note object.  This will assign a new UUID and the updated timestamp as the current time
   * @param {string} author The name of the note author
   * @param {string} content The content of the note
   */
  static createNote(author, content) {
    const note = { id: uuid(), author, updated: NoteUtil.getNoteDate(), content };
    return note;
  }
}
