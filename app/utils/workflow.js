import AssetUtil from './asset';
import PythonHandler from '../services/assets/handlers/python';
import RHandler from '../services/assets/handlers/r';

export default class WorkflowUtil {
  static getAssetType(asset) {
    let assetType = 'generic';
    if (!asset) {
      return assetType;
    }

    if (AssetUtil.getHandlerMetadata(PythonHandler.id, asset.metadata)) {
      assetType = 'python';
    } else if (AssetUtil.getHandlerMetadata(RHandler.id, asset.metadata)) {
      assetType = 'r';
    }

    return assetType;
  }

  /**
   * Build a graph (collection of nodes and links) for an asset and all of
   * its descendants
   * @param {object} asset
   * @returns An react-d3-graph object containing nodes and links attributes
   */
  static getAllDependenciesAsGraph(asset) {
    const graph = {
      nodes: [],
      links: []
    };
    const allDeps = WorkflowUtil.getAllDependencies(asset);
    for (let index = 0; index < allDeps.length; index++) {
      const entry = allDeps[index];
      if (entry.asset && entry.dependencies && entry.dependencies.length > 0) {
        // Given how we traverse, we can assume assets will be unique
        graph.nodes.push({ id: entry.asset, assetType: entry.assetType });
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

  /**
   * Build a tree (hierarchy of nodes) for an asset and all of
   * its descendants
   * @param {object} asset
   * @returns An react-d3-tree tree object containing nodes and links attributes
   */
  static getAllDependenciesAsTree(asset) {
    if (!asset) {
      return null;
    }

    const tree = {
      name: AssetUtil.getAssetNameFromUri(asset),
      children: null,
      attributes: {
        assetType: WorkflowUtil.getAssetType(asset)
      }
    };

    if (asset.children) {
      tree.children = [];
      for (let index = 0; index < asset.children.length; index++) {
        tree.children.push(WorkflowUtil.getAllDependenciesAsTree(asset.children[index]));
      }
    }

    const allDeps = WorkflowUtil.getDependencies(asset);
    if (allDeps && allDeps.length > 0 && !tree.children) {
      tree.children = [];
    }

    for (let index = 0; index < allDeps.length; index++) {
      const entry = allDeps[index];
      const depEntry = { name: entry.id, attributes: { assetType: 'dependency' } };
      // Only push dependencies once (to avoid unnecessary clutter)
      // eslint-disable-next-line prettier/prettier
      if (!tree.children.some(x => x.name === depEntry.name
            && x.attributes.assetType === depEntry.attributes.assetType)) {
        tree.children.push(depEntry);
      }
    }
    return tree;
  }

  static getDependencies(asset) {
    if (!asset) {
      return [];
    }

    const libraries = [];
    const pythonMetadata = AssetUtil.getHandlerMetadata(PythonHandler.id, asset.metadata);
    if (pythonMetadata) {
      libraries.push(...pythonMetadata.libraries);
    }
    const rMetadata = AssetUtil.getHandlerMetadata(RHandler.id, asset.metadata);
    if (rMetadata) {
      libraries.push(...rMetadata.libraries);
    }
    return libraries;
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
      ? [
          {
            asset: asset.uri,
            assetType: WorkflowUtil.getAssetType(asset),
            dependencies: WorkflowUtil.getDependencies(asset)
          }
        ]
      : [];
    if (!asset || !asset.children) {
      return dependencies.flat();
    }
    for (let index = 0; index < asset.children.length; index++) {
      dependencies.push(WorkflowUtil.getAllDependencies(asset.children[index]));
    }
    return dependencies.flat();
  }
}
