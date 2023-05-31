/* eslint-disable no-underscore-dangle */
import FlexSearch from 'flexsearch';
import fs from 'fs';
import path from 'path';

export default class SearchService {
  constructor() {
    // Our FlexSearch indexers
    // key = id (any type)
    // value = { rootPath: URI, indexer: FlexSearch.Index }
    this.indexers = new Map();
  }

  /**
   *
   * @param {any} id The unique ID associated with the indexer.
   * @param {uri} rootPath The root path where the indexer should process files from
   * @returns The newly created indexer, or an existing indexer with the provided ID.  If it is unable to create the indexer, it will return null.
   */
  addIndexer(id, rootPath) {
    if (id === null || id === undefined || rootPath === null || rootPath === undefined) {
      return null;
    }

    // If the root path is not an absolute path, this is a problem and we need to throw an error.
    // After this point we will assume all of our asset paths (for files and directories) are absolute.
    if (!path.isAbsolute(rootPath)) {
      throw new Error(
        'Only absolute paths can be indexed.  Please provide an absolute path for the root directory.'
      );
    }

    // If the key already exists, don't add it again and return the existing object.
    if (this.indexers.has(id)) {
      return this.indexers.get(id).indexer;
    }

    this.indexers.set(id, { rootPath, indexer: new FlexSearch.Index() });
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
   * recursively traversing directories for files, as well as adding all StatWrap associated content with an
   * indexable asset.
   *
   * @param {FlexSearch.Index} indexer FlexSearch indexer that we are working with.  Assumed to be properly initialized.
   * @param {uri} uri The URI (fully qualified) of the asset that we are going to attempt to add to our index.
   */
  _indexAssets(indexer, uri) {
    const details = fs.statSync(uri);
    if (details === undefined || details === null) {
      return;
    }

    if (details.isDirectory()) {
      const self = this;
      const files = fs.readdirSync(uri);
      files.forEach(function eachFile(file) {
        const filePath = path.join(uri, file);
        self._indexAssets(indexer, filePath);
      });
    } else {
      indexer.add(uri, this._getIndexableContent(uri));
    }
  }

  /**
   * Start an index that has been added via `addIndexer`.
   *
   * @param {string} id The ID of the indexer to start.  For StatWrap we will use the full URI as the
   * ID for each indexer.
   * @returns The FlexSearch.Index that is being used, or null if one cannot be created.
   */
  startIndexer(id) {
    if (id === null || id === undefined || !this.indexers.has(id)) {
      return null;
    }

    // If the root path is not set or cannot be found, we can't start the indexer.
    // Return null to signal an error and that we can't proceed.
    const indexer = this.indexers.get(id);
    if (indexer.rootPath === null || indexer.rootPath === undefined) {
      return null;
    }

    // This will throw an error if the path cannot be accessed
    fs.accessSync(indexer.rootPath);
    this._indexAssets(indexer.indexer, indexer.rootPath);

    return indexer.indexer;
  }
}
