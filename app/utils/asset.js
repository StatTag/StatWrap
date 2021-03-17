// We do have a dependency cycle here, but it is just to grab a constant value.
// No circular functions exist (and we need to make sure it stays that way).
// eslint-disable-next-line import/no-cycle
import FileHandler from '../services/assets/handlers/file';
// eslint-disable-next-line import/no-cycle
import PythonHandler from '../services/assets/handlers/python/python';

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
   * Build a graph (collection of nodes and links) for an asset and all of
   * its descendants
   * @param {object} asset
   * @returns An graph object containing nodes and links attributes
   */
  static getAllDependenciesAsGraph(asset) {
    const graph = {
      nodes: [],
      links: []
    };
    const allDeps = AssetUtil.getAllDependencies(asset);
    for (let index = 0; index < allDeps.length; index++) {
      const entry = allDeps[index];
      if (entry.asset && entry.dependencies && entry.dependencies.length > 0) {
        // Given how we traverse, we can assume assets will be unique
        graph.nodes.push({ id: entry.asset, assetType: 'python' });
        for (let depIndex = 0; depIndex < entry.dependencies.length; depIndex++) {
          const dependencyId = entry.dependencies[depIndex].id;
          // We need to see if we already have an dependency before we add it as a node (to avoid
          // duplicate nodes with the same ID).
          if (!graph.nodes.some(n => n.id === dependencyId)) {
            graph.nodes.push({ id: dependencyId, assetType: 'dependency' });
          }
          // Likewise, we have to make sure that any edge is unique before we add it
          if (!graph.links.some(l => l.source === entry.asset && l.target === dependencyId)) {
            graph.links.push({ source: entry.asset, target: dependencyId });
          }
        }
      }
    }
    return graph;
  }

  static getDependencies(asset) {
    if (!asset) {
      return [];
    }
    const metadata = AssetUtil.getHandlerMetadata(PythonHandler.id, asset.metadata);
    if (!metadata) { return []; }
    return metadata.libraries;
  }

  /**
   * Given an asset, get the list of assets (including descendants) and all dependencies
   *
   * Example result:
   * [
   *    { asset: '/test/1', dependencies: [] },
   *    { asset: '/test/1/1', dependencies: [] },
   *    { asset: '/test/1/1/1', dependencies: [] }
   * ]
   * @param {object} asset The root asset to scan
   * @returns Array of assets and dependencies
   */
  static getAllDependencies(asset) {
    const dependencies = asset
      ? [{ asset: asset.uri, dependencies: AssetUtil.getDependencies(asset) }]
      : [];
    if (!asset || !asset.children) {
      return dependencies.flat();
    }
    for (let index = 0; index < asset.children.length; index++) {
      dependencies.push(AssetUtil.getAllDependencies(asset.children[index]));
    }
    return dependencies.flat();
  }
}
