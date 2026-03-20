import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

const FILE_EXTENSION_LIST = ['dart'];

export default class DartHandler extends BaseCodeHandler {
  static id = 'StatWrap.DartHandler';

  constructor() {
    super(DartHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return DartHandler.id;
  }

  getLibraryId(moduleName, importName) {
    return moduleName || importName || '(unknown)';
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const processedPaths = new Set();

    // Typical Dart file read operations:
    // e.g. File('path/to/file')
    const fileMatches = [
      ...text.matchAll(/File\s*\(\s*(['"]{1}[^'"]+['"]{1})\s*\)/gim),
      ...text.matchAll(/loadString\s*\(\s*(['"]{1}[^'"]+['"]{1})\s*\)/gim),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path)) {
        inputs.push({
          id: `File Read - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path);
      }
    }

    // Typical SQLite/database open operations:
    // e.g. openDatabase('my_db.db')
    const dbMatches = [
      ...text.matchAll(/openDatabase\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})[\s\S]*?\)/gim)
    ];
    for (let index = 0; index < dbMatches.length; index++) {
      const match = dbMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path)) {
        inputs.push({
          id: `DB Conn - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path);
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

    // Typical Dart file write operations:
    // e.g. File('path/to/file').writeAsString()
    const fileMatches = [
      ...text.matchAll(/File\s*\(\s*(['"]{1,}[\s\S]+?['"]{1,})\s*\)\s*\.\s*write[a-zA-Z]*\s*\(/gim),
    ];
    for (let index = 0; index < fileMatches.length; index++) {
      const match = fileMatches[index];
      const path = match[1].trim();
      if (!processedPaths.has(path)) {
        outputs.push({
          id: `File Write - ${path}`,
          type: Constants.DependencyType.DATA,
          path,
        });
        processedPaths.add(path);
      }
    }

    return outputs;
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    // Dart imports:
    // import 'package:http/http.dart' as http;
    // import 'dart:io';
    // import '../local_file.dart';
    const importMatches = [
      ...text.matchAll(/^import\s+(['"]([^'"]+)['"])(?:\s+as\s+([a-zA-Z0-9_]+))?\s*(?:show\s+[^;]+|hide\s+[^;]+)?\s*;/gm),
    ];
    for (let index = 0; index < importMatches.length; index++) {
      const match = importMatches[index];
      const importPath = match[2];
      const alias = match[3] || null;

      let moduleName = importPath;
      if (moduleName.startsWith('package:')) {
        moduleName = moduleName.substring(8); // Remove 'package:'
      } else if (moduleName.startsWith('dart:')) {
        moduleName = moduleName.substring(5); // Remove 'dart:'
      }

      libraries.push({
        id: this.getLibraryId(moduleName, importPath),
        module: moduleName,
        import: importPath,
        alias,
      });
    }

    return libraries;
  }
}
