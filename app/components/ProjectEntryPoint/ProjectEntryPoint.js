import React from 'react';
import { Button, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport, faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import styles from './ProjectEntryPoint.css';

function findEntryPoints(asset, entryPointsList) {
  if (asset.attributes && asset.attributes.entrypoint === true) {
    entryPointsList.push(asset);
  }
  if (asset.children) {
    asset.children.forEach((child) => {
      findEntryPoints(child, entryPointsList);
    });
  }
}

function findAllDescendantAssetsByUri(asseturi, uri) {
  const descendantsList = [];
  // just loop through the asset uri and break it apart at each '/' and add to the list till we get to the end
  while (asseturi !== uri) {
    const lastSlash = asseturi.lastIndexOf('/');
    if (lastSlash === -1) {
      break;
    }
    asseturi = asseturi.substring(0, lastSlash); // Update the variable instead of modifying the function parameter directly
    descendantsList.push(asseturi);
  }
  return descendantsList;
}

const projectEntryPoint = (props) => {
  const { assets, rooturi, onSelect } = props;

  const setSelectedAsset = (asset) => {
    const assetDescendantsUri = findAllDescendantAssetsByUri(asset.uri, rooturi).reverse();
    if (onSelect) {
      onSelect(asset, assetDescendantsUri);
    }
  };

  const entryPointsList = [];
  if (assets) {
    findEntryPoints(assets, entryPointsList);
  }

  if (entryPointsList && entryPointsList.length > 0) {
    return (
      <div className={styles.container}>
        <Typography variant="body1">Entry Points</Typography>
        <ul className={styles.entryPointList} type='disc'>
          {entryPointsList.map((asset) => {
            const fileName = asset.uri.split('/').pop();
            let folder = asset.uri.replace(rooturi + '/', '').split('/')[0];
            if(folder === fileName) {
              folder = rooturi.split('/').pop();
            }
            return (
              <li key={asset.uri} className={styles.entryPointItem}>
                <Typography className={styles.entryPointUri}>
                  <FontAwesomeIcon icon={faFileImport} /> {fileName} ({folder})
                </Typography>
                <Button onClick={() => setSelectedAsset(asset)}>
                  Navigate here &nbsp; <FontAwesomeIcon icon={faShareFromSquare} />
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return null;
};

export default projectEntryPoint;
