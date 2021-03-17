import BaseCodeHandler from './baseCode';

// Python file extensions that we will scan.  This is derived from the following SO post:
// https://stackoverflow.com/a/18032741/5670646
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['py', 'py3', 'pyi'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.PythonHandler'
 * }
 */
export default class PythonHandler extends BaseCodeHandler {
  static id = 'StatWrap.PythonHandler';

  constructor() {
    super(PythonHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return PythonHandler.id;
  }

  getLibraryId(moduleName, importName) {
    let id = '';
    if (moduleName && importName) {
      id = `${moduleName}.${importName}`;
    } else if (moduleName) {
      id = moduleName;
    } else if (importName) {
      id = importName;
    } else {
      id = '(unknown)';
    }
    return id;
  }

  getLibraries(text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    // A million thanks to https://stackoverflow.com/a/44988666/5670646 for getting us started
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - package/module name derived from the "from" keyword
    //     e.g., "from one import two" --> m[1]: "one"
    // 2 - import name.  This could be a comma-separated list, but won't be split by default
    //     e.g., "from test import one, two, three" --> m[2]: "one, two, three"
    // 3 - alias for the import
    //     e.g., "import one as two" --> m[3]: "two"
    const matches = [
      ...text.matchAll(/^(?:from[ ]+(\S+)[ ]+)?import[ ]+(.+?)(?:[ ]+as[ ]+(\S+))?[ ]*$/gm)
    ];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      libraries.push({
        id: this.getLibraryId(match[1], match[2]),
        module: match[1] ? match[1] : null,
        import: match[2] ? match[2] : null,
        alias: match[3] ? match[3] : null
      });
    }
    return libraries;
  }
}
