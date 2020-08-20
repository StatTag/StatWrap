const fs = require('fs');
/**
 * Results:
 * {
 *   id: 'DefaultHandler',
 *   uri: 'the provided uri to scan',
 *   assetType: 'file | directory | socket | symlink | other | unknown',
 *   size: 123456 (in bytes),
 *   lastAccessed: Date,
 *   lastModified: Date,
 *   lastStatusChange: Date,
 *   created: Date,
 *   children: Array (optional) - only if assetType is 'directory'
 * }
 */
export default class DefaultHandler {
  static id = 'DefaultHandler';

  id() {
    return DefaultHandler.id;
  }

  // Return the type of asset that is represented.  This is a general
  // classification scheme as defined by StatWrap.
  assetType(details) {
    if (!details) {
      return 'unknown';
    }

    if (details.isDirectory()) {
      return 'directory';
    }
    if (details.isFile()) {
      return 'file';
    }
    if (details.isSocket()) {
      return 'socket';
    }
    if (details.isSymbolicLink()) {
      return 'symlink';
    }

    return 'other';
  }

  /**
   * Performs the main scanning and discovery of the asset at the specified URI
   * @param {string} uri - A string containing the URI that the asset can be found at
   * @return {object} A JS object containing the details about the specified asset
   */
  scan(uri) {
    const result = { id: this.id(), uri };
    if (!fs.accessSync(uri)) {
      result.error = 'Unable to access asset';
      return result;
    }

    const details = fs.statSync(uri);
    if (!details) {
      result.error = 'No information could be found for this asset';
      return result;
    }

    result.assetType = this.assetType(details);
    result.size = details.size;
    result.lastAccessed = details.atime;
    result.lastModified = details.mtime;
    result.lastStatusChange = details.ctime;
    result.created = details.birthtime;

    return result;
  }
}
