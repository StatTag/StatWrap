import Constants from '../constants/constants';
import AssetsConfig from '../constants/assets-config';
const path = require('path');

export default class ChecklistUtil {
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
          if(contentType.extensions.includes(ext)) {
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
