const DefaultDisplayName = '(empty)';
const path = require('path');
const fs = require('fs');
const AllowedUrlProtocols = ['http:', 'https:', 'ftp:', 'ssh:', 'file:', 'ws:', 'wss:', 'smb:', 's3:']

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
   * Parse an author string into a name object with first and last name
   * Handles formats like "John Doe", "Doe, John", "John", etc.
   * @param {string} authorString The author string to parse
   * @returns {object} Name object with first and last properties
   */
  static parseAuthorName(authorString) {
    if (!authorString || typeof authorString !== 'string') {
      return null;
    }

    const trimmed = authorString.trim();
    if (!trimmed) {
      return null;
    }

    // Check if format is "Last, First"
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim());
      return {
        first: parts[1] || '',
        last: parts[0] || '',
      };
    }

    // Otherwise assume "First Last" or just "Name"
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      // Single name - use as first name
      return {
        first: parts[0],
        last: '',
      };
    }

    // Multiple parts - first word is first name, rest is last name
    return {
      first: parts[0],
      last: parts.slice(1).join(' '),
    };
  }

  /**
   * Extract recommended people from project assets based on author metadata
   * @param {object} assets The root asset object to scan
   * @returns {Array} Array of person objects with name property
   */
  static getRecommendedPeopleFromAssets(assets) {
    const recommendations = [];
    const seenNames = new Set();

    const extractAuthorsFromAsset = (asset) => {
      if (!asset) {
        return;
      }

      // Check if this asset has R handler metadata with authors
      if (asset.metadata && Array.isArray(asset.metadata)) {
        const rMetadata = asset.metadata.find(m => m.id === 'StatWrap.RHandler');
        if (rMetadata && rMetadata.authors && Array.isArray(rMetadata.authors)) {
          rMetadata.authors.forEach(authorString => {
            const name = GeneralUtil.parseAuthorName(authorString);
            if (name) {
              const displayName = GeneralUtil.formatName(name);
              // Avoid duplicates
              if (!seenNames.has(displayName) && displayName !== DefaultDisplayName) {
                seenNames.add(displayName);
                recommendations.push({ name });
              }
            }
          });
        }
      }

      // Recursively process children
      if (asset.children && Array.isArray(asset.children)) {
        asset.children.forEach(child => extractAuthorsFromAsset(child));
      }
    };

    extractAuthorsFromAsset(assets);
    return recommendations;
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

  /**
   * Given a string, determine if it is a valid URL with a protocol of:
   * http, https, ftp, ssh, file, ws, wss, smb, s3
   * Protocol list we allow is curated from: https://www.iana.org/assignments/uri-schemes/uri-schemes.xhtml
   * Credit for code goes to Snyk! https://medium.com/@snyksec/secure-javascript-url-validation-a74ef7b19ca8
   * @param {*} url
   * @returns
   */
  static isValidResourceUrl(url) {
    if (url == null || url == undefined) {
      return false;
    }

    let givenURL;
    try {
        givenURL = new URL(url);
    } catch (error) {
      return false;
    }

    let lowerProtocol = givenURL.protocol.toLowerCase();
    return AllowedUrlProtocols.includes(lowerProtocol);
  }

  /**
   * This function converts an image file to it's Base64 string
   * @param {string} filePath The path to the image file
   * @returns {string} The Base64 string of the image
   */
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
