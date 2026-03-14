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

  constructor() {
    super(RHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return RHandler.id;
  }

  scan(originalAsset) {
    const asset = super.scan(originalAsset);
    
    // Add author extraction for RMarkdown/Quarto files
    if (asset.type === 'file' && this.includeFile(asset.uri)) {
      const fs = require('fs');
      const AssetUtil = require('../../../utils/asset').default;
      
      const metadata = AssetUtil.getHandlerMetadata(RHandler.id, asset.metadata);
      if (metadata && !metadata.error) {
        try {
          const contents = fs.readFileSync(asset.uri, 'utf8');
          const authors = this.getAuthors(contents);
          if (authors.length > 0) {
            metadata.authors = authors;
          }
        } catch {
          // Silently fail if we can't read the file
        }
      }
    }
    
    return asset;
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
        /^[^#]*?(read\.table|read\.csv|read\.csv2|read\.DIF|read\.fortran|read\.fwf|read\.ftable|read\.dcf|read\.csv|read\.csv2|scan|read_delim|read_csv|read_csv2|read_excel|read_xls|read_xlsx|read_tsv|read_fwf|read_log|read_table|read_file|read_file_raw|read_lines|read_lines_raw|read_rds)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm,
      ),
    ];
    for (let index = 0; index < baseMatches.length; index++) {
      const match = baseMatches[index];
      const path = match[2].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    // source from other code file
    const sourceMatches = [
      ...text.matchAll(
        /^[^#]*?(source|sys\.source)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm,
      ),
    ];
    for (let index = 0; index < sourceMatches.length; index++) {
      const match = sourceMatches[index];
      const path = match[2].trim();
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
      ...text.matchAll(
        /^[^#]*?(file|url|gzfile|bzfile|xzfile|unz|fifo)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s,]*(['"]{1,}[\s\S]+?['"]{1,})?[\s\S]*?\)/gm,
      ),
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
      ...text.matchAll(
        /^\s*(pdf|win\.metafile|png|jpeg|bmp|postscript|ggsave)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm,
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

    // Base R and tidyverse export capabilities
    // https://cran.r-project.org/doc/manuals/r-release/R-data.html
    // Tidyverse is similar, just uses _ instead of .
    const baseMatches = [
      ...text.matchAll(
        /^\s*(write\.table|write|write\.csv|write\.csv2|write\.ftable|write\.dcf|sink|write_delim|write_csv|write_csv2|write_excel_csv|write_excel_csv2|write_tsv|write_file|write_lines|write_rds)\s*\([\s\S]+?\s*,\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)\s*$/gm,
      ),
    ];
    for (let index = 0; index < baseMatches.length; index++) {
      const match = baseMatches[index];
      const path = match[2].trim();
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
      ...text.matchAll(
        /^[^#]*?(file|url|gzfile|bzfile|xzfile|unz|fifo)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s,]*(['"]{1,}[\s\S]+?['"]{1,})?[\s\S]*?\)/gm,
      ),
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

  /**
   * Extract author information from RMarkdown/Quarto YAML frontmatter
   * @param {string} text The file content
   * @returns {Array} Array of author strings found in the YAML header
   */
  getAuthors(text) {
    const authors = [];
    if (!text || text.trim() === '') {
      return authors;
    }

    // Extract YAML frontmatter
    const yamlMatch = text.match(/^---\s*\n([\s\S]*?)\n---/m);
    if (!yamlMatch) {
      return authors;
    }

    const yamlContent = yamlMatch[1];

    // Pattern 1: Simple string author: "John Doe" or author: "John Doe, Jane Doe"
    const simpleAuthorMatch = yamlContent.match(/^author:\s*["']([^"']+)["']\s*$/m);
    if (simpleAuthorMatch) {
      const authorString = simpleAuthorMatch[1];
      // Split by comma for multiple authors
      authorString.split(',').forEach(author => {
        const trimmed = author.trim();
        if (trimmed) {
          authors.push(trimmed);
        }
      });
      return authors;
    }

    // Pattern 2: Quarto nested name format - extract "given" and "family" fields
    // Matches patterns like:
    //   - name:
    //       given: Norah
    //       family: Jones
    const nestedNameRegex = /^[ \t]+-[ \t]+name:\s*\n((?:[ \t]+(?:given|family|literal):.+\n?)+)/gm;
    const nestedNameMatches = [...yamlContent.matchAll(nestedNameRegex)];
    nestedNameMatches.forEach(match => {
      const nameBlock = match[1];
      const given = nameBlock.match(/given:\s*(.+)$/m);
      const family = nameBlock.match(/family:\s*(.+)$/m);
      const literal = nameBlock.match(/literal:\s*(.+)$/m);
      
      if (literal) {
        authors.push(literal[1].trim());
      } else if (given || family) {
        const givenName = given ? given[1].trim() : '';
        const familyName = family ? family[1].trim() : '';
        const fullName = [givenName, familyName].filter(n => n).join(' ');
        if (fullName) {
          authors.push(fullName);
        }
      }
    });

    // Pattern 3: List format - extract all name: values from structured format (simple string names)
    // Matches: - name: Norah Jones
    const structuredNameMatches = [...yamlContent.matchAll(/^[ \t]+-[ \t]+name:\s*["']?([^"'\n:]+)["']?\s*$/gm)];
    structuredNameMatches.forEach(match => {
      const authorText = match[1].trim();
      if (authorText && !authors.includes(authorText)) {
        authors.push(authorText);
      }
    });

    // If we found authors from patterns 2 or 3, return them
    if (authors.length > 0) {
      return authors;
    }

    // Pattern 4: Simple list format (with or without additional metadata on same line)
    // author:
    //   - John Doe
    //   - Jane Doe, Institution
    // Also supports "authors:" field used by Quarto
    const listMatch = yamlContent.match(/^authors?:\s*\n((?:[ \t]+-[ \t]+.+\n?)+)/m);
    if (listMatch) {
      const listContent = listMatch[1];
      // Match each list item
      const items = listContent.matchAll(/^[ \t]+-[ \t]+(.+)$/gm);
      for (const item of items) {
        let authorText = item[1].trim();
        
        authorText = authorText.replace(/\^?\[.*?\]/g, '').trim();
        
        const commaIndex = authorText.indexOf(',');
        if (commaIndex > 0) {
          authorText = authorText.substring(0, commaIndex).trim();
        }
        
        if (authorText) {
          authors.push(authorText);
        }
      }
    }

    return authors;
  }
}
