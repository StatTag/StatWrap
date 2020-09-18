/* eslint-disable no-plusplus */
const fs = require('fs');
const path = require('path');
// const DefaultHandler = require('./handlers/defaultHandler');

export default class AssetService {
  // The list of handlers that are used for each asset.
  handlers = null;

  constructor(handlers) {
    if (handlers) {
      this.handlers = [...handlers];
    } else {
      this.handlers = [];
    }
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

  scan(uri) {
    // This will throw an error if it can't access the uri
    fs.accessSync(uri);

    // TODO: When we move past file/folder assets, this will need to account for
    // other types of assets that aren't reachable via the file system.
    const details = fs.statSync(uri);
    if (!details) {
      result.error = 'No information could be found for this asset';
      return result;
    }

    const result = { uri, type: this.assetType(details), metadata: [] };

    // If this is a directory, we are going to traverse and get details
    // about the contained files and sub-folders
    if (result.type === 'directory') {
      const self = this;
      const files = fs.readdirSync(uri);
      const children = [];
      files.forEach(function eachFile(file) {
        const filePath = path.join(uri, file);
        children.push(self.scan(filePath));
      });

      result.children = children;
    }

    if (!this.handlers) {
      return result;
    }

    let assetEntry = result;
    for (let index = 0; index < this.handlers.length; index++) {
      assetEntry = this.handlers[index].scan(assetEntry);
    }
    return assetEntry;
  }
}
