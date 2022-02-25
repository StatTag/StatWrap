import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

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

  getInputs(text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    // TODO: The following scenarios are not currently handled
    // 1 - Multi-line
    //   export excel \\
    //     mydata2 ,\\
    //     nolabel
    // 2 - sasxport with 'if' statement
    //   export sasxport5 v1 v2 v3 using mydata if tvar==2010
    const importMatches = [
      ...text.matchAll(
        /^\s*?((?:import\s+(?:excel|delimited|sasxport|sasxport5|sasxport8|dbase))|(?:infile|inf|infix|xmluse))\s+?(?:(?:.*)using\s+([^,]+?)|([^,]+?))\s*?(?:$|[\r\n,])/gm
      )
    ];
    for (let index = 0; index < importMatches.length; index++) {
      const match = importMatches[index];
      // Depending on what matches, the path will be either in group 2 or 3
      const path = match[2] ? match[2].trim() : match[3].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    return inputs;
  }

  getOutputs(text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const figureMatches = [
      ...text.matchAll(/^\s*(gr(?:aph)? export)\s*([\s\S]+?)(?:,[\s\S]+?)?$/gm)
    ];
    for (let index = 0; index < figureMatches.length; index++) {
      const match = figureMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.FIGURE,
        path
      });
    }

    const logMatches = [...text.matchAll(/^\s*((?:cmd)?log)\s*using\b([\w\W]*?)(?:$|[\r\n,])/gm)];
    for (let index = 0; index < logMatches.length; index++) {
      const match = logMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: 'log',
        path
      });
    }

    // TODO: The following scenarios are not currently handled
    // 1 - Multi-line
    //   export excel \\
    //     mydata2 ,\\
    //     nolabel
    // 2 - sasxport with 'if' statement
    //   export sasxport5 v1 v2 v3 using mydata if tvar==2010
    const exportMatches = [
      ...text.matchAll(
        /^\s*?((?:export\s+(?:excel|delimited|sasxport|sasxport5|sasxport8|dbase))|outfile|xmlsave)\s+?(?:(?:.*)using\s+([^,]+?)|([^,]+?))\s*?(?:$|[\r\n,])/gm
      )
    ];
    for (let index = 0; index < exportMatches.length; index++) {
      const match = exportMatches[index];
      // Depending on what matches, the path will be either in group 2 or 3
      const path = match[2] ? match[2].trim() : match[3].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    const putMatches = [
      ...text.matchAll(/^\s*(putdocx|putexcel|putpdf)\s+save\s+([\s\S]+?)(?:,[\s\S]+?)?$/gm)
    ];
    for (let index = 0; index < putMatches.length; index++) {
      const match = putMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    // estout is a package, but used pretty widely and supported in StatTag so we
    // are supporting it here.
    const estMatches = [
      ...text.matchAll(
        /^\s*(est(?:out|add|tab))\s+(?:using)\s+([^,\r\n,#]+?\.[^,\r\n,#]+?)(?:[, \r\n,#]|$)/gm
      )
    ];
    for (let index = 0; index < estMatches.length; index++) {
      const match = estMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    // tableone is a package, but used pretty widely and supported in StatTag so we
    // are supporting it here.
    const table1Matches = [
      ...text.matchAll(
        /^\s*(table1)[\s\S]+?(?:saving)\s*?\(\s*([^,\r\n,#]+?\.[^,\r\n,#]+?)\s*[,\r\n,#][\s\S]*?\)\s*?$/gm
      )
    ];
    for (let index = 0; index < table1Matches.length; index++) {
      const match = table1Matches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    return outputs;
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
