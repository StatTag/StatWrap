import { union } from 'lodash';
import Constants from '../constants/constants';
import AssetsConfig from '../constants/assets-config';
import AssetUtil from './asset';
import WorkflowUtil from './workflow';
import { v4 as uuidv4 } from 'uuid';
const path = require('path');

export default class ChecklistUtil {
  /**
   * This function initializes the checklist with the statements and seeds other properties
   * @returns {object} The initialized checklist
   */
  static initializeChecklist() {
    const checklist = [];
    Constants.CHECKLIST.forEach((statement, index) => {
      checklist.push({
        id: index + 1,
        uid: uuidv4(), 
        order: index + 1, 
        name: statement[0],
        statement: statement[1],
        answer: false,
        scanResult: {},
        notes: [],
        assets: [],
        subChecklist: [],
        source: 'default',
      });
    });
    return checklist;
  }


  /**
   * Sanitizes a checklist name by trimming whitespace and enforcing the max length.
   * @param {string} name The raw name string to sanitize
   * @returns {string} The sanitized name, or empty string if input is invalid
   */
  static sanitizeChecklistName(name) {
    if (typeof name !== 'string') {
      return '';
    }
    return name.trim().substring(0, Constants.CHECKLIST_NAME_MAX_LENGTH);
  }


  /**
   * Sanitizes a checklist description by trimming whitespace and enforcing the max length.
   * @param {string} description The raw description string to sanitize
   * @returns {string} The sanitized description, or empty string if input is invalid
   */
  static sanitizeChecklistDescription(description) {
    if (typeof description !== 'string') {
      return '';
    }
    return description.trim().substring(0, Constants.CHECKLIST_DESCRIPTION_MAX_LENGTH);
  }


  /**
   * Generates the export JSON object containing only the checklist names and descriptions.
   * Excludes notes, assets, scan results, contents, etc.
   * @param {Array} checklist The full checklist array from the project
   * @returns {Object} The export-ready JSON object
   */
  static generateChecklistExport(checklist) {
    return {
      type: Constants.CHECKLIST_EXPORT_TYPE,
      version: Constants.CHECKLIST_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      checklists: checklist.map((item) => ({
        name: item.statement || item.name || '',
        description: item.description || '',
      })),
    };
  }


  /**
   * Validates and extracts checklst items from an imported JSON object.
   * @param {string} jsonString The raw JSON string from the imported file
   * @param {Array} existingChecklist The current checklist (for duplicate detection)
   * @returns {Object} { valid, error, items, skippedCount }
   */
  static validateAndParseImport(jsonString, existingChecklist) {
    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return {
        valid: false,
        error: 'The selected file is not valid JSON. Please check the file and try again.',
        items: [],
        skippedCount: 0,
      };
    }

    // Validate the Structure 
    if (!parsed || parsed.type !== Constants.CHECKLIST_EXPORT_TYPE) {
      return {
        valid: false,
        error: 'This file does not appear to be a StatWrap checklist export. '
             + 'It is missing the required "type" field.',
        items: [],
        skippedCount: 0,
      };
    }

    // Check that the 'checklists' field exists and is an array.
    if (!Array.isArray(parsed.checklists)) {
      return {
        valid: false,
        error: 'This file does not contain a valid "checklists" array.',
        items: [],
        skippedCount: 0,
      };
    }

    // Check that the array is not empty.
    if (parsed.checklists.length === 0) {
      return {
        valid: false,
        error: 'The imported file contains an empty checklist. There is nothing to import.',
        items: [],
        skippedCount: 0,
      };
    }

    // Extract and sanitize each item i.e. name and description
    const existingNames = new Set(
      existingChecklist.map((item) => (item.statement || item.name || '').toLowerCase())
    );

    const validItems = [];
    let skippedCount = 0;

    parsed.checklists.forEach((rawItem) => {
      // Each item must have name 
      if (!rawItem || typeof rawItem.name !== 'string' || rawItem.name.trim() === '') {
        skippedCount++;
        return;
      }

      const sanitizedName = ChecklistUtil.sanitizeChecklistName(rawItem.name);
      const sanitizedDescription = ChecklistUtil.sanitizeChecklistDescription(
        rawItem.description || ''
      );

      if (existingNames.has(sanitizedName.toLowerCase())) {
        skippedCount++;
        return;
      }

      existingNames.add(sanitizedName.toLowerCase());
      validItems.push({
        name: sanitizedName,
        description: sanitizedDescription,
      });
    });

    if (validItems.length === 0) {
      return {
        valid: false,
        error: skippedCount > 0
          ? `All ${skippedCount} item(s) in the file were either duplicates of existing checklists or had invalid/empty names.`
          : 'No valid checklist items were found in the file.',
        items: [],
        skippedCount,
      };
    }

