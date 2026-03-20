import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

const FILE_EXTENSION_LIST = ['go'];

export default class GoHandler extends BaseCodeHandler {
  static id = 'StatWrap.GoHandler';

  constructor() {
    super(GoHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return GoHandler.id;
  }

  getLibraryId(moduleName, importName) {
    return moduleName || importName || '(unknown)';
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    // Typical Go file read operations:

    const fileMatches = [
      ...text.matchAll(/(?:os|ioutil)\.(?:Open|ReadFile)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[1].trim();
      inputs.push({
        id: `File Read - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    const dbMatches = [
      ...text.matchAll(/sql\.Open\s*\(\s*['"]{1,}[\s\S]+?['"]{1,}\s*,\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim)
    ];
    for (let index = 0; index < dbMatches.length; index++) {
      const match = dbMatches[index];
      const path = match[1].trim();
      inputs.push({
        id: `DB Conn - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    return inputs;
  }

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    // Typical Go file write operations:

    const fileMatches = [
      ...text.matchAll(/(?:os|ioutil)\.(?:Create|WriteFile)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[1].trim();
      outputs.push({
        id: `File Write - ${path}`,
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

    // Go imports can be single-line or multiple line or they could go with aliases.

    const singleLineMatches = [
      ...text.matchAll(/^import\s+(?:([a-zA-Z0-9_.]*)\s+)?(['"]([^'"]+)['"])/gm),
    ];
    for (let index = 0; index < singleLineMatches.length; index++) {
      const match = singleLineMatches[index];
      const alias = match[1] || null;
      const importPath = match[3];

      libraries.push({
        id: importPath,
        module: importPath,
        import: importPath,
        alias,
      });
    }

    // Extract import blocks: import 
    const blockRegex = /import\s*\(\s*([\s\S]*?)\s*\)/gm;
    let blockMatch;
    while ((blockMatch = blockRegex.exec(text)) !== null) {
      const blockContent = blockMatch[1];
      // Inside the block, match for aliases and import paths
      const innerMatches = [
        ...blockContent.matchAll(/(?:([a-zA-Z0-9_.]*)\s+)?(?:['"]([^'"]+)['"])/g),
      ];
      for (let index = 0; index < innerMatches.length; index++) {
        const innerMatch = innerMatches[index];
        const alias = innerMatch[1] || null;
        const importPath = innerMatch[2];

        // Ensure we actually got an import path
        if (importPath) {
          libraries.push({
            id: importPath,
            module: importPath,
            import: importPath,
            alias,
          });
        }
      }
    }

    return libraries;
  }
}
