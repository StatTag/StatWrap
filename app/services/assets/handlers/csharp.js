import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

const FILE_EXTENSION_LIST = ['cs', 'csx'];

export default class CSharpHandler extends BaseCodeHandler {
  static id = 'StatWrap.CSharpHandler';

  constructor() {
    super(CSharpHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return CSharpHandler.id;
  }

  getLibraryId(moduleName, importName) {
    if (moduleName && importName) {
      return `${moduleName}.${importName}`;
    }
    return moduleName || importName || '(unknown)';
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    const usingMatches = [
      ...text.matchAll(/^\s*using\s+(?:static\s+)?([A-Za-z_][A-Za-z0-9_\.]*)\s*;/gm),
      ...text.matchAll(/^\s*using\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_\.]*)\s*;/gm),
    ];

    for (let index = 0; index < usingMatches.length; index++) {
      const match = usingMatches[index];
      const isAlias = !!match[2];
      const fullImport = isAlias ? match[2] : match[1];
      const alias = isAlias ? match[1] : null;
      const lastDotIndex = fullImport.lastIndexOf('.');

      const moduleName = lastDotIndex === -1 ? fullImport : fullImport.substring(0, lastDotIndex);
      const importName = lastDotIndex === -1 ? null : fullImport.substring(lastDotIndex + 1);

      libraries.push({
        id: this.getLibraryId(moduleName, importName),
        module: moduleName,
        import: importName,
        alias,
      });
    }

    return libraries;
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const processedPaths = new Set();
    const addInput = (operation, filePath) => {
      const path = filePath.trim();
      const key = path.toLowerCase();
      if (processedPaths.has(key)) {
        return;
      }

      inputs.push({
        id: `${operation} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
      processedPaths.add(key);
    };

    const readMatches = [
      ...text.matchAll(/File\.(?:ReadAllText|ReadAllLines|ReadAllBytes|OpenRead)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/new\s+StreamReader\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/new\s+FileStream\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*,\s*FileMode\.(?:Open|OpenOrCreate)[\s\S]*?\)/gim),
    ];

    for (let index = 0; index < readMatches.length; index++) {
      const match = readMatches[index];
      const operation = (match[0].match(/File\.[A-Za-z]+|StreamReader|FileStream/) || ['Read'])[0];
      addInput(operation, match[1]);
    }

    return inputs;
  }

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const processedPaths = new Set();
    const addOutput = (operation, filePath) => {
      const path = filePath.trim();
      const key = path.toLowerCase();
      if (processedPaths.has(key)) {
        return;
      }

      outputs.push({
        id: `${operation} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
      processedPaths.add(key);
    };

    const writeMatches = [
      ...text.matchAll(/File\.(?:WriteAllText|WriteAllLines|WriteAllBytes|AppendAllText|Create|OpenWrite)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/new\s+StreamWriter\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/new\s+FileStream\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*,\s*FileMode\.(?:Create|CreateNew|Append|Truncate)[\s\S]*?\)/gim),
    ];

    for (let index = 0; index < writeMatches.length; index++) {
      const match = writeMatches[index];
      const operation = (match[0].match(/File\.[A-Za-z]+|StreamWriter|FileStream/) || ['Write'])[0];
      addOutput(operation, match[1]);
    }

    return outputs;
  }
}