    return {
      valid: true,
      error: null,
      items: validItems,
      skippedCount,
    };
  }


  /**
   * Recalculates the 'order' field for all items based on their current
   * position in the array. Call this after any add, delete, or reorder operation.
   */
  static renumberChecklist(checklist) {
    return checklist.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
  }


    /**
   * Checks if a custom checklist statement already exists in the checklist.
   * 
   * @param {string} name - The checklist statement to check for duplication
   * @param {Array} checklist - The array of current checklist items
   * @param {string|number} - The ID or UID of the item to ignore
   * @returns {boolean} true if a duplicate is found, false otherwise
   */
  static isDuplicateChecklist(name, checklist, excludeId = null) {
    if (!name || !checklist || !Array.isArray(checklist)) {
      return false;
    }

    const sanitizedInput = ChecklistUtil.sanitizeChecklistName(name).toLowerCase();

    return checklist.some((item) => {
      if (excludeId && (item.uid === excludeId || item.id === excludeId)) {
        return false;
      }
      
      const statement = item.statement ? item.statement.toLowerCase() : '';
      return statement === sanitizedInput;
    });
  }


  /**
   * This function returns the languages and dependencies of the project
   * @param {object} asset The root project asset to find the languages and dependencies of
   * @returns {object} An object containing the languages and dependencies found as arrays
   */
  static findProjectLanguagesAndDependencies(asset) {
    // Will be structured as:
    // {
    //    'language': [ 'dependency 1', 'dependency 2']
    //    ...
    // }
    const dependencies = {};
    if (!asset) {
      return dependencies;
    }

    ChecklistUtil.findAssetLanguageAndDependencies(asset, dependencies);
    return dependencies;
  }

  /**
   * This function returns the language and dependencies of an asset and its children recursively
   * @param {object} asset The asset to find the languages of
   * @param {object} dependencies Tracks discovered languages and dependencies
   */
  static findAssetLanguageAndDependencies(asset, dependencies) {
    const includeAsset =  AssetUtil.includeAsset(asset.uri);
    if (
      includeAsset &&
      asset.type === Constants.AssetType.FILE &&
      asset.contentTypes.includes(Constants.AssetContentType.CODE)
    ) {
      const lastSep = asset.uri.lastIndexOf(path.sep);
      const fileName = asset.uri.substring(lastSep + 1);
      const ext = fileName.split('.').pop();

      if (ext) {
        AssetsConfig.contentTypes.forEach((contentType) => {
          // Ensures both the extension and content type are for code files
          if (
            contentType.categories.includes(Constants.AssetContentType.CODE) &&
            contentType.extensions.includes(ext)
          ) {
            // Initialize the language in the object if it doesn't already exist
            if (!dependencies.hasOwnProperty(contentType.name)) {
              dependencies[contentType.name] = [];
            }

            // Find and add all dependencies, keeping only the unique ones
            dependencies[contentType.name] = union(
              dependencies[contentType.name],
              ChecklistUtil.findAssetDependencies(asset));
          }
        });
      }
    }

    if (asset.children && includeAsset) {
      asset.children.forEach((child) => {
        ChecklistUtil.findAssetLanguageAndDependencies(child, dependencies);
      });
    }

    return dependencies;
  }

  /**
   * This function returns the dependencies of an asset and its children recursively
   * @param {object} asset The asset to find the dependencies of
   * @param {object} dependencies Empty object that acts like a map to store the dependencies found as keys
   * @returns {array} An array containing the dependencies found
   */
  static findAssetDependencies(asset) {
    const dependencies = [];
    const assetDependencies = WorkflowUtil.getAllLibraryDependencies(asset);
    assetDependencies.forEach((x) => {
      if (x.assetType && x.assetType !== Constants.AssetType.GENERIC) {
        x.dependencies.forEach((dep) => {
          if (dependencies.findIndex((i) => i === dep.id) === -1) {
            dependencies.push(WorkflowUtil.getDependencyName(dep.id));
          }
        });
      }
    });
    return dependencies;
  }

  /** This function finds the data files in the asset and its children recursively
   * @param {object} asset The asset to find the data files within
   * @param {array} dataFiles An array to store the data files found
   * @returns {object} An object containing the data files found
   */
  static findDataFiles(asset, dataFiles = []) {
    if (!asset || !AssetUtil.includeAsset(asset.uri)) {
      return { dataFiles: dataFiles };
    }

    if (
      asset.type === Constants.AssetType.FILE &&
      asset.contentTypes.includes(Constants.AssetContentType.DATA)
    ) {
      const fileName = AssetUtil.getAssetNameFromUri(asset.uri);
      dataFiles.push(fileName);
    }

    if (asset.children) {
      asset.children.forEach((child) => {
        ChecklistUtil.findDataFiles(child, dataFiles);
      });
    }

    return { dataFiles: dataFiles };
  }

  /**
   * This function gets the entry point file names from the entryPoints assets array
   * @param {object} asset The asset to find the entry point files within
   * @returns {object} An object containing the entry point file names found
   */
  static findEntryPointFiles(asset) {
    const entryPoints = AssetUtil.findEntryPointAssets(asset);
    const entryPointFiles = [];
    entryPoints?.forEach((entryPoint) => {
      const fileName = AssetUtil.getAssetNameFromUri(entryPoint.uri);
      entryPointFiles.push(fileName);
    });
    return { entryPoints: entryPointFiles };
  }

  /**
   * This function finds the documentation files in the asset
   * @param {object} asset The asset to find the documentation files within
   * @param {array} documentationFiles An array to store the documentation files found
   * @returns {object} An object containing the documentation files found
   */
  static findDocumentationFiles(asset, documentationFiles = []) {
    if (!asset || !AssetUtil.includeAsset(asset.uri)) {
      return { documentationFiles: documentationFiles };
    }
    if (
      asset.type === Constants.AssetType.FILE &&
      asset.contentTypes.includes(Constants.AssetContentType.DOCUMENTATION)
    ) {
      const fileName = AssetUtil.getAssetNameFromUri(asset.uri);
      documentationFiles.push(fileName);
    }

    if (asset.children) {
      asset.children.forEach((child) => {
        ChecklistUtil.findDocumentationFiles(child, documentationFiles);
      });
    }

    return { documentationFiles: documentationFiles };
  }
}
