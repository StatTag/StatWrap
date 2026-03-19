import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

const FILE_EXTENSION_LIST = ['rs'];

export default class RustHandler extends BaseCodeHandler {
  static id = 'StatWrap.RustHandler';

  constructor() {
    super(RustHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return RustHandler.id;
  }

  getLibraryId(moduleName, importName) {
    return moduleName || importName || '(unknown)';
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    // First we extract the base and the braces part
    const useBlockMatches = [
      ...text.matchAll(/^\s*use\s+([a-zA-Z0-9_:]+)::\s*\{([^}]+)\};/gm),
    ];
    for (let index = 0; index < useBlockMatches.length; index++) {
      const match = useBlockMatches[index];
      const basePath = match[1];
      const importsStr = match[2];

      const imports = importsStr.split(',').map((i) => i.trim()).filter((i) => i.length > 0);
      for (const imp of imports) {
        let actualImport = imp;
        let alias = null;

        // handle `path as alias`
        if (imp.includes(' as ')) {
          [actualImport, alias] = imp.split(/\s+as\s+/).map((s) => s.trim());
        }

        let fullPath = basePath;
        if (actualImport !== 'self') {
          fullPath = `${basePath}::${actualImport}`;
        }

        libraries.push({
          id: fullPath,
          module: basePath,
          import: fullPath,
          alias,
        });
      }
    }

    // Match single `use` like `use std::fs;` or `use std::fs as filesystem;`
    const useMatches = [
      ...text.matchAll(/^\s*use\s+([a-zA-Z0-9_:]+)(?:\s+as\s+([a-zA-Z0-9_]+))?\s*;/gm),
    ];
    for (let index = 0; index < useMatches.length; index++) {
      const match = useMatches[index];
      const fullPath = match[1];
      const alias = match[2] || null;

      // Extract the base module (everything before the last ::), or just the module if it has no ::
      let modulePath = fullPath;
      if (fullPath.includes('::')) {
        const parts = fullPath.split('::');
        parts.pop();
        modulePath = parts.join('::');
      }

      libraries.push({
        id: fullPath,
        module: modulePath,
        import: fullPath,
        alias,
      });
    }

    // Match `extern crate name;` or `extern crate name as alias;`
    const externMatches = [
      ...text.matchAll(/^\s*extern\s+crate\s+([a-zA-Z0-9_]+)(?:\s+as\s+([a-zA-Z0-9_]+))?\s*;/gm),
    ];
    for (let index = 0; index < externMatches.length; index++) {
      const match = externMatches[index];
      const crateName = match[1];
      const alias = match[2] || null;

      libraries.push({
        id: crateName,
        module: crateName,
        import: crateName,
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

    // Match File::open("path") or OpenOptions::new()...open("path")
    const fileOpenMatches = [
      ...text.matchAll(/(?:\.|::)open\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < fileOpenMatches.length; index++) {
      const match = fileOpenMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        inputs.push({
          id: `File Read (open) - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
      }
    }

    // Match fs::read_to_string("path") or fs::read("path")
    const fsReadMatches = [
      ...text.matchAll(/(?:fs::|std::fs::)(?:read_to_string|read)\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < fsReadMatches.length; index++) {
      const match = fsReadMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        inputs.push({
          id: `File Read (fs::read) - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
      }
    }

    // Match Connection::open("path") for SQLite
    const dbOpenMatches = [
      ...text.matchAll(/Connection::open\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < dbOpenMatches.length; index++) {
      const match = dbOpenMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        inputs.push({
          id: `DB Conn - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
      }
    }

    // Match BufReader::new(file_path)
    const bufReaderMatches = [
      ...text.matchAll(/BufReader::new\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < bufReaderMatches.length; index++) {
      const match = bufReaderMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        inputs.push({
          id: `BufReader - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
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

    // Match File::create("path")
    const fileCreateMatches = [
      ...text.matchAll(/(?:File::|std::fs::File::)create\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < fileCreateMatches.length; index++) {
      const match = fileCreateMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        outputs.push({
          id: `File Write (create) - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
      }
    }

    // Match fs::write("path", data)
    const fsWriteMatches = [
      ...text.matchAll(/(?:fs::|std::fs::)write\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < fsWriteMatches.length; index++) {
      const match = fsWriteMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        outputs.push({
          id: `File Write (fs::write) - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
      }
    }

    // Match OpenOptions::new()...open("path") (write mode)
    const openOptionsWriteRegex = /(?:create|write|append)\s*\(\s*true\s*\)[\s\S]*?\.open\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim;
    const openOptionsWriteMatches = [...text.matchAll(openOptionsWriteRegex)];
    for (let index = 0; index < openOptionsWriteMatches.length; index++) {
      const match = openOptionsWriteMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        outputs.push({
          id: `File Write (OpenOptions) - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
      }
    }
    
    // Match BufWriter::new(file_path) (if passing string instead of File object)
    const bufWriterMatches = [
      ...text.matchAll(/BufWriter::new\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];
    for (let index = 0; index < bufWriterMatches.length; index++) {
      const match = bufWriterMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path.toLowerCase())) {
        outputs.push({
          id: `BufWriter - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path.toLowerCase());
      }
    }

    return outputs;
  }
}
