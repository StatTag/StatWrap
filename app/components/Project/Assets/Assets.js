import React, { useState, useEffect } from 'react';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import AssetDetails from '../../AssetDetails/AssetDetails';
import Loading from '../../Loading/Loading';
import AssetUtil from '../../../utils/asset';
import styles from './Assets.css';

const assets = props => {
  const {
    project,
    onAddedAssetNote,
    onUpdatedAssetNote,
    onDeletedAssetNote,
    onUpdatedAssetAttribute,
    assetAttributes
  } = props;
  const [selectedAsset, setSelectedAsset] = useState();

  // Because our project property can change, the asset that we have in state as the selected
  // asset may have actually changed.  We need to detect that and refresh the selected asset
  // in that case.
  useEffect(() => {
    // Get a more recent copy of the asset from the updated project
    if (project && project.assets && selectedAsset) {
      const updatedAsset = AssetUtil.findDescendantAssetByUri(project.assets, selectedAsset.uri);
      setSelectedAsset(updatedAsset);
    } else {
      setSelectedAsset(null);
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
      />
    ) : null;
    if (project.assets) {
      assetDisplay = project.assets.error ? (
        <Error>{project.assets.errorMessage}</Error>
      ) : (
        <>
          <div className={styles.tree}>
            <AssetTree
              project={project}
              onSelectAsset={asset => setSelectedAsset(asset)}
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

export default assets;
