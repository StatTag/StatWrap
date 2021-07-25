import BaseCodeHandler from './baseCode';

// R file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['do', 'ado'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.StataHandler'
 * }
 */
export default class StataHandler extends BaseCodeHandler {
  static id = 'StatWrap.StataHandler';

  constructor() {
    super(StataHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return StataHandler.id;
  }

  getLibraryId(packageName, location) {
    if (!packageName) {
      return '(unknown)';
    }
    return location ? `${packageName.trim()} (${location.trim()})` : packageName.trim();
  }

  processRegexGroup1Match(libraries, text, regex) {
    const matches = [...text.matchAll(regex)];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      libraries.push({
        id: this.getLibraryId(match[1].trim()),
        package: match[1].trim()
      });
    }
  }

  getLibraries(text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    this.processRegexGroup1Match(libraries, text, /(?:do|ru[n]?)\s+([^,"]+?)(?:,\s+nostop)?\s?$/gm);
    this.processRegexGroup1Match(libraries, text, /(?:do|ru[n]?)\s+"(.+?)"(?:,\s+nostop)?\s?$/gm);

    // Load a plugin
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - handle used for plugin
    const pluginMatches = [...text.matchAll(/pr(?:ogram)?\s+(.+),\s+plug(?:in)?\s?$/gm)];
    for (let index = 0; index < pluginMatches.length; index++) {
      const match = pluginMatches[index];
      libraries.push({
        id: this.getLibraryId(match[1]),
        package: match[1].trim()
      });
    }
    // Load a plugin with specified location
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - handle used for plugin
    // 2 - file location of plugin
    const pluginUsingMatches = [
      ...text.matchAll(/pr(?:ogram)?\s+(.+),\s+plug(?:in)?\s*(?:using\s*\(\s*"(.+?)"\s*\))/gm)
    ];
    for (let index = 0; index < pluginUsingMatches.length; index++) {
      const match = pluginUsingMatches[index];
      libraries.push({
        id: this.getLibraryId(match[1], match[2]),
        package: match[1].trim()
      });
    }
    return libraries;
  }
}
