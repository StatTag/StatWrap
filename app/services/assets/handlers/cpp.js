import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

// C++ file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['cc', 'cpp', 'cxx', 'c++', 'h', 'hh', 'hpp', 'hxx', 'ipp', 'tpp', 'inl'];

export default class CppHandler extends BaseCodeHandler {
  static id = 'StatWrap.CppHandler';

  constructor() {
    super(CppHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return CppHandler.id;
  }

  getLibraryId(importName) {
    return importName || '(unknown)';
  }

  static _stripQuotes(value) {
    return value ? value.replace(/^['"]|['"]$/g, '').trim() : '';
  }

  static _isReadMode(mode) {
    if (!mode || mode.trim() === '') {
      return true;
    }

    const normalized = mode.toLowerCase();
    return /ios::in|\bin\b/.test(normalized);
  }

  static _isWriteMode(mode) {
    if (!mode || mode.trim() === '') {
      return false;
    }

    const normalized = mode.toLowerCase();
    return /ios::out|ios::app|ios::trunc|\bout\b|\bapp\b|\btrunc\b/.test(normalized);
  }

  static _isReadFOpenMode(mode) {
    const normalized = CppHandler._stripQuotes(mode).toLowerCase();
    return normalized.includes('r') || normalized.includes('+');
  }

  static _isWriteFOpenMode(mode) {
    const normalized = CppHandler._stripQuotes(mode).toLowerCase();
    return /[wax]/.test(normalized) || normalized.includes('+');
  }

  static _isReadPosixOpenMode(flags) {
    if (!flags || flags.trim() === '') {
      return true;
    }

    const normalized = flags.toLowerCase();
    return /o_rdonly|o_rdwr/.test(normalized);
  }

  static _isWritePosixOpenMode(flags) {
    if (!flags || flags.trim() === '') {
      return false;
    }

    const normalized = flags.toLowerCase();
    return /o_wronly|o_rdwr|o_creat|o_append|o_trunc/.test(normalized);
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const processed = new Set();
    const addInput = (operation, filePath) => {
      const normalizedPath = CppHandler._stripQuotes(filePath);
      const key = `${operation}:${normalizedPath}`;
      if (processed.has(key)) {
        return;
      }

      inputs.push({
        id: `${operation} - ${normalizedPath}`,
        type: Constants.DependencyType.DATA,
        path: normalizedPath,
      });
      processed.add(key);
    };

    const streamCtorMatches = [
      ...text.matchAll(
        /(?:^|[^\w])(?:std::)?(ifstream|fstream)\s+\w+\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^)]+))?\)/gim,
      ),
      ...text.matchAll(
        /(?:^|[^\w])(?:std::)?(ifstream|fstream)\s+\w+\s*\{\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^}]+))?\}/gim,
      ),
    ];
    for (let index = 0; index < streamCtorMatches.length; index++) {
      const match = streamCtorMatches[index];
      const streamType = (match[1] || '').toLowerCase();
      const filePath = match[2].trim();
      const mode = match[3];

      const isInput = streamType === 'ifstream' || CppHandler._isReadMode(mode);
      if (isInput) {
        addInput(streamType, filePath);
      }
    }

    const openMatches = [
      ...text.matchAll(/(?:^|[^\w])\w+\.open\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^)]+))?\)/gim),
      ...text.matchAll(/(?:^|[^\w])\w+\.open\s*\{\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^}]+))?\}/gim),
    ];
    for (let index = 0; index < openMatches.length; index++) {
      const match = openMatches[index];
      const filePath = match[1].trim();
      const mode = match[2];
      if (CppHandler._isReadMode(mode)) {
        addInput('open', filePath);
      }
    }

    const cFileMatches = [
      ...text.matchAll(/(?:^|[^\w])(fopen|freopen)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*,\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < cFileMatches.length; index++) {
      const match = cFileMatches[index];
      const operation = match[1];
      const filePath = match[2].trim();
      const mode = match[3];
      if (CppHandler._isReadFOpenMode(mode)) {
        addInput(operation, filePath);
      }
    }

    const posixOpenMatches = [
      ...text.matchAll(/(?:^|[^\w])(open)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*,\s*([^,)]+)[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < posixOpenMatches.length; index++) {
      const match = posixOpenMatches[index];
      const operation = match[1];
      const filePath = match[2].trim();
      const flags = match[3];
      if (CppHandler._isReadPosixOpenMode(flags)) {
        addInput(operation, filePath);
      }
    }

    return inputs;
  }

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const processed = new Set();
    const addOutput = (operation, filePath) => {
      const normalizedPath = CppHandler._stripQuotes(filePath);
      const key = `${operation}:${normalizedPath}`;
      if (processed.has(key)) {
        return;
      }

      outputs.push({
        id: `${operation} - ${normalizedPath}`,
        type: Constants.DependencyType.DATA,
        path: normalizedPath,
      });
      processed.add(key);
    };

    const streamCtorMatches = [
      ...text.matchAll(
        /(?:^|[^\w])(?:std::)?(ofstream|fstream)\s+\w+\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^)]+))?\)/gim,
      ),
      ...text.matchAll(
        /(?:^|[^\w])(?:std::)?(ofstream|fstream)\s+\w+\s*\{\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^}]+))?\}/gim,
      ),
    ];
    for (let index = 0; index < streamCtorMatches.length; index++) {
      const match = streamCtorMatches[index];
      const streamType = (match[1] || '').toLowerCase();
      const filePath = match[2].trim();
      const mode = match[3];

      const isOutput =
        streamType === 'ofstream' ||
        CppHandler._isWriteMode(mode) ||
        (streamType === 'fstream' && !mode);
      if (isOutput) {
        addOutput(streamType, filePath);
      }
    }

    const openMatches = [
      ...text.matchAll(/(?:^|[^\w])\w+\.open\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^)]+))?\)/gim),
      ...text.matchAll(/(?:^|[^\w])\w+\.open\s*\{\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*(?:,\s*([^}]+))?\}/gim),
    ];
    for (let index = 0; index < openMatches.length; index++) {
      const match = openMatches[index];
      const filePath = match[1].trim();
      const mode = match[2];
      if (CppHandler._isWriteMode(mode)) {
        addOutput('open', filePath);
      }
    }

    const cFileMatches = [
      ...text.matchAll(/(?:^|[^\w])(fopen|freopen)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*,\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < cFileMatches.length; index++) {
      const match = cFileMatches[index];
      const operation = match[1];
      const filePath = match[2].trim();
      const mode = match[3];
      if (CppHandler._isWriteFOpenMode(mode)) {
        addOutput(operation, filePath);
      }
    }

    const posixOpenMatches = [
      ...text.matchAll(/(?:^|[^\w])(open)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})\s*,\s*([^,)]+)[\s\S]*?\)/gim),
      ...text.matchAll(/(?:^|[^\w])(creat)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < posixOpenMatches.length; index++) {
      const match = posixOpenMatches[index];
      const operation = match[1];
      const filePath = match[2].trim();
      const flags = match[3];

      const isOutput = operation === 'creat' || CppHandler._isWritePosixOpenMode(flags);
      if (isOutput) {
        addOutput(operation, filePath);
      }
    }

    return outputs;
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    const matches = [...text.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const rawImport = match[1].trim();
      const includeName = rawImport.slice(1, rawImport.length - 1).trim();
      const includeType = rawImport.startsWith('<') ? 'system' : 'local';
      libraries.push({
        id: this.getLibraryId(includeName),
        module: includeType,
        import: includeName,
        alias: null,
      });
    }

    return libraries;
  }
}