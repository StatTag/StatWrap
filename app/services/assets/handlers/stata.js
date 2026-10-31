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
        package: match[1].trim(),
      });
    }
  }

  /**
   * Preprocesses Stata code to handle line continuations while preserving comment lines.
   * Handles:
   * 1. Backslash continuation (\ at end of line)
   * 2. Triple slash continuation (/// at end of line with optional comment)
   * @param {string} text Raw Stata file text
   * @returns {string} Preprocessed Stata text with continuations merged
   */
  preprocessText(text) {
    if (!text || text.trim() === '') {
      return '';
    }

    const lines = text.split(/\r?\n/);
    const processedLines = [];
    let currentLine = '';

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      // If currentLine is empty, this line is the beginning of a statement
      if (currentLine === '') {
        // If the line starts with a comment (*, //, or # as tested in StatWrap), keep it as-is
        if (/^\s*(?:\*|\/\/|#)/.test(line)) {
          processedLines.push(line);
          continue;
        }
      }

      // Check for Stata triple slash (///) line continuation with optional trailing comment
      const tripleSlashMatch = line.match(/^(.*?)\/\/\/[^\r\n]*$/);
      if (tripleSlashMatch) {
        currentLine += (currentLine ? ' ' : '') + tripleSlashMatch[1].trim();
        continue;
      }

      // Check for backslash line continuation (\ at end of line)
      const backslashMatch = line.match(/^(.*?)\\[ \t]*$/);
      if (backslashMatch) {
        currentLine += (currentLine ? ' ' : '') + backslashMatch[1].trim();
        continue;
      }

      // No continuation, finalize the statement line
      if (currentLine !== '') {
        currentLine += ` ${line.trim()}`;
        processedLines.push(currentLine);
        currentLine = '';
      } else {
        processedLines.push(line);
      }
    }

    if (currentLine !== '') {
      processedLines.push(currentLine);
    }

    return processedLines.join('\n');
  }

  /**
   * Extracts the target file path from a Stata import or export command arguments string.
   * Handles both 'using <path>' and direct '<path>' as well as trailing 'if', 'in', and options.
   * @param {string} args Command arguments following the command name
   * @returns {string|null} The resolved file path or null
   */
  extractStataPath(args) {
    if (!args || !args.trim()) {
      return null;
    }
    const trimmed = args.trim();

    // 1. If 'using' is present, the path immediately follows 'using'
    const usingMatch = trimmed.match(
      /\busing\s+("(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*'|[^\s,]+)/i,
    );
    if (usingMatch) {
      return usingMatch[1].trim();
    }

    // 2. Otherwise, the path is the first argument token directly following the command
    const directMatch = trimmed.match(/^("(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*'|[^\s,]+)/);
    if (directMatch) {
      return directMatch[1].trim();
    }

    return null;
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const processedText = this.preprocessText(text);
    const importMatches = [
      ...processedText.matchAll(
        /^\s*?((?:import\s+(?:excel|delimited|sasxport|sasxport5|sasxport8|dbase))|(?:infile|inf|infix|xmluse))\s+(.+?)$/gm,
      ),
    ];
    for (let index = 0; index < importMatches.length; index += 1) {
      const match = importMatches[index];
      const command = match[1].trim();
      const path = this.extractStataPath(match[2]);
      if (path) {
        inputs.push({
          id: `${command} - ${path}`,
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

    const processedText = this.preprocessText(text);

    const figureMatches = [
      ...processedText.matchAll(/^\s*(gr(?:aph)? export)\s*([\s\S]+?)(?:,[\s\S]+?)?$/gm),
    ];
    for (let index = 0; index < figureMatches.length; index += 1) {
      const match = figureMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.FIGURE,
        path,
      });
    }

    const logMatches = [
      ...processedText.matchAll(/^\s*((?:cmd)?log)\s*using\b([\w\W]*?)(?:$|[\r\n,])/gm),
    ];
    for (let index = 0; index < logMatches.length; index += 1) {
      const match = logMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: 'log',
        path,
      });
    }

    const exportMatches = [
      ...processedText.matchAll(
        /^\s*?((?:export\s+(?:excel|delimited|sasxport|sasxport5|sasxport8|dbase))|outfile|xmlsave)\s+(.+?)$/gm,
      ),
    ];
    for (let index = 0; index < exportMatches.length; index += 1) {
      const match = exportMatches[index];
      const command = match[1].trim();
      const path = this.extractStataPath(match[2]);
      if (path) {
        outputs.push({
          id: `${command} - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
      }
    }

    const putMatches = [
      ...processedText.matchAll(
        /^\s*(putdocx|putexcel|putpdf)\s+save\s+([\s\S]+?)(?:,[\s\S]+?)?$/gm,
      ),
    ];
    for (let index = 0; index < putMatches.length; index += 1) {
      const match = putMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    // estout is a package, but used pretty widely and supported in StatTag so we
    // are supporting it here.
    const estMatches = [
      ...processedText.matchAll(
        /^\s*(est(?:out|add|tab))\s+(?:using)\s+([^,\r\n,#]+?\.[^,\r\n,#]+?)(?:[, \r\n,#]|$)/gm,
      ),
    ];
    for (let index = 0; index < estMatches.length; index += 1) {
      const match = estMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    // tableone is a package, but used pretty widely and supported in StatTag so we
    // are supporting it here.
    const table1Matches = [
      ...processedText.matchAll(
        /^\s*(table1)[\s\S]+?(?:saving)\s*?\(\s*([^,\r\n,#]+?\.[^,\r\n,#]+?)\s*[,\r\n,#][\s\S]*?\)\s*?$/gm,
      ),
    ];
    for (let index = 0; index < table1Matches.length; index += 1) {
      const match = table1Matches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    return outputs;
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    const processedText = this.preprocessText(text);

    this.processRegexGroup1Match(
      libraries,
      processedText,
      /(?:do|ru[n]?)\s+([^,"]+?)(?:,\s+nostop)?\s?$/gm,
    );
    this.processRegexGroup1Match(
      libraries,
      processedText,
      /(?:do|ru[n]?)\s+"(.+?)"(?:,\s+nostop)?\s?$/gm,
    );

    // Load a plugin
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - handle used for plugin
    const pluginMatches = [...processedText.matchAll(/pr(?:ogram)?\s+(.+),\s+plug(?:in)?\s?$/gm)];
    for (let index = 0; index < pluginMatches.length; index += 1) {
      const match = pluginMatches[index];
      libraries.push({
        id: this.getLibraryId(match[1]),
        package: match[1].trim(),
      });
    }
    // Load a plugin with specified location
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - handle used for plugin
    // 2 - file location of plugin
    const pluginUsingMatches = [
      ...processedText.matchAll(
        /pr(?:ogram)?\s+(.+),\s+plug(?:in)?\s*(?:using\s*\(\s*"(.+?)"\s*\))/gm,
      ),
    ];
    for (let index = 0; index < pluginUsingMatches.length; index += 1) {
      const match = pluginUsingMatches[index];
      libraries.push({
        id: this.getLibraryId(match[1], match[2]),
        package: match[1].trim(),
      });
    }
    return libraries;
  }
}
