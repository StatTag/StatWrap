import GeneralUtil from '../../utils/general';
import AssetUtil from '../../utils/asset';

const fs = require('fs');
const path = require('path');
const Constants = require('../../constants/constants');
const AssetsConfig = require('../../constants/assets-config');

export default class AssetService {
  assetContentTypesByExtension = null;

  assetContentTypesByCategory = null;

  // The list of handlers that are used for each asset.
  handlers = null;

  constructor(handlers, contentTypes) {
    if (handlers) {
      this.handlers = [...handlers];
    } else {
      this.handlers = [];
    }

    this.assetContentTypesByExtension = GeneralUtil.indexByField(
      contentTypes || AssetsConfig.contentTypes,
      'extensions',
    );
    this.assetContentTypesByCategory = GeneralUtil.indexByField(
      contentTypes || AssetsConfig.contentTypes,
      'categories',
    );
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

  // Use a set of heuristics to guess the asset content type.  This will only be run
  // if the contentType isn't already explicitly set.
  assetContentTypes(uri, details) {
    if (!uri || !details || !details.isFile()) {
      return [Constants.AssetContentType.OTHER];
    }

    const extension = AssetUtil.getExtensionFromUri(uri).toLowerCase();
    const entry = this.assetContentTypesByExtension[extension];
    if (!entry || entry === undefined) {
      return [Constants.AssetContentType.OTHER];
    }

    return entry[0].categories;
    // for (let typeIndex = 0; typeIndex < AssetsConfig.contentTypes.length; typeIndex++) {
    //   const { patterns, type } = AssetsConfig.contentTypes[typeIndex];
    //   if (patterns && type && patterns.length > 0 && patterns.some(regex => regex.test(uri))) {
    //     return type;
    //   }
    // }
    //
    // return Constants.AssetContentType.OTHER;
  }

  /**
   * Scan a URI for all available assets.  This is done recursively for all available assets.
   *
   * This will return URIs as absolute paths (not relative).
   *
   * @param {string} uri The base URI to recursively scan
   * @returns An asset object which contains nested assets
   */
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

    const result = {
      uri,
      type: this.assetType(details),
      contentTypes: this.assetContentTypes(uri, details),
      metadata: [],
    };

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

    if (this.handlers.length === 0) {
      console.warn('There are no handlers registered');
    }

    let assetEntry = result;
    for (let index = 0; index < this.handlers.length; index++) {
      assetEntry = this.handlers[index].scan(assetEntry);
    }
    return assetEntry;
  }
}
