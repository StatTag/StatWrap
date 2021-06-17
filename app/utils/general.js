/* eslint-disable no-underscore-dangle */
const DefaultDisplayName = '(empty)';

export default class GeneralUtil {
  static formatDateTime(date) {
    if (!date || date === '') {
      return '';
    }

    let formattableDate = date;
    if (typeof date === 'string' || date instanceof String) {
      const parsedDate = Date.parse(date);
      if (Number.isNaN(parsedDate)) {
        return date;
      }
      formattableDate = new Date(parsedDate);
    }
    const [day, time] = formattableDate.toISOString().split('T');
    const formatted = `${day} ${time.split('.')[0]}`;
    return formatted;
  }

  /**
   * Internal function to handle common code used to append a name part to
   * an overal displaly string for names.
   * @param {string} displayName The currently formatted display name string
   * @param {string} namePart The name part to append
   * @returns String containing namePart and a trailing space appended to displayName
   * if namePart exists.  Otherwise it returns displayName.
   */
  static _appendNamePart(displayName, namePart) {
    const trimmedNamePart = namePart ? namePart.trim() : '';
    if (trimmedNamePart !== '') {
      return displayName.concat(`${trimmedNamePart} `);
    }
    return displayName;
  }

  /**
   * Given a name object, format the name for disply depending on which components
   * are available
   * @param {object} name Structure containing the components of the name
   */
  static formatName(name) {
    if (!name) {
      return DefaultDisplayName;
    }

    // We are going to trim the parts of the name that we're given when doing the
    // formatting.  This means that '  ' would come back as ''.
    let displayName = '';
    displayName = GeneralUtil._appendNamePart(displayName, name.prefix);
    displayName = GeneralUtil._appendNamePart(displayName, name.first);
    displayName = GeneralUtil._appendNamePart(displayName, name.middle);
    displayName = GeneralUtil._appendNamePart(displayName, name.last);
    displayName = GeneralUtil._appendNamePart(displayName, name.suffix);

    displayName = displayName.trim();
    // If after everything we have a blank string, we will assume no real data was
    // provided and that we should use our default display name instead
    if (displayName === '') {
      return DefaultDisplayName;
    }
    return displayName;
  }
}
