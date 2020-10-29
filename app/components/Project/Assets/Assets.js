import React, { useState } from 'react';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import AssetDetails from '../../AssetDetails/AssetDetails';
import Loading from '../../Loading/Loading';
import styles from './Assets.css';

const assets = props => {
  const { project, onAddedAssetNote, onUpdatedAssetNote, onDeletedAssetNote } = props;
  const [selectedAsset, setSelectedAsset] = useState();
  let assetDisplay = null;
  if (project) {
    console.log('*** RENDER ***');
    console.log(project);
    assetDisplay = <Loading>Please wait for the list of assets to finish loading...</Loading>;
    const assetDetails = selectedAsset ? (
      <AssetDetails
        asset={selectedAsset}
        onAddedNote={onAddedAssetNote}
        onUpdatedNote={onUpdatedAssetNote}
        onDeletedNote={onDeletedAssetNote}
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
