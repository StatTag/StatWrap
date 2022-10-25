import p from 'path';
import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

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
        /^[^#]*?(read\.table|read\.csv|read\.csv2|read\.DIF|read\.fortran|read\.fwf|read\.ftable|read\.dcf|read\.csv|read\.csv2|scan|read_delim|read_csv|read_csv2|read_excel|read_xls|read_xlsx|read_tsv|read_fwf|read_log|read_table|read_file|read_file_raw|read_lines|read_lines_raw|read_rds)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm
      )
    ];
    for (let index = 0; index < baseMatches.length; index++) {
      const match = baseMatches[index];
      const path = match[2].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    // source from other code file
    const sourceMatches = [
      ...text.matchAll(
        /^[^#]*?(source|sys\.source)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm
      )
    ];
    for (let index = 0; index < sourceMatches.length; index++) {
      const match = sourceMatches[index];
      const path = match[2].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: 'code',
        path
      });
    }

    // TODO: URLs
    // https://stat.ethz.ch/R-manual/R-devel/library/utils/html/download.file.html

    // Base R connections
    // https://stat.ethz.ch/R-manual/R-devel/library/base/html/connections.html
    // TODO: Handle 'open=' parameter
    const fileMatches = [
      ...text.matchAll(
        /^[^#]*?(file|url|gzfile|bzfile|xzfile|unz|fifo)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s,]*(['"]{1,}[\s\S]+?['"]{1,})?[\s\S]*?\)/gm
      )
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[2].trim();
      const mode = match[3];
      const isOutput = !mode || mode.match(/[r+]/);
      if (isOutput) {
        inputs.push({
          id: `${match[1]} - ${path}`,
          type: Constants.DependencyType.DATA,
          path
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
      ...text.matchAll(
        /^\s*(pdf|win\.metafile|png|jpeg|bmp|postscript|ggsave)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm
      )
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

    // Base R and tidyverse export capabilities
    // https://cran.r-project.org/doc/manuals/r-release/R-data.html
    // Tidyverse is similar, just uses _ instead of .
    const baseMatches = [
      ...text.matchAll(
        /^\s*(write\.table|write|write\.csv|write\.csv2|write\.ftable|write\.dcf|sink|write_delim|write_csv|write_csv2|write_excel_csv|write_excel_csv2|write_tsv|write_file|write_lines|write_rds)\s*\([\s\S]+?\s*,\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm
      )
    ];
    for (let index = 0; index < baseMatches.length; index++) {
      const match = baseMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    // Base R connections
    // https://stat.ethz.ch/R-manual/R-devel/library/base/html/connections.html
    // TODO: Handle 'open=' parameter
    const fileMatches = [
      ...text.matchAll(
        /^[^#]*?(file|url|gzfile|bzfile|xzfile|unz|fifo)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s,]*(['"]{1,}[\s\S]+?['"]{1,})?[\s\S]*?\)/gm
      )
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[2].trim();
      const mode = match[3];
      const isOutput = mode && mode.match(/[aw+]/);
      if (isOutput) {
        outputs.push({
          id: `${match[1]} - ${path}`,
          type: Constants.DependencyType.DATA,
          path
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
        /(html_document|html_notebook|ioslides_presentation|slidly_presentation|beamer_presentation|pdf_document|word_document|odt_document|rtf_document|md_document|powerpoint_presentation)+/gm
      )
    ];
    for (let index = 0; index < outputMatches.length; index++) {
      const match = outputMatches[index];
      const type = match[1].trim();
      const baseFileName = p.parse(this.getBaseFileName(uri)).name;
      const extension = this.getRMarkdownOutputExtension(type);
      outputs.push({
        id: `${type} - ${baseFileName}.${extension}`,
        type: Constants.DependencyType.FILE,
        path: `${baseFileName}.${extension}`
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
        package: packageName
      });
    }
    return libraries;
  }
}
