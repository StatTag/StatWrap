import React from 'react';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import Loading from '../../Loading/Loading';
import styles from './Assets.css';

const assets = props => {
  let assetDisplay = null;
  if (props.project) {
    assetDisplay = <Loading>Please wait for the list of assets to finish loading...</Loading>;
    if (props.project.assets) {
      assetDisplay = props.project.assets.error ? (
        <Error>{props.project.assets.errorMessage}</Error>
      ) : (
        <AssetTree project={props.project} />
      );
    }
  }

  return <div className={styles.container}>{assetDisplay}</div>;
};

export default assets;
