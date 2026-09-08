import BaseCodeHandler from './baseCode';
import PythonHandler from './python';
import RHandler from './r';
import AssetUtil from '../../../utils/asset';

const fs = require('fs');

const FILE_EXTENSION_LIST = ['ipynb'];

/**
 * Metadata:
 * {
 *   id: 'StatWrap.JupyterHandler'
 * }
 */
export default class JupyterHandler extends BaseCodeHandler {
  static id = 'StatWrap.JupyterHandler';

  constructor() {
    super(JupyterHandler.id, FILE_EXTENSION_LIST);
    this.languageHandlers = {
      python: new PythonHandler(),
      r: new RHandler(),
    };
  }

  id() {
    return JupyterHandler.id;
  }

  /**
   * Extracts code from a parsed Jupyter Notebook JSON object.
   * @param {object} notebook The parsed Jupyter Notebook JSON object
   * @returns {string} The concatenated code from all code cells
   */
  extractCode(notebook) {
    if (!notebook || !notebook.cells || !Array.isArray(notebook.cells)) {
      return '';
    }

    const codeCells = notebook.cells.filter((cell) => cell.cell_type === 'code');
    let sourceCode = '';

    codeCells.forEach((cell) => {
      if (cell.source) {
        if (Array.isArray(cell.source)) {
          sourceCode += cell.source.join('') + '\n';
        } else if (typeof cell.source === 'string') {
          sourceCode += cell.source + '\n';
        }
      }
    });

    return sourceCode;
  }

  /**
   * Performs the main scanning and discovery of the asset at the specified URI
   * @param {object} originalAsset - The asset to scan
   * @return {object} A JS object containing the details about the specified asset
   */
  scan(originalAsset) {
    const asset = { ...originalAsset };
    // If we have an invalid asset, just move along.
    if (!asset || asset === undefined || !asset.type) {
      return asset;
    }

    // Only handle files, but need to include directories for recursive processing
    if (asset.type !== 'file' && asset.type !== 'directory') {
      return asset;
    }

    const metadata = { id: this.id() };
    // If this is a directory, we are going to traverse and get details
    // about the contained files and sub-folders
    if (asset.type === 'directory' && asset.children) {
      const self = this;
      asset.children.forEach((child, index) => {
        asset.children[index] = self.scan(child);
      });
    } else {
      if (!this.includeFile(asset.uri)) {
        return asset;
      }

      // If we already have scanned this file, we won't do it again.
      const existingMetadata = AssetUtil.getHandlerMetadata(this.handlerId, asset.metadata);
      if (existingMetadata) {
        return asset;
      }

      try {
        const contents = fs.readFileSync(asset.uri, 'utf8');
        const notebook = JSON.parse(contents);
        const code = this.extractCode(notebook);
        
        let language = 'python'; // default for Jupyter
        if (notebook.metadata) {
          if (notebook.metadata.language_info && notebook.metadata.language_info.name) {
            language = notebook.metadata.language_info.name.toLowerCase();
          } else if (notebook.metadata.kernelspec && notebook.metadata.kernelspec.language) {
            language = notebook.metadata.kernelspec.language.toLowerCase();
          }
        }

        const subHandler = this.languageHandlers[language];
        if (subHandler) {
          metadata.libraries = subHandler.getLibraries(asset.uri, code);
          metadata.outputs = subHandler.getOutputs(asset.uri, code);
          metadata.inputs = subHandler.getInputs(asset.uri, code);
        }
      } catch (error) {
        metadata.error = error.message || 'Unable to read code file';
        asset.metadata.push(metadata);
        return asset;
      }

      asset.metadata.push(metadata);
    }

    return asset;
  }
}
