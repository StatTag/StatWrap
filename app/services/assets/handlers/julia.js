import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

// Julia file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['jl'];

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

    // open("file", "r") or open("file") for reading
    const openReadMatches = [
      ...text.matchAll(/^[^#]*?open\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})\s*(?:,\s*['"]{1,}r['"]{1,})?\s*\)/gim),
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
      ...text.matchAll(/^[^#]*?(?<!\.)(?:read|readlines|readline)\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
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
      ...text.matchAll(/^[^#]*?CSV\.(?:read|File)\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
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

    // load("file") - for JLD/JLD2/MAT etc.
    const loadMatches = [
      ...text.matchAll(/^[^#]*?(?:load|@load)\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/^[^#]*?@load\s+(['"]{1,}[\s\S]+?['"]{1,})/gim),
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

    // open("file", "w"/"a"/"w+"/"a+") for writing
    const openWriteMatches = [
      ...text.matchAll(/^[^#]*?open\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})\s*,\s*['"]{1,}[wa][+]?['"]{1,}\s*\)/gim),
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
      ...text.matchAll(/^[^#]*?(?<!\.)write\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
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
      ...text.matchAll(/^[^#]*?CSV\.write\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
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

    // savefig("file") for Plots.jl / Makie.jl
    const savefigMatches = [
      ...text.matchAll(/^[^#]*?savefig\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
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

    // save("file", ...) and @save "file" ... - for JLD/JLD2/MAT etc.
    const saveMatches = [
      ...text.matchAll(/^[^#]*?save\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/^[^#]*?@save\s+(['"]{1,}[\s\S]+?['"]{1,})/gim),
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

    // using Package or using Package: func1, func2
    const usingMatches = [
      ...text.matchAll(/^[^#]*?using\s+([\w.]+)(?:\s*:\s*([\w,\s!.]+))?/gim),
    ];
    for (const match of usingMatches) {
      const moduleName = match[1].trim();
      const importName = match[2] ? match[2].trim() : null;
      libraries.push({
        id: this.getLibraryId(moduleName, importName),
        module: moduleName,
        import: importName,
        alias: null,
      });
    }

    // import Package or import Package: func1, func2 or import Package as Alias
    const importMatches = [
      ...text.matchAll(/^[^#]*?import\s+([\w.]+)(?:\s*:\s*([\w,\s!.]+))?(?:\s+as\s+(\w+))?/gim),
    ];
    const seenModules = new Set(libraries.map((l) => l.module));
    for (const match of importMatches) {
      const moduleName = match[1].trim();
      const importName = match[2] ? match[2].trim() : null;
      const alias = match[3] ? match[3].trim() : null;
      if (!seenModules.has(moduleName)) {
        libraries.push({
          id: this.getLibraryId(moduleName, importName),
          module: moduleName,
          import: importName,
          alias,
        });
        seenModules.add(moduleName);
      }
    }

    return libraries;
  }
}
