import Constants from '../constants/constants';

/**
 * Keep only the items whose path is in checkedPaths.
 * Directory are kept if they are checked or have checked descendants.
 */

function filterContentsByPaths(contents, checkedPaths) {
  if (!contents) return [];
  const filtered = [];
  contents.forEach((item) => {
    if (item.type === Constants.AssetType.DIRECTORY) {
      if (checkedPaths.includes(item.path)) {
        const filteredChildren = filterContentsByPaths(item.contents, checkedPaths);
        filtered.push({ ...item, contents: filteredChildren });
      }
    } else {
      if (checkedPaths.includes(item.path)) {
        filtered.push(item);
      }
    }
  });
  return filtered;
}

/**
 * Recursively collect all paths from template contents
 */

function collectAllPaths(contents) {
  const paths = [];
  if (contents) {
    contents.forEach((item) => {
      paths.push(item.path);
      if (item.type === Constants.AssetType.DIRECTORY && item.contents) {
        paths.push(...collectAllPaths(item.contents));
      }
    });
  }
  return paths;
}

export { filterContentsByPaths, collectAllPaths };