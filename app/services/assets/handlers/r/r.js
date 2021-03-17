// eslint-disable-next-line import/no-cycle
import AssetUtil from '../../../../utils/asset';

const fs = require('fs');
const path = require('path');
const url = require('url');

// R file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['r', 'rmd'];
const URL_PROTOCOL_LIST = ['http:', 'https:'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.RHandler'
 * }
 */
export default class RHandler {
  static id = 'StatWrap.RHandler';

  id() {
    return RHandler.id;
  }

  getLibraryId(packageName) {
    return packageName || '(unknown)';
  }

  getLibraries(text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - library name
    const matches = [...text.matchAll(/^\s*(?:library|require)\s*\(\s*(\S+)\s*\)\s*$/gm)];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const packageName = match[1].replace(/['"]/gm, '');
      libraries.push({
        id: this.getLibraryId(packageName),
        package: packageName
      });
    }
    return libraries;
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
    return FILE_EXTENSION_LIST.includes(extension.toLowerCase());
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
      const existingMetadata = AssetUtil.getHandlerMetadata(RHandler.id, asset.metadata);
      if (existingMetadata) {
        return asset;
      }

      try {
        const contents = fs.readFileSync(asset.uri, 'utf8');
        metadata.libraries = this.getLibraries(contents);
      } catch {
        metadata.error = 'Unable to read R code file';
        asset.metadata.push(metadata);
        return asset;
      }

      asset.metadata.push(metadata);
    }

    return asset;
  }
}
