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
  scan(originalAsset) {
    const asset = { ...originalAsset };
    // If we have an invalid asset, just move along.
    if (!asset || asset === undefined || !asset.type) {
      return asset;
    }

    // Only handle files and directories
    if (asset.type !== 'file' && asset.type !== 'directory') {
      return asset;
    }

    const metadata = { id: this.id() };
    if (!fs.accessSync(asset)) {
      metadata.error = 'Unable to access asset';
      asset.metadata.push(metadata);
      return asset;
    }

    const details = fs.statSync(asset);
    if (!details) {
      metadata.error = 'No information could be found for this asset';
      asset.metadata.push(metadata);
      return asset;
    }

    metadata.size = details.size;
    metadata.lastAccessed = details.atime;
    metadata.lastModified = details.mtime;
    metadata.lastStatusChange = details.ctime;
    metadata.created = details.birthtime;

    // If this is a directory, we are going to traverse and get details
    // about the contained files and sub-folders
    if (asset.type === 'directory' && asset.children) {
      const self = this;
      // eslint-disable-next-line no-return-assign
      asset.children.forEach((child, index) => (asset.children[index] = self.scan(child)));
    }
    asset.metadata.push(metadata);
    return asset;
  }
}
