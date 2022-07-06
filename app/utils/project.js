/* eslint-disable no-nested-ternary */
/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
import { v4 as uuid } from 'uuid';
import WorkflowUtil from './workflow';
import AssetUtil from './asset';
import Constants from '../constants/constants';

// Used to verify that we have at least one non-whitespace character in a string
const oneNonWhitespaceRegex = new RegExp('\\S');

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
  return x.contentTypes.includes(Constants.AssetContentType.CODE) && WorkflowUtil.getAssetType(x);
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
    if (key) {
      // key can be an array or a single string.  If it's an array we will process
      // each element to check for duplicates.  If it's a single string we can do
      // a simple check and add.
      if (Array.isArray(key)) {
        key.forEach(k => {
          if (filter.values.findIndex(x => x.key === k) === -1) {
            filter.values.push({ key: k, label: k, value: true });
          }
        });
      } else if (filter.values.findIndex(x => x.key === key) === -1) {
        filter.values.push({ key, label: key, value: true });
      }
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

    const assetTypeFilter = { category: Constants.FilterCategory.ASSET_TYPE, values: [] };
    const assetTypeFunc = x => x.type;
    ProjectUtil._processAssetAndDescendantsForFilter(assets, assetTypeFilter, assetTypeFunc);
    if (assetTypeFilter.values.length > 0) {
      filters.push(assetTypeFilter);
    }

    const contentTypeFilter = { category: Constants.FilterCategory.CONTENT_TYPE, values: [] };
    // Content types should only apply to files
    const contentTypeFunc = x => x.type === Constants.AssetType.FILE && x.contentTypes;
    ProjectUtil._processAssetAndDescendantsForFilter(assets, contentTypeFilter, contentTypeFunc);
    if (contentTypeFilter.values.length > 0) {
      filters.push(contentTypeFilter);
    }

    const fileTypeFilter = { category: Constants.FilterCategory.FILE_TYPE, values: [] };
    ProjectUtil._processAssetAndDescendantsForFilter(assets, fileTypeFilter, _codeTypeFunc);
    if (fileTypeFilter.values.length > 0) {
      filters.push(fileTypeFilter);
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
      if (f.category === Constants.FilterCategory.ASSET_TYPE) {
        // This is the only category (for now) which can trigger us to filter out but
        // retain child items
        const catFilter = f.values.some(v => !v.value && v.key === asset.type) ? 1 : 0;
        filterOut = Math.max(catFilter, filterOut);
      }
      // Directories may get assigned a content type or file type, just because
      // of how asset processing assigns those, but for filtering purposes directories
      // should not consider those a relevant filter.  We are going to specify the
      // asset types where we want those to apply, considering we will be adding more
      // asset types in the future.
      if (asset.type === Constants.AssetType.FILE) {
        if (f.category === Constants.FilterCategory.CONTENT_TYPE) {
          const catFilter = f.values.some(v => !v.value && asset.contentTypes.includes(v.key))
            ? 2
            : 0;
          filterOut = Math.max(catFilter, filterOut);
        } else if (
          // File Type should only apply to files
          f.category === Constants.FilterCategory.FILE_TYPE
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

    const assetTypeIndex = filter.findIndex(
      x => x.category === Constants.FilterCategory.ASSET_TYPE
    );
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

  static _sortAndAddFilter(filter, filters) {
    if (filter && filter.values.length > 0) {
      filter.values.sort((a, b) => (a.label > b.label ? 1 : b.label > a.label ? -1 : 0));
      filters.push(filter);
    }
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

    const fileTypeFilter = { category: Constants.FilterCategory.FILE_TYPE, values: [] };
    ProjectUtil._processAssetAndDescendantsForFilter(assets, fileTypeFilter, _codeTypeFunc);
    if (fileTypeFilter.values.length > 0) {
      filters.push(fileTypeFilter);
    }

    // We get back a flat list of dependencies, so no recursive processing is needed for these
    const ioFilter = { category: Constants.FilterCategory.INPUTS_OUTPUTS, values: [] };
    const dependencyFilter = { category: Constants.FilterCategory.DEPENDENCIES, values: [] };
    const assetDepedencies = WorkflowUtil.getAllDependencies(assets);
    if (!assetDepedencies) {
      return filters;
    }
    assetDepedencies.forEach(x => {
      if (x.assetType && x.assetType !== Constants.AssetType.GENERIC) {
        x.dependencies.forEach(d => {
          const type = d.type ? d.type : Constants.DependencyType.DEPENDENCY;
          if (ioFilter.values.findIndex(i => i.key === type) === -1) {
            ioFilter.values.push({ key: type, label: type, value: true });
          }
          if (!d.type && dependencyFilter.values.findIndex(i => i.key === d.id) === -1) {
            dependencyFilter.values.push({ key: d.id, label: d.id, value: true });
          }
        });
      }
    });
    ProjectUtil._sortAndAddFilter(ioFilter, filters);
    ProjectUtil._sortAndAddFilter(dependencyFilter, filters);

    return filters;
  }

  /**
   * Utility function to determine if the asset group provided is valid or not.
   * @param {string} name Name of the asset group
   * @returns bool True if the name is valid, and false otherwise.
   */
  static validateAssetGroupName(name) {
    return !(!name || !oneNonWhitespaceRegex.test(name));
  }

  /**
   * Utility function to avoid duplicating parameter checks in our create/update/remove asset group methods
   * @param {object} project The project to validate
   * @param {object} group The group to validate
   * @param {bool} groupShouldExist If we should check that the group is an existing group.  Set to false when called
   *  for a new group.
   */
  static _validateProjectAndGroup(project, group, groupShouldExist) {
    if (!project) {
      throw new Error('The project object cannot be null or undefined');
    } else if (!group) {
      throw new Error('The group object cannot be null or undefined');
    } else if (!ProjectUtil.validateAssetGroupName(group.name)) {
      throw new Error(
        'The asset group name is required, and must be at least one non-whitespace character in length.'
      );
    }

    if (groupShouldExist) {
      if (!group.id || group.id === undefined || group.id === '') {
        throw new Error('The asset group ID cannot be null or undefined');
      }
    }
  }

  /**
   * Utility function to handle adding or updating an asset group within a project
   * @param {object} project The project object, assumed to be recently loaded.
   * @param {object} group The asset group to add to the project's collection
   * @returns object Will be the asset group record (with the assigned ID, if applicable) if the upsert succeeded.
   * If the upsert did not succeed, it will throw an exception.  If successful, the change will be reflected
   * in the `project` object. Even if no actual change is needed, this function will still
   * return the asset group.
   */
  static upsertAssetGroup(project, group) {
    ProjectUtil._validateProjectAndGroup(project, group, false);

    // Initialize the assetGroups array if it doesn't exist already in the object
    if (!project.assetGroups || project.assetGroups === undefined) {
      project.assetGroups = [];
    }

    // If we have an ID for the group, we need to see if it already exists.  That is
    // our indicator of each group - we won't do any name checks.  If there is no group
    // ID, we need to generate one and then can just add it.
    let addGroupToArray = false;
    if (group.id) {
      const existingGroup = project.assetGroups.find(p => p.id === group.id);
      if (existingGroup) {
        // Copy over only what attributes need to be saved in the directory.  Some
        // attributs may be specific to the project entry for the person.
        existingGroup.name = group.name;
        existingGroup.details = group.details;
        existingGroup.assets = group.assets;
      } else {
        addGroupToArray = true;
      }
    } else {
      group.id = uuid();
      addGroupToArray = true;
    }

    if (addGroupToArray) {
      project.assetGroups.push(group);
    }

    return group;
  }

  /**
   * Utility function to handle removing an asset group within a project.  Modifies the project parameter.
   * @param {object} project The project object, assumed to be recently loaded.
   * @param {object} group The asset group to remove from to the project's collection
   */
  static removeAssetGroup(project, group) {
    ProjectUtil._validateProjectAndGroup(project, group, true);

    // If there is no asset group collection, we're done - there's nothing to remove.
    if (!project.assetGroups || project.assetGroups === undefined) {
      return;
    }

    // If we don't find the asset group, we're going to let it slide silently for now.
    const existingGroupIndex = project.assetGroups.findIndex(p => p.id === group.id);
    if (existingGroupIndex > -1) {
      project.assetGroups.splice(existingGroupIndex, 1);
    }
  }

  /**
   * Given an array of asset groups, convert all of the asset paths from absolute paths to relative paths.
   * This will not modify the assetGroup parameters.
   * @param {string} projectPath The fully qualified path of the project
   * @param {array} assetGroups Array of asset group objects
   * @returns A modified copy of assetGroups that has the paths converted from absolute to relative
   */
  // TODO - unit tests!!
  static absoluteToRelativePathForAssetGroups(projectPath, assetGroups) {
    // If the array of asset groups isn't defined, we will return an empty array just to start
    // initializing the collection.
    if (assetGroups === null || assetGroups === undefined) {
      return [];
    }

    const modifiedAssetGroups = [...assetGroups];
    for (let index = 0; index < modifiedAssetGroups.length; index++) {
      modifiedAssetGroups[index].assets = AssetUtil.absoluteToRelativePathForArray(
        projectPath,
        modifiedAssetGroups[index].assets
      );
    }
    return modifiedAssetGroups;
  }

  /**
   * Given an array of asset groups, convert all of the asset paths from relative paths to absolute paths.
   * This will not modify the assetGroup parameters.
   * @param {string} projectPath The fully qualified path of the project
   * @param {array} assetGroups Array of asset group objects
   * @returns A modified copy of assetGroups that has the paths converted from relative to absolute
   */
  // TODO - unit tests!!
  static relativeToAbsolutePathForAssetGroups(projectPath, assetGroups) {
    // If the array of asset groups isn't defined, we will return an empty array just to start
    // initializing the collection.
    if (assetGroups === null || assetGroups === undefined) {
      return [];
    }

    const modifiedAssetGroups = [...assetGroups];
    for (let index = 0; index < modifiedAssetGroups.length; index++) {
      modifiedAssetGroups[index].assets = AssetUtil.relativeToAbsolutePathForArray(
        projectPath,
        modifiedAssetGroups[index].assets
      );
    }
    return modifiedAssetGroups;
  }
}
