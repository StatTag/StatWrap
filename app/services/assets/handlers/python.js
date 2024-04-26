import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

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

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const figureMatches = [
      ...text.matchAll(/(imread)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)$/gim),
    ];
    for (let index = 0; index < figureMatches.length; index++) {
      const match = figureMatches[index];
      const path = match[2].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.FIGURE,
        path,
      });
    }

    const pandasMatches = [
      ...text.matchAll(
        /(read_table|read_fwf|read_feather|read_parquet|read_csv|read_pickle|read_hdf|read_sql_table|read_sql_query|read_sql|read_excel|read_json|read_html|read_xml|read_stata|read_orc|read_sas|read_spss)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim,
      ),
    ];
    for (let index = 0; index < pandasMatches.length; index++) {
      const match = pandasMatches[index];
      const path = match[2].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    const fileMatches = [
      ...text.matchAll(
        /(open)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s,]*(['"]{1,}[\s\S]+?['"]{1,})?[\s\S]*?\)/gim,
      ),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[2].trim();
      const mode = match[3];
      const isOutput = !mode || mode.match(/[r]/);
      if (isOutput) {
        inputs.push({
          id: `${match[1]} - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
      }
    }

    return inputs;
  }

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const figureMatches = [
      ...text.matchAll(
        /^[^#]*?(plot|savefig|imsave|imwrite|save)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)$/gm,
      ),
    ];
    for (let index = 0; index < figureMatches.length; index++) {
      const match = figureMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.FIGURE,
        path,
      });
    }

    const pandasMatches = [
      ...text.matchAll(
        /^[^#]*?(to_parquet|to_csv|to_pickle|to_hdf|to_sql|to_excel|to_json|to_html|to_feather|to_latex|to_stata|to_markdown)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gm,
      ),
    ];
    for (let index = 0; index < pandasMatches.length; index++) {
      const match = pandasMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    const fileMatches = [
      ...text.matchAll(
        /^[^#]*?(open)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s,]*(['"]{1,}[\s\S]+?['"]{1,})?[\s\S]*?\)/gm,
      ),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[2].trim();
      const mode = match[3];
      const isOutput = mode && mode.match(/[xaw+]/);
      if (isOutput) {
        outputs.push({
          id: `${match[1]} - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
      }
    }

    return outputs;
  }

  getLibraries(uri, text) {
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
      ...text.matchAll(/^[^#]*?(?:from[ ]+(\S+)[ ]+)?import[ ]+(.+?)(?:[ ]+as[ ]+(\S+))?[ ]*$/gm),
    ];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      libraries.push({
        id: this.getLibraryId(match[1], match[2]),
        module: match[1] ? match[1] : null,
        import: match[2] ? match[2] : null,
        alias: match[3] ? match[3] : null,
      });
    }
    return libraries;
  }
}
