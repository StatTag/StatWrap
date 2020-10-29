// The cycle established is just to make accessible constant values, so we are not concerned with it
// in this case.
// eslint-disable-next-line import/no-cycle
import AssetUtil from '../../../utils/asset';

const fs = require('fs');
const path = require('path');

// All file and folder names (exact match - currently not supporting regex patterns)
// that we want to hide from view.
const FILE_IGNORE_LIST = ['.DS_Store', 'Thumbs.db', '.statwrap-project.json'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.FileHandler',
 *   size: 123456 (in bytes),
 *   lastAccessed: Date,
 *   lastModified: Date,
 *   lastStatusChange: Date,
 *   created: Date,
 *   include: Boolean
 * }
 */
export default class FileHandler {
  static id = 'StatWrap.FileHandler';

  id() {
    return FileHandler.id;
  }

  /**
   * Determine if a file represented by a URI is one that we want to typically include.
   * @param {string} uri - A string containing the URI of the asset we want to consider for inclusion
   */
  includeFile(uri) {
    if (!uri || uri === undefined) {
      return false;
    }

    const fileName = path.basename(uri.trim());
    if (fileName === '') {
      return false;
    }
    return !FILE_IGNORE_LIST.includes(fileName);
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

    // If we already have scanned this asset, we won't do it again.
    const existingMetadata = AssetUtil.getHandlerMetadata(FileHandler.id, asset.metadata);
    if (existingMetadata) {
      return asset;
    }

    const metadata = { id: this.id() };
    try {
      fs.accessSync(asset.uri);
    } catch {
      metadata.error = 'Unable to access asset';
      asset.metadata.push(metadata);
      return asset;
    }

    const details = fs.statSync(asset.uri);
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

    // We will collect metadata for files that we would otherwise not show.
    // We will set an additional attribute to indicate if this should or
    // should not be included, and downstream users can determine what to
    // do about it (e.g., hide the file from asset view).
    metadata.include = this.includeFile(asset.uri);

    asset.metadata.push(metadata);
    return asset;
  }
}
