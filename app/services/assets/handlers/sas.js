import BaseCodeHandler from './baseCode';

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

  getLibraries(text) {
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
    const includePathMatches = [...text.matchAll(/%inc(?:lude)?\s+'(.+)'\s?;/gim)];
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
    const includeRefMatches = [...text.matchAll(/%inc(?:lude)?\s+([^']+)\s?;/gim)];
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
