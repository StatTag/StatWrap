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
    Constants.CHECKLIST_DEFAULTS.forEach((item, index) => {
      checklist.push({
        id: item.id,
        order: index + 1,
        scanKey: item.scanKey,
        statement: item.statement,
        description: item.description,
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
   * Sanitizes question text by trimming whitespace and enforcing the max length.
   * @param {string} statement The raw question text
   * @returns {string} The sanitized statement, or empty string if input is invalid
   */
  static sanitizeChecklistStatement(statement) {
    if (typeof statement !== 'string') {
      return '';
    }
    return statement.trim().substring(0, Constants.CHECKLIST_STATEMENT_MAX_LENGTH);
  }

  /**
   * Trims and limits string IDs, or generates a UUID for non-string input.
   * @param {*} id The user-supplied ID to sanitize
   * @returns {string} The trimmed, length-limited ID (possibly blank), or a new UUID for non-string input
   */
  static sanitizeChecklistID(id) {
    if (typeof id !== 'string') {
      return uuidv4();
    }
    return id.trim().substring(0, Constants.CHECKLIST_ID_MAX_LENGTH).trim();
  }

  /**
   * Validates current checklist fields and repairs duplicate IDs and orders without mutating input.
   * Later ID duplicates receive UUIDs; later order duplicates move to the end and orders are renumbered.
   * @param {Array} checklist The current-version checklist items to validate
   * @returns {Array} The original array if unchanged, or repaired items preserving content and unknown fields
   * @throws {Error} If known fields are invalid or a unique replacement ID cannot be generated in five attempts
   */
  static validateChecklist(checklist) {
    if (!Array.isArray(checklist)) {
      throw new Error('Checklist must be an array.');
    }
    checklist.forEach((item, index) => {
      const label = `Checklist item ${index + 1}`;
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`${label} must be an object.`);
      }
      if (Object.prototype.hasOwnProperty.call(item, 'uid')
        || Object.prototype.hasOwnProperty.call(item, 'name')) {
        throw new Error(`${label} contains a legacy name or uid field.`);
      }
      if (typeof item.id !== 'string' || !item.id.trim()
        || ChecklistUtil.sanitizeChecklistID(item.id) !== item.id) {
        throw new Error(`${label} must have a valid string ID without surrounding whitespace.`);
      }
      if (!Number.isInteger(item.order) || item.order < 1 || item.order > checklist.length) {
        throw new Error(`${label} must have an order between 1 and ${checklist.length}.`);
      }
      if (typeof item.statement !== 'string' || !item.statement.trim()) {
        throw new Error(`${label} must have a nonblank statement.`);
      }
      if (!Object.values(Constants.ChecklistItemSource).includes(item.source)) {
        throw new Error(`${label} has an invalid source.`);
      }
      const builtin = Constants.CHECKLIST_DEFAULTS.find((entry) => entry.id === item.id);
      const scan = Constants.CHECKLIST_DEFAULTS.find((entry) => entry.scanKey === item.scanKey);
      if (builtin
        ? item.scanKey !== builtin.scanKey || item.source !== Constants.ChecklistItemSource.DEFAULT
        : item.source === Constants.ChecklistItemSource.DEFAULT ? !scan : item.scanKey !== null) {
        throw new Error(`${label} has conflicting or unknown scan metadata.`);
      }
      if (typeof item.answer !== 'boolean' || typeof item.description !== 'string'
        || !item.scanResult || typeof item.scanResult !== 'object' || Array.isArray(item.scanResult)
        || ['notes', 'assets', 'subChecklist'].some((key) => !Array.isArray(item[key]))) {
        throw new Error(`${label} has invalid answer, description, scan results, or collections.`);
      }
    });
    const reservedIds = new Set(checklist.map((item) => item.id));
    const ids = new Set();
    const orders = new Set();
    const duplicates = [];
    let changed = false;
    const retained = [];
    checklist.forEach((item) => {
      let updated = item;
      if (ids.has(item.id)) {
        let id;
        let attempts = 0;
        do {
          id = uuidv4();
          attempts++;
        } while (reservedIds.has(id) && attempts < 5);
        if (reservedIds.has(id)) {
          throw new Error('Unable to correct a duplicated checklist item ID.');
        }
        reservedIds.add(id);
        updated = { ...item, id };
        changed = true;
      }
      ids.add(item.id);
      if (orders.has(item.order)) {
        duplicates.push(updated);
      } else {
        orders.add(item.order);
        retained.push(updated);
      }
    });
    if (duplicates.length) {
      return ChecklistUtil.renumberChecklist([
        ...retained.sort((a, b) => a.order - b.order),
        ...duplicates,
      ]);
    }
    return changed ? retained : checklist;
  }

  /**
   * Converts legacy items to the current schema, recovering identities, questions, and scan associations.
   * Preserves content and unknown metadata while removing top-level name/uid and normalizing order.
   * @param {Array} checklist The version 1 checklist items
   * @returns {Array} Converted, validated items without mutating the legacy input or nested identities
   * @throws {Error} If legacy data is malformed, recognized metadata conflicts, or validation/repair fails
   */
  static convertChecklistV1(checklist) {
    if (!Array.isArray(checklist)) {
      throw new Error('Version 1 checklist must be an array.');
    }
    const legacyOrders = new Set();
    const positioned = checklist.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`Version 1 checklist item ${index + 1} must be an object.`);
      }
      if (item.source !== undefined && (typeof item.source !== 'string'
        || !Object.values(Constants.ChecklistItemSource).includes(item.source.trim().toLowerCase()))) {
        throw new Error(`Version 1 checklist item ${index + 1} has an invalid source.`);
      }
      const position = Number.isInteger(item.order) && item.order > 0 ? item.order
        : Number.isInteger(item.id) && item.id > 0 ? item.id : index + 1;
      const duplicateOrder = Number.isInteger(item.order) && item.order > 0
        && legacyOrders.has(item.order);
      legacyOrders.add(item.order);
      return { item, index, position, duplicateOrder };
    }).sort((a, b) => Number(a.duplicateOrder) - Number(b.duplicateOrder)
      || (a.duplicateOrder ? a.index - b.index : a.position - b.position || a.index - b.index));

    const converted = positioned.map(({ item, index }, orderIndex) => {
      const label = `Version 1 checklist item ${index + 1}`;
      const custom = typeof item.source === 'string'
        && item.source.trim().toLowerCase() === Constants.ChecklistItemSource.CUSTOM;
      const byId = Constants.CHECKLIST_DEFAULTS.find((entry) => entry.id === item.id);
      const scanKey = typeof item.scanKey === 'string' ? item.scanKey.trim() : null;
      const legacyName = typeof item.name === 'string' ? item.name.trim() : null;
      if (item.scanKey !== undefined && item.scanKey !== null && typeof item.scanKey !== 'string') {
        throw new Error(`${label} has an invalid scan key.`);
      }
      const byScan = Constants.CHECKLIST_DEFAULTS.find((entry) => entry.scanKey === scanKey);
      const byName = custom ? null
        : Constants.CHECKLIST_DEFAULTS.find((entry) => entry.scanKey === legacyName);
      const matches = [byId, byScan, byName].filter(Boolean);
      if ((custom && matches.length)
        || matches.some((entry) => entry.id !== matches[0].id)) {
        throw new Error(`${label} has conflicting built-in identity or scan metadata.`);
      }
      const builtin = matches[0];
      const statement = typeof item.statement === 'string' && item.statement.trim()
        ? item.statement : builtin ? builtin.statement
          : typeof item.name === 'string' && item.name.trim() ? item.name : null;
      if (!statement) {
        throw new Error(`${label} has no usable question text.`);
      }
      if (item.id !== undefined && typeof item.id !== 'string'
        && (!Number.isInteger(item.id) || item.id < 1)) {
        throw new Error(`${label} has an invalid legacy ID.`);
      }
      const retained = { ...item };
      delete retained.name;
      delete retained.uid;
      return {
        description: '',
        answer: false,
        scanResult: {},
        notes: [],
        assets: [],
        subChecklist: [],
        ...retained,
        id: builtin ? builtin.id : ChecklistUtil.sanitizeChecklistID(item.id === undefined
          || typeof item.id === 'number' ? undefined : item.id),
        order: orderIndex + 1,
        statement,
        scanKey: builtin ? builtin.scanKey : null,
        source: builtin ? Constants.ChecklistItemSource.DEFAULT
          : item.source === undefined ? Constants.ChecklistItemSource.CUSTOM
            : ChecklistUtil.sanitizeChecklistSource(item.source),
      };
    });
    return ChecklistUtil.validateChecklist(converted);
  }

  /**
   * Decodes parsed file data, converting legacy formats and validating known checklist fields.
   * Preserves unknown envelope/item fields and does not downgrade future format versions.
   * @param {Array|object} data A legacy item array or a parsed checklist containing version and items
   * @returns {object} The checklist with version, validated items, and migratedFromVersion (1 or null).
   * migratedFromVersion is internal metadata, not a persisted file field.
   * @throws {Error} If the checklist structure/version is invalid or item conversion/validation fails
   */
  static parseChecklistFile(data) {
    const array = Array.isArray(data);
    if (!array && (!data || typeof data !== 'object' || !Array.isArray(data.checklist))) {
      throw new Error('Checklist file must contain a checklist array.');
    }
    const version = array || !Object.prototype.hasOwnProperty.call(data, 'version') ? 1 : data.version;
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error(`Invalid checklist file version "${version}".`);
    }
    const checklist = array ? data : data.checklist;
    return {
      ...(array ? {} : data),
      version: version === 1 ? Constants.CHECKLIST_VERSION : version,
      checklist: version === 1 ? ChecklistUtil.convertChecklistV1(checklist)
        : ChecklistUtil.validateChecklist(checklist),
      migratedFromVersion: version === 1 ? version : null,
    };
  }

  /**
   * Normalizes the source to default or custom.
   * @param {*} source The source value to normalize
   * @returns {string} `default` for a matching string; otherwise `custom`
   */
  static sanitizeChecklistSource(source) {
    if (typeof source !== 'string') {
      return Constants.ChecklistItemSource.CUSTOM;
    }

    // The only time we return anything other than 'custom' is when it is default, even
    // if there is flanking whitespace or case issues.
    if (source.trim().toLowerCase() == Constants.ChecklistItemSource.DEFAULT) {
      return Constants.ChecklistItemSource.DEFAULT;
    }

      return Constants.ChecklistItemSource.CUSTOM;
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
   * Generates definitions with identity, question text, description, source, and scan association.
   * Excludes project-specific answers, notes, assets, order, scan results, and unknown fields.
   * @param {Array} checklist The full checklist array from the project
   * @returns {Object} The export-ready JSON object
   */
  static generateChecklistExport(checklist) {
    return {
      type: Constants.CHECKLIST_EXPORT_TYPE,
      version: Constants.CHECKLIST_VERSION,
      exportedAt: new Date().toISOString(),
      checklists: ChecklistUtil.sortChecklist(checklist).map((item) => {
        const source = item.source || Constants.ChecklistItemSource.CUSTOM;
        const scanKey = ChecklistUtil.getItemScanKey(item);
        if (source === Constants.ChecklistItemSource.DEFAULT && !scanKey) {
          throw new Error('Default checklist items must have a recognized scan association.');
        }
        return {
          id: item.id,
          statement: item.statement,
          description: item.description || '',
          source,
          scanKey,
        };
      }),
    };
  }


  /**
   * Validates an export and extracts allowlisted definitions, skipping invalid or duplicate items.
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

    if (parsed.version !== Constants.CHECKLIST_VERSION) {
      return {
        valid: false,
        error: `Unsupported checklist export version "${parsed.version}". `
          + `Expected version ${Constants.CHECKLIST_VERSION}.`,
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

    const existingStatements = new Set(
      existingChecklist.map((item) => ChecklistUtil.sanitizeChecklistStatement(item.statement).toLowerCase())
    );

    const existingIds = new Set(existingChecklist.map((item) => item.id));

    const validItems = [];
    let skippedCount = 0;
    const invalidReasons = [];

    parsed.checklists.forEach((rawItem, index) => {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        skippedCount++;
        invalidReasons.push(`Item ${index + 1}: checklist item must be an object.`);
        return;
      }

      const candidateId = typeof rawItem.id === 'string'
        ? ChecklistUtil.sanitizeChecklistID(rawItem.id) : null;
      const builtin = Constants.CHECKLIST_DEFAULTS.find((item) => item.id === candidateId);
      if (builtin && (rawItem.statement !== builtin.statement
        || (rawItem.description === undefined ? '' : rawItem.description) !== builtin.description
        || (rawItem.scanKey !== undefined && rawItem.scanKey !== builtin.scanKey))) {
        skippedCount++;
        invalidReasons.push(
          `Item ${index + 1}: built-in checklist item could not be imported because it is corrupted.`
        );
        return;
      }

      if (typeof rawItem.statement !== 'string' || !rawItem.statement.trim()) {
        skippedCount++;
        invalidReasons.push(`Item ${index + 1}: question must be nonblank text.`);
        return;
      }

      const id = ChecklistUtil.sanitizeChecklistID(rawItem.id);
      const statement = ChecklistUtil.sanitizeChecklistStatement(rawItem.statement);
      const sanitizedDescription = ChecklistUtil.sanitizeChecklistDescription(
        rawItem.description || ''
      );
      const source = rawItem.source === undefined && builtin
        ? Constants.ChecklistItemSource.DEFAULT : ChecklistUtil.sanitizeChecklistSource(rawItem.source);
      const suppliedScan = typeof rawItem.scanKey === 'string' ? rawItem.scanKey.trim() : rawItem.scanKey;
      const knownScan = Constants.CHECKLIST_DEFAULTS.some((item) => item.scanKey === suppliedScan);
      const scanKey = builtin ? builtin.scanKey
        : source === Constants.ChecklistItemSource.DEFAULT && knownScan ? suppliedScan : null;
      if (!id || (rawItem.scanKey !== undefined && rawItem.scanKey !== null
        && (!knownScan || source === Constants.ChecklistItemSource.CUSTOM
          || (builtin && suppliedScan !== builtin.scanKey)))
        || (builtin && source !== Constants.ChecklistItemSource.DEFAULT)
        || (!builtin && source === Constants.ChecklistItemSource.DEFAULT && !scanKey)) {
        skippedCount++;
        invalidReasons.push(`Item ${index + 1}: invalid ID or conflicting/unknown scan association.`);
        return;
      }

      if (existingStatements.has(statement.toLowerCase()) || existingIds.has(id)) {
        skippedCount++;
        return;
      }

      existingStatements.add(statement.toLowerCase());
      existingIds.add(id);
      validItems.push({
        id,
        statement,
        description: sanitizedDescription,
        source,
        scanKey,
      });
    });

    if (validItems.length === 0) {
      return {
        valid: false,
        error: skippedCount > 0
          ? `${skippedCount} item(s) were duplicates or invalid. ${invalidReasons.join(' ')}`.trim()
          : 'No valid checklist items were found in the file.',
        items: [],
        skippedCount,
        invalidReasons,
      };
    }

    return {
      valid: true,
      error: null,
      items: validItems,
      skippedCount,
      invalidReasons,
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
   * Sorts checklist items by their display order without changing their identities or input array.
   * @param {Array} checklist The checklist items to sort
   * @returns {Array} A new array ordered by the order field
   */
  static sortChecklist(checklist) {
    return [...checklist].sort((a, b) => a.order - b.order);
  }

    /**
   * Checks if a custom checklist statement already exists in the checklist.
   *
   * @param {string} statement - The checklist question to check for duplication
   * @param {Array} checklist - The array of current checklist items
   * @param {string|null} excludeId - The ID of the item to ignore when editing
   * @returns {boolean} true if a duplicate is found, false otherwise
   */
  static isDuplicateChecklist(statement, checklist, excludeId = null) {
    if (!statement || !checklist || !Array.isArray(checklist)) {
      return false;
    }

    const sanitizedInput = ChecklistUtil.sanitizeChecklistStatement(statement).toLowerCase();

    return checklist.some((item) => {
      if (excludeId && item.id === excludeId) {
        return false;
      }

      const existingStatement = ChecklistUtil.sanitizeChecklistStatement(item.statement).toLowerCase();
      return existingStatement === sanitizedInput;
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
            if (!Object.prototype.hasOwnProperty.call(dependencies, contentType.name)) {
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

  /**
   * Resolves a recognized built-in scan association without using question text or legacy names.
   * @param {object} item The checklist item or imported definition
   * @returns {string|null} The recognized scan key, or null for custom, unknown, or conflicting metadata
   */
  static getItemScanKey(item) {
    if (!item || item.source === Constants.ChecklistItemSource.CUSTOM) {
      return null;
    }

    const builtin = Constants.CHECKLIST_DEFAULTS.find((entry) => entry.id === item.id);
    const scanKey = typeof item.scanKey === 'string' ? item.scanKey.trim() : null;
    if (builtin) {
      return scanKey && scanKey !== builtin.scanKey ? null : builtin.scanKey;
    }
    return item.source === Constants.ChecklistItemSource.DEFAULT
      && Constants.CHECKLIST_DEFAULTS.some((entry) => entry.scanKey === scanKey) ? scanKey : null;
  }
}
