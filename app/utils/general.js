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
    displayName = GeneralUtil._appendNamePart(displayName, name.first);
    displayName = GeneralUtil._appendNamePart(displayName, name.last);

    displayName = displayName.trim();
    // If after everything we have a blank string, we will assume no real data was
    // provided and that we should use our default display name instead
    if (displayName === '') {
      return DefaultDisplayName;
    }
    return displayName;
  }

  /**
   * Given a user object, format the name for display depending on which components
   * are available
   * @param {object} user The user object we are formatting a display name for
   */
  static formatDisplayName(user) {
    if (!user || !user.id) {
      return DefaultDisplayName;
    }

    // If there is no name component, all we can try to use is the ID.
    if (!user.name) {
      return user.id;
    }

    let displayName = user.name.display ? user.name.display.trim() : '';
    if (displayName === '') {
      displayName = GeneralUtil._appendNamePart(displayName, user.name.first);
      displayName = GeneralUtil._appendNamePart(displayName, user.name.last);
      displayName = displayName.trim();
      if (displayName === '') {
        return user.id;
      }
      return displayName;
    }

    return user.name.display;
  }

  /**
   * Modify an array of strings to either add the string (if include is true), or ensure
   * it is removed if include is false.
   * @param {array} array Array of strings
   * @param {string} item String item to include or exclude
   * @param {bool} include Whether or not to include item in array
   * @returns The updated array
   */
  static toggleStringInArray(array, item, include) {
    // If the input array is null or undefined, we will not process it and just return
    if (array === null || array === undefined || item === null || item === undefined) {
      return array;
    }

    const index = array.indexOf(item);
    if (index === -1 && include) {
      array.push(item);
    } else if (index > -1 && !include) {
      array.splice(index, 1);
    }
    return array;
  }
}
