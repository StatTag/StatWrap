// eslint-disable-next-line import/no-cycle
import AssetUtil from '../../../utils/asset';

const fs = require('fs');
const path = require('path');
const url = require('url');

// All lookups should be lowercase - we will do lowercase conversion before comparison.
const URL_PROTOCOL_LIST = ['http:', 'https:'];

/**
 * This is not intended for direct use - this should be inherited by more specific
 * classes dedicated to each programming language/code type
 */
export default class BaseCodeHandler {
  constructor(handlerId, fileExtensionList) {
    this.handlerId = handlerId;
    this.fileExtensionList = fileExtensionList;
  }

  /**
   * Determine if a file represented by a URI is one that we want to typically include.
   * @param {string} uri - A string containing the URI of the asset we want to consider for inclusion
   */
  includeFile(uri) {
    if (!uri || uri === undefined) {
      return false;
    }

    let fileName = null;
    // Detect if URL or path-based URI.  For now we only consider HTTP(S) as valid
    // URL protocols.
    const urlPath = url.parse(uri);
    if (urlPath && urlPath.protocol && URL_PROTOCOL_LIST.includes(urlPath.protocol.toLowerCase())) {
      fileName = urlPath.pathname;
    } else {
      fileName = path.basename(uri.trim());
    }

    if (fileName === '') {
      return false;
    }

    const fileNameParts = fileName.split('.');
    if (!fileNameParts || fileNameParts.length < 2 || fileNameParts[0].trim() === '') {
      return false;
    }
    const extension = fileNameParts.pop();
    return this.fileExtensionList.includes(extension.toLowerCase());
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

    // Only handle files, but need to include directories for recursive processing
    if (asset.type !== 'file' && asset.type !== 'directory') {
      return asset;
    }

    const metadata = { id: this.id() };
    // If this is a directory, we are going to traverse and get details
    // about the contained files and sub-folders
    if (asset.type === 'directory' && asset.children) {
      const self = this;
      // eslint-disable-next-line no-return-assign
      asset.children.forEach((child, index) => (asset.children[index] = self.scan(child)));
    } else {
      if (!this.includeFile(asset.uri)) {
        return asset;
      }

      // If we already have scanned this file, we won't do it again.
      const existingMetadata = AssetUtil.getHandlerMetadata(this.handlerId, asset.metadata);
      if (existingMetadata) {
        return asset;
      }

      try {
        const contents = fs.readFileSync(asset.uri, 'utf8');
        metadata.libraries = this.getLibraries(contents);
      } catch {
        metadata.error = 'Unable to read code file';
        asset.metadata.push(metadata);
        return asset;
      }

      asset.metadata.push(metadata);
    }

    return asset;
  }
}
