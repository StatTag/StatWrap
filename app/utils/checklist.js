import { union } from 'lodash';
import Constants from '../constants/constants';
import AssetsConfig from '../constants/assets-config';
import AssetUtil from './asset';
import WorkflowUtil from './workflow';
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
        name: statement[0],
        statement: statement[1],
        answer: false,
        scanResult: {},
        notes: [],
        assets: [],
        subChecklist: [],
      });
    });
    return checklist;
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
    const assetDepedencies = WorkflowUtil.getAllLibraryDependencies(asset);
    assetDepedencies.forEach((x) => {
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
