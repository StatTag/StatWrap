import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

// SAS file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['sas'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.SASHandler'
 * }
 */
export default class SASHandler extends BaseCodeHandler {
  static id = 'StatWrap.SASHandler';

  constructor() {
    super(SASHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return SASHandler.id;
  }

  getLibraryId(packageName) {
    return packageName || '(unknown)';
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const procMatches = [
      ...text.matchAll(
        /^\s*(proc import)\b[\S\s]*?(?:datafile)\s*?=\s*?(["'][\s\S]*?["'])[\S\s]*?;[\s]*?$/gim
      )
    ];
    for (let index = 0; index < procMatches.length; index++) {
      const match = procMatches[index];
      const path = match[2].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    const infileMatches = [
      ...text.matchAll(/^\s*(infile)\b[\S\s]*?(["'][\s\S]*?["'])[\S\s]*?;[\s]*?$/gim)
    ];
    for (let index = 0; index < infileMatches.length; index++) {
      const match = infileMatches[index];
      const path = match[2].trim();
      inputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
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
        /^\s*(ods pdf|ods epub|ods epub2|ods epub3|ods pcl|ods powerpoint|ods ps|ods rtf|ods word)\b[\S\s]*?file\s*?=\s*?(["'][\s\S]*?["'])[\S\s]*?;[\s]*?$/gim
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

    const dataMatches = [
      ...text.matchAll(
        /^\s*(ods chtml|ods csv|ods csvall|ods markup|ods excel|ods html|ods html3|ods html5|ods phtml)\b[\S\s]*?(?:body|file|path)\s*?=\s*?(["'][\s\S]*?["'])[\S\s]*?;[\s]*?$/gim
      )
    ];
    for (let index = 0; index < dataMatches.length; index++) {
      const match = dataMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    const procMatches = [
      ...text.matchAll(
        /^\s*(proc export)\b[\S\s]*?(?:outfile)\s*?=\s*?(["'][\s\S]*?["'])[\S\s]*?;[\s]*?$/gim
      )
    ];
    for (let index = 0; index < procMatches.length; index++) {
      const match = procMatches[index];
      const path = match[2].trim();
      outputs.push({
        id: `${match[1]} - ${path}`,
        type: Constants.DependencyType.DATA,
        path
      });
    }

    return outputs;
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    // We need to collect and then resolve references to macro libraries.  This
    // can be done in multiple parts for SAS macros.  You can import a file using
    // its path, or you can create a `fileref` and import that.
    // See:
    //  %include - https://documentation.sas.com/doc/en/vdmmlcdc/1.0/lestmtsref/p1s3uhhqtscz2sn1otiatbovfn1t.htm
    //  filename - https://documentation.sas.com/doc/en/vdmmlcdc/1.0/lestmtsref/p05r9vhhqbhfzun1qo9mw64s4700.htm

    // Import of full file paths
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - included file name
    const includePathMatches = [...text.matchAll(/%inc(?:lude)?\s+['"](.+)['"]\s?;/gim)];
    for (let index = 0; index < includePathMatches.length; index++) {
      const match = includePathMatches[index];
      libraries.push({
        id: this.getLibraryId(match[1]),
        package: match[1]
      });
    }

    // Import of references
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - included reference
    const includeRefMatches = [...text.matchAll(/%inc(?:lude)?\s+([^'"]+?)\s?;/gim)];
    for (let index = 0; index < includeRefMatches.length; index++) {
      const match = includeRefMatches[index];
      const matchName = match[1].trim();
      libraries.push({
        id: this.getLibraryId(matchName),
        package: matchName
      });
    }

    // File references
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - fileref label
    // 2 - path to file
    const referenceMatches = [
      ...text.matchAll(/filename\s+(.+)\s+'(.+)'\s?(?:encoding\s?=\s?".*")?;/gim)
    ];
    for (let index = 0; index < referenceMatches.length; index++) {
      const match = referenceMatches[index];
      libraries.push({
        id: this.getLibraryId(match[1]),
        package: match[2]
      });
    }

    // Library references
    // For this regex, the match groups:
    // 0 - full match (not used)
    // 1 - libname alias
    // 2 - SAS library
    const libnameMatches = [...text.matchAll(/libname\s+(.+)\s+'(.+)'\s?;/gim)];
    for (let index = 0; index < libnameMatches.length; index++) {
      const match = libnameMatches[index];
      libraries.push({
        id: this.getLibraryId(match[1]),
        package: match[2]
      });
    }

    return libraries;
  }
}
