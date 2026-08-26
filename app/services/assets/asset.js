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
  /**
   * Internal recursive function to build the asset tree without applying handlers.
   * This operates extremely quickly (tree-only scan).
   * @param {string} uri The current URI
   * @param {object} stats Object to keep track of total files and directories
   * @returns An asset object
   */
  _buildTree(uri, stats) {
    // This will throw an error if it can't access the uri
    fs.accessSync(uri);

    const details = fs.statSync(uri);
    let result = {};

    if (!details) {
      result.error = 'No information could be found for this asset';
      return result;
    }

    const type = this.assetType(details);
    if (type === 'file') stats.totalFiles++;
    else if (type === 'directory') stats.totalDirectories++;

    result = {
      uri,
      type,
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
        // Skip common large dependency/hidden directories to save massive memory and time
        if (['node_modules', '.git', '.venv', 'venv', '__pycache__', '.pytest_cache', '.idea'].includes(file)) {
          return; // continue in forEach
        }
        
        const filePath = path.join(uri, file);
        children.push(self._buildTree(filePath, stats));
      });

      result.children = children;
    }
    
    return result;
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
    const startTime = Date.now();
    console.log(`[AssetService] Starting scan for ${uri}`);
    
    const stats = { totalFiles: 0, totalDirectories: 0 };
    const result = this._buildTree(uri, stats);
    
    const treeBuildTime = Date.now();
    console.log(`[AssetService] Built tree in ${treeBuildTime - startTime}ms. Found ${stats.totalFiles} files and ${stats.totalDirectories} directories.`);

    if (!this.handlers) {
      return result;
    }

    if (this.handlers.length === 0) {
      console.warn('There are no handlers registered');
    }

    let assetEntry = result;
    
    // Performance threshold check: if files exceed 10000, skip deep code handler scan
    // We only apply FileHandler which is fast because it uses already existing fs.stat.
    // The rest of the handlers are skipped to prevent UI lockup and memory exhaustion.
    const MAX_DEEP_SCAN_FILES = 10000;
    if (stats.totalFiles > MAX_DEEP_SCAN_FILES) {
      console.warn(`[AssetService] Project has ${stats.totalFiles} files, exceeding limit of ${MAX_DEEP_SCAN_FILES}. Skipping deep code handlers.`);
      for (let index = 0; index < this.handlers.length; index++) {
        if (this.handlers[index].id && this.handlers[index].id() === 'StatWrap.FileHandler') {
          assetEntry = this.handlers[index].scan(assetEntry);
        }
      }
    } else {
      for (let index = 0; index < this.handlers.length; index++) {
        const handlerStartTime = Date.now();
        assetEntry = this.handlers[index].scan(assetEntry);
        const handlerId = this.handlers[index].id ? this.handlers[index].id() : index;
        console.log(`[AssetService] Handler ${handlerId} took ${Date.now() - handlerStartTime}ms`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[AssetService] Total scan completed in ${totalTime}ms`);
    return assetEntry;
  }
}
