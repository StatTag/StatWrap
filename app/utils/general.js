/* eslint-disable no-underscore-dangle */
const DefaultDisplayName = '(empty)';
const path = require('path');
const fs = require('fs');

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

  /**
   * Code from: https://itnext.io/building-an-in-memory-index-with-javascript-7f712ff525d8
   * Given an array of objects, create an indexed collection that allows fast access of the
   * indexed field.  For example
   *
   * const contentTypeIndex = indexByField(contentTypes, "type");
   * contentTypeIndex["code"];
   *
   * @param {array} array The array to index
   * @param {string} field The field name to index by
   * @returns An object that allows quick indexing by the field.
   */
  static indexByField(array, field) {
    if (array === null || array === undefined) {
      return null;
    }
    if (field === null || field === undefined) {
      return array;
    }

    return array.reduce((acc, it) => {
      const key = it[field];
      if (Array.isArray(key)) {
        const result = { ...acc };
        // eslint-disable-next-line no-restricted-syntax
        for (const k of key) {
          const value = acc[k] ? [...acc[k], it] : [it];
          result[k] = value;
        }
        return result;
      }

      const value = acc[key] ? [...acc[key], it] : [it];
      return {
        ...acc,
        [key]: value,
      };
    }, []);
  }

  static convertImageToBase64(filePath) {
    try {
      const file = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      let mimeType;
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.svg':
          mimeType = 'image/svg+xml';
          break;
        default:
          mimeType = 'application/octet-stream';
      }
      return `data:${mimeType};base64,${file.toString('base64')}`;
    } catch (error) {
      console.error('Error converting image to Base64:', error);
      return null;
    }
  };
}
