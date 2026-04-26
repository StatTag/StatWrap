import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

// Julia file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['jl'];

// Matches a single-quoted or double-quoted string without spanning into adjacent quoted strings.
const QUOTED_STRING = '(?:"[^"]*"|\'[^\']*\')';

export default class JuliaHandler extends BaseCodeHandler {
  static id = 'StatWrap.JuliaHandler';

  constructor() {
    super(JuliaHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return JuliaHandler.id;
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

    const processedPaths = new Set();

    // open("file") or open("file", "r") for reading, including do-block form:
    //   open("file") do io ... end
    //   open("file", "r") do io ... end
    // Excluded: write/append modes — after the path, only an optional ", "r"" satisfies
    // the regex before ")", so open("file", "w") will not match here.
    const openReadMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?open\\s*\\(\\s*(${QUOTED_STRING})\\s*(?:,\\s*(?:"r"|'r'))?\\s*\\)`,
        'gim'
      )),
    ];
    for (const match of openReadMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `open - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // read("file", String) and readlines/readline (not CSV.read etc.)
    const readMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?(?<!\\.)(?:read|readlines|readline)\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of readMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `read - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // CSV.read("file", ...) or CSV.File("file")
    const csvReadMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?CSV\\.(?:read|File)\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of csvReadMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `CSV.read - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // readdlm("file", ...) from DelimitedFiles standard library
    const readdlmMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?readdlm\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of readdlmMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `readdlm - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // deserialize("file") from Serialization standard library
    const deserializeMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?deserialize\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of deserializeMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `deserialize - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // load("file") and @load "file" - for JLD2/MAT/FileIO etc.
    const loadMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?load\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
      ...text.matchAll(new RegExp(
        `^[^#]*?@load\\s+(${QUOTED_STRING})`,
        'gim'
      )),
    ];
    for (const match of loadMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `load - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    return inputs;
  }

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const processedPaths = new Set();

    // open("file", "w"/"a"/"w+"/"a+") for writing, including do-block form:
    //   open("file", "w") do io ... end
    const openWriteMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?open\\s*\\(\\s*(${QUOTED_STRING})\\s*,\\s*(?:"[wa][+]?"|'[wa][+]?')\\s*\\)`,
        'gim'
      )),
    ];
    for (const match of openWriteMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `open - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // write("file", content) (not CSV.write etc.)
    const writeMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?(?<!\\.)write\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of writeMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `write - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // CSV.write("file", df)
    const csvWriteMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?CSV\\.write\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of csvWriteMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `CSV.write - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // writedlm("file", data, ...) from DelimitedFiles standard library
    const writedlmMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?writedlm\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of writedlmMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `writedlm - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // savefig("file") for Plots.jl / Makie.jl
    const savefigMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?savefig\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of savefigMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `savefig - ${filePath}`,
          type: Constants.DependencyType.FIGURE,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // serialize("file", obj) from Serialization standard library
    const serializeMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?serialize\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
    ];
    for (const match of serializeMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `serialize - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // save("file", ...) and @save "file" ... - for JLD2/FileIO etc.
    const saveMatches = [
      ...text.matchAll(new RegExp(
        `^[^#]*?save\\s*\\(\\s*(${QUOTED_STRING})[\\s\\S]*?\\)`,
        'gim'
      )),
      ...text.matchAll(new RegExp(
        `^[^#]*?@save\\s+(${QUOTED_STRING})`,
        'gim'
      )),
    ];
    for (const match of saveMatches) {
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `save - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    return outputs;
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    const seenModules = new Set();

    // using Package: func1, func2 (specific imports from one package, WITH colon)
    // \.{0,2} handles relative imports: ..Statistics, .Module
    // [ \t]+ (not \s+) prevents the import list from spanning to the next line
    const usingSpecificMatches = [
      ...text.matchAll(/^[^#]*?using\s+(\.{0,2}[\w.]+)[ \t]*:[ \t]*([\w,!. \t]+)/gim),
    ];
    for (const match of usingSpecificMatches) {
      const moduleName = match[1].trim();
      const importName = match[2].trim();
      if (!seenModules.has(moduleName)) {
        libraries.push({
          id: this.getLibraryId(moduleName, importName),
          module: moduleName,
          import: importName,
          alias: null,
        });
        seenModules.add(moduleName);
      }
    }

    // using Package or using Package1, Package2, Package3 (WITHOUT colon)
    // Positive lookahead (?=[ \t]*(?:#|$)) anchors to end-of-line, preventing the regex
    // engine from backtracking [\w.]+ to a shorter match when "using A: f" is present.
    const usingGeneralMatches = [
      ...text.matchAll(/^[^#]*?using\s+(\.{0,2}[\w.]+(?:[ \t]*,[ \t]*\.{0,2}[\w.]+)*)(?=[ \t]*(?:#|$))/gim),
    ];
    for (const match of usingGeneralMatches) {
      const packages = match[1].split(',').map((p) => p.trim()).filter(Boolean);
      for (const pkg of packages) {
        if (!seenModules.has(pkg)) {
          libraries.push({
            id: pkg,
            module: pkg,
            import: null,
            alias: null,
          });
          seenModules.add(pkg);
        }
      }
    }

    // import Package: func1, func2 (specific imports WITH colon)
    const importSpecificMatches = [
      ...text.matchAll(/^[^#]*?import\s+(\.{0,2}[\w.]+)\s*:\s*([\w,!. \t]+)/gim),
    ];
    for (const match of importSpecificMatches) {
      const moduleName = match[1].trim();
      const importName = match[2].trim();
      if (!seenModules.has(moduleName)) {
        libraries.push({
          id: this.getLibraryId(moduleName, importName),
          module: moduleName,
          import: importName,
          alias: null,
        });
        seenModules.add(moduleName);
      }
    }

    // import Package as Alias (single module with alias)
    const importAliasMatches = [
      ...text.matchAll(/^[^#]*?import\s+(\.{0,2}[\w.]+)[ \t]+as[ \t]+(\w+)/gim),
    ];
    for (const match of importAliasMatches) {
      const moduleName = match[1].trim();
      const alias = match[2].trim();
      if (!seenModules.has(moduleName)) {
        libraries.push({
          id: moduleName,
          module: moduleName,
          import: null,
          alias,
        });
        seenModules.add(moduleName);
      }
    }

    // import Package or import Package1, Package2, Package3 (WITHOUT colon or alias)
    // Same positive end-of-line lookahead as usingGeneralMatches to prevent backtracking issues.
    const importGeneralMatches = [
      ...text.matchAll(/^[^#]*?import\s+(\.{0,2}[\w.]+(?:[ \t]*,[ \t]*\.{0,2}[\w.]+)*)(?=[ \t]*(?:#|$))/gim),
    ];
    for (const match of importGeneralMatches) {
      const packages = match[1].split(',').map((p) => p.trim()).filter(Boolean);
      for (const pkg of packages) {
        if (!seenModules.has(pkg)) {
          libraries.push({
            id: pkg,
            module: pkg,
            import: null,
            alias: null,
          });
          seenModules.add(pkg);
        }
      }
    }

    return libraries;
  }
}
