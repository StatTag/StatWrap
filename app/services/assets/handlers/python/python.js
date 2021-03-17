// eslint-disable-next-line import/no-cycle
import AssetUtil from '../../../../utils/asset';

const fs = require('fs');
const path = require('path');
const url = require('url');

// Python file extensions that we will scan.  This is derived from the following SO post:
// https://stackoverflow.com/a/18032741/5670646
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['py', 'py3', 'pyi'];
const URL_PROTOCOL_LIST = ['http:', 'https:'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.PythonHandler'
 * }
 */
export default class PythonHandler {
  static id = 'StatWrap.PythonHandler';

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

    // Placeholder --- we may not need a full parser, but there is a library we can use if we
    // find we have to go to that level.  Otherwise, we will rely on regex.
    // const parser = new Python3Parser();
    // const python = `from importlib.util import spec_from_loader, module_from_spec\nfrom package2.subpackage1.module5 import function2\nfrom abc import xyz\nimport ghi as other_name\nimport sys\nfor i in sys.argv:\n print(i)\nprint('abc')\nprint('abc')\n`;
    // const errors = parser.validate(python);
    // console.log(errors);
    // const tokens = parser.getAllTokens(python);
    // console.log(tokens);
    // const tree = parser.parse(python);
    // console.log(tree);
    // const listener = new StatWrapPythonListener();
    // parser.listen(listener, tree);
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
      const existingMetadata = AssetUtil.getHandlerMetadata(PythonHandler.id, asset.metadata);
      if (existingMetadata) {
        return asset;
      }

      try {
        const contents = fs.readFileSync(asset.uri, 'utf8');
        metadata.libraries = this.getLibraries(contents);
      } catch {
        metadata.error = 'Unable to read Python code file';
        asset.metadata.push(metadata);
        return asset;
      }

      asset.metadata.push(metadata);
    }

    return asset;
  }
}
