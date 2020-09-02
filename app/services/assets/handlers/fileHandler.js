const fs = require('fs');

/**
 * Metadata:
 * {
 *   id: 'StatWrap.FileHandler',
 *   size: 123456 (in bytes),
 *   lastAccessed: Date,
 *   lastModified: Date,
 *   lastStatusChange: Date,
 *   created: Date,
 * }
 */
export default class FileHandler {
  static id = 'StatWrap.FileHandler';

  id() {
    return FileHandler.id;
  }

  /**
   * Performs the main scanning and discovery of the asset at the specified URI
   * @param {string} uri - A string containing the URI that the asset can be found at
   * @return {object} A JS object containing the details about the specified asset
   */
  scan(uri) {
    const result = { id: this.id() };
    if (!fs.accessSync(uri)) {
      result.error = 'Unable to access asset';
      return result;
    }

    const details = fs.statSync(uri);
    if (!details) {
      result.error = 'No information could be found for this asset';
      return result;
    }

    result.size = details.size;
    result.lastAccessed = details.atime;
    result.lastModified = details.mtime;
    result.lastStatusChange = details.ctime;
    result.created = details.birthtime;

    // // If this is a directory, we are going to traverse and get details
    // // about the contained files and sub-folders
    // if (result.assetType === 'directory') {
    //   const self = this;
    //   const files = fs.readdirSync(uri);
    //   const children = [];
    //   files.forEach(function eachFile(file) {
    //     const filePath = path.join(uri, file);
    //     children.push(self.scan(filePath));
    //   });

    //   result.children = children;
    // }

    return result;
  }
}
