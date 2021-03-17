import BaseCodeHandler from './baseCode';

// R file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['r', 'rmd'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.RHandler'
 * }
 */
export default class RHandler extends BaseCodeHandler {
  static id = 'StatWrap.RHandler';

  constructor() {
    super(RHandler.id, FILE_EXTENSION_LIST);
  }

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
}
