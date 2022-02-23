import React, { useState, useEffect } from 'react';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import AssetDetails from '../../AssetDetails/AssetDetails';
import AssetFilter from '../../Filter/Filter';
import Loading from '../../Loading/Loading';
import AssetUtil from '../../../utils/asset';
import ProjectUtil from '../../../utils/project';
import styles from './Assets.css';

const assetsComponent = props => {
  const {
    project,
    onAddedAssetNote,
    onUpdatedAssetNote,
    onDeletedAssetNote,
    onUpdatedAssetAttribute,
    onSelectedAsset,
    assetAttributes,
    dynamicDetails
  } = props;
  const [selectedAsset, setSelectedAsset] = useState();
  const [assets, setAssets] = useState(null);

  const filteredProjectAssets =
    !project || !project.assets ? null : AssetUtil.filterIncludedFileAssets(project.assets);

  // Because our project property can change, the asset that we have in state as the selected
  // asset may have actually changed.  We need to detect that and refresh the selected asset
  // in that case.
  useEffect(() => {
    // Get a more recent copy of the asset from the updated project
    if (project && project.assets && selectedAsset) {
      const updatedAsset = AssetUtil.findDescendantAssetByUri(project.assets, selectedAsset.uri);
      setSelectedAsset(updatedAsset);
      if (onSelectedAsset) {
        onSelectedAsset(updatedAsset);
      }
    } else {
      setSelectedAsset(null);
      if (onSelectedAsset) {
        onSelectedAsset(null);
      }
    }
  }, [project]);

  // Whenever the filter changes, update the list of assets to include only
  // those that should be displayed.
  const handleFilterChanged = filter => {
    let filteredAssets = ProjectUtil.getFilteredAssets(filteredProjectAssets, filter);
    if (ProjectUtil.isDirectoryFilteredOut(filter)) {
      filteredAssets = ProjectUtil.flattenFilteredAssets(filteredAssets);
    }

    // If filteredAssets ends up becoming null, we are going to set it to an
    // empty object so our UI still displays.
    if (!filteredAssets) {
      filteredAssets = {};
    }

    setAssets(filteredAssets);
  };

  useEffect(() => {
    if (project && project.assets) {
      setAssets(AssetUtil.filterIncludedFileAssets(project.assets));
    } else {
      setAssets(null);
    }
  }, [project]);

  let assetDisplay = null;
  if (project) {
    assetDisplay = <Loading>Please wait for the list of assets to finish loading...</Loading>;
    const assetDetails = selectedAsset ? (
      <AssetDetails
        asset={selectedAsset}
        onAddedNote={onAddedAssetNote}
        onUpdatedNote={onUpdatedAssetNote}
        onDeletedNote={onDeletedAssetNote}
        onUpdatedAttribute={onUpdatedAssetAttribute}
        assetAttributes={assetAttributes}
        sourceControlEnabled={project.sourceControlEnabled}
        dynamicDetails={dynamicDetails}
      />
    ) : null;
    if (assets) {
      // Note that for the AssetFilter component, we always want that to be the original
      // full list of assets.  That's why we use project.assets for that component's
      // propery, and the assets state variable for the AssetTree.
      assetDisplay = project.assets.error ? (
        <Error>{assets.errorMessage}</Error>
      ) : (
        <>
          <AssetFilter
            assets={filteredProjectAssets}
            mode="asset"
            onFilterChanged={handleFilterChanged}
          />
          <div className={styles.tree}>
            <AssetTree
              assets={assets}
              onSelectAsset={asset => {
                setSelectedAsset(asset);
                if (onSelectedAsset) {
                  onSelectedAsset(asset);
                }
              }}
              selectedAsset={selectedAsset}
            />
          </div>
          <div className={styles.details}>{assetDetails}</div>
        </>
      );
    }
  }

  return <div className={styles.container}>{assetDisplay}</div>;
};

export default assetsComponent;
