import Constants from '../constants/constants';
import AssetsConfig from '../constants/assets-config';
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
        images: [],
        urls: [],
        subChecklist: [],
      });
    });
    return checklist;
  }

  /**
   * This function returns the languages and dependencies of an asset and its children
   * @param {object} asset The asset to find the languages and dependencies of
   * @param {object} languages Empty object that acts like a map to store the languages found as keys
   * @param {object} dependencies Empty object that acts like a map to store the dependencies found as keys
   * @returns {object} An object containing the languages and dependencies found as arrays
   */
  static findAssetLanguagesAndDependencies(asset, languages = {}, dependencies = {}) {
    if (!asset) {
      return {
        languages: [],
        dependencies: []
      };
    }
    if (asset.type === Constants.AssetType.FILE && asset.contentTypes.includes(Constants.AssetContentType.CODE) ) {
      const lastSep = asset.uri.lastIndexOf(path.sep);
      const fileName = asset.uri.substring(lastSep + 1);
      const ext = fileName.split('.').pop();

      if(ext){
        AssetsConfig.contentTypes.forEach((contentType) => {
          // Ensures both the extension and content type are for code files
          if(contentType.categories.includes(Constants.AssetContentType.CODE) && contentType.extensions.includes(ext)) {
            languages[contentType.name] = true;
          }
        });
      }
    }

    if(asset.children){
      asset.children.forEach(child => {
        this.findAssetLanguagesAndDependencies(child, languages, dependencies);
      });
    }

    return {
      languages: Object.keys(languages),
      dependencies: Object.keys(dependencies)
    };
  }
}
