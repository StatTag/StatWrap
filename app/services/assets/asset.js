const fs = require('fs');
const os = require('os');
const path = require('path');

function getAllFiles(dirPath) {
  const files = fs.readdirSync(dirPath);
  const arrayOfFiles = [];
  files.forEach(function eachFile(file) {
    const filePath = `${dirPath}/${file}`;
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles.push({
        name: file,
        type: 'folder',
        path: path.join(dirPath, '/', file),
        contents: getAllFiles(filePath)
      });
    } else {
      arrayOfFiles.push({
        name: file,
        type: 'file',
        path: path.join(dirPath, '/', file)
      });
    }
  });

  return arrayOfFiles;
}

export default class AssetService {
  // The list of handlers that are used for each asset.
  handlers = null;

  constructor() {

  }

  scan(rootPath) {
    if (!fs.accessSync(rootPath)) {
      throw new Error(`Unable to scan for assets in "${rootPath}"`);
    }
    const files = getAllFiles(rootPath);
    return files;
  }
}
