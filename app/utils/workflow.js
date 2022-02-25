/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
import AssetUtil from './asset';
import PythonHandler from '../services/assets/handlers/python';
import RHandler from '../services/assets/handlers/r';
import SASHandler from '../services/assets/handlers/sas';
import StataHandler from '../services/assets/handlers/stata';
import Constants from '../constants/constants';

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
    } else if (AssetUtil.getHandlerMetadata(SASHandler.id, asset.metadata)) {
      assetType = 'sas';
    } else if (AssetUtil.getHandlerMetadata(StataHandler.id, asset.metadata)) {
      assetType = 'stata';
    }

    return assetType;
  }

  /**
   * Build a graph (collection of nodes and links) for an asset and all of
   * its descendants
   * @param {object} asset The root asset to build the graph from.
   * @param {array} filters The filters to apply (if applicable)
   * @returns An react-d3-graph object containing nodes and links attributes
   */
  static getAllDependenciesAsGraph(asset, filters) {
    const graph = {
      nodes: [],
      links: []
    };

    if (!asset || !asset.uri) {
      return graph;
    }

    const applyFilter = filters !== null && filters !== undefined && filters.length > 0;
    const typeFilterIndex = applyFilter
      ? filters.findIndex(x => x.category === 'Code File Type')
      : -1;
    const typeFilter = typeFilterIndex === -1 ? null : filters[typeFilterIndex];
    const depedencyFilterIndex = applyFilter
      ? filters.findIndex(x => x.category === 'Inputs and Outputs')
      : -1;
    const dependencyFilter = depedencyFilterIndex === -1 ? null : filters[depedencyFilterIndex];
    const allDeps = WorkflowUtil.getAllDependencies(asset, asset.uri);
    for (let index = 0; index < allDeps.length; index++) {
      const entry = allDeps[index];
      if (entry.asset && entry.dependencies && entry.dependencies.length > 0) {
        // If we have a code file type filter to apply, and we are supposed to filter this
        // asset out, skip further processing.
        if (typeFilter && typeFilter.values.some(x => !x.value && x.key === entry.assetType)) {
          continue;
        }

        // Given how we traverse, we can assume assets will be unique
        graph.nodes.push({ id: entry.asset, assetType: entry.assetType });
        for (let depIndex = 0; depIndex < entry.dependencies.length; depIndex++) {
          const dependency = entry.dependencies[depIndex];

          // If we have a dependency filter to apply, and we are supposed to filter this
          // dependency out, skip further processing.
          if (
            dependencyFilter &&
            dependencyFilter.values.some(
              x =>
                // Only consider filters that are turned off
                !x.value &&
                // If the filter is for dependencies, it is a match if there is
                // no dependency.type value (we leave that empty).  If there is
                // a dependency.type and it matches the key, filter it out.
                (x.key === dependency.type ||
                  (x.key === Constants.DependencyType.DEPENDENCY && !dependency.type))
            )
          ) {
            continue;
          }

          const dependencyId = dependency.id;
          // We need to see if we already have an dependency before we add it as a node (to avoid
          // duplicate nodes with the same ID).
          if (!graph.nodes.some(n => n.id === dependencyId)) {
            graph.nodes.push({
              id: dependencyId,
              assetType: dependency.type ? dependency.type : Constants.DependencyType.DEPENDENCY
            });
          }
          // Likewise, we have to make sure that any edge is unique before we add it
          const source =
            dependency.direction === Constants.DependencyDirection.IN ? dependencyId : entry.asset;
          const target =
            dependency.direction === Constants.DependencyDirection.IN ? entry.asset : dependencyId;
          if (!graph.links.some(l => l.source === source && l.target === target)) {
            graph.links.push({ source, target });
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

  /**
   * Intended for use within this class only.  Utility function to get all of the
   * relevant collections from a metadata object, and add those collections to our
   * larger lists.  Note that the array parameters will be modified.
   * @param {object} asset The asset to extract metadata from
   * @param {string} metadataId The id of the metadata handler
   * @param {array} libraries Collection of libraries we will add to (if found)
   * @param {array} inputs Collection of input relationships we will add to (if found)
   * @param {array} outputs Collection of output relationships we will add to (if found)
   */
  static _getMetadataDependencies(asset, metadataId, libraries, inputs, outputs) {
    const metadata = AssetUtil.getHandlerMetadata(metadataId, asset.metadata);
    if (metadata) {
      if (metadata.libraries) {
        libraries.push(...metadata.libraries);
      }
      if (metadata.inputs) {
        inputs.push(...metadata.inputs);
      }
      if (metadata.outputs) {
        outputs.push(...metadata.outputs);
      }
    }
  }

  /**
   * Given an asset, collect and flatten the list of all dependencies that were found
   * by different handlers.
   * @param {object} asset The asset to find all dependencies for
   * @returns Array of dependencies, or an empty array if none are found
   */
  static getDependencies(asset) {
    if (!asset) {
      return [];
    }

    const libraries = [];
    const inputs = [];
    const outputs = [];
    WorkflowUtil._getMetadataDependencies(asset, PythonHandler.id, libraries, inputs, outputs);
    WorkflowUtil._getMetadataDependencies(asset, RHandler.id, libraries, inputs, outputs);
    WorkflowUtil._getMetadataDependencies(asset, SASHandler.id, libraries, inputs, outputs);
    WorkflowUtil._getMetadataDependencies(asset, StataHandler.id, libraries, inputs, outputs);

    return libraries
      .map(e => {
        return { ...e, direction: Constants.DependencyDirection.IN };
      })
      .concat(
        inputs.map(e => {
          return { ...e, direction: Constants.DependencyDirection.IN };
        }),
        outputs.map(e => {
          return { ...e, direction: Constants.DependencyDirection.OUT };
        })
      );
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
   * @param {string} rootUri The root portion of the URI that should be stripped
   * @returns Array of assets and dependencies
   */
  static getAllDependencies(asset, rootUri) {
    const dependencies = asset
      ? [
          {
            asset: rootUri ? asset.uri.replace(rootUri, '').replace(/^\\+|\/+/, '') : asset.uri,
            assetType: WorkflowUtil.getAssetType(asset),
            dependencies: WorkflowUtil.getDependencies(asset)
          }
        ]
      : [];
    if (!asset || !asset.children) {
      return dependencies.flat();
    }
    for (let index = 0; index < asset.children.length; index++) {
      dependencies.push(WorkflowUtil.getAllDependencies(asset.children[index], rootUri));
    }
    return dependencies.flat();
  }
}
