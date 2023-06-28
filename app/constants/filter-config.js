import Constants from './constants';

/**
 * Application-wide configuration settings for filtering.  This can be applied to
 * filters in different views - workflow, dependencies, searching.  The config
 * is separated into different contexts, such as a global exclude (applies to every
 * context), or other specific ones (e.g., filters just for indexing/searching).
 *
 * Filters can have the following attributes:
 * name (array) - An array of strings representing regex to apply to asset names we
 *     want excluded.
 * contentType (array) - An array of strings representing Constant.AssetContentType
 *     values we want excluded.
 */
module.exports = {
  /**
   * Exclusion settings for every context.  These are the files and folders that
   * we should always skip.
   */
  globalExclude: {
    names: [
      'Thumbs.db', // Windows
      '^\\..*' // Anything starting with '.' -- hidden files/folders
    ]
  },

  searchExclude: {
    contentTypes: [Constants.AssetContentType.DATA]
  }
};
