import p from 'path';
import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

// R file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['r', 'rmd', 'qmd'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.RHandler'
 * }
 */
export default class RHandler extends BaseCodeHandler {
  static id = 'StatWrap.RHandler';

  static argumentDelimiter = ',';

  static keyValueDelimiter = '=';

  constructor() {
    super(RHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return RHandler.id;
  }

  getLibraryId(packageName) {
    return packageName || '(unknown)';
  }

  isQuotedString(value) {
    if (!value || value.length < 2) {
      return false;
    }
    const start = value[0];
    const end = value[value.length - 1];
    return (start === '"' && end === '"') || (start === "'" && end === "'");
  }

  extractLeadingQuotedString(value) {
    if (!value) {
      return '';
    }
    const match = value.match(/^\s*(['"](?:.|\s)*?['"])/);
    return match ? match[1].trim() : '';
  }

  splitArguments(text) {
    const argumentsList = [];
    if (!text || text.trim() === '') {
      return argumentsList;
    }

    let segmentStart = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;
    let parenDepth = 0;

    const pushSegment = endIndex => {
      const value = text.substring(segmentStart, endIndex).trim();
      if (value !== '') {
        argumentsList.push(value);
      }
      segmentStart = endIndex + 1;
    };

    for (let index = 0; index < text.length; index++) {
      const chr = text[index];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if ((inSingleQuote || inDoubleQuote) && chr === '\\') {
        isEscaped = true;
        continue;
      }

      if (!inDoubleQuote && chr === "'") {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (!inSingleQuote && chr === '"') {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (inSingleQuote || inDoubleQuote) {
        continue;
      }

      if (chr === '(') {
        parenDepth++;
        continue;
      }

      if (chr === ')') {
        parenDepth = Math.max(parenDepth - 1, 0);
        continue;
      }

      if (chr === RHandler.argumentDelimiter && parenDepth === 0) {
        pushSegment(index);
      }
    }

    pushSegment(text.length);
    return argumentsList;
  }

  splitNamedArgument(text) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;
    let parenDepth = 0;

    for (let index = 0; index < text.length; index++) {
      const chr = text[index];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if ((inSingleQuote || inDoubleQuote) && chr === '\\') {
        isEscaped = true;
        continue;
      }

      if (!inDoubleQuote && chr === "'") {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (!inSingleQuote && chr === '"') {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (inSingleQuote || inDoubleQuote) {
        continue;
      }

      if (chr === '(') {
        parenDepth++;
        continue;
      }

      if (chr === ')') {
        parenDepth = Math.max(parenDepth - 1, 0);
        continue;
      }

      if (chr === RHandler.keyValueDelimiter && parenDepth === 0) {
        const key = text.substring(0, index).trim();
        const value = text.substring(index + 1).trim();
        if (!/^[A-Za-z.][A-Za-z0-9._]*$/.test(key)) {
          return null;
        }
        return {
          key,
          value,
        };
      }
    }

    return null;
  }

  parseFunctionArguments(argumentsText) {
    const segments = this.splitArguments(argumentsText);
    return segments.map((segment, index) => {
      const named = this.splitNamedArgument(segment);
      if (named) {
        return {
          index,
          key: named.key,
          value: named.value,
        };
      }
      return {
        index,
        key: '',
        value: segment,
      };
    });
  }

  resolveFileArgument(argumentsText, fileParameterName, positionalIndex) {
    const parsedArguments = this.parseFunctionArguments(argumentsText);
    if (parsedArguments.length === 0) {
      return '';
    }

    const normalizedParameterName = fileParameterName.toLowerCase();
    let match = parsedArguments.find(arg => arg.key.toLowerCase() === normalizedParameterName);
    if (!match) {
      match = parsedArguments.find(
        arg => arg.key && normalizedParameterName.startsWith(arg.key.toLowerCase()),
      );
    }
    if (match) {
      if (this.isQuotedString(match.value)) {
        return match.value;
      }
      const leadingQuoted = this.extractLeadingQuotedString(match.value);
      if (leadingQuoted) {
        return leadingQuoted;
      }
    }

    const unnamedArguments = parsedArguments.filter(arg => !arg.key);
    const positional = unnamedArguments[positionalIndex - 1];
    if (!positional) {
      return '';
    }
    if (this.isQuotedString(positional.value)) {
      return positional.value;
    }
    return this.extractLeadingQuotedString(positional.value);
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    // We are going to skip image imports for now. May need to look at packages
    // like imager that support this in the future: https://www.rdocumentation.org/packages/imager/versions/0.41.1/topics/load.image

    // Base R and tidyverse import capabilities
    // https://cran.r-project.org/doc/manuals/r-release/R-data.html
    // Tidyverse is similar, just uses _ instead of .
    const baseMatches = [
      ...text.matchAll(
        /^[^#]*?(read\.table|read\.csv|read\.csv2|read\.DIF|read\.fortran|read\.fwf|read\.ftable|read\.dcf|scan|read_delim|read_csv|read_csv2|read_excel|read_xls|read_xlsx|read_tsv|read_fwf|read_log|read_table|read_file|read_file_raw|read_lines|read_lines_raw|read_rds)\s*\(([\s\S]*?)\)\s*$/gm,
      ),
    ];
    for (let index = 0; index < baseMatches.length; index++) {
      const match = baseMatches[index];
      const path = this.resolveFileArgument(match[2], 'file', 1);
      if (!path) {
        continue;
      }
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    // source from other code file
    const sourceMatches = [...text.matchAll(/^[^#]*?(source|sys\.source)\s*\(([\s\S]*?)\)\s*$/gm)];
    for (let index = 0; index < sourceMatches.length; index++) {
      const match = sourceMatches[index];
      const path = this.resolveFileArgument(match[2], 'file', 1);
      if (!path) {
        continue;
      }
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: 'code',
        path,
      });
    }

    // TODO: URLs
    // https://stat.ethz.ch/R-manual/R-devel/library/utils/html/download.file.html

    // Base R connections
    // https://stat.ethz.ch/R-manual/R-devel/library/base/html/connections.html
    // TODO: Handle 'open=' parameter
    const fileMatches = [
      ...text.matchAll(/^[^#]*?(file|url|gzfile|bzfile|xzfile|unz|fifo)\s*\(([\s\S]*?)\)\s*$/gm),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = this.resolveFileArgument(match[2], 'description', 1);
      if (!path) {
        continue;
      }
      const mode = this.resolveFileArgument(match[2], 'open', 2);
      const isOutput = !mode || mode.match(/[r+]/);
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

  /**
   * Utility method to get the expected output file extension for an RMarkdown output type
   * @param {string} type The RMarkdown output type
   * @returns A string containing the file extension for the RMarkdown output type
   */
  getRMarkdownOutputExtension(type) {
    // If you add any new entries here, make sure to add a corresponding entry in the regex for Rmd
    // outputs in getOutputs
    switch (type) {
      case 'html_notebook':
        return 'nb.html';
      case 'html_document':
      case 'ioslides_presentation':
      case 'slidly_presentation':
      case 'beamer_presentation':
        // case 'revealjs::revealjs_presentation': -- currently not supported, need to find fix
        return 'html';
      case 'pdf_document':
        return 'pdf';
      case 'word_document':
        return 'docx';
      case 'odt_document':
        return 'odt';
      case 'rtf_document':
        return 'rtf';
      case 'md_document':
        return 'md';
      case 'powerpoint_presentation':
        return 'pptx';
      default:
        return '';
    }
  }

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const figureMatches = [
      ...text.matchAll(/^\s*(pdf|win\.metafile|png|jpeg|bmp|postscript|ggsave)\s*\(([\s\S]*?)\)\s*$/gm),
    ];
    for (let index = 0; index < figureMatches.length; index++) {
      const match = figureMatches[index];
      const path = this.resolveFileArgument(match[2], 'file', 1);
      if (!path) {
        continue;
      }
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.FIGURE,
        path,
      });
    }

    // Base R and tidyverse export capabilities
    // https://cran.r-project.org/doc/manuals/r-release/R-data.html
    // Tidyverse is similar, just uses _ instead of .
    const baseMatches = [
      ...text.matchAll(
        /^\s*(write\.table|write|write\.csv|write\.csv2|write\.ftable|write\.dcf|sink|write_delim|write_csv|write_csv2|write_excel_csv|write_excel_csv2|write_tsv|write_file|write_lines|write_rds)\s*\(([\s\S]*?)\)\s*$/gm,
      ),
    ];
    for (let index = 0; index < baseMatches.length; index++) {
      const match = baseMatches[index];
      const path = this.resolveFileArgument(match[2], 'file', 2);
      if (!path) {
        continue;
      }
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    // Base R connections
    // https://stat.ethz.ch/R-manual/R-devel/library/base/html/connections.html
    // TODO: Handle 'open=' parameter
    const fileMatches = [
      ...text.matchAll(/^[^#]*?(file|url|gzfile|bzfile|xzfile|unz|fifo)\s*\(([\s\S]*?)\)\s*$/gm),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = this.resolveFileArgument(match[2], 'description', 1);
      if (!path) {
        continue;
      }
      const mode = this.resolveFileArgument(match[2], 'open', 2);
      const isOutput = mode && mode.match(/[aw+]/);
      if (isOutput) {
        outputs.push({
          id: `${match[1]} - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
      }
    }

    // We also want to consider conventions beyond what is in the code.  If the code file is an Rmd,
    // it will generate output as well based on the type of export it's set up to do.
    // This is a two-part match.  Part one gets the first header in the Rmd file.  If one doesn't exist,
    // we're done processing.
    const rmdHeaderMatches = text.match(/---(.|\s)+?---/m);
    if (!rmdHeaderMatches || rmdHeaderMatches.length < 1) {
      return outputs;
    }

    const headerText = rmdHeaderMatches[0];
    // const outputMatches = [...text.matchAll(/^output\s*:\s*([\w]+)\s*[:]?/gm)];
    // /((?:html_document|html_notebook|ioslides_presentation|slidly_presentation|beamer_presentation|pdf_document|word_document|odt_document|rtf_document|md_document|powerpoint_presentation)+(?:.|\s)+?)+(?:.|\s)+?/gm
    const outputMatches = [
      ...headerText.matchAll(
        // If you add any new entries here, please also add corresponding entry in getRMarkdownOutputExtension
        /(html_document|html_notebook|ioslides_presentation|slidly_presentation|beamer_presentation|pdf_document|word_document|odt_document|rtf_document|md_document|powerpoint_presentation)+/gm,
      ),
    ];
    for (let index = 0; index < outputMatches.length; index++) {
      const match = outputMatches[index];
      const type = match[1].trim();
      const baseFileName = p.parse(this.getBaseFileName(uri)).name;
      const extension = this.getRMarkdownOutputExtension(type);
      outputs.push({
        id: `${type} - ${baseFileName}.${extension}`,
        type: Constants.DependencyType.FILE,
        path: `${baseFileName}.${extension}`,
      });
    }

    return outputs;
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - library name
    const matches = [...text.matchAll(/^[^#]*?(?:library|require)\s*\(\s*(\S+)\s*\)\s*$/gm)];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const packageName = match[1].replace(/['"]/gm, '');
      libraries.push({
        id: this.getLibraryId(packageName),
        package: packageName,
      });
    }
    return libraries;
  }

  getAuthors(uri, text) {
    const authors = [];
    if (!text || text.trim() === '') {
      return authors;
    }

    // Scan for .rmd and .qmd files
    const extension = this.getBaseFileName(uri).split('.').pop().toLowerCase();
    if (extension !== 'rmd' && extension !== 'qmd') {
      return authors;
    }

    // Extract the YAML front matter
    const yamlMatches = text.match(/^(?:---\r?\n)([\s\S]*?)(?:\r?\n---)/);
    if (!yamlMatches || yamlMatches.length < 2) {
      return authors;
    }

    const yamlContent = yamlMatches[1];
    // we are going to support 3 fomrat :- Inline Array , Single List , Bullets List

    // Finding the author field
    // Using regex to extract everything after author
    const authorBlockMatch = yamlContent.match(/(?:^|\n)author:\s*([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|$)/);

    if (!authorBlockMatch || authorBlockMatch.length < 2) {
      return authors;
    }

    let authorContent = authorBlockMatch[1].trim();

    // format-1 :- [name1, name2]
    if (authorContent.startsWith('[')) {
      const inlineArrayMatch = authorContent.match(/\[(.*?)\]/);
      if (inlineArrayMatch) {
        const items = inlineArrayMatch[1].split(',').map(item => item.trim().replace(/^['"]|['"]$/g, ''));
        authors.push(...items.filter(item => item !== ''));
      }
      return authors;
    }

    // format-2 :- "name" or name
    if (authorContent && !authorContent.includes('\n')) {
      const item = authorContent.replace(/^['"]|['"]$/g, '').trim();
      if (item !== '') {
        authors.push(item);
      }
      return authors;
    }

    // format-3 :- Bulleted list , This one also able to handle Quarto format too
    // - name1
    // - name: name2
    // - first: name3
    //   last: last3
    const lines = authorContent.split('\n');
    let currentObject = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // new list item
      if (line.startsWith('-')) {
        let val = line.substring(1).trim();
        if (val === '') {
        } else if (val.startsWith('name:')) {
          const parsedName = val.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
          if (parsedName) authors.push(parsedName);
        } else if (val.includes(':')) {
          // grabs the value of the first attribute
        } else {
          // Simple array element
          authors.push(val.replace(/^['"]|['"]$/g, ''));
        }
      } else {
        // Not starting with '-', its a property of an object in a list
        if (line.startsWith('name:')) {
          const parsedName = line.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
          if (parsedName) authors.push(parsedName);
        }
      }
    }

    return authors;
  }
}
