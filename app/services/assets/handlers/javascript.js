import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

// JavaScript file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['js', 'jsx', 'mjs', 'cjs'];

export default class JavaScriptHandler extends BaseCodeHandler {
  static id = 'StatWrap.JavaScriptHandler';

  constructor() {
    super(JavaScriptHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return JavaScriptHandler.id;
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

    // fs.readFileSync('file') and fs.readFile('file', ...)
    const readMatches = [
      ...text.matchAll(/fs\.(?:readFileSync|readFile)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < readMatches.length; index++) {
      const match = readMatches[index];
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `readFile - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // fs.createReadStream('file')
    const streamMatches = [
      ...text.matchAll(/fs\.createReadStream\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < streamMatches.length; index++) {
      const match = streamMatches[index];
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        inputs.push({
          id: `createReadStream - ${filePath}`,
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

    // fs.writeFileSync('file') and fs.writeFile('file', ...)
    const writeMatches = [
      ...text.matchAll(/fs\.(?:writeFileSync|writeFile|appendFile|appendFileSync)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < writeMatches.length; index++) {
      const match = writeMatches[index];
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `writeFile - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath);
      }
    }

    // fs.createWriteStream('file')
    const streamMatches = [
      ...text.matchAll(/fs\.createWriteStream\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < streamMatches.length; index++) {
      const match = streamMatches[index];
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath)) {
        outputs.push({
          id: `createWriteStream - ${filePath}`,
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

    // ES module imports: import x from 'module', import { x } from 'module', import * as x from 'module'
    const esImportMatches = [
      ...text.matchAll(/^[^/]*?import\s+(?:(\*\s+as\s+\w+|\{[^}]*\}|\w+))\s+from\s+(['"]{1,}[\s\S]+?['"]{1,})/gim),
    ];
    for (let index = 0; index < esImportMatches.length; index++) {
      const match = esImportMatches[index];
      const importName = match[1].trim();
      const moduleName = match[2].trim().replace(/['"]/g, '');
      libraries.push({
        id: this.getLibraryId(moduleName, importName),
        module: moduleName,
        import: importName,
        alias: null,
      });
    }

    // Side-effect imports: import 'module'
    const sideEffectMatches = [
      ...text.matchAll(/^[^/]*?import\s+(['"]{1,}[\s\S]+?['"]{1,})/gim),
    ];
    for (let index = 0; index < sideEffectMatches.length; index++) {
      const match = sideEffectMatches[index];
      const moduleName = match[1].trim().replace(/['"]/g, '');
      libraries.push({
        id: moduleName,
        module: moduleName,
        import: null,
        alias: null,
      });
    }

    // CommonJS require: require('module') or const x = require('module')
    const requireMatches = [
      ...text.matchAll(/^[^/]*?(?:const|let|var)\s+(?:\{[^}]*\}|\w+)\s*=\s*require\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})\s*\)/gim),
      ...text.matchAll(/^[^/]*?require\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})\s*\)/gim),
    ];
    const seenModules = new Set(libraries.map((l) => l.module));
    for (let index = 0; index < requireMatches.length; index++) {
      const match = requireMatches[index];
      const moduleName = match[1].trim().replace(/['"]/g, '');
      if (!seenModules.has(moduleName)) {
        libraries.push({
          id: moduleName,
          module: moduleName,
          import: null,
          alias: null,
        });
        seenModules.add(moduleName);
      }
    }

    return libraries;
  }
}
