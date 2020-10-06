import React, { useState } from 'react';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import AssetDetails from '../../AssetDetails/AssetDetails';
import Loading from '../../Loading/Loading';
import styles from './Assets.css';

const assets = props => {
  const [selectedAsset, setSelectedAsset] = useState();
  let assetDisplay = null;
  if (props.project) {
    assetDisplay = <Loading>Please wait for the list of assets to finish loading...</Loading>;
    const assetDetails = selectedAsset ? <AssetDetails asset={selectedAsset} /> : null;
    if (props.project.assets) {
      assetDisplay = props.project.assets.error ? (
        <Error>{props.project.assets.errorMessage}</Error>
      ) : (
        <>
          <div className={styles.tree}>
            <AssetTree
              project={props.project}
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
