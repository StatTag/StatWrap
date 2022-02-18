/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
import WorkflowUtil from './workflow';

const _codeTypeFunc = function(x) {
  if (!x || !x.metadata) {
    return null;
  }
  return WorkflowUtil.getAssetType(x);
};

/* eslint-disable no-underscore-dangle */
export default class ProjectUtil {
  /**
   * Recursive worker function to get unique filter values for an asset and its descendants.
   * @param {object} asset The asset to scan
   * @param {object} filter The filter to provide values for
   * @param {func} getter The function to retrieve the value
   */
  static _processAssetAndDescendantsForFilter(asset, filter, getter) {
    if (!asset || asset === undefined) {
      return;
    }

    // Only add the filter value if we don't already have it.
    const value = getter(asset);
    if (value && filter.values.indexOf(value) === -1) {
      filter.values.push(value);
    }
    if (asset.children) {
      asset.children.forEach(child => {
        ProjectUtil._processAssetAndDescendantsForFilter(child, filter, getter);
      });
    }

    if (filter.values.length > 0) {
      filter.values.sort();
    }
  }

/*
  /**
   * Recursive worker function to get unique filter values for an asset and its descendants.
   * @param {object} asset The asset to scan
   * @param {object} filter The filter to provide values for
   * /
  static _processAssetAndDescendantsForAssetFilter(asset, filter) {
    if (!asset || asset === undefined) {
      return;
    }

    // Only add the filter value if we don't already have it.
    if (asset.type && filter.values.indexOf(asset.type) === -1) {
      filter.values.push(asset.type);
    }
    if (asset.children) {
      asset.children.forEach(child => {
        ProjectUtil._processAssetAndDescendantsForAssetFilter(child, filter);
      });
    }

    if (filter.values.length > 0) {
      filter.values.sort();
    }
  }

  /**
   * Recursive worker function to get unique filter values for an asset and its descendants.
   * @param {object} asset The asset to scan
   * @param {object} filter The filter to provide values for
   * /
  static _processAssetAndDescendantsForContentTypeFilter(asset, filter) {
    if (!asset || asset === undefined) {
      return;
    }

    // Only add the filter value if we don't already have it.
    if (asset.type && filter.values.indexOf(asset.contentType) === -1) {
      filter.values.push(asset.contentType);
    }
    if (asset.children) {
      asset.children.forEach(child => {
        ProjectUtil._processAssetAndDescendantsForContentTypeFilter(child, filter);
      });
    }
  }

  /**
   * Recursive worker function to get unique filter values for an asset and its descendants.
   * @param {object} asset The asset to scan
   * @param {object} filter The filter to provide values for
   * /
  static _processAssetAndDescendantsForCodeTypeFilter(asset, filter) {
    if (!asset || asset === undefined) {
      return;
    }

    // Only add the filter value if we don't already have it.
    const codeType = WorkflowUtil.getAssetType(asset);
    if (codeType && filter.values.indexOf(codeType) === -1) {
      filter.values.push(codeType);
    }
    if (asset.children) {
      asset.children.forEach(child => {
        ProjectUtil._processAssetAndDescendantsForCodeTypeFilter(child, filter);
      });
    }
  }
*/

  /**
   * Return the collection of filters that may be applied for this root asset.  This is geared towards
   * the Asset view
   * @param {object} assets The assets we will scan
   */
  static getAssetFilters(assets) {
    const filters = [];
    if (!assets || assets === undefined) {
      return filters;
    }

    const assetTypeFilter = { category: 'Asset Type', values: [] };
    const assetTypeFunc = x => x.type;
    ProjectUtil._processAssetAndDescendantsForFilter(assets, assetTypeFilter, assetTypeFunc);
    if (assetTypeFilter.values.length > 0) {
      filters.push(assetTypeFilter);
    }

    const contentTypeFilter = { category: 'Content Type', values: [] };
    const contentTypeFunc = x => x.contentType;
    ProjectUtil._processAssetAndDescendantsForFilter(assets, contentTypeFilter, contentTypeFunc);
    if (contentTypeFilter.values.length > 0) {
      filters.push(contentTypeFilter);
    }

    const codeTypeFilter = { category: 'Code File Type', values: [] };
    ProjectUtil._processAssetAndDescendantsForFilter(assets, codeTypeFilter, _codeTypeFunc);
    if (codeTypeFilter.values.length > 0) {
      filters.push(codeTypeFilter);
    }

    return filters;
  }

  /**
   * Apply a collection of filters to an asset collection.  Return the assets that meet the
   * filter.
   * @param {object} assets The assets object that we are going to filter.
   * @param {array} filter The collection of active filters to apply to the assets.
   */
  static getFilteredAssets(assets, filter) {
    if (!assets || assets === undefined) {
      return null;
    }
    // If we have no filters, that doesn't mean we return nothing - it's the opposite.  No
    // filters means we have no filters applied, and so therefore everything is returned.
    if (!filter || filter === undefined || filter.length === 0) {
      return assets;
    }

    return assets;
  }

  /**
   * Return the collection of filters that may be applied for this project.  This is geared towards
   * the Workflow view
   * @param {object} assets The assets we will scan
   */
  static getWorkflowFilters(assets) {
    const filters = [];
    if (!assets || assets === undefined) {
      return filters;
    }

    const codeTypeFilter = { category: 'Code File Type', values: [] };
    ProjectUtil._processAssetAndDescendantsForFilter(assets, codeTypeFilter, _codeTypeFunc);
    if (codeTypeFilter.values.length > 0) {
      filters.push(codeTypeFilter);
    }

    return filters;
  }
}
