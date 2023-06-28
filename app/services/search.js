/* eslint-disable no-underscore-dangle */
import FlexSearch from 'flexsearch';
import fs from 'fs';
import path from 'path';
import Constants from '../constants/constants';
import AssetUtil from '../utils/asset';
import FilterConfig from '../constants/filter-config';

export default class SearchService {
  constructor(config) {
    // Our indexers are per project
    // key = project id (any type allowed, but should be string UUID)
    // value = { config: object, indexer: FlexSearch.Index }
    this.indexers = new Map();

    // Configuration drives what we allow to be indexed.  It is an object with
    // the following structure:
    // {
    //   // The file extensions to exclude
    //   excludeExtensions: [ <string> ]
    // }
    this.config = config;
  }

  /**
   *
   * @param {any} id The unique ID associated with the indexer.
   * @param {object} config An object that defines the type of content/assets to be indexed
   *  {
   *    rootPath,  -- A URI containing the root path to index.  If this is set, we will process recursively **all** files and folders
   *    assets     -- An object represented scanned StatWrap Asset objects.  If provided, we will do StatWrap-specific indexing including metadata.
   *  }
   * @returns The newly created indexer, or an existing indexer with the provided ID.  If it is unable to create the indexer, it will return null.
   */
  addIndexer(id, config) {
    if (id === null || id === undefined || config === null || config === undefined) {
      throw new Error('The ID and config must both be provided');
    }

    // rootPath and assets are mutually exclusive in the config.  Make sure that assumption
    // is never violated.
    if (config.rootPath && config.assets) {
      throw new Error('The config cannot have both the rootPath and assets specified');
    }
    // If the user config defines a rootPath to use for indexing, we will operate entirely as a directory/file indexer
    // without any other restrictions on the content to index.
    else if (config.rootPath) {
      // If the root path is not an absolute path, this is a problem and we need to throw an error.
      // After this point we will assume all of our asset paths (for files and directories) are absolute.
      if (!path.isAbsolute(config.rootPath)) {
        throw new Error(
          'Only absolute paths can be indexed.  Please provide an absolute path for the root directory.'
        );
      }
    } else if (config.assets === null || config.assets === undefined) {
      throw new Error('The config must have defined either the rootPath or the assets to index');
    }

    // If the key already exists, don't add it again and return the existing object.
    if (this.indexers.has(id)) {
      return this.indexers.get(id).indexer;
    }

    this.indexers.set(id, { config, indexer: new FlexSearch.Index() });
    return this.indexers.get(id).indexer;
  }

  /**
   * Helper function to retrieve a text string that can be added to an indexer.
   *
   * @param {URI} uri The asset URI to get indexable content for
   * @returns A string containing the content that should be indexed
   */
  _getIndexableContent(uri) {
    // This is a basic implementation to start.  We will expand it in the future to process
    // more complex files, such as Word documents.
    const contents = fs.readFileSync(uri, 'utf8');
    return contents;
  }

  /**
   * Helper function to properly add all indexable objects to the specified index.  This includes
   * recursively traversing directories for files.
   *
   * @param {FlexSearch.Index} indexer FlexSearch indexer that we are working with.  Assumed to be properly initialized.
   * @param {uri} uri The URI (fully qualified) of the asset that we are going to attempt to add to our index.
   */
  _indexFile(indexer, uri) {
    try {
      const details = fs.statSync(uri);
      if (details === undefined || details === null) {
        return;
      }

      if (details.isDirectory()) {
        const self = this;
        const files = fs.readdirSync(uri);
        files.forEach(function eachFile(file) {
          const filePath = path.join(uri, file);
          self._indexFile(indexer, filePath);
        });
      } else {
        indexer.add(uri, this._getIndexableContent(uri));
      }
    } catch (e) {
      // If there is an error, eat it.  We don't want to stop the overall indexing process
      // because of a single file failure. Right now, we're going to say that it's not
      // feasible to track/report back unindexed files, further justifying eating the error.
    }
  }

  _indexAsset(indexer, asset) {
    try {
      // We are only able to index files for now.
      if (asset.type === Constants.AssetType.FILE) {
        indexer.add(asset.uri, this._getIndexableContent(asset.uri));
      } else if (asset.type === Constants.AssetType.DIRECTORY) {
        if (asset.children) {
          asset.children.forEach(c => this._indexAsset(indexer, c));
        }
      }
    } catch (e) {
      // If there is an error, eat it.  We don't want to stop the overall indexing process
      // because of a single asset failure. Right now, we're going to say that it's not
      // feasible to track/report back unindexed assets, further justifying eating the error.
    }
  }

  /**
   * Helper filter function to be used with a call to AssetUtil.filterIncludedFileAssets
   * This allows us to apply index/search-specific filter logic when deciding which assets
   * to index or not.
   * @param {object} asset The asset to apply our filter to
   * @returns true if the asset should be included, false otherwise
   */
  _filterAssets(asset) {
    return !FilterConfig.searchExclude.contentTypes.some(x => asset.contentTypes.includes(x));
  }

  /**
   * Start an index that has been added via `addIndexer`.
   *
   * @param {string} id The ID of the indexer to start.  For StatWrap we will use the project ID as the
   * ID for each indexer.
   * @returns The FlexSearch.Index that is being used, or null if one cannot be created.
   */
  startIndexer(id) {
    if (id === null || id === undefined || !this.indexers.has(id)) {
      return null;
    }

    const indexer = this.indexers.get(id);
    if (indexer.config === null || indexer.config === undefined) {
      return null;
    }

    // If the root path is not set or cannot be found, and the assets are not set, we can't start the indexer.
    // Return null to signal an error and that we can't proceed.
    if (
      (indexer.config.rootPath === null || indexer.config.rootPath === undefined) &&
      (indexer.config.assets === null || indexer.config.assets === undefined)
    ) {
      return null;
    }

    if (indexer.config.rootPath) {
      // This will throw an error if the path cannot be accessed
      fs.accessSync(indexer.config.rootPath);
      this._indexFile(indexer.indexer, indexer.config.rootPath);
    } else if (indexer.config.assets) {
      const filteredAssets = AssetUtil.filterIncludedFileAssets(
        indexer.config.assets,
        this._filterAssets
      );
      this._indexAsset(indexer.indexer, filteredAssets);
    } else {
      throw new Error('Not implemented');
    }

    return indexer.indexer;
  }

  testSearch(id, searchText) {
    console.log('Searching: ', id, searchText);
    console.log(this.indexers.get(id).indexer.search(searchText));
  }
}
