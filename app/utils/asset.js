/* eslint-disable no-underscore-dangle */
import path from 'path';
import last from 'lodash/last';
import constants from '../constants/constants';

// We do have a dependency cycle here, but it is just to grab a constant value.
// No circular functions exist (and we need to make sure it stays that way).
// eslint-disable-next-line import/no-cycle
import FileHandler from '../services/assets/handlers/file';

export default class AssetUtil {
  static getHandlerMetadata(handler, metadata) {
    if (!metadata || metadata.length === 0) {
      return null;
    }
    if (!handler || handler.trim() === '') {
      return null;
    }

    const entry = metadata.find(m => {
      return m && m.id === handler;
    });
    return entry || null;
  }

  /**
   * This is a specialized filter to be placed on top of FileHandler metadata.
   * Given an asset, it will return a filtered object that only includes items
   * (including the base asset itself) and descendants that should be included
   * in a typical view.
   * @param {object} asset
   */
  static filterIncludedFileAssets(asset) {
    if (!asset) {
      return null;
    }

    // Find the metadata associated with the FileHandler.  If that hasn't been applied, we
    // are (for now) still going to show the asset.  If we do have that metadata, only
    // include assets tagged that way.
    const assetMetadata = AssetUtil.getHandlerMetadata(FileHandler.id, asset.metadata);
    if (assetMetadata && !assetMetadata.include) {
      return null;
    }

    // If there are no children, we're done processing
    if (!asset.children) {
      return asset;
    }

    // Explicitly clone the children array so we don't modify the original object.
    const filteredAsset = { ...asset, children: [...asset.children] };
    for (let index = 0; index < filteredAsset.children.length; index++) {
      filteredAsset.children[index] = AssetUtil.filterIncludedFileAssets(
        filteredAsset.children[index]
      );
    }
    filteredAsset.children = filteredAsset.children.filter(c => c);
    return filteredAsset;
  }

  /**
   * Find the child asset for the asset parameter, based on the specified URI.  This requires
   * the URI to match exactly (case-sensitive).
   * @param {object} asset The asset object whose children we want to search
   * @param {string} uri The URI to search for
   */
  static findChildAssetByUri(asset, uri) {
    if (!asset || !uri || !asset.children) {
      return null;
    }

    const child = asset.children.find(a => {
      return a && a.uri === uri;
    });

    return child || null;
  }

  /**
   * Find the descendant asset for the asset parameter, based on the specified URI.  This requires
   * the URI to match exactly (case-sensitive).  Note that the descendant can include the root asset
   * itself, as well as any children, or further descendants.
   * @param {object} asset The asset object whose children we want to search
   * @param {string} uri The URI to search for
   */
  static findDescendantAssetByUri(asset, uri) {
    if (!asset || !uri) {
      return null;
    }

    // We can match the root asset
    if (asset.uri === uri) {
      return asset;
    }

    // Are there any children?  If not, we can stop trying to further match.
    if (!asset.children) {
      return null;
    }

    for (let index = 0; index < asset.children.length; index++) {
      const found = AssetUtil.findDescendantAssetByUri(asset.children[index], uri);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Recursively collect and flatten all asset notes into an array
   * @param {object} asset The asset to find all notes for
   */
  static getAllNotes(asset) {
    const notes =
      asset && asset.notes
        ? asset.notes.map(n => {
            return { ...n, uri: asset.uri };
          })
        : [];
    if (!asset || !asset.children) {
      return notes.flat();
    }

    for (let index = 0; index < asset.children.length; index++) {
      notes.push(AssetUtil.getAllNotes(asset.children[index]));
    }
    return notes.flat();
  }

  /**
   * Recursively convert all nested asset URIs from relative path to absolute path
   * @param {string} projectPath The URI to the root path of the project
   * @param {object} assets The root asset that we want to convert paths
   *                        for (for all descendants)
   */
  static recursiveRelativeToAbsolutePath(projectPath, assets) {
    return AssetUtil.recursivePathConversion(projectPath, assets, AssetUtil.relativeToAbsolutePath);
  }

  /**
   * For an asset, convert its URI from a relative path to an absolute
   * path, if it is a file or directory type.
   *
   * This will return the absolute path.  It will not modify the asset.
   *
   * @param {string} projectPath The URI to the root path of the project
   * @param {object} asset The asset that we want to convert the path for
   */
  static relativeToAbsolutePath(projectPath, asset) {
    if (!asset || asset.uri == null || asset.uri === undefined) {
      return null;
    }

    return path.resolve(projectPath, asset.uri);
  }

  /**
   * Recursively call a path conversion function for assets.
   * @param {string} projectPath The URI to the root path of the project
   * @param {object} assets The root asset that we want to convert paths
   *                        for (for all descendants)
   * @param {function} workerFn The conversion function to call.
   */
  static recursivePathConversion(projectPath, assets, workerFn) {
    if (!assets || projectPath == null || projectPath === undefined) {
      return assets;
    }

    // Ensure nested objects are deeply copied
    const assetsCopy = JSON.parse(JSON.stringify(assets));
    return AssetUtil._recursivePathConversion(projectPath, assetsCopy, workerFn);
  }

  /**
   * Internal worker method to handle the recursive calls.
   * @param {string} projectPath The URI to the root path of the project
   * @param {object} asset The current asset that we want to conver paths for (including all children)
   * @param {function} workerFn The conversion function to call.
   * @returns The original version of assets with uri fields updated
   */
  static _recursivePathConversion(projectPath, asset, workerFn) {
    // We only do this for files and directories
    if (asset.type === constants.AssetType.FILE || asset.type === constants.AssetType.DIRECTORY) {
      asset.uri = workerFn(projectPath, asset);
    }

    if (asset.children) {
      for (let index = 0; index < asset.children.length; index++) {
        asset.children[index] = AssetUtil._recursivePathConversion(
          projectPath,
          asset.children[index],
          workerFn
        );
      }
    }

    return asset;
  }

  /**
   * Recursively convert all nested asset URIs from absolute path to relative path
   * @param {string} projectPath The URI to the root path of the project
   * @param {object} assets The root asset that we want to convert paths
   *                        for (for all descendants)
   */
  static recursiveAbsoluteToRelativePath(projectPath, assets) {
    return AssetUtil.recursivePathConversion(projectPath, assets, AssetUtil.absoluteToRelativePath);
  }

  /**
   * For an asset, convert its URI from a relative path to an absolute
   * path, if it is a file or directory type.
   *
   * This will return the relative path.  It will not modify the asset.
   * If there is no URI or the URI is not an absolute path, it will return
   * null.
   *
   * @param {string} projectPath The URI to the root path of the project
   * @param {object} asset The asset that we want to convert the path for
   */
  static absoluteToRelativePath(projectPath, asset) {
    if (!asset || asset.uri == null || asset.uri === undefined || !path.isAbsolute(asset.uri)) {
      return null;
    }

    return path.relative(projectPath, asset.uri);
  }

  /**
   * Given a URI, return the name of the asset devoid of the pathing
   *
   * @param {string or object} item Either a string representing the URI, or an object with a `uri` attribute containing the URI
   * @returns The name portion (with extension, if applicable) of the URI
   */
  static getAssetNameFromUri(item) {
    if (!item) {
      return '';
    }

    let uri = item;
    if (typeof item === 'object') {
      uri = item.uri ? item.uri : '';
    }
    return last(uri.split(path.sep));
  }
}
