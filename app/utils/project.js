/* eslint-disable no-nested-ternary */
/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
import WorkflowUtil from './workflow';
import Constants from '../constants/constants';

/*
  Within StatWrap, we organize filters like this:

  [
    {
      category: 'Category Name',
      values: [
        {
          key: 'filter key',
          label: 'display label',
          value: true | false
        }
      ]
    }
  ]
*/

const _codeTypeFunc = function(x) {
  if (!x || !x.metadata) {
    return null;
  }
  return x.contentType === Constants.AssetContentType.CODE && WorkflowUtil.getAssetType(x);
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
    const key = getter(asset);
    if (key && filter.values.findIndex(x => x.key === key) === -1) {
      if (filter.category === 'Content Type') {
        console.log(asset.uri, key);
      }
      filter.values.push({ key, label: key, value: true });
    }
    if (asset.children) {
      asset.children.forEach(child => {
        ProjectUtil._processAssetAndDescendantsForFilter(child, filter, getter);
      });
    }

    if (filter.values.length > 0) {
      filter.values.sort((a, b) => (a.label > b.label ? 1 : b.label > a.label ? -1 : 0));
    }
  }

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
    // Content types should only apply to files
    const contentTypeFunc = x => x.type === Constants.AssetType.FILE && x.contentType;
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
   * Recursive worker function to get the list of assets that should be shown given
   * the current filter
   * @param {object} asset The asset to scan
   * @param {object} filter The filter to apply to the asset. Because this is a worker
   *  function, we know (based on our control) that it will be defined.
   */
  static _processFiltersForAssetAndDescendants(asset, filter) {
    if (!asset || asset === undefined) {
      return;
    }

    // We apply filters in a way that we only remove for 'off' filters.  As we look
    // at the different filters, the only thing that would have us remove an asset
    // is if the filter matches and its value is false.
    // Too lazy to create enum constants here... so the 3 values that the filterOut
    // result can take are:
    // 0 - no, don't filter it out
    // 1 - yes, filter out just this asset, but not its children
    // 2 - yes, filter out the asset and its children (inherited filter)
    let filterOut = 0;
    for (let filterIndex = 0; filterIndex < filter.length; filterIndex++) {
      // As we go through each filter, we will only short-circuit once we have the
      // most extreme filter out (2).
      if (filterOut === 2) {
        break;
      }

      const f = filter[filterIndex];
      if (f.category === 'Asset Type') {
        // This is the only category (for now) which can trigger us to filter out but
        // retain child items
        const catFilter = f.values.some(v => !v.value && v.key === asset.type) ? 1 : 0;
        filterOut = Math.max(catFilter, filterOut);
      }
      // Directories may get assigned a content type or code file type, just because
      // of how asset processing assigns those, but for filtering purposes directories
      // should not consider those a relevant filter.  We are going to specify the
      // asset types where we want those to apply, considering we will be adding more
      // asset types in the future.
      if (asset.type === Constants.AssetType.FILE) {
        if (f.category === 'Content Type') {
          const catFilter = f.values.some(v => !v.value && v.key === asset.contentType) ? 2 : 0;
          filterOut = Math.max(catFilter, filterOut);
        } else if (
          // Code File Type should only apply to files that have a code content type
          f.category === 'Code File Type' &&
          asset.contentType === Constants.AssetContentType.CODE
        ) {
          // eslint-disable-next-line prettier/prettier
          const catFilter = f.values.some(v => !v.value && WorkflowUtil.getAssetType(asset) === v.key) ? 2 : 0;
          filterOut = Math.max(catFilter, filterOut);
        }
      }
    }

    if (asset.children) {
      // Filtering asset and children, return null
      if (filterOut === 2) {
        return null;
      }

      let assetClone = null;
      // If we're filtering out the asset only, we need to preserve the object structure but
      // only include the children;
      const isStub = filterOut === 1;
      if (isStub) {
        assetClone = { children: [] };
      } else {
        assetClone = { ...asset, children: [] };
      }

      for (let index = 0; index < asset.children.length; index++) {
        const processedChild = ProjectUtil._processFiltersForAssetAndDescendants(
          asset.children[index],
          filter
        );
        if (processedChild) {
          assetClone.children.push(processedChild);
        }
      }

      // If assetClone is just a stub, and now it has no children (after recusive filtering)
      // we don't want to return the stub at all - just return null.
      if (isStub && assetClone.children.length === 0) {
        return null;
      }

      return assetClone;
    }

    if (filterOut > 0) {
      return null;
    }

    return asset;
  }

  /**
   * Utility function to determine if, for a collection of filters, we have
   * the directory filter available, and if it is turned off.
   * @param {object} filter The filter to be applied
   * @returns true if directories are being filtered out
   */
  static isDirectoryFilteredOut(filter) {
    if (!filter || filter === undefined) {
      return false;
    }

    const assetTypeIndex = filter.findIndex(x => x.category === 'Asset Type');
    if (assetTypeIndex !== -1) {
      const directoryIndex = filter[assetTypeIndex].values.findIndex(
        y => y.key === Constants.AssetType.DIRECTORY
      );
      if (directoryIndex !== -1) {
        return !filter[assetTypeIndex].values[directoryIndex].value;
      }
    }

    return false;
  }

  /**
   * Internal worker function to recusively add valid assets to the flat array
   * @param {object} asset The current asset we are processing
   * @param {array} flattenedList The flat array of assets that we will add to
   */
  static _flattenFilteredAssets(asset, flattenedList) {
    if (asset.children) {
      asset.children.forEach(x => ProjectUtil._flattenFilteredAssets(x, flattenedList));
    }
    if (asset.uri) {
      flattenedList.push(asset);
    }
  }

  /**
   * Once a filter is applied, we may end up with stub objects where containers
   * like directories used to be. In that case, this method will recursively
   * turn our asset and its descendants into a flattened children array under a
   * stub asset container.
   * @param {object} assets The assets object to flatten
   */
  static flattenFilteredAssets(assets) {
    if (!assets || assets === undefined) {
      return null;
    }

    const flattenedList = [];
    ProjectUtil._flattenFilteredAssets(assets, flattenedList);
    return { uri: 'Filtered List', children: flattenedList };
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

    // Do an extra check to see if we can short-circuit the longer check.  If all of the
    // filters are 'on', then we just return the assets untouched.
    // TODO ****

    return ProjectUtil._processFiltersForAssetAndDescendants(assets, filter);
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
