import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

const FILE_EXTENSION_LIST = ['c', 'h'];

export default class CHandler extends BaseCodeHandler {
  static id = 'StatWrap.CHandler';

  constructor() {
    super(CHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return CHandler.id;
  }

  getLibraryId(moduleName, importName) {
    return moduleName || importName || '(unknown)';
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    const includeMatches = [...text.matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)];
    for (let index = 0; index < includeMatches.length; index++) {
      const match = includeMatches[index];
      const includePath = match[1].trim();
      libraries.push({
        id: includePath,
        module: includePath,
        import: includePath,
        alias: null,
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

    const fopenMatches = [
      ...text.matchAll(/fopen\s*\(\s*(['"][^'"]+['"])\s*,\s*(['"])([^'"]*)\2\s*\)/gim),
    ];
    for (let index = 0; index < fopenMatches.length; index++) {
      const match = fopenMatches[index];
      const filePath = match[1].trim();
      const mode = (match[3] || '').toLowerCase();
      if ((mode.includes('r') || mode.includes('+')) && !processedPaths.has(filePath.toLowerCase())) {
        inputs.push({
          id: `File Read (fopen) - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath.toLowerCase());
      }
    }

    const freopenMatches = [
      ...text.matchAll(/freopen\s*\(\s*(['"][^'"]+['"])\s*,\s*(['"])([^'"]*)\2\s*,[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < freopenMatches.length; index++) {
      const match = freopenMatches[index];
      const filePath = match[1].trim();
      const mode = (match[3] || '').toLowerCase();
      if ((mode.includes('r') || mode.includes('+')) && !processedPaths.has(filePath.toLowerCase())) {
        inputs.push({
          id: `File Read (freopen) - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath.toLowerCase());
      }
    }

    const openMatches = [...text.matchAll(/\bopen\s*\(\s*(['"][^'"]+['"])\s*,\s*([^,\)]+(?:\|[^,\)]+)*)/gim)];
    for (let index = 0; index < openMatches.length; index++) {
      const match = openMatches[index];
      const filePath = match[1].trim();
      const flags = (match[2] || '').toUpperCase();
      const isRead = flags.includes('O_RDONLY') || flags.includes('O_RDWR');
      if (isRead && !processedPaths.has(filePath.toLowerCase())) {
        inputs.push({
          id: `File Read (open) - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath.toLowerCase());
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

    const fopenMatches = [
      ...text.matchAll(/fopen\s*\(\s*(['"][^'"]+['"])\s*,\s*(['"])([^'"]*)\2\s*\)/gim),
    ];
    for (let index = 0; index < fopenMatches.length; index++) {
      const match = fopenMatches[index];
      const filePath = match[1].trim();
      const mode = (match[3] || '').toLowerCase();
      const isWrite = mode.includes('w') || mode.includes('a') || mode.includes('x') || mode.includes('+');
      if (isWrite && !processedPaths.has(filePath.toLowerCase())) {
        outputs.push({
          id: `File Write (fopen) - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath.toLowerCase());
      }
    }

    const freopenMatches = [
      ...text.matchAll(/freopen\s*\(\s*(['"][^'"]+['"])\s*,\s*(['"])([^'"]*)\2\s*,[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < freopenMatches.length; index++) {
      const match = freopenMatches[index];
      const filePath = match[1].trim();
      const mode = (match[3] || '').toLowerCase();
      const isWrite = mode.includes('w') || mode.includes('a') || mode.includes('x') || mode.includes('+');
      if (isWrite && !processedPaths.has(filePath.toLowerCase())) {
        outputs.push({
          id: `File Write (freopen) - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath.toLowerCase());
      }
    }

    const openMatches = [...text.matchAll(/\bopen\s*\(\s*(['"][^'"]+['"])\s*,\s*([^,\)]+(?:\|[^,\)]+)*)/gim)];
    for (let index = 0; index < openMatches.length; index++) {
      const match = openMatches[index];
      const filePath = match[1].trim();
      const flags = (match[2] || '').toUpperCase();
      const isWrite =
        flags.includes('O_WRONLY') ||
        flags.includes('O_RDWR') ||
        flags.includes('O_CREAT') ||
        flags.includes('O_APPEND') ||
        flags.includes('O_TRUNC');
      if (isWrite && !processedPaths.has(filePath.toLowerCase())) {
        outputs.push({
          id: `File Write (open) - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath.toLowerCase());
      }
    }

    const creatMatches = [...text.matchAll(/\bcreat\s*\(\s*(['"][^'"]+['"])/gim)];
    for (let index = 0; index < creatMatches.length; index++) {
      const match = creatMatches[index];
      const filePath = match[1].trim();
      if (!processedPaths.has(filePath.toLowerCase())) {
        outputs.push({
          id: `File Write (creat) - ${filePath}`,
          type: Constants.DependencyType.DATA,
          path: filePath,
        });
        processedPaths.add(filePath.toLowerCase());
      }
    }

    return outputs;
  }
}
